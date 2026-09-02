# Demo video script

90 seconds, Ram on camera, normal speed, no cuts that skip a confirmation. The bounty asks
for a real person and will not accept an AI voice or a sped-up recording. Three minutes is
the maximum; 90 seconds is the target, because a judge watching twenty of these rewards the
one that gets to the point.

Six things have to appear on screen, and all six are in the shot list below: a deposit,
decrypting the pool balance, a draw being triggered, claiming a prize, withdrawing
principal, and one sentence on why the selection is fair and confidential.

---

## Before you press record

The pool has to be in this state or the 90 seconds will not fit.

- **The demo pool has at least four other savers**, seeded by the seed script. Below three
  savers the app shows a privacy warning, which is correct behaviour and a bad first frame.
- **Your wallet already deposited in the previous period**, and holds a large share of the
  pool. Odds come from your average balance across a whole period, so the deposit you make
  on camera earns odds for the *current* period, not for the draw you trigger. The prize
  you reveal comes from the earlier deposit. That is the product working, not a fudge.
- **The last finished period has not been closed yet.** Stop the keeper about ten minutes
  before recording, or record in the first minutes of a new period, so the draw panel has
  something to close and the "Advance draw" button is live.
- **The yield source is sponsored** and the tiers hold real prize liquidity, so the draw
  panel shows three prize sizes rather than zeros.
- **You hold spare confidential USDC** already shielded, so the deposit on camera is one
  click and not an approve, a wrap and a deposit.
- **Sepolia ETH in the wallet**, at least 0.05, and the wallet already connected and on the
  right network before the first frame.
- Browser at 100 percent zoom, wallet pop-ups visible, no other tabs, no notifications.

Have the tab open on the app's main screen. Do not start on the landing page.

---

## Shot list

| # | Time | On screen | What you do | What you say |
| --- | --- | --- | --- | --- |
| 1 | 0:00 to 0:10 | You, on camera | Nothing. Talk to the lens | "This is Hearth. It is a savings pool where you cannot lose your money and you might win a prize. Your balance is encrypted on chain. Nobody can see what you saved, and nobody can see what you won." |
| 2 | 0:10 to 0:22 | The app, deposit panel | Type an amount. Click **Deposit**. Confirm in the wallet. Let the confirmation land on screen | "I am depositing confidential USDC. The amount is encrypted in my browser before it is sent, so it goes on chain as a ciphertext. The contract adds it to my balance without ever reading it." |
| 3 | 0:22 to 0:34 | The reveal panel, then the wallet signature prompt | Click **Reveal**. Sign the message. Let the number appear | "To see my own balance I sign a message. That is EIP-712 user decryption. It is not a transaction, it costs nothing, and it leaves nothing behind. Zama's relayer only answers because the contract granted my address, and it refuses anybody else." |
| 4 | 0:34 to 0:50 | The draw panel | Click **Advance draw**. Let the close confirm, then the proof fetch, then the award. Point at the seed and the bracket when they appear | "Now the draw. The random seed is generated inside Zama's coprocessor, so nobody sees it, and it can only be drawn once. Prize sizes were fixed before it existed. Anyone can run this. I am not privileged here." |
| 5 | 0:50 to 1:00 | The draw panel, evaluation progress | Click **Advance evaluation** once. Let the batch confirm | "This step credits the winners. It walks the saver list from a point the seed decides, so I cannot aim it at myself, and pressing it says nothing about whether I won." |
| 6 | 1:00 to 1:12 | Reveal panel showing winnings, then the verify panel | Click **Reveal** again. The winnings appear. Click across to the verify panel showing the recomputed thresholds | "I won. And here is why anybody can check that: the seed and the pool's scale are public, so my threshold is public arithmetic. The only private number is my own balance, and it is the only one that needs to be." |
| 7 | 1:12 to 1:22 | The winnings row | Click **Claim prize**. Confirm in the wallet | "Claiming is an ordinary withdrawal. There is no claim function in the contract at all, so there is no transaction only a winner would send." |
| 8 | 1:22 to 1:30 | Withdraw panel, then the empty balance | Click **Withdraw all**. Confirm. Let the balance go to zero | "And my principal comes back whenever I ask. No lock-up, no loss. That is the whole product. Contracts are verified on Sepolia and the link is below." |

---

## Notes for the edit

- Show every wallet confirmation. A judge scoring correctness wants to see the chain
  agreeing with the app.
- Do not cut the wait on shot 4. The proof fetch takes a few seconds and the app labels it
  honestly. A demo that hides its own latency looks edited.
- If a step fails on the take, keep going and start the take again. Do not speed anything
  up: sped-up video is explicitly disqualified.
- Total spoken words are about 215, which lands near 90 seconds at a normal pace. If you
  are running long, shot 5 is the one to shorten, not shot 6.
- End on the app, not on a slide.
