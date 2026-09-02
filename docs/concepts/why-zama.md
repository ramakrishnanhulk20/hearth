# Why this needs Zama

The test a judge should apply to any project built for a company's developer program:
delete that company's technology and see whether the product survives. If it still works,
the technology was decoration.

## Delete the encryption and there is no product

Fully homomorphic encryption, usually shortened to FHE, means arithmetic performed
directly on encrypted numbers, producing an encrypted answer, without ever decrypting the
inputs. Zama's Protocol brings that to Ethereum: a Solidity contract can add, compare and
choose between values it cannot read.

Take it out of Hearth and here is what is left.

| Piece of Hearth | Without FHE |
| --- | --- |
| Your balance | A public number. Anyone can price your savings and your odds. |
| The winner test | A public comparison. The result is visible to everyone the instant it runs. |
| Who won a draw | Public, because the credit that lands in someone's balance is a visible number. |
| The random seed | Either a public number somebody can see coming, or an off-chain number somebody can pick. |
| Prize credits | Public transfers to identified winners. |

What you get is PoolTogether. PoolTogether already exists, it works, and it has been
running for years. There is no reason to rebuild it.

The product Hearth actually sells is the thing PoolTogether cannot offer: prize savings
where your balance, your odds and your wins are yours alone, while the draw stays
checkable by strangers. Those two properties are in tension on a transparent chain.
Encrypted computation is the only thing that resolves them, and Zama's Protocol is the
only place on Ethereum that does it today.

There is no partial version. Every one of the five rows above is a core promise. Remove
the encryption from any one and the product fails at that row.

## The exact pieces we use

Not "built on Zama". Here is the list, with what each one does for us.

### Encrypted integers

`euint64` for money and weights, `euint128` for the pool's total accumulator, `ebool` for
the outcome of a comparison. Every saver's principal, winnings, weight and credit is one
of these. The arithmetic we perform on them is `FHE.add`, `FHE.sub`, `FHE.mul` by a
public number, `FHE.min`, `FHE.gt` and `FHE.select`.

`FHE.select` deserves a note, because it is what makes the whole design possible. It is
an if-statement whose condition is encrypted: it returns one of two encrypted values and
the chain cannot tell which. That is how a winner and a loser produce identical
transactions. Nothing branches on a secret anywhere in Hearth.

`FHE.fromExternal` takes an encrypted value a user built in their browser, with its
proof, and turns it into a value the contract can use. That is how a deposit amount
arrives encrypted from end to end.

### ERC-7984, the confidential token standard

Hearth's asset is Zama's confidential USDC, an ERC-7984 wrapper around ordinary USDC.
Balances in it are encrypted values rather than public numbers.

Deposits arrive through `confidentialTransferAndCall`, which transfers an encrypted
amount and calls the receiver's hook in the same transaction. The vault's hook is handed
the amount the token really moved, which is how the vault credits reality rather than a
request. Payouts go the other way through `confidentialTransfer`.

Using the standard token, rather than writing our own, matters. Several projects in this
field hand-rolled an "ERC-7984-style" token. Ours is the one Zama deployed, so a saver's
confidential USDC is usable outside Hearth and the token's own behaviour is not something
we get to define in our favour.

### Encrypted randomness

`FHE.randEuint64()` generates a random number inside Zama's coprocessor, under the
network's FHE key, from a seed that is public but useless without that key. The number
comes out as ciphertext. Nobody, including us and including whoever sends the
transaction, sees it at the moment it is created.

It has to be generated inside a transaction, because it mutates the on-chain generator
state. That rules out the trick of previewing a draw off-chain with `eth_call` to see
whether you would win, and it is why closing a draw is a real transaction that succeeds
exactly once. Nobody can re-roll a seed they do not like.

### The access control list

Zama's on-chain ACL decides who may decrypt which ciphertext. It is enforcement, not
policy: the relayer refuses a request for a handle the caller is not allowed on.

Hearth uses four calls on it. `FHE.allowThis` keeps a value usable by the contract in
later transactions. `FHE.allow` grants a saver permanent read access to their own
principal, winnings, per-draw weight and per-draw credit. `FHE.allowTransient` grants
access for the length of one transaction, which is how the vault hands the pool a
one-time allowance over an evaluation batch's total without ever giving it standing
access. `FHE.makePubliclyDecryptable` opens a value to everybody, and we use it on
exactly five kinds of value: the seed, the aggregate weight, the harvest, the per-tier
remainders and the unfunded counter.

That last call is one-way and permanent. It is the single most consequential thing a
contract on this protocol can do, so every use of it in Hearth is listed in
[what stays private](../security/what-stays-private.md).

### EIP-712 user decryption

This is how a saver reads their own numbers. They sign a typed structured message,
which is a signature standard that shows the signer exactly what they are approving, and
Zama's relayer returns the plaintext of values that saver is allowed on.

It is an off-chain request. No transaction, no gas, no trace. That is why Hearth can have
no claim function at all: learning that you won costs nothing and leaves nothing behind,
so winners and losers are indistinguishable by their behaviour on chain.

The bounty requires user decryption of both balance and winnings. Hearth also grants the
per-draw weight and per-draw credit, so a saver can verify the draw's arithmetic against
their own inputs rather than being asked to trust it.

### KMS-signed public decryption

The other direction. A contract marks a value publicly decryptable, anyone asks the
relayer for the cleartext, and the relayer returns it with a signature from the key
management service, the group that holds the network's decryption key. The contract then
verifies that signature on chain with `FHE.checkSignatures` before acting on the number.

This is what turns "we say the seed was 12345" into a number the contract itself refuses
to accept without proof. Hearth uses it twice per draw: once for the seed, aggregate and
harvest together at award time, and once for the three tier remainders at reconciliation.
Both proofs are bound to their handles in a fixed order, so nothing can be shuffled or
replayed into a different draw.

## What a saver actually trusts

Naming this is the point of the page.

- **The Zama Protocol** to compute correctly on ciphertexts and to decrypt only what is
  marked decryptable. Every decryption the contracts act on carries a proof verified on
  chain. This is the same trust boundary Zama's own Confidential Vault documents.
- **The confidential USDC wrapper**, which is Zama's contract rather than ours, and which
  is upgradeable by its owner. See the token layer section of
  [what stays private](../security/what-stays-private.md).
- **Hearth's own contracts**, which are immutable once deployed, with no proxy and no
  upgrade path. The owner's remaining powers are narrow and listed in the
  [threat model](../security/threat-model.md): a pause that stops deposits and draw
  closing but never withdrawals or evaluation, a yield-source setter, a rescue path for
  foreign tokens that cannot touch saver balances, and two-step ownership transfer with
  renouncing disabled.

Nothing on that list is a person we ask you to believe.
