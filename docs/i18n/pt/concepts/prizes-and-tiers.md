# Prêmios e níveis

O rendimento entra como um bolo único por período. Os níveis são como esse bolo vira uma
mistura de prêmios pequenos e frequentes com um prêmio raro e grande. Esta página explica o
lado do dinheiro: como a liquidez é dividida, como um prêmio é dimensionado, o que acontece
quando um nível paga mais do que planejou, e os três pontos em que nos afastamos de propósito
do PoolTogether V5.

Tamanhos de prêmio, liquidez por nível e contagens de prêmios sempre foram públicos no
PoolTogether, e a parte em texto claro dos três é pública aqui. O que fica cifrado é quem
ganhou, e um total corrente por nível chamado de remanescente.

## Liquidez e cotas

Cada nível guarda um bolo chamado de liquidez, em números simples que qualquer um pode ler.
Duas coisas entram nele:

- **Colheitas.** Toda premiação divide a colheita verificada entre os níveis pelas cotas
  deles. O resto inteiro dessa divisão, as poucas unidades base que não dividem por igual, vai
  para o nível grande em vez de ser descartado. Uma colheita contabilizada na premiação do
  sorteio `p` é oferecida no fechamento seguinte, não no próprio sorteio `p`.
- **Remanescente reconciliado.** Tudo o que um nível ofereceu em um sorteio anterior e ninguém
  ganhou volta quando aquele nível reconcilia, o que na Sepolia é um sorteio depois.

Cada nível também guarda um segundo bolo, o **remanescente**, e esse é cifrado. É o total
corrente de tudo que o nível ofereceu e ninguém ganhou, e ele é somado à oferta do nível a
cada fechamento mesmo com o tamanho secreto.

No fechamento, para cada nível:

```
prize[t]     = liquidity[t] * UTILISATION / count[t]     // plaintext only
offered[t]   = liquidity[t] + carry[t]                   // plaintext plus encrypted
liquidity[t] = 0                                         // until the tier reconciles
```

Duas coisas a tirar disso. Os tamanhos dos prêmios vêm apenas da parte em texto claro, que é o
que os mantém públicos. O remanescente cifrado só acrescenta capacidade, então um nível está
sempre pelo menos tão capaz de pagar quanto o tamanho público do prêmio dele sugere.

`UTILISATION` é 50 por cento. Essa é a taxa de utilização do PoolTogether, e é a defesa contra
sobredemanda: um nível oferece toda a liquidez dele mas dimensiona cada prêmio como se tivesse
apenas metade. Um nível pode, portanto, pagar o dobro de prêmios que espera antes de secar.

**Tudo isso é fixado no fechamento, antes de a semente aleatória daquele sorteio existir.** A
semente é sorteada depois, na mesma transação. Ninguém pode ver uma semente, descobrir que
ganhou e depois mover dinheiro entre níveis para aumentar o ganho.

## Os três níveis da Sepolia

Cada pool carrega o seu próprio conjunto de níveis, porque as chances são uma fração do
período do próprio pool. O pool de USDC, de uma hora:

| Nível | Prêmios por sorteio (`count`) | Chances | Cotas | Reconcilia a cada | Como é a sensação |
| --- | --- | --- | --- | --- | --- |
| Grande | 1 | 1 em 24 | 40 | 1 sorteio | Raro e grande |
| Médio | 1 | 1 em 6 | 20 | 1 sorteio | Algumas vezes por dia |
| Frequente | 4 | 1 em 1 | 40 | 1 sorteio | Quatro prêmios a cada sorteio |

Os seis pools que sorteiam a cada seis horas mantêm as mesmas quantidades, cotas e cadência e
mudam apenas as chances: grande 1 em 4, médio 1 em 2, frequente 1 em 1. Um sorteio de seis
horas é seis vezes mais raro, então 1 em 4 entrega o prêmio grande cerca de uma vez por dia, o
mesmo ritmo que o conjunto de uma hora dá. O nível médio é a única diferença: cerca de duas
vezes por dia nos pools de seis horas contra cerca de quatro vezes por dia no de uma hora. Por
que seis horas: [pools e
tokens](pools-and-tokens.md).

As cotas somam 100 nos dois conjuntos, então o nível grande fica com 40 por cento de toda
colheita, o nível médio com 20 por cento e o nível frequente com 40 por cento. Todo nível de
todo pool reconcilia a cada sorteio, o que é uma escolha com custo dos dois lados; ela tem uma
seção própria abaixo.

