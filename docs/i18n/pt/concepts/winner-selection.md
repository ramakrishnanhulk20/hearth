# Seleção do vencedor

Este é o coração do produto: decidir quem ganhou, sobre números que ninguém pode ler, de um
jeito que um estranho ainda consegue conferir.

**A frase que importa: a seleção do vencedor é fixada no sorteio, e a avaliação apenas a
anota.** No momento em que o pool verifica a semente aleatória e a faixa em que o total do
pool cai, o resultado de cada poupador em cada nível já está determinado. Os limiares são
números públicos que qualquer um pode recalcular, e o peso cifrado com que são comparados não
pode mais mudar. A avaliação é escrituração. Ela não pode ser dirigida, antecipada nem pulada
de um jeito que mude quem ganhou.

## O que fica fixado quando um sorteio é premiado

| Símbolo | O que é | Público? |
| --- | --- | --- |
| `R` | A semente aleatória deste sorteio | Sim, depois que o período termina |
| `M` | A faixa em que o peso total do pool caiu, uma potência de dois | Sim, depois que o período termina |
| `prize[t]` | O que um prêmio do nível `t` paga | Sim, fixado no fechamento |
| `offered[t]` | A liquidez que o nível `t` colocou neste sorteio | Sim, fixada no fechamento |
| `count[t]` | Quantos prêmios o nível `t` oferece por sorteio | Sim, fixado na implantação |
| `odds[t]` | Com que frequência o nível `t` dispara, como fração | Sim, fixado na implantação |
| `W` | O saldo total ponderado pelo tempo do pool no período | **Não. Nunca publicado** |
| `twab` | O saldo ponderado pelo tempo de um poupador no período | Não, cifrado, legível por aquele poupador |

As duas últimas linhas são os segredos. `twab` é por pessoa. `W` é a soma de todos os `twab`,
e fica guardado porque publicá-lo exatamente entrega a um observador uma forma de recuperar
por subtração o valor depositado por quem se moveu sozinho. O que o sorteio usa no lugar é
`M`: a menor potência de dois igual ou acima de `W`. Então `M` fica em algum ponto entre `W` e
`2W`, e a única coisa que um observador aprende de um sorteio para o outro é se o pool cruzou
uma potência de dois.

## A regra do PoolTogether, e a nossa

O PoolTogether V5 dá a cada poupador `count[t]` chances independentes no nível `t`. Cada
chance é ganha com probabilidade `min(1, twab * odds[t] / W)`. Então o número esperado de
prêmios de um poupador em um nível é a fatia dele no pool, multiplicada pelas chances do
nível, multiplicada pelo número de prêmios.

Fazer isso ao pé da letra sobre números cifrados exigiria sortear um número aleatório novo por
poupador por prêmio, e precisaria do `W` exato. O Hearth reproduz o mesmo formato com um único
número aleatório uniforme por poupador por nível, uma escada de limiares aninhados, e `M` no
lugar de `W`.

Escreva `z = twab * odds[t] * count[t] / M`. Esse é o número esperado de prêmios que este
poupador ganha neste nível. O Hearth paga a ele `floor(z)` ou `ceil(z)` prêmios, com teto em
`count[t]`, e a média ao longo de muitos sorteios é exatamente `z`.

Como o denominador é `M` e não `W`, a expectativa de cada poupador é escalada por `W / M`, um
número entre meio e um. Some os poupadores e um nível paga entre metade e todos os seus
`count * odds` prêmios nominais por sorteio. Nada se perde com isso. O que um nível não paga
fica no remanescente cifrado dele e é oferecido de novo no fechamento seguinte, então com o
tempo todo o rendimento ainda sai; os tamanhos dos prêmios simplesmente se acomodam mais
altos. Veja
[prêmios e níveis](prizes-and-tiers.md).

## O teste, passo a passo

Para um poupador `u` no nível `t` do sorteio `p`:

1. Derive o número aleatório dele para este nível. `prn = keccak256(R, p, u, t)`. Como o
   endereço do poupador e o índice do nível entram no hash, cada poupador recebe o seu próprio
   número e cada nível recebe um diferente, tudo a partir da única semente `R`.
