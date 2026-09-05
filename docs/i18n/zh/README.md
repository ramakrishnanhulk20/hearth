# Hearth 文档

Hearth 是构建在 Zama 协议上的机密无损有奖储蓄。你存入一种机密代币，余额在链上始终保持加密，
资金池赚到的收益按周期开奖发放为奖金，本金随时可以取回。
没有任何人能读到你存了多少、赢了多少，我们自己也不能。

Sepolia 上运行着七个资金池，Zama 在该网络上发布了几种机密代币就对应几个池，每个池有自己的合约和自己的 keeper。
下面大多数页面的示例用 USDC 来讲解，因为那是运行历史最长的池；不过每一页讲的都是全部七个池。

这些页面是完整的书面记录：它如何工作，以及它没有隐藏什么。
仓库根目录的 `ARCHITECTURE.md` 是实现规格说明；这一组文档讲的是同一套设计，
只是写给使用它的人和审计它的人看。

## 页面

| 页面 | 内容 |
| --- | --- |
| [Hearth 是什么](getting-started/what-is-hearth.md) | 一页讲完产品：储户要做的四个动作，以及每个动作究竟隐藏了什么。 |
| [在 Sepolia 上试用](getting-started/try-it-on-sepolia.md) | 选一种代币、领水龙头、封装、存入、开奖、揭示、领奖、提取、解封装。 |
| [资金池与代币](concepts/pools-and-tokens.md) | 七个池和它们的地址，为什么其中六个每六小时开一次奖，各代币的初始注资额，Hearth 拒绝的那种代币，以及每个池的路由。 |
| [一次开奖是怎么进行的](concepts/how-a-draw-works.md) | 周期、两周期窗口与关闭截止时间、开奖的五个步骤，以及金库用什么代替了资金池的总额。 |
| [时间加权余额](concepts/time-weighted-balance.md) | 为什么中奖概率按你在整个周期的平均余额计算，临近截止才存入值多少，以及为什么保存三条观测点就够了。 |
| [中奖判定](concepts/winner-selection.md) | 中奖判定式、PoolTogether 的单奖项规则、针对已公布区间的嵌套阈值，以及一个三位储户的完整算例。 |
| [奖金与档位](concepts/prizes-and-tiers.md) | 收益如何变成奖金流动性、加密结转额与对账节奏、Sepolia 的三个档位、超额派奖，以及我们在哪些地方偏离了 PoolTogether V5。 |
| [收益来源](concepts/yield-source.md) | Sepolia 上的赞助型来源、为什么收割额是经过验证而不是听其自报的，以及 Zama 的机密金库在主网上如何接入。 |
| [为什么必须用 Zama](concepts/why-zama.md) | 删除测试：把全同态加密拿掉，产品就不复存在。我们用到的每一块 Zama 技术，逐项列出。 |
| [什么保持私密](security/what-stays-private.md) | 七条规则：区间以及它替换掉的那个泄漏、余额被锁定的代价、两个方向上的包装接缝、公布的中奖数量测量了什么、代币层、为什么评估不是破绽，以及行为层面的残余风险。 |
| [威胁模型](security/threat-model.md) | 九类攻击者，各自想要什么、什么挡得住、什么挡不住。外加我们上一版设计被实际攻破的记录。 |
| [随机性与可验证性](security/randomness-and-verification.md) | 随机种子从哪来、为什么没人能重摇或改变它的奖金大小，以及任何人如何事后重算一个阈值。 |
| [静态分析](security/static-analysis.md) | slither 与 solhint 的运行结果、五类告警各自背后的那一个原因，以及依赖审计和它至今仍然报出的那两条 axios 告警。 |
| [keeper](operations/keeper.md) | keeper 的工作逐步拆解、执行顺序规则、一池一进程、线上那七个跑在哪、它停机时会发生什么，以及 gas 预算。 |
| [部署](operations/deploying.md) | 每种代币部署一个池、构造函数签名与参数、合约验证，以及两套 Sepolia 参数与一套主网参数的对照。 |
| [已知局限](limitations.md) | 我们知道的每一条局限，编号列成一份共十四项的清单。 |
| [常见问题](faq.md) | 十二个简短回答，从七种代币里你能存哪一种开始，也包括领奖按钮跑哪去了。 |
