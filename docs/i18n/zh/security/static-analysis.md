# 静态分析

每个合约在部署之前都会跑一遍 slither 0.11.6 和 solhint，而每一条告警要么被修掉，要么在这里被解释。
七个池是这同样三个合约的七次部署，所以跑一次就覆盖了全部。本页就是那份解释。原始运行是可复现的：

```bash
npm run lint -w @hearth/contracts
```

这条是 solhint，它在 `.solhint.json` 里调好的规则集上零告警通过；
而 slither 用的是同一批源码在不带 FHEVM Hardhat 插件情况下的一次普通编译，
因为那个插件会在编译时重写 `ZamaConfig.sol`，之后 slither 就没法把源码偏移映射回磁盘上的文件了。
这次普通编译用的是完全相同的编译器设置（0.8.27，优化器 800 轮，cancun），
所以 slither 读到的字节码就是实际上线的字节码。

## 运行结果

slither 用 102 个检测器分析了 46 个合约，报出 88 条结果，其中 85 条在 Hearth 自己的合约里。
没有一条是 bug。它们归为五类，每一类有一个原因。

| 类别 | 数量 | slither 给出的严重度 | 为什么它不算问题 |
| --- | --- | --- | --- |
| `unused-return` | 38 | 中 | 其中 36 条是 `FHE.allow`、`FHE.allowThis`、`FHE.allowTransient` 和 `FHE.makePubliclyDecryptable`，它们返回传给自己的那个句柄，好让调用可以串起来。忽略那个返回值是每一份 Zama 示例里都有的标准用法。另外两条在下面。 |
| `reentrancy-no-eth`、`reentrancy-benign`、`reentrancy-events` | 20 | 中和低 | slither 把每一个 `FHE.*` 操作都当作外部调用，因为它们每一个都是对协处理器合约的一次调用。那些调用携带的是密文句柄，不是控制流，而且没有用户合约会在它们内部运行。真正的外部调用是代币和金库，两者都在构造时固定，而且每一个移动价值的函数都是 `nonReentrant` 并且在转账之前写入自己的状态。 |
| `timestamp` 和 `incorrect-equality` | 18 | 低和中 | 周期就是有意用 `block.timestamp` 定义的，而那些严格相等比较的是周期号和零标志，从来不是余额。一个验证者可以把时间戳挪动几秒，而周期是一小时或六小时，这会把一位储户的权重挪动 3,600 或 21,600 秒里的那么几秒。 |
| `uninitialized-local` | 8 | 中 | 那些累加器和计数器就是有意从 Solidity 的零默认值开始的：`offered`、`assigned`、`totalShares`、`processed`、`heavy`、`marked`、`cleared`。而 `harvestHandle` 在它声明之后那个 try/catch 的每一条路径上都被赋了值。 |
| `calls-loop` | 1 | 低 | `finalizeDraw` 向资金池询问三个档位各自的对账节奏。这个循环上界是三，而那个资金池是金库自己的，由拥有者设定一次。 |

那两条不属于访问控制调用的 `unused-return` 结果：

- `HearthVault._withdraw` 忽略了 `confidentialTransfer` 返回的句柄。一次 ERC-7984 转账
  要么整笔转走要么一分不动，而金库在同一笔交易里已经把金额限制为
  「储户持有的」和「金库持有的」中较小的那个，所以转出金额按构造就等于请求金额。
  账本在那次调用之前就更新了。
- `SponsoredYieldSource.sponsor` 忽略了 `wrap` 的返回值。赞助方在这里按定义就是可信的一方，
  而资金池在一次关闭时记入的从来不是赞助方自己给的数字，
  而是经 KMS 验证的、来源方在收割时实际转出的金额。

## slither 看不到什么

slither 推理的是明文控制流。它没法判断一次加密比较是不是正确的比较、
一次访问控制列表授权是不是漏了，或者某个不该公布的值是不是被公布了。
那些性质由单元测试、公平性与不变式测试，以及[威胁模型](threat-model.md)里那些已执行的攻击脚本覆盖。