2. Reduza para a faixa. `r = prn mod M`, um número inteiro de `0` a `M - 1`. `M` é uma
   potência de dois, então isso é um resto simples de um hash de 256 bits por uma potência de
   dois, o que é exatamente uniforme e não tem viés a corrigir. É aritmética pública sobre
   valores públicos.
3. Monte a escada. Para cada prêmio `k` de `0` a `count[t] - 1`:
   `threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))`.
   São números públicos. Qualquer um pode calculá-los para qualquer endereço, e o contrato
   expõe a mesma aritmética como uma função de leitura, `thresholdOf(drawId, saver, tier, k)`,
   para que o painel de verificação do aplicativo, os testes e qualquer conferente de fora
   usem uma única implementação.
4. Compare. O prêmio `k` é ganho quando o peso cifrado do poupador é maior que
   `threshold_k`. Este é o único passo que toca um segredo, e é uma comparação cifrada cujo
   resultado é um verdadeiro ou falso cifrado que ninguém consegue ler.
5. Pague. Cada prêmio ganho soma `prize[t]` ao pagamento cifrado do poupador neste nível, por
   uma seleção cifrada em vez de um "se", então a transação parece idêntica tenha a pessoa
   ganhado nada ou tudo.
6. Limite. O pagamento do nível a este poupador é o menor entre o que ele ganhou e o que
   sobrou no nível. Essa subtração atualiza a liquidez cifrada restante do nível.
7. Credite. O valor limitado é somado aos ganhos cifrados do poupador.

Os limiares sobem com `k`, então um poupador ganha os prêmios de `0` a `j-1` para algum `j` e
depois para. A condição para o prêmio `k` é exatamente
`twab * odds * count > r + k * M`.

### O único desvio em texto claro

Se um limiar for maior que `2^64 - 1`, nenhum peso de 64 bits consegue superá-lo, então a
resposta é falsa e a comparação é pulada por inteiro. Isso acontece em um nível de chance
baixa quando `M` é muito grande. Como os limiares só sobem com `k`, o laço daquele nível para
no primeiro limiar assim em vez de conferir o resto. O desvio é sobre um número público. Nada
no Hearth jamais desvia sobre um segredo.

## Exemplo resolvido: três poupadores, um nível

Um pool minúsculo, para os números ficarem legíveis. Um nível: o nível frequente, `count = 4`,
`odds = 1` (isto é, `oddsNum = 1`, `oddsDen = 1`). Os pesos estão em saldo-segundos do token
que aquele pool guarda; o exemplo os lê como USDC.

| Poupador | Peso | Fatia de `W` | `z = peso * 4 / M` |
| --- | --- | --- | --- |
| Ada | 600 | 60% | 2,34 |
| Ben | 300 | 30% | 1,17 |
| Cy | 100 | 10% | 0,39 |
| **Total `W`** | **1.000** | 100% | **3,91** |

`W` é 1.000, então a faixa é `M = 1.024`, a menor potência de dois igual ou acima dele.
Ninguém de fora do pool vê o 1.000. Veem o 1.024.

Note a coluna do total. O pagamento nominal do nível é `count * odds = 4` prêmios por sorteio.
O que ele de fato espera pagar é `4 * W / M = 4 * 1000 / 1024 = 3,91`. Essa é a escala
`W / M`, e aqui é um corte de 2,3 por cento porque 1.000 fica perto do topo da faixa dele. Um
pool de 520 ficaria perto do fundo da mesma faixa e o nível esperaria pagar cerca de 2,03
prêmios.

Agora o sorteio acontece. O `r` de cada poupador vem de um hash da semente com o endereço
dele, então é um número diferente para cada um, e cai entre 0 e 1.023.

**Ada, `r = 271`.** Os limiares são `floor((271 + k * 1024) / 4)`:

| k | Limiar | O peso 600 da Ada supera? |
| --- | --- | --- |
| 0 | 67 | Sim |
| 1 | 323 | Sim |
| 2 | 579 | Sim |
| 3 | 835 | Não |

