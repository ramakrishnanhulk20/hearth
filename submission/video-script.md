# Demo video script

Ram on camera, normal speed. The bounty rejects an AI voice and a sped-up recording, so the
whole thing is shot at real speed with real waits. Three minutes is the hard cap. The target
is about two minutes forty of runtime carrying roughly 90 seconds of speech, which leaves
headroom if a transaction is slow on the day.

Five things have to appear on screen, because the bounty form names them: depositing into the
pool, decrypting your own pool balance, a draw being triggered, claiming a prize, and
withdrawing principal. Plus one short explanation of why winner selection stays fair and
confidential. All six are in the shot list.

Host it on X if you can, since the form prefers that. YouTube or Loom otherwise. Nothing else
is accepted.

---

## Before you press record

The pool has to be in this state or the shot list will not fit.

- **You are one of the larger savers.** The seeded wallets hold 1,200, 600, 300, 150 and 75
  USDC. Record from one of the top two. Odds are proportional to weight, and shot 6 needs a
  prize on screen.
- **You already have a prize waiting.** Open `/app`, press **Reveal** in "What you hold" and
  look at "Unclaimed winnings", or open the newest awarded card in "Your draws", press
  **Reveal my result** and check the number is above zero. The **Claim** button only exists
  when the credit is above zero, so if it is zero, wait for the next draw and check again.
  The frequent tier offers up to four prizes a draw across five savers, so this rarely takes
  long.
- **A draw is waiting to be closed.** Stop the keeper about half an hour before recording, or
  record just after a period boundary. A draw stays closable for an hour and a half after its
  period ends, so there is room. If the "Run the draw" panel says nothing is waiting, there is
  no draw to trigger on camera.
- **The tiers hold prize money**, so the pool panel shows three prize sizes rather than zeros.
  The sponsor drips about 20 USDC an hour into the pool.
- **You hold spare confidential USDC already wrapped**, so the deposit on camera is one click
  rather than an approve, a wrap and a deposit.
- **At least 0.05 Sepolia ETH**, wallet connected, already on Sepolia, before the first frame.
- Run `npm run prove:sepolia -w @hearth/contracts` about five minutes before you need shot 10,
  in a terminal you can bring to the front. It takes a little over four minutes, almost all of
  it waiting on Zama's relayer, and it puts money in and takes it back out, so it leaves the
  pool as it found it.
- Browser at 100 percent zoom, wallet pop-ups visible, no other tabs, no notifications.

Start on camera. Have `/` already scrolled to the last screen in one tab and `/app` open in
another.

---

## Shot list

| # | Time | Screen | What you click | What you say |
| --- | --- | --- | --- | --- |
| 1 | 0:00 to 0:15 | You, on camera | Nothing. Talk to the lens | "PoolTogether is a good product that publishes everything: every balance, every wallet's odds, every winner. I built Hearth: no-loss prize savings on Zama's protocol, with every balance encrypted on chain." |
| 2 | 0:15 to 0:32 | `/`, the last screen of the landing story, the card titled "A saver's balance" | Click **Try to open it**. Let the refusal land and stay on it for a beat | "That is a real saver's balance. I am asking Zama's key management service to open it. It refuses. That refusal came from the network, not from my page." |
| 3 | 0:32 to 0:50 | `/app`, panel 1, "Deposit" | Type an amount in the deposit field. Click **Deposit**. Confirm in the wallet | "Wrapping is public. Depositing is not. That is why they are two buttons. The amount is encrypted in my browser and the contract never reads it." |
| 4 | 0:50 to 1:05 | `/app`, panel 2, "What you hold" | Click **Reveal**. Sign the message. Let the principal and winnings appear | "To read my own balance I sign a message. No gas, no transaction. The relayer answers me and nobody else." |
| 5 | 1:05 to 1:32 | `/app`, right column, "Run the draw" | Click **Close**, confirm, then click **Award** on the same panel and confirm. Stay on the "asking Zama's key management service for the seed" line while it works | "Now the draw. Closing fixes the prize sizes and draws a seed inside the coprocessor. Awarding hands back the signed seed, and the contract checks that signature on chain." |
| 6 | 1:32 to 1:55 | `/app`, panel 3, "Your draws", the newest awarded card | Click **Advance the draw** and confirm. Once the walk reaches you, click **Reveal my result**, then click the claim button, which carries your own amount and reads **Claim 1.00 USDC** or whatever you won, and confirm | "This walks the saver list from a point the seed picked, so I cannot aim it at myself. There is my result. Claiming is an ordinary withdrawal. No transaction names a winner." |
| 7 | 1:55 to 2:05 | `/lab`, the draw ceremony | Click the newest **Draw** chip, then **Open the seal**. Let the seed, the bracket and the thresholds fall in | "The seed and the bracket are public. Anyone can recompute the threshold any address had to beat." |
| 8 | 2:05 to 2:11 | `/verify` | Paste any saver's address into "Thresholds for an address". Let the numbers render | "Same numbers here, with no wallet at all." |
| 9 | 2:11 to 2:23 | `/app`, panel 4, "Withdraw" | Click **All of it**. Confirm. Let the balance seal itself again | "My principal comes back whenever I ask, in full." |
| 10 | 2:23 to 2:36 | The terminal, on the finished output of the prove-it command | Scroll to the last lines, where step 9 says the wallet grew by exactly what went in | "One command proves the whole thing against the live network. Deposit, decrypt, a stranger refused, withdraw to the unit. Contracts verified on Sepolia." |
| 11 | 2:36 to 2:40 | You, on camera | Nothing | "Anyone can run it. The link is below." |

---

## The waits, and how to handle them

Every one of these is honest latency. Do not speed any of it up and do not hide it. A cut is
allowed while something is spinning; a cut that removes a wallet confirmation is not.

- **Reveal takes a few seconds.** It signs, then decrypts in the browser. The panel says which
  it is doing.
- **A retry can add half a minute.** One of Zama's key management parties sometimes serves a
  share the others disagree with. The app says "a KMS share failed, retrying with a new key"
  and asks again under a fresh key. That line is worth keeping in the take: it is the product
  handling a real fault in public. If it drags past about 40 seconds, cut to the moment the
  number lands rather than restarting.
- **Awarding fetches four cleartexts before it sends anything.** Expect "asking Zama's key
  management service for the seed" on screen for several seconds, and occasionally "the seed
  is published but not decryptable yet, asking again".
- **A period is one hour.** Shots 5, 6 and 7 only exist when a real draw is there to close and
  a real awarded draw is there to open. Record those three when a draw actually lands, and if
  the keeper closed it first, use the next one.
- **The prove-it command takes a little over four minutes.** Start it before the take. Shot 10
  films the finished output, not the run.

---

## Notes for the edit

- Show every wallet confirmation. A judge scoring correctness wants to see the chain agreeing
  with the app.
- Spoken text is 230 words, which lands near 90 seconds at a normal pace. If the runtime is
  over 2:50, drop shot 8 and shorten shot 11 to "Anyone can run it." Do not cut shot 2 or shot
  6: the refusal and the claim are the two things nothing else in the field can show.
- If a step fails on the take, keep going and start the take again. Never speed anything up.
  A sped-up video is explicitly not considered.
- The project name on the form is Hearth. It must not contain the word Zama.
- End on camera, not on a slide.