### O que essas configurações produzem

Escreva `H` para a colheita recolhida em um período. O número esperado nominal de prêmios de
um nível por sorteio é `count * odds`. Realimente isso na fórmula de dimensionamento e cada
nível se acomoda em um regime estável:

| Nível | Liquidez em repouso | Tamanho do prêmio | Pagamento esperado por sorteio | Com que frequência dispara |
| --- | --- | --- | --- | --- |
| Grande | 19,2 H | 9,6 H | 0,4 H | Cerca de uma vez por dia |
| Médio | 2,4 H | 1,2 H | 0,2 H | Cerca de a cada seis horas |
| Frequente | 0,8 H | 0,1 H | 0,4 H (quatro prêmios) | A cada sorteio |

Os três pagamentos esperados somam exatamente `H`. Todo o rendimento sai como prêmio e nada
dele se acumula para sempre.

Essa tabela é do pool de uma hora. Um pool de seis horas recolhe seis vezes mais em um período
e faz sorteios seis vezes menos, e as chances mais curtas dele espalham essa receita pelo
mesmo número de prêmios: o nível grande se acomoda em 3,2 H de liquidez e um prêmio de 1,6 H,
o nível médio em 0,8 H e 0,4 H, e o nível frequente segue inalterado em 0,1 H por prêmio.
Medido em dinheiro real e não em
`H`, o prêmio grande de um pool de seis horas tem o mesmo tamanho do prêmio grande de um pool
de uma hora que ganhe na mesma taxa, porque um sorteio mais raro carrega seis vezes a colheita.

Esses são os números nominais. O sorteio roda contra a faixa `M` em vez do total exato `W`, e
`M` fica entre `W` e `2W`, então um nível na prática paga entre metade e todos os prêmios
nominais dele a cada sorteio. Veja
[seleção do vencedor](winner-selection.md). O que ele não paga vai para o remanescente e é
oferecido de novo, então nada se perde; o que acontece em vez disso é que os tamanhos dos
prêmios se acomodam em algum ponto entre os números acima e o dobro deles, dependendo de onde
o total do pool está dentro da faixa. Um pool perto do topo de uma faixa paga perto da tabela.
Um pool que acabou de cruzar uma potência de dois paga prêmios menos numerosos e maiores por
um tempo.

Um motivo para a tabela descrever a implantação ao vivo e não um ideal: todo nível reconcilia
a cada sorteio. O que um nível ofereceu e ninguém ganhou é publicado na finalização daquele
sorteio e lançado direto de volta na liquidez pública dele, então a liquidez em repouso de um
nível de fato se acomoda onde a tabela diz, e o bolo que o aplicativo mostra é o bolo que o
nível está carregando. Sob uma cadência mais lenta o mesmo dinheiro ainda seria oferecido e
ainda seria ganhável, mas ficaria no remanescente cifrado entre reconciliações, e a liquidez
pública, que é o que dimensiona o prêmio, seria apenas a colheita contabilizada desde a última
reconciliação daquele nível. A próxima seção é essa troca por inteiro.

Para colocar um número nisso, suponha que a fonte de USDC na Sepolia pingue 10 USDC por
período. Então o prêmio grande fica perto de 96 USDC e cai cerca de uma vez por dia, o prêmio
médio perto de 12 USDC a cada seis horas, e quatro prêmios de cerca de 1 USDC caem em todo
sorteio, com cada um desses números livre para chegar ao dobro dependendo da faixa. A taxa de
pingo ao vivo naquele pool é de
`5,555 base units a second, which is 19.998 USDC a period`, a taxa de cada pool está listada
em [pools e tokens](pools-and-tokens.md), e os tamanhos de prêmio ao vivo estão no cartão "O
pool agora" no painel daquele pool em `/app/<slug>`, lidos da
blockchain.

Esses são argumentos de construtor, escolhidos com a fórmula de chances do PoolTogether V5 e
escritos por pool em `packages/contracts/hearth.config.ts`. Uma implantação de mainnet com um
período diário usaria outros; veja [implantação](../operations/deploying.md).

## A cadência de reconciliação, e o que custa aumentá-la

Reconciliar um nível publica o remanescente dele, e o remanescente é exatamente o dinheiro que
aquele nível ofereceu e ninguém ganhou. Subtraia do que foi oferecido, divida pelo tamanho do
prêmio, e você sabe quantos prêmios aquele nível pagou. Esse número é uma divulgação real: é
uma medição dos saldos cifrados, da forma "quantos destes poupadores tinham um peso acima do
próprio limiar publicado".

