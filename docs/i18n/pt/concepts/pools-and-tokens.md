# Pools e tokens

O Hearth não é um pool. São sete, um para cada token confidencial da lista de endereços da
Zama na Sepolia, e cada um tem o seu próprio `HearthVault`, o seu próprio `HearthPrizePool` e
a sua própria `SponsoredYieldSource`, com seus próprios poupadores, seu próprio dinheiro de
prêmio e seu próprio keeper.

Os contratos são o mesmo código, implantado sete vezes com argumentos de construtor
diferentes. Nada é compartilhado na blockchain: nenhum registro, nenhum roteador, nenhum
saldo comum. Um poupador do pool de WETH não pode ver, tocar nem ser tocado pelo pool de
USDC, e um cofre pausado ou um keeper travado em um token deixa os outros seis rodando.

## Os sete pools

| Token | Slug | Sorteia a cada | Cofre | Pool de prêmios | Fonte de rendimento |
| --- | --- | --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 hora | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` |
| Confidential USDT (Mock) | `usdt` | 6 horas | `0xe54F44dE64F8A7abc0647eaae547dD59ce0EFfac` | `0x6a83Beb2Dc3f258107Cad5e17BC57657fAd4fbd1` | `0x5bb1Cd5380Cb9f2B15569030fF0dB7a445cF54cA` |
| Confidential WETH (Mock) | `weth` | 6 horas | `0x3D1A182782B68fE270A66294C9adaC7F005c4f14` | `0x1a11e7C689F244fA8Dd5f4abA8F2F3131090cc1C` | `0x40DF298f15c6136294eC651aD7b0c1C6F221DE8F` |
| Confidential BRON (Mock) | `bron` | 6 horas | `0x18086DC8271f8A73c5Ea985fd519527Dbb991279` | `0x2Ed982979CD184494B947a1E38E597494a38ACe4` | `0x0cD1155D752bD81b3a437a6f0B3965CAA2A1C8e9` |
| Confidential ZAMA (Mock) | `zama` | 6 horas | `0xEEC26386F273c6678cA538AcA18e1d9384eA9F09` | `0x873B285404199D46325a294Aa0EC7a79C30A7fF7` | `0xdD352D70311E834ab75307f53d5C276060081d23` |
| Confidential tGBP (Mock) | `tgbp` | 6 horas | `0xCe95dAa01f5354aA8887A5952E403D26d452c323` | `0xC531D54ee2c695e0eBfe8b8258e9Fd80fd507095` | `0xDEa2BD6351072F735B6ea83c357bF157d83c01af` |
| Confidential XAUt (Mock) | `xaut` | 6 horas | `0x77f701101d66FbD522A3bFdC2c00DB09a4F57daE` | `0x9a2888aca42c707A3BC0D561FdF6ff8Abfda5201` | `0x03fDdAA7C4323C53CE511CC49D4c33B26B492af7` |

Todo contrato acima está verificado no Etherscan. O par de tokens que cada pool guarda é da
Zama, não nosso, e está listado em
[experimente na Sepolia](../getting-started/try-it-on-sepolia.md).

O pool de USDC foi implantado primeiro, em 2 de setembro de 2026 no bloco `11622398`, e faz
sorteios de hora em hora desde então, e é por isso que ele é o pool com histórico e o pool
contra o qual o transcrito de prova do README foi gravado. Os outros seis foram implantados
em 5 de setembro de 2026, nos blocos `11641314` a `11641523`.

## Por que seis horas, e não uma hora para os sete

Gás. Um sorteio em um pool de cinco poupadores custa `8,456,388` de gás, medido em recibos ao
vivo na Sepolia: um fechamento, uma premiação, dois lotes de avaliação, uma finalização e uma
reconciliação por nível. A 1 gwei isso dá `0.0085 ETH`. Sete pools sorteando de hora em hora
seriam 168 sorteios por dia, cerca de `1.43 ETH`, que não dá para manter financiado com
faucets públicos ao longo de uma janela de avaliação. Um pool de dez poupadores custa
`12,582,923` de gás por sorteio e a conta cresce junto.

Então os seis pools implantados depois sorteiam a cada seis horas. São quatro sorteios por
dia cada um, então os sete pools juntos custam cerca de `0.41 ETH` por dia em vez de `1.43`,
e quatro sorteios por dia ainda é frequente o bastante para um visitante ver um acontecer
dentro de uma única visita. O pool de USDC mantém o relógio de hora em hora e os sorteios de
histórico que vieram com ele.

As chances são definidas contra o período de cada pool em vez de serem transportadas, então a
sensação do produto é a mesma nos dois relógios:

| Nível | Pool de uma hora (`usdc`) | Pools de seis horas |
| --- | --- | --- |
| Grande | quantidade 1, chance 1 em 24, cotas 40 | quantidade 1, chance 1 em 4, cotas 40 |
| Médio | quantidade 1, chance 1 em 6, cotas 20 | quantidade 1, chance 1 em 2, cotas 20 |
| Frequente | quantidade 4, chance 1 em 1, cotas 40 | quantidade 4, chance 1 em 1, cotas 40 |

O prêmio grande, portanto, paga cerca de uma vez por dia em todos os pools. O nível médio é o
único lugar onde os dois relógios diferem: cerca de quatro vezes por dia no pool de uma hora
e cerca de duas vezes por dia nos de seis horas, porque cortar a chance pela metade não
compensa por completo ter um sexto dos sorteios. Todo nível de todo pool reconcilia a cada
sorteio, pelo motivo em [prêmios e níveis](prizes-and-tiers.md).

## Casas decimais, e o que um valor significa

Todo wrapper confidencial da lista de endereços da Zama na Sepolia lê seis casas decimais,
seja qual for a leitura do token público por baixo, porque o wrapper se limita a seis e joga
a diferença no `rate()` dele. O Confidential WETH é o caso mais claro: o subjacente dele tem
18 casas decimais, então o `rate()` do wrapper é um milhão de milhões, e uma unidade base do
wrapper é um milhão de milhões de unidades base do token público.

Todo valor em `packages/contracts/hearth.config.ts` está em unidades base do wrapper, e a
implantação e as tarefas multiplicam pela taxa que leem na blockchain antes de tocar no token
público. Isso não é um detalhe. Nossa própria auditoria achou um bug em que um pool
contabilizava o valor que quem chamou passou em vez do valor que o wrapper cunhou, o que em
um token de 18 casas decimais inflava o dinheiro de prêmio por um fator de um milhão de
milhões. Veja
[fonte de rendimento](yield-source.md).

## O que cada pool recebe de semente

`hearth:seed --token <slug>` patrocina a fonte de rendimento e coloca cinco poupadores de
demonstração, dos índices de conta 2 a 6, para que um primeiro visitante chegue em um pool
povoado. As posições diferem por token porque um pool tem que parecer com o ativo que ele
guarda: 1.200 de uma stablecoin de dólar e 0,6 de ether são poupadores do mesmo tamanho.

| Pool | Cinco posições de demonstração | Patrocínio | Dinheiro de prêmio liberado |
| --- | --- | --- | --- |
| `usdc` | 1.200 / 600 / 300 / 150 / 75 | 10.000 USDC | 20 USDC por hora, ou seja 19,998 por sorteio |
| `usdt` | 1.200 / 600 / 300 / 150 / 75 | 10.000 USDT | 20 USDT por hora, ou seja 119,98 por sorteio |
| `weth` | 0,6 / 0,3 / 0,15 / 0,075 / 0,04 | 5 WETH | 0,01 WETH por hora, arredondado para baixo em 0,0432 por sorteio |
| `bron` | 2.000 / 1.000 / 500 / 250 / 125 | 15.000 BRON | 30 BRON por hora, ou seja 179,99 por sorteio |
| `zama` | 2.000 / 1.000 / 500 / 250 / 125 | 15.000 ZAMA | 30 ZAMA por hora, ou seja 179,99 por sorteio |
| `tgbp` | 1.000 / 500 / 250 / 125 / 60 | 8.000 tGBP | 16 tGBP por hora, ou seja 95,99 por sorteio |
| `xaut` | 0,4 / 0,2 / 0,1 / 0,05 / 0,025 | 3 XAUt | 0,006 XAUt por hora, arredondado para baixo em 0,0216 por sorteio |

A taxa de uma fonte é de unidades base inteiras por segundo, então as duas menores taxas são
arredondadas para baixo: 0,01 WETH por hora são 2,77 unidades base por segundo e libera 2, e
0,006 XAUt por hora são 1,67 e libera 1. Todo patrocínio é dimensionado para durar mais de
oitenta sorteios, o que dá vinte dias ou mais, para que ninguém precise recarregar um pool
durante uma janela de avaliação.

## O token que o Hearth recusa

A Zama também publica um **Confidential tGBP** não-mock na Sepolia, em
`0x167DC962808B32CFFFc7e14B5018c0bE06A3A208` sobre o token público
`0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3`. O mint do subjacente dele é restrito ao
emissor, então ninguém além do emissor consegue obter o token público, ninguém consegue
empacotar no confidencial, e nenhum pool pode ser aberto sobre ele.

O Hearth lista o token no seletor de pools mesmo assim, em cinza, com o motivo escrito sob o
nome dele. O arquivo de implantação declara esse motivo uma única vez, em inglês, como
`mint restricted to the issuer`, e o aplicativo o imprime na língua em que a pessoa está lendo.
Escolhê-lo abre uma página que nomeia o token, aponta para os dois contratos no Etherscan, diz
de quem é a restrição e não oferece nenhuma ação de carteira, porque um botão de depósito que
reverte é pior do que nenhum botão.

Deixar o token fora da lista teria sido mais fácil e teria parecido que o Hearth simplesmente
não tinha chegado nele. Um poupador que vai procurar tGBP encontra duas entradas: o pool mock
que funciona e o token oficial que não funciona, com o motivo.

## O que a fileira de pools mostra

A página inicial termina com uma fileira de todos os pools, cada célula carregando o prêmio
grande daquele pool agora, lido no servidor em um único multicall e embarcado dentro da página,
para que a fileira já esteja preenchida quando a história para de rolar. O seletor dentro do
console mostra os mesmos números pelas mesmas regras.

Duas dessas regras existem porque um número pode enganar:

- Um pool cuja leitura não voltou diz `não lido`, nunca `0.00`. Um nó que não respondeu e um
  prêmio vazio ficam idênticos depois que se escreve um zero.
- Um pool que ainda não fechou o primeiro sorteio diz **Primeiro sorteio HH:MM UTC** no lugar de
  um número, na fileira e sob o nome dele no seletor. O dinheiro de prêmio só chega aos níveis
  quando o primeiro sorteio é premiado, então, antes daquele fechamento, a resposta honesta é uma
  hora, e não `0.00`. Qual das duas uma célula mostra é decidido por `lastClosedDraw` ainda ler
  zero, e a hora em si é `firstPeriodAt` mais `periodLength`, o fim do primeiro período e o
  primeiro momento em que o sorteio 1 pode fechar. O relógio é de vinte e quatro horas em UTC em
  todas as línguas.

## De onde o aplicativo tira os endereços

O aplicativo nunca carrega um endereço digitado à mão. Todo pool aberto em
`packages/web/src/lib/chain/pools.json` é gerado a partir de um arquivo que o script de
implantação escreveu, por:

```
node scripts/sync-pools.mjs        # from packages/web
```

Esse script lê `packages/contracts/deployments/sepolia/hearth.<slug>.json`, recusa qualquer
arquivo sem um endereço, recusa dois pools reivindicando o mesmo slug, e acrescenta a única
entrada restrita que não tem implantação. Rode-o depois de toda implantação. As variáveis de
ambiente que guardavam os três endereços de um único pool não existem mais.

O pool que um poupador está vendo é o primeiro segmento depois de `/app`:

| Rota | O que mostra |
| --- | --- |
| `/app` | Redireciona para o pool que o poupador usou por último, ou `usdc` na primeira visita |
| `/app/<slug>` | O painel daquele pool |
| `/app/<slug>/deposit` | Cunhar, blindar e depositar naquele token |
| `/app/<slug>/withdraw` | Sacar e desblindar naquele token |
| `/app/<slug>/draws` | Os sorteios daquele pool, e o resultado do próprio poupador em cada um |
| `/app/<slug>/run` | Os cinco passos do sorteio, abertos a qualquer pessoa, daquele pool |
| `/verify?pool=<slug>` | A semente pública, a faixa e os limiares daquele pool |

Um código de idioma vai na frente de todas elas para todo idioma que não seja o inglês, então
o painel de um leitor japonês é `/ja/app/weth`.

## Um keeper por pool

Sete pools significam sete processos keeper, cada um assinando pelo seu próprio índice de
conta da mesma frase semente, porque dois processos em uma conta brigam pelo mesmo nonce. A
tabela e o arquivo do pm2 estão em [o keeper](../operations/keeper.md).
