# Keeper

抽獎不會自己發生。得有東西去送那些交易。這一頁講那個東西做什麼、它停下來會怎樣，以及它要花多少錢。

一支程序驅動一個池。Hearth 在 Sepolia 上跑七個池，所以有七支 keeper 程序在跑，各自用同一組助記詞的
不同帳戶簽名，各自指向一個池的位址檔。底下「一池一支 keeper」那一節就是對照表。

先講最重要的定位：keeper 沒有任何特權。它呼叫的每一個函式任何人都能呼叫，而 keeper 有可能濫用的那
兩根槓桿，也就是選誰被評估和選派獎順序，現在都不再是槓桿了。它是一種替存戶省麻煩的便利設施，不是這個
池在安全上必須倚賴的角色。

## 工作內容，依序，針對第 `p` 期

1. **截止。** 在第 `p` 期結束之後、`closeDeadline(p)`（也就是第 `p+2` 期的中點）之前呼叫
   `closeDraw(p)`。養成在第 `p+1` 期一開始就做的習慣是對的。這會固定每個層級的獎金金額和拿出來的
   資金、把那筆資金移進該期抽獎、抽出加密種子、向金庫索取加密的尺度計數和非空旗標、收成收益來源，
   並把那四個 handle 都標成可公開解密。
2. **取得證明。** 依 `[seed, scaleCount, nonEmpty, harvested]` 的順序，要求 Zama 的中繼器公開解密那
   四個 handle。中繼器會連同金鑰管理服務的簽章一起回傳明文。
3. **開獎。** 呼叫 `awardDraw(p, seed, scaleCount, nonEmpty, harvested, proof)`。合約在鏈上驗證簽章、
   把收成記進各層級，並開出這期抽獎。中獎者就在這一刻決定。
4. **評估。** 在金庫上反覆呼叫 `evaluate(p, count)`，直到巡走繞回起點為止。每一次呼叫都會把一個逐期
   的游標，從種子導出的起點往前推過存戶名單。keeper 挑的是 `count`，永遠不是哪些位址；`4` 是一筆
   交易裡塞得下的、需要加密運算的存戶數上限。在第 `p` 期或之前沒有觀測值的存戶，合約自己會依明文
   時間戳跳過，不花加密運算成本。
5. **定案。** 在視窗於第 `p+2` 期結束時關閉之後，呼叫 `finalizeDraw(p)`。這會把每個層級沒付掉的餘額
   摺進該層級的加密結轉金、公布未撥付計數器，並為每一個到期對帳的層級把結轉金標成可公開解密，發出
   `CarryPublished`。
6. **對帳，逐一處理到期的層級。** 對 `finalizeDraw` 公布過的每一個層級，取得結轉金明文並呼叫
   `reconcile(tier, carry, proof)`。資金池會拿證明對照金庫公布的 handle 檢查、把驗證過的數字記進該
   層級的明文資金，金庫從結轉金裡扣掉它（結轉金自公布以來可能又長大了），然後發出 `TierReconciled`。

在 Sepolia 上，每個池的每個層級每期都到期，所以每次定案之後第 6 步最多跑三次。這個節奏是每個層級各自
的建構子參數，而 keeper 是從鏈上讀它、不是自己假設，所以一個較少公布某層級結轉金的部署，不需要改動
keeper。這一版為什麼每期都公布三個，寫在[獎金與層級](../concepts/prizes-and-tiers.md)。

## 排序規則

**在第 `p+3` 期一開始，先為第 `p` 期定案和對帳，再在同一期裡截止第 `p+2` 期。**

理由是錢，不是正確性。一次截止會依各層級當下的明文資金決定獎金金額，而對帳正是把先前某一期的結轉金
變回明文資金的動作。先對帳，那筆錢立刻算進獎金金額；後對帳，它就得等一期。

這兩件工作會在同一瞬間變得可做。第 `p` 期的視窗在第 `p+2` 期結束時關閉，而第 `p+2` 期在第 `p+3` 期
開始時變得可截止，所以 keeper 先做定案和任何到期的對帳，然後才截止。

順序跑掉不會損失什麼，但往哪個方向跑掉有差。先截止再定案的話，該層級的結轉金還沒進入待處理狀態，
所以 `openDraw` 會把它摺進拿出來的金額，那筆錢照樣贏得到；只是它不會抬高公布的獎金金額，因為
`closeDraw` 只依明文資金決定那個數字。若是先定案、再截止、最後才對帳，結轉金就處於待處理狀態：
`openDraw` 會把待處理的結轉金完全排除在該期抽獎之外，所以在對帳清掉那個旗標之前，那筆錢既沒被拿出來
也贏不到。在 Sepolia 上每個層級在每次定案時都到期，所以這是常態，也是 keeper 為何要在定案之後重新
讀一次結轉金並先對帳、再截止的原因。不管哪一種都不會損失什麼：對帳之後的第一次截止，會把它全部摺
回去。