`reconcileEvery[t]` é o botão dessa divulgação, e é um argumento de construtor por nível.
Aumentá-lo esconde a contagem por aquele tanto de sorteios e depois publica um número para o
período todo. Coloque o nível grande em 24 e a contagem dele vira um número diário, e as
pessoas que ela pode ser passam a ser todos que foram elegíveis em qualquer ponto daquele dia,
em vez dos cerca de quatro por cento do pool elegíveis em um único sorteio. Em um nível de 1
em 24 essa diferença não é cosmética: uma contagem por sorteio nomeia um ganhador do prêmio
grande dentro de um conjunto pequeno.

O preço de aumentá-lo é o próprio prêmio grande. Um fechamento move toda a liquidez pública de
um nível para dentro do sorteio e deixa o nível em zero, e esse dinheiro só volta em uma
reconciliação. Então, com cadência 24, em 23 de cada 24 sorteios a liquidez pública do nível
grande é só a colheita contabilizada desde a última reconciliação, o prêmio publicado é
dimensionado a partir da cota de um único sorteio, e o bolo acumulado aparece à vista apenas
no sorteio da reconciliação. O dinheiro não fica parado nesse meio tempo, porque o remanescente
cifrado é somado à oferta do nível a cada fechamento e pode ser ganho durante todo esse tempo.
Ele fica invisível, no entanto, e um prêmio grande que ninguém pode ver crescer não é de
verdade um prêmio grande.

Uma contagem escondida e um prêmio grande visível e acumulando não podem coexistir. **Esta
implantação escolheu o prêmio grande visível.** Os três níveis rodam em `reconcileEvery = 1`,
então o remanescente de cada nível é publicado na finalização do sorteio de que veio,
verificado na blockchain contra o handle que o cofre publicou, e lançado de volta na liquidez
pública pelo `reconcile`. O bolo se acumula à vista, do jeito que o do PoolTogether se
acumula, e quantos prêmios cada nível pagou vira público um sorteio depois, também do jeito
que o do PoolTogether. Nunca quem ganhou, em nenhum dos dois casos.

Isso faz da contagem acima um resíduo divulgado em vez de um resíduo mitigado. O raciocínio
não mudou e continua verdadeiro: uma contagem por sorteio em um nível de 1 em 24 é uma medição
sobre o conjunto pequeno de poupadores elegíveis naquele sorteio, e ela se acumula contra um
saldo que nunca se move. É uma medição mais fraca nos pools de seis horas, cujo nível grande é
1 em 4, então cada contagem cobre cerca de um quarto do pool em vez de um vinte e quatro avos,
e há quatro delas por dia em vez de vinte e quatro.
Está escrita em [o que permanece privado](../security/what-stays-private.md) e carregada na
[lista de limitações](../limitations.md). Duas coisas ainda a limitam. As contagens são grosseiras, já
que nada mais fino que um número inteiro de prêmios é publicado. E os limiares não podem ser
apontados para um saldo suspeito, porque a semente é sorteada dentro do coprocessador e
revelada só depois que o período dela acabou.

Uma implantação que prefira a medição mais lenta ao bolo visível coloca o botão mais alto e
faz a troca no outro sentido. É uma reimplantação.

## Sobredemanda: quando um nível paga mais do que planejou

Os prêmios são independentes, então um nível que espera quatro prêmios às vezes distribui
seis, ou nove. Cada prêmio é um oitavo da liquidez do nível frequente, então ele consegue
pagar oito. Além disso, o nível está vazio.

O Hearth trata disso com um contador cifrado por nível por sorteio. Todo pagamento é limitado
ao menor entre o que o poupador ganhou e o que sobrou no nível, e o contador cai pelo valor
limitado. Nenhuma transação reverte, e a aritmética de ninguém estoura.

### O que um vencedor tardio sente

A avaliação percorre a lista de poupadores a partir de um ponto derivado da semente daquele
sorteio. Se o nível esvaziar no meio da varredura:

- O poupador sendo avaliado naquele momento recebe o que sobrou, que pode ser menos do que os
  prêmios que os limiares dele dizem que ganhou.
- Poupadores mais adiante na varredura não recebem nada daquele nível naquele sorteio. Os
  outros níveis não são afetados: cada nível tem o seu próprio contador.

Ninguém pode comprar um lugar melhor nessa fila. A ordem da varredura é fixada pela semente,
quem chama `evaluate` escolhe quantos poupadores avançar e nunca quais, e o ponto de partida
muda a cada sorteio, então nenhum endereço fica sistematicamente por último.