Ada ganha 3 prêmios. A expectativa dela era 2,34, então 3 é o lado alto do `floor` ou `ceil`.

**Ben, `r = 812`.** Limiares `floor((812 + k * 1024) / 4)`:

| k | Limiar | O peso 300 do Ben supera? |
| --- | --- | --- |
| 0 | 203 | Sim |
| 1 | 459 | Não |

Ben ganha 1 prêmio, contra uma expectativa de 1,17.

**Cy, `r = 155`.** Limiares `floor((155 + k * 1024) / 4)`:

| k | Limiar | O peso 100 do Cy supera? |
| --- | --- | --- |
| 0 | 38 | Sim |
| 1 | 294 | Não |

Cy ganha 1 prêmio. A expectativa dele era 0,39, então este é o dia de sorte dele. Ao longo de
muitos sorteios ele ganha um prêmio em cerca de 39 por cento das vezes e nada no resto.

Cinco prêmios foram distribuídos onde 3,91 eram esperados. Tudo bem: cada prêmio é um oitavo
da liquidez do nível, então o nível consegue pagar oito antes de secar. Veja
[sobredemanda](prizes-and-tiers.md).

Agora repare no que um observador vê no fim de tudo isso. Ele pode calcular as três tabelas
sozinho, porque `R`, `M`, os limiares e os endereços são públicos. O que ele não pode é
preencher a coluna da direita, porque os pesos são cifrados, e também não pode recuperar o
1.000, porque só o 1.024 foi publicado. Depois que o nível reconcilia, um sorteio adiante, ele
fica sabendo quantos prêmios o nível pagou. Nunca a quem.

## Por que dividir a sua carteira não ganha nada

Esta é a propriedade que uma versão mal construída perde.

Os prêmios esperados de um poupador em um nível são `z = twab * odds * count / M`, que é
linear no peso dele, e `M` não depende de como o peso do pool está dividido entre endereços.
Divida um peso de 600 em duas carteiras de 300 e cada uma recebe `z = 1,17`, num total de
2,34. Exatamente igual. Divida em seis carteiras de 100 e cada uma recebe 0,39, total 2,34.
Exatamente igual de novo. Não há limiar para explorar e nem arredondamento para farmar, só
mais gás a pagar.

Uma versão anterior deste projeto dobrava a contagem de prêmios em uma única zona vencedora
mais larga, de modo que cada poupador podia ganhar no máximo um prêmio por nível. Isso limitava
grandes detentores abaixo da fatia justa deles e pagava as pessoas por se dividirem. Uma
revisão de projeto pegou isso e a escada aninhada tomou o lugar.

## Quanto custa

Por poupador por sorteio, o trabalho cifrado é: uma multiplicação e uma soma para calcular o
peso, depois, para cada nível, uma comparação e uma seleção por prêmio, mais um limite. Com os
três níveis da Sepolia isso dá 6 comparações, 6 seleções e cerca de uma dúzia de somas,
subtrações e mínimos.

A Zama publica o orçamento por transação na Sepolia como 20.000.000 de unidades de computação
no total, com 5.000.000 em profundidade sequencial, e precifica uma soma de 64 bits em
162.000, uma comparação em cerca de 118.000, uma seleção em 55.000 e uma multiplicação por um
número público em 365.000. Esses números colocam um poupador na casa dos poucos milhões de
unidades de computação, e é por isso que a avaliação vai em lotes de `4` poupadores por
transação. O valor medido é
`3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)` por poupador e o gás medido é
`708,836 (the marginal cost of one more saver in a batch; a batch of one costs 1,291,192)`.

## O que esta página não cobre

Ela não cobre de onde vem `R` nem como verificá-lo, que é
[aleatoriedade e verificação](../security/randomness-and-verification.md). Não cobre como
`prize[t]` é dimensionado nem o que acontece quando um nível seca no meio do sorteio, que é
[prêmios e níveis](prizes-and-tiers.md). E não afirma esconder quem participou: a lista de
poupadores, os lotes de avaliação e as contagens de prêmios por nível são todos públicos. Veja
[o que permanece privado](../security/what-stays-private.md).
