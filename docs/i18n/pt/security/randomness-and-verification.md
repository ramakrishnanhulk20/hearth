# Aleatoriedade e verificação

Um sorteio só vale alguma coisa se um estranho puder conferi-lo. Esta página é como.

## De onde vem a semente

Uma chamada, dentro da transação que fecha um sorteio:

```solidity
euint64 seed = FHE.randEuint64();
```

Isso roda dentro do coprocessador da Zama. O número é produzido por um gerador
criptograficamente seguro sob a chave FHE da rede, e o que volta ao contrato é um handle de
texto cifrado, não um número. Ninguém viu o valor naquele momento: nem quem chamou, nem nós,
nem o minerador.

Duas propriedades do gerador da Zama importam aqui, e as duas estão declaradas na documentação
da própria Zama:

- **Ele tem que rodar dentro de uma transação.** Gerar um valor aleatório muta o estado do
  gerador na blockchain, então isso não pode ser feito por `eth_call`, a forma somente leitura
  de simular uma chamada. Ninguém pode pré-visualizar um sorteio fora da blockchain para ver se
  ganharia.
- **Ele é criptograficamente seguro e fica cifrado** até que algo o torne explicitamente
  decifrável.

## Por que ninguém pode sorteá-la de novo, nem mudar o tamanho do que ela ganha

Quatro coisas, juntas.

1. **Fechar dá certo uma vez.** A máquina de estados do sorteio permite `closeDraw(p)`
   exatamente uma vez por sorteio. Não há segunda tentativa para comprar um número melhor.
2. **O valor é desconhecido quando é sorteado.** Como a semente é texto cifrado no momento da
   criação, quem envia a transação de fechamento não aprende nada por tê-la enviado. Não há
   sentido em competir para ser quem chama.
3. **O passo de publicação é de mão única.** Depois do fechamento, a semente é marcada como
   publicamente decifrável. Esse sinalizador é permanente e irrevogável na lista de controle de
   acesso da Zama, então o número que o mundo vê é o número com que o contrato se comprometeu,
   não um escolhido depois.
4. **Os prêmios são fixados antes de a semente existir.** O tamanho do prêmio de cada nível e a
   liquidez que ele oferece são calculados no topo da mesma transação de fechamento, antes de
   `randEuint64` ser chamada. Em um rascunho anterior eles eram definidos mais tarde, na
   premiação, o que deixava uma janela em que alguém podia ler a semente, descobrir que tinha
   ganhado, e então mover liquidez entre níveis para tornar aquele ganho maior. Essa janela
   acabou.

Compare com os projetos alternativos. Um sorteio alimentado por um hash de bloco pode ser
sorteado de novo por um validador que não gostou do resultado. Um sorteio alimentado por um
número de fora da blockchain pode ser escolhido diretamente. Nenhum dos dois é possível aqui, e
essa é a razão inteira de a aleatoriedade ser gerada na blockchain sob cifragem e nunca por um
gerador de fora.

## O que fica público, e quando

| Valor | Publicado quando | Por que precisa ser público |
| --- | --- | --- |
| A semente `R` | No fechamento, legível depois que o relayer a decifra | Sem ela ninguém pode recalcular um limiar |
| A contagem de escala, da qual sai a faixa `M` | No fechamento | Os limiares são relativos ao tamanho do pool |
| Se o período foi não vazio | No fechamento | Distingue um sorteio vazio de um real |
| A colheita do sorteio | No fechamento | É o dinheiro que financia prêmios posteriores |
| O tamanho do prêmio de cada nível e a liquidez oferecida em texto claro | No fechamento | Necessário para conferir o que um ganho paga |
| O remanescente de cada nível | Na finalização de todo sorteio, já que todo nível reconcilia a cada sorteio | Necessário para conferir quantos prêmios o nível pagou |
| O contador de não financiado | Na finalização | Prova que o pool financiou todo crédito que o cofre escreveu |

Duas coisas estão deliberadamente **fora** dessa lista. O saldo total exato ponderado pelo
tempo do pool nunca é publicado, porque fazer isso deixava um observador recuperar exatamente o
valor depositado por quem se moveu sozinho; a faixa acima dele é publicada no lugar. E nenhum
valor por poupador é jamais marcado como publicamente decifrável.

Tudo na lista chega depois que o período que ela decide já terminou. Publicar `R` não pode
ajudar ninguém a mudar um peso, porque os pesos do período `p` são congelados no momento em que
o período `p` termina, que é antes de o sorteio poder sequer ser fechado.