Isso é visível para o poupador afetado, não silencioso. O peso guardado e o crédito guardado
dele naquele sorteio são ambos decifráveis por ele, então ele pode recalcular os limiares a
partir da semente pública e ver que o crédito veio curto.

### Com que frequência acontece

Para o nível frequente, com muitos poupadores pequenos, o número de prêmios distribuídos fica
perto de uma distribuição de Poisson com média 4, e o nível consegue pagar 8. A chance de
precisar de um nono é cerca de 2 por cento por sorteio. Como o sorteio roda contra a faixa e
não contra o total exato, a contagem esperada real fica entre 2 e 4, então 2 por cento é o
teto e não o caso típico. Para os dois níveis com `count = 1`, o número esperado de prêmios
fica bem abaixo de um enquanto a capacidade ainda é dois, então o limite é mais raro lá por
ordens de grandeza.

Essa aproximação supõe um pool com muitos poupadores pequenos. Em um pool de três poupadores
de tamanhos muito diferentes a dispersão é outra, e no pool de demonstração pequeno da Sepolia
é fácil construir um sorteio que atinge o limite. Isso é uma característica do tamanho da
demonstração, não um bug.

## Três diferenças deliberadas em relação ao PoolTogether V5

As três estão declaradas aqui em vez de enterradas, porque um revisor que conhece o V5 vai
procurá-las.

### 1. O sorteio roda contra uma faixa, não contra o total exato

O V5 roda o teste do vencedor contra a emissão total exata do sorteio, o que ele pode fazer
porque esse número é público em uma blockchain transparente. Publicar o total exato aqui
vazaria valores de depósito individuais, então o Hearth publica apenas a faixa de potência de
dois acima dele.

A consequência é a descrita acima: um nível paga entre metade e todos os prêmios nominais dele
a cada sorteio, e os tamanhos dos prêmios se acomodam correspondentemente mais altos. Nenhum
dinheiro se perde e as chances de nenhum poupador ficam distorcidas em relação às de outro,
porque todo poupador de um nível é escalado pelo mesmo `W / M`. É a limitação 12.

### 2. Sem nível de reserva

O V5 leva uma cota de toda contribuição para uma reserva. A reserva financia o incentivo para
premiar o sorteio, e amortece um nível com sobredemanda completando o que falta.

O Hearth não tem reserva. A taxa de utilização de 50 por cento é o único amortecedor, que é a
alternativa que a própria documentação do V5 aponta para implantações que usam o
`tierLiquidityUtilizationRate` com essa finalidade. A consequência é o limite descrito acima:
no sorteio raro com sobredemanda, os últimos vencedores na ordem da varredura ficam curtos em
vez de serem completados.

Escolhemos isso porque uma reserva precisa de um caminho de saque controlado pelo dono para
ser útil, e todo poder do dono em um pool confidencial é uma coisa em que um poupador tem que
confiar. A troca está escrita na [lista de limitações](../limitations.md) como a limitação 4.

### 3. As chances do nível grande são medidas sobre um período

O V5 mede as chances do nível grande ao longo de toda a janela de acumulação do nível, então a
chance de levar um bolo que vem crescendo há um ano reflete um ano de participação.

O Hearth mede as chances do nível grande sobre um único período, como todo outro nível. Isso
significa que um grande detentor que aparece por um período dá um tiro proporcional inteiro em
um bolo que outras pessoas passaram 24 períodos enchendo. É uma assimetria real e está
declarada como a limitação 5.

O conserto barato é conhecido e anotado para uma versão futura: acompanhar os saldo-segundos
acumulados desde o último pagamento do nível grande e pesar o nível grande por isso em vez de
pelo peso de um único período. Ficou de fora da versão um porque acrescenta um segundo
acumulador com a própria análise de estouro, e entregar a coisa mais simples que está
totalmente provada ganhou de entregar a coisa melhor que não está.

## O que esta página não cobre

Ela não cobre de onde vem a colheita nem como ela é verificada, que é
[fonte de rendimento](yield-source.md). Não cobre o teste por poupador que decide quem ganha,
que é [seleção do vencedor](winner-selection.md). E não faz nenhuma afirmação de privacidade
sobre tamanhos de prêmio: eles são públicos aqui por projeto, e o que as contagens publicadas
de prêmios de fato divulgam está exposto em
[o que permanece privado](../security/what-stays-private.md).
