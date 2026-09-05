# Hearth 說明文件

Hearth 是建立在 Zama Protocol 上的機密型「不賠本抽獎儲蓄」。你存入一種機密代幣，餘額在鏈上
保持加密狀態，資金池賺到的收益會在定期抽獎中當成獎金發出去，而你的本金隨時可以全額領回。
包括我們在內，沒有任何人讀得到你存了多少、又贏了多少。

Sepolia 上共有七個資金池，Zama 在該網路發行的每一種機密代幣各有一個，每個池都有自己的合約和
自己的 keeper。底下多數頁面的實例都以 USDC 說明，因為那是歷史最久的池；不過每一頁講的都是全部
七個池。

這些頁面是完整的書面紀錄：它怎麼運作，以及它沒有隱藏什麼。程式庫根目錄的 `ARCHITECTURE.md`
是實作規格書；這份文件樹則是同一套設計，寫給使用它的人和稽核它的人看。

## 頁面

| 頁面 | 內容 |
| --- | --- |
| [Hearth 是什麼](getting-started/what-is-hearth.md) | 一頁講完這個產品：存戶會做的四個動作，以及每個動作各自藏住了什麼。 |
| [在 Sepolia 上試玩](getting-started/try-it-on-sepolia.md) | 從七種代幣裡挑一種，領水龍頭、遮蔽、存入、一次抽獎、揭露、領獎、提領、解除遮蔽。 |
| [資金池與代幣](concepts/pools-and-tokens.md) | 七個池和它們的位址、其中六個為何每六小時抽一次、各代幣的預設示範存款、Hearth 拒收的那一種代幣，以及各池的路由。 |
| [一次抽獎是怎麼跑的](concepts/how-a-draw-works.md) | 期、兩期的視窗與截止期限、抽獎的五個步驟，以及金庫用什麼取代了資金池總額的公布。 |
| [時間加權餘額](concepts/time-weighted-balance.md) | 中獎機率為何看你在該期的平均餘額、太晚存入值多少，以及為何存三筆觀測值就夠了。 |
| [中獎判定](concepts/winner-selection.md) | 中獎判定式、PoolTogether 的逐獎規則、對照公開級距的巢狀門檻，以及三名存戶的實例。 |
| [獎金與層級](concepts/prizes-and-tiers.md) | 收益如何變成獎金資金、加密結轉金與對帳節奏、Sepolia 上的三個層級、超額中獎，以及我們在哪些地方偏離了 PoolTogether V5。 |
| [收益來源](concepts/yield-source.md) | Sepolia 上的贊助式來源、收成為何要驗證而不是聽報告，以及主網上 Zama 機密金庫怎麼接進來。 |
| [為什麼是 Zama](concepts/why-zama.md) | 刪除測試：把全同態加密拿掉，這個產品就不存在。我們用到的每一塊 Zama 技術，一一點名。 |
| [什麼保持私密](security/what-stays-private.md) | 七條規則：級距與它取代掉的那個外洩、餘額被鎖定的代價、包裝接縫的兩個方向、獎項數量究竟量到了什麼、代幣層、為何評估動作不會洩底，以及行為上的殘留線索。 |
| [威脅模型](security/threat-model.md) | 九種攻擊者、各自想要什麼、什麼擋得住他們、什麼擋不住。另附我們上一版設計被實際打穿的紀錄。 |
| [隨機性與驗證](security/randomness-and-verification.md) | 種子從哪裡來、為何沒人能重擲或改動它能贏到的金額，以及任何人事後如何重算門檻。 |
| [靜態分析](security/static-analysis.md) | slither 與 solhint 的執行結果、五類發現各自背後的那一個原因，以及相依套件稽核和它至今仍會報出的那兩條 axios 發現。 |
| [Keeper](operations/keeper.md) | keeper 的工作逐步拆解、排序規則、一池一支程序、線上那七支跑在哪、它掛掉會怎樣，以及 gas 預算。 |
| [部署](operations/deploying.md) | 每種代幣部署一個池、建構子簽章與參數、驗證，以及兩組 Sepolia 參數對照一組主網參數。 |
| [限制](limitations.md) | 十四項限制，全部列在一份編號清單裡。 |
| [常見問題](faq.md) | 十二則簡答，從七種代幣裡你能存哪一種開始，也包括領獎按鈕跑到哪去了。 |