Cada um desses números chega ao contrato com uma assinatura do serviço de gestão de chaves da
Zama, verificada na blockchain por `FHE.checkSignatures`. A prova é amarrada aos handles em uma
ordem fixa: `[seed, scaleCount, nonEmpty, harvested]` na premiação, e um handle de remanescente
por reconciliação. Nada pode ser embaralhado entre posições nem reaproveitado contra outro
sorteio. A máquina de estados do sorteio é a proteção contra reaproveitamento: cada passo dá
certo uma vez por sorteio, e a reconciliação uma vez por nível.

## A faixa, e como o cofre a acompanha

O saldo total ponderado pelo tempo do pool em um período, `W`, fica cifrado. O número contra o
qual o sorteio roda é `M = 2^m`, a menor potência de dois igual ou acima de `W`.

O cofre acompanha `m` de sorteio em sorteio em vez de calculá-lo do zero. A cada fechamento ele
compara `W` sob cifragem contra as cinco potências de dois em volta do `m` do sorteio anterior,
soma os cinco resultados em uma pequena contagem cifrada, e marca essa contagem como
publicamente decifrável. O pool lê a contagem verificada e descobre o novo `m`, que pode se
mover no máximo três passos por sorteio. Uma comparação cifrada separada contra 1 dá o
sinalizador de não vazio.

Então o registro público por sorteio é um inteiro pequeno, e ele só muda quando o pool cruza
uma potência de dois. `scaleBits()` no pool lê o `m` atual; a implantação o semeia com
`initialScaleBits`, o comprimento em bits esperado do total do primeiro período, e o rastreador
corrige qualquer erro em até três bits por sorteio.

## Como qualquer um recalcula um limiar

Tudo abaixo usa apenas dados públicos. Sem carteira, sem assinatura, sem permissão.

Para o sorteio `p`, o endereço de poupador `u`, o nível `t` com `count[t]` prêmios e chances
`oddsNum[t] / oddsDen[t]`:

```
prn         = keccak256(abi.encode(R, p, u, t))
r           = prn mod M                                        // 0 <= r < M
threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))
```

para cada `k` de `0` a `count[t] - 1`. Aquele poupador ganhou o prêmio `k` se e somente se o
peso ponderado pelo tempo dele no período `p` foi estritamente maior que `threshold_k`.

Você não precisa reimplementar isso. O cofre expõe
`thresholdOf(drawId, saver, tier, k)` como uma função de leitura pura sobre a mesma aritmética
que a avaliação usa, então o painel de verificação do aplicativo, a suíte de testes e qualquer
pessoa com um explorador de blocos leem a mesma implementação. Reimplementar fora da blockchain
são quatro linhas de aritmética de inteiros grandes, se você preferir conferir o contrato
contra o seu próprio código.

Um exemplo resolvido com números pequenos está em
[seleção do vencedor](../concepts/winner-selection.md). Um exemplo preenchido de um sorteio real
na Sepolia está aqui, tirado do pool `usdc`, cujo pool de prêmios é
`0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2`. Todo pool publica os mesmos campos para os
próprios sorteios:

| Campo | Valor |
| --- | --- |
| Sorteio | `2, the period from 23:00 to 00:00 UTC on 2 September 2026` |
| Semente `R` | `5625525180683981523` |
| Faixa `M` | `2^43, which is 8,796,093,022,208 balance-seconds` |
| Colheita | `19.531380 USDC` |
| Tamanhos dos prêmios por nível | `3.559644 / 1.779822 / 0.889911 USDC, grand / mid / frequent` |
| Prêmios pagos por nível | `0 / 0 / 5, against a funded capacity of 2 / 2 / 8` |

Lido da blockchain: a semente e a faixa vêm do evento `DrawAwarded` do pool, os tamanhos dos
prêmios e a liquidez oferecida vêm de `drawParams(2)`, e os prêmios pagos vêm dos três eventos
`TierReconciled` daquele sorteio, já que o que um nível ofereceu e não pagou é exatamente o
remanescente que ele publicou. Os níveis grande e médio não pagaram nada neste sorteio e
devolveram a oferta inteira, que é o que um nível de 1 em 24 e um de 1 em 6 fazem na maior
parte do tempo.

O painel de verificação do aplicativo faz essa aritmética no navegador para qualquer endereço
que você digitar, em `/verify?pool=<slug>` para o pool que você quiser. Ele não tem acesso
privilegiado; são as mesmas entradas públicas e a mesma fórmula.

