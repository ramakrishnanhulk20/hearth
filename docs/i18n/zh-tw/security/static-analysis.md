# 靜態分析

每一份合約在部署前都會跑過 slither 0.11.6 和 solhint，而每一項發現不是被修掉，就是在這裡說明。七個
池是同樣這三份合約的七次部署，所以跑一次就涵蓋全部。這一頁是說明。原始的執行可以重現：

```bash
npm run lint -w @hearth/contracts
```

那是 solhint 的部分，它在 `.solhint.json` 調校過的規則集下零警告通過；至於 slither，則是對同一批
原始碼做一次不帶 FHEVM Hardhat 外掛的單純編譯，因為那個外掛會在編譯時改寫 `ZamaConfig.sol`，之後
slither 就沒辦法把原始碼位移對回磁碟上的檔案。這次單純編譯用的是完全相同的編譯器設定（0.8.27、
optimizer 800 runs、cancun），所以 slither 讀到的位元碼就是實際出貨的位元碼。

## 執行結果

slither 用 102 個偵測器分析了 46 份合約，回報 88 項結果，其中 85 項落在 Hearth 自己的合約裡。沒有一項
是 bug。它們分成五類，而每一類都有一個原因。

| 類別 | 數量 | slither 給的嚴重度 | 為什麼它不算一項發現 |
| --- | --- | --- | --- |
| `unused-return` | 38 | 中 | 其中 36 項是 `FHE.allow`、`FHE.allowThis`、`FHE.allowTransient` 和 `FHE.makePubliclyDecryptable`，它們回傳的是傳進去的那個 handle，好讓呼叫可以串接。忽略那個回傳值，是每一份 Zama 範例都記載的用法。另外兩項在下面。 |
| `reentrancy-no-eth`、`reentrancy-benign`、`reentrancy-events` | 20 | 中與低 | slither 把每一個 `FHE.*` 操作都當成外部呼叫，因為它們每一個都是對協同處理器合約的呼叫。那些呼叫帶的是密文 handle，不是控制權，而且沒有任何使用者合約在它們裡面執行。真正的外部呼叫是代幣和金庫，兩者都在建構時就固定，而每一個會移動價值的函式都是 `nonReentrant`，並在轉帳前先寫入狀態。 |
| `timestamp` 與 `incorrect-equality` | 18 | 低與中 | 期是刻意由 `block.timestamp` 定義的，而那些嚴格相等比較的是期數和零旗標，從來不是餘額。驗證者可以把時間戳挪動幾秒，而面對一小時或六小時的期，那只會讓一位存戶的權重在 3,600 或 21,600 秒中挪動那幾秒。 |
| `uninitialized-local` | 8 | 中 | 那些是刻意從 Solidity 的零預設值開始的累加器和計數器：`offered`、`assigned`、`totalShares`、`processed`、`heavy`、`marked`、`cleared`。`harvestHandle` 在它宣告之後那個 try/catch 的每一條路徑上都會被指派。 |
| `calls-loop` | 1 | 低 | `finalizeDraw` 會向資金池詢問三個層級各自的對帳節奏。這個迴圈上限是三，而那個資金池是金庫自己的，由擁有者設定一次。 |

那兩項不是存取控制呼叫的 `unused-return` 結果：

- `HearthVault._withdraw` 忽略了 `confidentialTransfer` 回傳的 handle。一次 ERC-7984 轉帳要嘛整筆過、
  要嘛完全不過，而金庫在同一筆交易裡已經把金額限制在「存戶持有的」和「金庫持有的」兩者中較小的那個，
  所以依結構而言，轉出的金額就是被要求的金額。帳本在那次呼叫之前就更新了。
- `SponsoredYieldSource.sponsor` 忽略了 `wrap` 的回傳值。贊助者在這裡依定義就是被信任的一方，而資金池
  在截止時記下的，從來不是贊助者自己的數字，而是經 KMS 驗證、來源在收成時實際轉過來的金額。

## slither 看不到的東西

slither 推理的是明文的控制流程。它分辨不出一次加密比較是不是正確的那一次比較、某個存取控制清單的
授權是不是漏了，或者某個不該公布的值是不是被公布了。那些性質由單元測試、公平性與不變量測試，以及
[威脅模型](threat-model.md)裡實際執行過的攻擊腳本涵蓋。

## 相依套件稽核

在儲存庫根目錄跑 `npm audit --omit=dev`，在 2026 年 9 月 6 日回報兩項結果，兩項都在 `axios` 裡，而且都在
應用程式從來不會執行到的程式碼裡：

- 合約套件裡 `hardhat-deploy@0.11.45` 底下的 `axios@0.21.4`。那是部署工具，跑在維運者自己的機器上，
  從來不會被打包出貨。`hardhat-deploy` 0.11 把版本釘在 0.21 這一條線上，所以唯一的修法是把部署工具做一次
  主版本升級，而那會改掉這個儲存庫所依賴的那些部署紀錄。
- `@coinbase/cdp-sdk` 底下的 `axios`，它是 `@wagmi/connectors` 連同 WalletConnect 連接器一起拉進來的。
  Hearth 從來不 import axios，也從來不呼叫 Coinbase 的 SDK；那些公告講的是 Node 裡伺服器端代理處理和請求
  偽造，不是瀏覽器的打包檔。`npm audit fix` 只是把那份巢狀副本挪到另一個一樣有問題的版本，而不是挪出那個
  範圍，所以就維持 lockfile 記下的樣子。

web 套件單獨來看，把那個連接器拿掉之後，稽核是乾淨的，9 月 3 日那個零結果的數字就是這樣來的。