## keeper 停擺時會怎樣

什麼都不會損失。這就是完整的答案，而它之所以成立，是因為漏掉的步驟是這樣處理的：

| 漏掉的步驟 | 後果 |
| --- | --- |
| 截止從未發生，或發生在 `closeDeadline` 之後而失敗 | 該期維持 `None` 並被略過。它的資金從未被移動，所以留在層級裡，下一期再拿出來。收成由下一次截止收走。 |
| 開獎沒在視窗內發生 | 遲到的開獎照樣把收成入帳、照樣把拿出來的資金退回層級，並把該期標為 `Skipped`。沒有任何收益或資金消失。 |
| 巡走沒走到每一位存戶 | 巡走漏掉的存戶在該期什麼也拿不到。他們那份拿出來的金額在定案時摺進該層級的結轉金，之後再被拿出來。這是唯一一種真實存戶會失去他可能中到的東西的情況，也就是限制 2。 |
| 定案或對帳遲到 | 各層級有一段時間持有較少的明文資金，所以獎金金額比較小。一筆已被定案公布、但還沒被對帳清掉的結轉金，會在每一次截止時被排除在外，直到對帳落地。什麼都不會損失：對帳之後的第一次截止會把它全部摺回去。 |

停擺的 keeper 讓池子損失的是抽獎次數，不是錢。存入和提領全程照常運作，因為暫停路徑從不碰它們，而
一期卡住的抽獎不會鎖住任何東西。

我們上一版部署就是那個警世例子：`openDraw` 是無需許可的，卻沒有人去呼叫，所以線上那個池抱著一期
可開的抽獎放了 26 小時。無需許可不等於自動化。這就是為什麼這一版設計有一支真正的 keeper，底下還有
一條備援路徑。

## 存戶怎麼自己推進一期抽獎

上面每一步都無需許可，而 App 把它們每一個都放在「跑一次抽獎」畫面上，網址是所在池的
`/app/<slug>/run`，也就是側邊欄標著「任何人」的那一列。最上面一張卡片會寫出資金池正在等的那一步，
底下五個各有自己的按鈕，還沒輪到那一步時會關閉並寫明原因：

- **截止**，然後**開獎**。截止會固定獎金金額並抽出加密種子。開獎會在瀏覽器裡取得那四份解密證明，
  再把簽好的明文送回去。那個中繼器呼叫跟 keeper 做的是同一個，而 SDK 直接在頁面上完成它。
- **推進。** 對目前開著的那一期跑 `evaluate(p, count)`，把那條共用的巡走推進一批。同一個呼叫也出現在
  「我的抽獎」上你自己那張卡片，寫作「推進抽獎」。如果 keeper 掛了、而巡走還沒走到你，就是按這一顆。
  它不讓你挑自己，而那正是它的優點：因為沒有人能把自己單獨挑出來，送出這筆交易完全說明不了你有沒有
  中獎。
- **定案**和**對帳。** 對任何視窗已經結束的一期，跑那兩個收尾步驟。

這些都不需要我們的許可、我們的金鑰，也不需要我們的伺服器活著。

## Chainlink Automation，只用在截止那一步

`HearthPrizePool` 為截止那一步實作了 Chainlink 的 `checkUpkeep` 和 `performUpkeep` 介面。註冊一個
時間型的 upkeep，可以給資金池第二條獨立的路徑，讓抽獎照排程被截止，而截止正是那個有期限的步驟，所以
它是值得投保的那一步。

它只涵蓋截止，別的都不涵蓋，理由很簡單：截止是唯一不需要鏈下資料的步驟。開獎需要從 Zama 的中繼器
取回一份解密證明。評估需要反覆跑到游標繞回為止。對帳需要另一次解密。一個鏈上的自動化網路取不到那些
東西，假裝它取得到只是演戲。

那個 upkeep 是選配的。它需要在一個註冊過的 upkeep 帳戶裡放 LINK，而且它是備援而不是主要路徑，而且會是
一池一個 upkeep，各照該池自己的排程。七個池目前一個都還沒註冊，所以示範池全靠 keeper 在跑。

我們在本地宣告那兩個函式的介面，而不是為了兩個選擇器就把整包 Chainlink 合約和它的相依套件加進來。

## 預算

每期抽獎的成本，取自線上部署。