## Por que o resto não tem viés

Reduzir um número aleatório grande para uma faixa com um resto simples costuma ter viés. Se
`2^256` não é um múltiplo exato da faixa, os resíduos baixos ocorrem um pouco mais vezes, e
esse viés cai de forma desigual sobre os poupadores. O PoolTogether V5 resolve isso com
amostragem por rejeição, e um rascunho anterior do Hearth também.

O Hearth não precisa mais. `M` é uma potência de dois por construção, e `2^256` é um múltiplo
exato de toda potência de dois até `2^256`. Então `prn mod M` é simplesmente os `m` bits baixos
de um hash de 256 bits, e cada valor de `0` a `M - 1` vem exatamente do mesmo número de
entradas. **O viés é zero, não pequeno**, sem laço, sem rejeição e sem nada que um verificador
tenha que reproduzir com cuidado.

Esse é um benefício colateral de publicar a faixa em vez do total exato, e vale declarar porque
remove um pedaço de código que qualquer um conferindo o sorteio teria que reproduzir
exatamente.

## Garimpar endereços não funciona

Assim que `R` é público, alguém poderia gerar endereços até achar um com limiar baixo. Seria
inútil. Os limiares são comparados contra um peso do período `p`, e um endereço novinho não tem
observações em ou antes do período `p`, então o peso dele é zero. Zero não supera limiar nenhum.
Para ter peso no período `p` você tinha que manter um saldo durante o período `p`, que já havia
terminado antes de `R` existir.

Garimpar para um sorteio futuro falha pelo outro motivo: a semente daquele sorteio ainda não foi
gerada, e é imprevisível.

## O que a verificação prova, e o que não prova

Ser preciso sobre isso é o objetivo da página.

**Ela prova:**

- Que a semente foi gerada na blockchain, dentro de uma transação, sob a chave da rede, e
  publicada exatamente uma vez.
- Que os tamanhos dos prêmios e a liquidez oferecida foram fixados antes de aquela semente
  existir.
- Que a regra aplicada a todo poupador é pública, uniforme e recalculável por qualquer um.
- Que os tamanhos dos prêmios decorrem da liquidez do nível e dos parâmetros do nível por
  aritmética pública.
- Que o número de prêmios que cada nível pagou bate com o que o nível ofereceu menos o que
  voltou no remanescente dele.
- Que o pool financiou todo crédito que o cofre escreveu, já que o contador de não financiado é
  publicado e é zero.

**Ela não prova:**

- Que o gerador do coprocessador é uniforme. Esse é o motor da Zama, e ele é confiado, não
  verificado aqui.
- Que o serviço de gestão de chaves assinou o texto claro verdadeiro do handle da semente. O
  contrato confere a assinatura, não a semântica. Um quórum desonesto poderia assinar um valor
  à escolha dele. Toda aplicação neste protocolo divide essa suposição; é o atacante 8 no
  [modelo de ameaças](threat-model.md).
- Que a faixa publicada realmente é a faixa da soma do peso de todo poupador. Alguém de fora
  não consegue somar pesos cifrados, e agora também não consegue ver a soma. O que essa pessoa
  tem no lugar é que o mesmo código público e imutável calculou as comparações e o peso de cada
  poupador a partir das mesmas observações, e que as invariantes de conservação se sustentam: o
  pago é igual ao creditado, e ninguém saca mais do que o principal mais os ganhos.
- Nada sobre quem ganhou. Esse é o ponto inteiro, e é por isso que publicar mais tornaria a
  verificação mais forte e o produto pior. Publicar o total exato é o exemplo concreto: isso
  tornava o tamanho do pool conferível, e também tornava o depósito de quem se moveu sozinho
  recuperável até a unidade base.

## O que um poupador pode conferir e mais ninguém

Um poupador pode ir um passo além de alguém de fora, porque pode decifrar o próprio peso e o
próprio crédito de um sorteio.

1. Revele o seu peso do sorteio `p`.
2. Recalcule os seus próprios limiares a partir do `R` e do `M` públicos, ou leia-os de
   `thresholdOf`.
3. Conte quantos você superou, multiplique pelo tamanho do prêmio daquele nível.
4. Revele o seu crédito do sorteio `p` e confira se bate.

Se não bater, ou um nível secou antes de a varredura chegar em você, que é o limite documentado,
ou algo está errado e você tem os números para provar. O aplicativo faz os quatro passos por
você e mostra a aritmética.
