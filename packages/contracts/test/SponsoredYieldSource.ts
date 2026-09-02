// Covers the sponsored yield source on its own, with a plain signer standing in for the prize pool:
// sponsoring, accrual, the rate change, who may harvest, and the encrypted handle a harvest returns.
// Does not cover what the pool does with that handle, the public decryption the pool books it from, or
// the Zama Confidential Vault adapter.
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { ConfidentialUSDC, SponsoredYieldSource, TestUSDC } from "../types";

const usd = (whole: number): bigint => BigInt(whole) * 1_000_000n;
const RATE = 1_000_000n / 60n; // one USDC per minute

describe("SponsoredYieldSource", () => {
  let usdc: TestUSDC;
  let cusdc: ConfidentialUSDC;
  let source: SponsoredYieldSource;
  let cusdcAddress: string;

  let owner: HardhatEthersSigner;
  let pool: HardhatEthersSigner;
  let sponsor: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, pool, sponsor, stranger] = await ethers.getSigners();

    usdc = (await (await ethers.getContractFactory("TestUSDC")).deploy()) as unknown as TestUSDC;
    cusdc = (await (
      await ethers.getContractFactory("ConfidentialUSDC")
    ).deploy(await usdc.getAddress())) as unknown as ConfidentialUSDC;
    cusdcAddress = await cusdc.getAddress();

    source = (await (
      await ethers.getContractFactory("SponsoredYieldSource")
    ).deploy(cusdcAddress, pool.address, RATE, owner.address)) as unknown as SponsoredYieldSource;
  });

  async function fund(amount: bigint) {
    await (await usdc.connect(sponsor).claim()).wait();
    await (await usdc.connect(sponsor).approve(await source.getAddress(), amount)).wait();
    await (await source.connect(sponsor).sponsor(amount)).wait();
  }

  const poolBalance = () =>
    cusdc
      .confidentialBalanceOf(pool.address)
      .then((handle) => fhevm.userDecryptEuint(FhevmType.euint64, handle, cusdcAddress, pool));

  it("books exactly what the wrapper mints when sponsored", async () => {
    await (await usdc.connect(sponsor).claim()).wait();
    await (await usdc.connect(sponsor).approve(await source.getAddress(), usd(1_000))).wait();
    await expect(source.connect(sponsor).sponsor(usd(1_000)))
      .to.emit(source, "Sponsored")
      .withArgs(sponsor.address, usd(1_000), usd(1_000));
    expect(await source.balance()).to.equal(usd(1_000));
    expect(await usdc.balanceOf(cusdcAddress)).to.equal(usd(1_000));
  });

  it("refuses an empty sponsorship", async () => {
    await expect(source.connect(sponsor).sponsor(0)).to.be.revertedWithCustomError(source, "ZeroAmount");
  });

  it("accrues at the rate and never beyond the sponsored balance", async () => {
    await fund(usd(10));
    await time.increase(120);
    const elapsed = BigInt(await time.latest()) - (await source.lastAccrualAt());
    expect(await source.harvestable()).to.equal(RATE * elapsed);

    await time.increase(3600);
    expect(await source.harvestable()).to.equal(usd(10));
  });

  it("only the recipient may harvest, and the harvest lands in its confidential balance", async () => {
    await fund(usd(100));
    await time.increase(600);

    await expect(source.connect(stranger).harvest()).to.be.revertedWithCustomError(source, "NotRecipient");
    await expect(source.connect(owner).harvest()).to.be.revertedWithCustomError(source, "NotRecipient");

    const before = await source.harvestable();
    const tx = await source.connect(pool).harvest();
    const receipt = await tx.wait();
    const parsed = receipt!.logs.map((log) => {
      try {
        return source.interface.parseLog(log) ?? cusdc.interface.parseLog(log);
      } catch {
        return null;
      }
    });
    const harvested = parsed.find((entry) => entry?.name === "Harvested")!.args.amount as bigint;
    const moved = parsed.find((entry) => entry?.name === "ConfidentialTransfer")!.args.amount as string;

    expect(harvested).to.be.closeTo(before, RATE * 2n);
    expect(await source.balance()).to.equal(usd(100) - harvested);
    expect(await poolBalance()).to.equal(harvested);
    expect(await source.harvestable()).to.equal(0n);
    // The pool books the decryption of this handle, never the plaintext in the event, so the handle has
    // to carry the same amount and has to be readable by the recipient.
    expect(await fhevm.userDecryptEuint(FhevmType.euint64, moved, cusdcAddress, pool)).to.equal(harvested);
  });

  it("returns an encrypted zero without reverting when nothing has accrued", async () => {
    const handle = await source.connect(pool).harvest.staticCall();
    expect(handle, "the pool always gets a handle to prove, even for an empty harvest").to.not.equal(
      ethers.ZeroHash,
    );
    await expect(source.connect(pool).harvest()).to.not.emit(source, "Harvested");
    expect(await source.balance()).to.equal(0n);
  });

  it("settles accrual at the old rate before a rate change", async () => {
    await fund(usd(100));
    await time.increase(60);
    const atOldRate = await source.harvestable();

    await expect(source.connect(stranger).setRate(RATE * 10n)).to.be.revertedWithCustomError(
      source,
      "OwnableUnauthorizedAccount",
    );
    await (await source.connect(owner).setRate(0)).wait();
    await time.increase(600);

    expect(await source.harvestable()).to.be.closeTo(atOldRate, RATE * 2n);
  });

  it("keeps an owner forever", async () => {
    await expect(source.connect(owner).renounceOwnership()).to.be.revertedWithCustomError(
      source,
      "RenounceDisabled",
    );
  });
});