| 步驟 | 每期交易數 | 各自的 gas |
| --- | --- | --- |
| 截止 | 1 | `1,422,474` |
| 開獎 | 1 | `435,578` |
| 評估，滿的一批 4 位 | `floor(savers / 4)`，這裡是 1 | `3,417,699` |
| 評估，最後不滿的一批 | 0 或 1，這裡是 1，帶著一位存戶 | 一位存戶 `1,291,192`，每多一位再加 `708,836` |
| 定案 | 1 | `509,463` |
| 對帳 | 3，每個層級一次，因為每個層級每期都到期 | `459,994` |

在 5 位存戶的情況下，那是每期 `8,456,388` gas，以部署當時 Sepolia 的基本費用 1 gwei 計，約
`0.0085 ETH`。一小時一期的話一天 24 期，每天 `0.2030 ETH`；一天一期的話就是 `0.0085 ETH`。

把它乘上七個池，就是六個池為何每六小時、而不是每小時抽一次的全部原因。七個池全都每小時抽，一天是
168 期，約 `1.43 ETH`，公開水龍頭跟不上。一個每小時的池加六個六小時的池，一天是 48 期，約
`0.41 ETH`。每個 keeper 帳戶分開加值，所以某個池 gas 用完，只會停掉它自己的抽獎。

在 Sepolia 上，一批裡多一位存戶要花 `708,836` gas，而只帶一位存戶的一批要花 `1,291,192`，因為呼叫
的固定成本兩種情況都要付。以運算單位計，一位存戶在模擬協同處理器的價目表上是 `3,674,128`，那也是
唯一讀得到這個數字的地方，因為線上的收據不會回報運算單位。批次大小 `4` 就是依這個量測，對照 Zama
公布的 Sepolia 上限（每筆交易 20,000,000 個運算單位，其中循序深度 5,000,000）定出來的。`evaluate`
接受任何數量，所以如果 Zama 調整某個操作的計價，keeper 不必重新部署就能改用比較小的批次。

**keeper 會評估完整條巡走。** 鏈上沒有任何東西限制評估的總花費，keeper 也不會做到一半就停；它強制
的是一道費用上限（`KEEPER_MAX_FEE_GWEI`），在上限以下它會一直送到游標走到終點。誠實的後果寫在
[威脅模型](../security/threat-model.md)：一個被無用位址灌大的池，讓 keeper 每期多花 gas，而不是讓
存戶損失獎金，因為在該期之前沒有觀測值的位址會被跳過，不做任何加密運算。如果 keeper 掛了，任何人都
能按「推進」，而因為巡走每期的起點都不同，沒有人會永遠待在最後面。

## 一池一支 keeper

一支程序由
`HEARTH_ADDRESSES_FILE` 告訴它自己驅動哪個池，也就是該池部署時寫出的那個位址檔，而那個檔案同時給了
它代幣符號、小數位數，以及要用哪個帳戶索引簽名。`KEEPER_NAME` 是每一行日誌都會帶的標籤。
`packages/keeper/ecosystem.config.cjs` 在一台機器上用 pm2 啟動全部七支，各一支程序。

| pm2 程序 | `HEARTH_ADDRESSES_FILE` | `KEEPER_ACCOUNT_INDEX` |
| --- | --- | --- |
| `hearth-keeper-usdc` | `hearth.json` | 1 |
| `hearth-keeper-usdt` | `hearth.usdt.json` | 10 |
| `hearth-keeper-weth` | `hearth.weth.json` | 11 |
| `hearth-keeper-bron` | `hearth.bron.json` | 12 |
| `hearth-keeper-zama` | `hearth.zama.json` | 13 |
| `hearth-keeper-tgbp` | `hearth.tgbp.json` | 14 |
| `hearth-keeper-xaut` | `hearth.xaut.json` | 15 |

`usdc` 那支程序指向 `hearth.json` 而不是 `hearth.usdc.json`，因為那是第一次部署寫出的檔案，當時池還
沒有代號，而跑著的那支 keeper 已經指著它好幾天了。兩個檔案帶的是同一組位址。

那些索引刻意排得比較開，這樣之後要加池不必重新編號，而且每個帳戶都需要自己的 Sepolia ETH。索引 0 是
部署者，keeper 會拒絕它。

## 線上那七支跑在哪

在一台筆電上用 pm2 跑全部七支是一種做法，到今天也還跑得動。但那不是線上的那一種。線上的七支 Sepolia
keeper 全都跑在 Railway 上，一池一個服務，所以闔上筆電不會停掉任何一期抽獎。

keeper 是一支長時間執行的程序，而不是一個排程函式：一輪執行可能要在金鑰管理服務上等兩分鐘，比多數
serverless 平台允許的時間還長。任何能讓一支 Node 程序一直活著的託管平台都可以，而程式庫裡帶著這一家
的設定：

- 程式庫根目錄的 `railway.json` 驅動 `usdc` 池。
- `railway/hearth-keeper-<slug>.json` 各驅動其餘六個池的其中一個。每一條啟動指令都在行內設好該池的
  `KEEPER_NAME`、`KEEPER_ACCOUNT_INDEX` 和 `HEARTH_ADDRESSES_FILE`，所以用其中一份建出來的服務，只
  還需要 `RECOVERY_PHRASE` 和 `SEPOLIA_RPC_URL`。

在任何託管平台上，建置都是 `npm run build -w @hearth/keeper`，啟動都是
`node packages/keeper/dist/src/index.js`。keeper 需要的那幾份合約 ABI 已經提交在 `packages/keeper/abi`
底下，所以一台從不編譯合約的機器也跑得動它；而且開機檢查會把載入的 ABI 和 keeper 會呼叫的那些函式
對過一遍，讓不一致在啟動時就被報出來，而不是等到第一筆交易。位址檔基於同樣的理由也必須提交，而它們
確實提交了，在 `packages/contracts/deployments/sepolia/` 底下。

不管跑在哪，每個池都只跑一支程序。兩支 keeper 用同一個帳戶簽名，會為了同一個 nonce 互相搶，所以要為
同一個池啟動託管的那一支之前，先把本地那一支停掉。一個服務一個服務的分步設定，寫在 keeper 套件自己
的 README，也就是 `packages/keeper/README.md`。

## 怎麼跑它

keeper 就是 `@hearth/keeper` 套件。它用部署所用的同一組 `RECOVERY_PHRASE` 的其中一個帳戶簽名，並從
`packages/contracts/.env` 讀 `SEPOLIA_RPC_URL`；它自己的設定放在 `packages/keeper/.env`：

```
HEARTH_ADDRESSES_FILE=../contracts/deployments/sepolia/hearth.weth.json
KEEPER_ACCOUNT_INDEX=11            # defaults to the index in the address file
KEEPER_NAME=weth                   # defaults to the slug in the address file
KEEPER_BATCH=4                     # savers of encrypted work per evaluate call
KEEPER_POLL_SECONDS=30
KEEPER_MAX_FEE_GWEI=20             # refuse to send above this
```

```
npm run compile -w @hearth/contracts    # the keeper reads the compiled ABI
npm run build -w @hearth/keeper
npm run plan -w @hearth/keeper          # one pass, simulates every call, sends nothing
npm run once -w @hearth/keeper          # one live pass
pm2 start packages/keeper/ecosystem.config.cjs   # all seven
pm2 logs hearth-keeper-weth                      # one pool
```

`plan` 和 `once` 驅動的是 `HEARTH_ADDRESSES_FILE` 指到的那個池，所以要檢查另一個池，只要在指令前面
換一個變數。如果 `packages/keeper/.env` 裡還留著單池設定時期的 `HEARTH_VAULT` 和 `HEARTH_POOL`，
請把它們拿掉：它們會比位址檔更早被讀到，那樣七支程序會全部去驅動同一個池。

一輪執行每一項事實印一行，而每一行都標著該程序驅動的池，所以七份交錯的日誌仍然讀得懂。金額帶著該池
自己的符號和自己的小數位數，兩者都從位址檔讀出：

```
09:14:37 [usdc] closed draw 41 (gas 1,422,474)
09:14:39 [usdc] draw 41: asking the relayer for the seed, the scale, the empty flag and the harvest
09:14:53 [usdc] awarded draw 41: 3 tiers, prizes 12.40 / 2.10 / 0.40 cUSDC, harvest 3.60 cUSDC (gas 435,578)
09:15:07 [usdc] evaluated draw 41: 4 of 9 savers done (gas 3,417,699)
09:15:38 [usdc] nothing to do: period 43, draw 41 has 8 of 9 savers evaluated
```

WETH 那支程序印出同樣的行，只是標著 `[weth]`，單位是 `cWETH`。每一種行各自代表什麼，逐行說明放在
keeper 套件自己的 README，也就是 `packages/keeper/README.md`。

keeper 在每一輪之間是無狀態的：它從鏈上讀抽獎狀態、評估游標和對帳節奏，然後算出該做什麼。重啟它
不會損失任何東西。每個池只跑一個實例，而且絕不要在同一個帳戶上跑兩支：在鏈上，每一步每期每個層級
都只會成功一次，兩次 evaluate 呼叫也只是把同一個游標往前推，但同一個帳戶上的兩支 keeper 會互相搶
交易的 nonce。

## 這一頁沒有講到的

它沒有講 keeper 的那些交易究竟對錢做了什麼，那是[一次抽獎是怎麼跑的](../concepts/how-a-draw-works.md)。
它沒有講部署，那是[部署](deploying.md)。而且它不做任何可用性承諾：我們跑一支 keeper，但我們不保證它，
而這個設計本來就是為了「不保證它也沒關係」而建的。
