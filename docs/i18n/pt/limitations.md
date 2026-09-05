# Limitações

Toda limitação que conhecemos, numerada, em um só lugar. Outras páginas se referem a estes
números.

A razão de esta página existir é simples. Uma afirmação de confidencialidade só vale tanto quanto
as costuras que o autor se dispôs a nomear. Qualquer coisa abaixo disso que te surpreenda depois
é falha nossa, não uma descoberta.

## 1. A avaliação é feita em lotes, e os lotes têm teto

O teste do vencedor roda sobre números cifrados, e a Zama limita uma única transação a 20.000.000
de unidades de computação com 5.000.000 em profundidade sequencial na Sepolia. A avaliação de um
poupador custa `3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)` disso, então no máximo `4` poupadores precisando de
trabalho cifrado cabem em uma chamada.

**O que significa:** um pool com muitos poupadores precisa de muitas transações por sorteio. O
custo cresce linearmente com o número de poupadores, e é pago em gás por quem avalia.

**O que não significa:** não há teto para quantos poupadores o pool suporta. Vários projetos
desta área limitam a participação a 32 endereços. O Hearth não limita a participação de jeito
nenhum; ele limita quantos cabem em uma transação. `evaluate` aceita qualquer contagem, então um
lote menor não precisa de reimplantação.

## 2. A janela de dois períodos, e prêmios que expiram

Um sorteio tem que ser fechado, premiado e avaliado durante os dois períodos que o seguem. São
duas horas no pool de USDC e meio dia nos de seis horas. Fechar tem um prazo ainda mais apertado:
o meio do segundo desses períodos, para que a ida e volta da decifragem e a premiação sempre
tenham pelo menos meio período pela frente. Depois que a janela fecha, o sorteio acabou.

**O que significa:** um poupador que a varredura de avaliação não alcança dentro da janela perde
aquele sorteio, mesmo que os limiares dele digam que ganhou. A parte dele na liquidez do nível é
dobrada no remanescente do nível e financia um sorteio posterior. Este é o mesmo comportamento de
um prêmio não resgatado expirando no PoolTogether V5, e é o único caso do sistema em que um
poupador real perde algo que poderia ter tido.

**Por que a janela existe:** ela limita o quão para trás o cofre tem que lembrar dos saldos, que é
o que torna três observações guardadas por poupador suficientes. Uma janela de um período foi
tentada e era frágil demais contra um relayer lento.

**O que reduz isso:** o keeper percorre a lista inteira, qualquer um pode avançar mais a varredura
pelo aplicativo, e a varredura começa em um ponto diferente a cada sorteio, então ninguém fica
permanentemente no fim da fila.

## 3. Existe um teto de quanto um poupador pode ter

Depósitos são recusados quando o valor, ou o principal resultante, fica acima de
`maxPrincipal = (2^64 - 1) / periodLength`. Em um período de uma hora isso dá cerca de 5 bilhões
de tokens, no período de seis horas que os outros pools rodam dá cerca de 854 milhões, e em um
período diário daria cerca de 213 milhões.

**O que significa:** o teto é real, e em um período diário na mainnet é um número que uma grande
instituição poderia alcançar.

**Por que existe:** os valores cifrados aqui são de 64 bits, e os saldo-segundos acumulados de um
poupador têm que ficar dentro disso. Um estouro cifrado não reverte e ninguém vê acontecer, então
o teto é imposto na porta. A checagem limita o valor que entra além do total resultante, porque
senão um depósito grande o bastante para virar a soma além de `2^64` produziria um número pequeno
que passa na checagem.

**Como a recusa se comporta:** ela volta como um falso cifrado e o token reembolsa o depósito na
mesma transação, então bater no teto não revela o seu saldo.

## 4. Sem nível de reserva

O PoolTogether V5 mantém uma cota de reserva que completa um nível com sobredemanda. O Hearth não
tem reserva. A taxa de utilização de 50 por cento é o único amortecedor.

**O que significa:** quando um nível distribui mais prêmios do que consegue financiar, o que
acontece em no máximo cerca de 2 por cento dos sorteios no nível frequente, os poupadores que a
varredura alcança por último recebem menos ou nada em vez de serem completados.

**Por quê:** uma reserva precisa de um caminho de saque controlado pelo dono para ser útil, e todo
poder do dono em um pool confidencial é uma coisa em que um poupador tem que confiar.

## 5. As chances do nível grande são medidas sobre um período

O V5 mede as chances do nível grande ao longo de toda a janela de acumulação do nível. O Hearth as
mede sobre um único período, como todo outro nível.

**O que significa:** um grande detentor que entra por um período dá um tiro proporcional inteiro
em um bolo que levou 24 períodos para ser formado. Quem poupou pelos 24 períodos não tem nenhum
direito adicional sobre ele.

**O conserto conhecido, adiado:** acumular saldo-segundos desde o último pagamento do nível grande
e pesar o nível grande por isso. Ele acrescenta um segundo acumulador com a própria análise de
estouro, então é uma mudança para a versão dois em vez de um acréscimo não provado à versão um.

## 6. A privacidade precisa de três ou mais poupadores

O saldo total exato ponderado pelo tempo do pool nunca é publicado. O que se publica a cada
sorteio é a menor potência de dois acima dele, porque o sorteio precisa de alguma escala pública
contra a qual rodar.

**O vazamento que isso substituiu:** publicar o total exato deixava qualquer um recuperar
exatamente o valor depositado por quem se moveu sozinho. Dois totais consecutivos, os carimbos de
tempo públicos dos eventos de depósito e saque, e a aritmética é uma única divisão sem resto. Esse
foi o projeto até 3 de setembro de 2026 e uma revisão o quebrou.

**O que significa agora:** com um poupador, a faixa publicada é o peso desse poupador com margem
de um fator dois. Com dois, cada um consegue limitar o outro do mesmo jeito. Abaixo de três
poupadores não há conjunto de anonimato que preste. Faixas consecutivas ainda podem ser
subtraídas, mas são iguais a menos que o pool tenha cruzado uma potência de dois, então a
subtração dá uma banda em vez de um número.

**O que o aplicativo faz:** ele declara isso sempre que o pool tem menos de três poupadores, em
vez de mostrar uma afirmação de privacidade que não é verdadeira naquele tamanho.

## 7. A camada do token é da Zama, e os poderes dela se aplicam

O ativo do Hearth é o wrapper de USDC confidencial da Zama, não nosso.

**O que significa:** o dono dele pode nomear observadores capazes de decifrar todo valor que se
move pelo token, e de fazer isso **retroativamente**, então valores que já estão na blockchain
ficam expostos a um observador nomeado depois. Vigiar a nomeação e sair não é uma defesa. O escopo
são valores de depósito, pagamentos de saque, o saldo do próprio pool, e a única transferência de
financiamento de prêmio por lote de avaliação. O dono também pode bloquear um endereço, e o
contrato é atualizável. Em 2 de setembro de 2026 não havia observadores e o pausador estava
indefinido.

**O que isso não alcança:** o livro do próprio Hearth. Principal, ganhos, pesos por sorteio e
créditos por sorteio vivem no cofre, e o token não tem direitos de acesso sobre eles.

**Uma consequência de produto, e todo pool ao vivo bate nela a cada sorteio:** a transferência de
financiamento de um lote carrega o total creditado a todo mundo daquele lote, então um lote de um
carrega o prêmio exato de um poupador, sob a suposição do observador. O último lote da varredura
tem um único poupador sempre que a contagem de poupadores não é múltiplo do tamanho do lote. Cada
um dos sete pools é semeado com cinco poupadores com tamanho de lote 4 (`KEEPER_BATCH`,
`packages/keeper/src/config.ts`), então todo sorteio termina com um lote de um, e o evento
`Evaluated` naquela mesma transação nomeia o poupador a que ele pertence.

Os sete pools são sete wrappers separados com os poderes de sete donos separados, então isso vale
pool por pool em vez de uma vez para todos.

Nenhum lote mínimo conserta isso, porque `evaluate(uint32,uint256)`
(`packages/contracts/contracts/HearthVault.sol`) é aberto a qualquer pessoa e pega o tamanho do
lote de quem chama, então qualquer observador pode forçar um lote de um, faça o keeper o que
fizer. Registramos isso como um resíduo aceito: só morde sob a suposição do observador, e ao vivo
`observerCount()` é 0. O conserto do lado do contrato, adiado: acumular créditos por sorteio e
enviar uma única transferência de financiamento na finalização, ou encher o total de todo lote.

**A alternativa que rejeitamos:** escrever o nosso próprio token confidencial. Isso troca um
contrato conhecido, auditado e operado pela Zama por um que nós mesmos avaliamos.

## 8. Os sorteios dependem de alguém enviar transações

Nada na blockchain dispara sozinho.

**O que significa:** se nenhum keeper rodar e nenhum poupador agir, um sorteio é pulado e aquele
período não paga prêmio. Um fechamento que perde o prazo é recusado direto em vez de encalhar o
sorteio, e uma premiação que acontece depois da janela ainda contabiliza a colheita, devolve a
liquidez oferecida e marca o sorteio como `Skipped`.

**O que não significa:** dinheiro em risco. Um sorteio pulado mantém a liquidez dele nos níveis, a
colheita é contabilizada por uma premiação atrasada, e depósitos e saques não são afetados em
momento nenhum.

**O que reduz isso:** todo passo é aberto a qualquer pessoa e o aplicativo os expõe, então
qualquer poupador pode empurrar um sorteio. O pool também implementa a interface de automação da
Chainlink para o passo de fechamento, que é o único passo que não precisa de dados de fora da
blockchain e o único com prazo, mas nenhum upkeep está registrado em nenhum dos sete pools, então
hoje os keepers e o aplicativo são tudo o que há. Cada pool tem o próprio processo keeper na
própria conta, então um keeper que para, ou uma conta que fica sem ETH da Sepolia, custa a aquele
pool os sorteios dele e deixa os outros seis rodando.

## 9. O rendimento na Sepolia é patrocinado, não ganho

O dinheiro de prêmio de cada pool vem do próprio saldo financiado por patrocinador dele, que pinga
a uma taxa fixa.

**O que significa:** não é rendimento real. Ninguém está ganhando isso emprestando nem por um
cofre. Quando o saldo patrocinado acaba, os prêmios param. Um patrocínio não pode ser retomado
depois de feito, e só o dono da fonte pode mudar a taxa.

**Por quê:** não existe lugar na Sepolia que pague rendimento sobre os tokens mock da Zama. A Aave
recusa esses depósitos, o Compound quer o USDC da própria Circle, e o cofre da Zama na Sepolia é
apenas ocioso, sem adaptador de rendimento, que é a descrição da própria Zama.

**O que há de real nisso:** cada unidade de dinheiro de prêmio foi genuinamente empacotada,
genuinamente transferida ao pool como uma transferência cifrada, e genuinamente verificada por uma
decifragem assinada pelo KMS antes de ser creditada. Uma fonte que reverte também não para mais um
sorteio: a colheita é contabilizada como zero, `HarvestFailed` é emitido e o fechamento dá certo.
A origem do dinheiro é um mock. O encanamento não é.

## 10. A costura do empacotamento, e o que custa um saldo identificado

Transformar USDC público em USDC confidencial é uma transferência pública, então o valor fica
visível.

**O que significa:** um poupador que empacota e deposita imediatamente o mesmo valor publicou o
depósito dele. Medimos isso na nossa própria implantação anterior: três de cinco depósitos ao vivo
ficaram de dois a quatro blocos depois de um empacotamento público de exatamente 100 USDC.

**O que custa, além do valor:** os limiares são públicos, porque são eles que tornam o sorteio
verificável. Então um saldo que um observador consegue fixar tem resultado público em todo sorteio
e todo nível, calculado sem nenhuma decifragem, e em todo sorteio posterior também, já que os
ganhos nunca entram nas chances. Até um teto frouxo prova uma derrota certa em qualquer nível cujo
limiar fique acima dele.

**O que o Hearth faz:** mantém empacotar e depositar como passos separados, diz no passo do
empacotamento para você usar um número redondo de modo que o empacotamento seja um balde e não um
valor exato, avisa no passo do depósito, e deixa um poupador manter um saldo confidencial
permanente para que um depósito saia de um acúmulo de composição desconhecida.

**O que o Hearth não pode fazer:** removê-la. Não existe forma confidencial de converter um token
público, e não existe forma de tornar um limiar privado sem tornar o sorteio inverificável.

## 11. A ordem da varredura decide quem fica curto em um nível com sobredemanda

Quando um nível seca no meio do sorteio, o poupador que a varredura alcança naquele momento recebe
o resto e os seguintes não recebem nada daquele nível.

**O que significa:** no sorteio raro com sobredemanda, alguém é prejudicado por uma posição que
não escolheu.

**O que já não é:** uma alavanca. Uma versão anterior deixava quem chamava `evaluate` entregar uma
lista de endereços, o que colocava a ordem nas mãos do keeper e deixava um poupador comprar a
frente da fila. Agora quem chama passa uma contagem, a varredura começa em um ponto derivado da
semente do sorteio, e o início muda a cada sorteio.

**O que reduz isso:** o poupador afetado consegue ver, porque o peso e o crédito dele naquele
sorteio são ambos decifráveis por ele, então um crédito curto é comprovável em vez de misterioso.

## 12. O sorteio roda contra uma faixa, então um nível paga entre metade e todos os prêmios dele

O teste do vencedor usa `M`, a menor potência de dois acima do peso total do pool, no lugar do
total em si. `M` fica, portanto, entre `W` e `2W`.

**O que significa:** a contagem esperada de prêmios de cada poupador é escalada por `W / M`, um
número entre meio e um, então um nível paga entre metade e todos os seus `count * odds` prêmios
nominais a cada sorteio. Um pool que acabou de cruzar uma potência de dois paga na ponta baixa
dessa faixa até crescer dentro da faixa dele.

**O que não significa:** dinheiro perdido nem chances distorcidas. Todo poupador de um nível é
escalado pelo mesmo fator, então a fatia de ninguém muda em relação à de outro. O que um nível não
paga vai para o remanescente cifrado dele e é oferecido de novo, então os tamanhos dos prêmios se
acomodam entre os números nominais e o dobro deles, e todo o rendimento ainda sai.

**Por que aceitamos:** a alternativa era publicar o total exato, que é a limitação 6.

## 13. Os ganhos acumulados ficam públicos se você fizer o percurso de ida e volta pelo wrapper

Empacotar para dentro e desempacotar para fora são ambos movimentos públicos na camada do token, e
a primeira das duas chamadas de desempacotamento é a que publica o valor, então um
desempacotamento que você nunca finaliza já o vazou.

**O que significa:** para um endereço cuja única contraparte em USDC confidencial é o Hearth, o
total público desempacotado menos o total público empacotado é um piso dos ganhos de toda a vida
que foram sacados, e vira exato assim que aquele endereço esvazia tudo. Desempacotar para um
endereço novo não ajuda, porque a transferência confidencial para aquele endereço é ela mesma o
elo.

**O que reduz isso:** desempacote em denominações redondas sem relação com a sua posição, ou deixe
um saldo confidencial permanente para trás e nunca faça o percurso completo de ida e volta.

## 14. Um saldo que nunca muda é estreitado pelas contagens de prêmios publicadas

Toda reconciliação publica quantos prêmios um nível pagou. Como todo limiar é público, essa
contagem é uma restrição da forma "quantos destes poupadores tinham um peso acima do próprio
limiar publicado", e as restrições se acumulam.

**O que significa:** um poupador cujo saldo nunca muda ao longo de muitos sorteios é
progressivamente estreitado por essas contagens. Um poupador que deposita ou saca reinicia a
própria incógnita.

**O que limita a velocidade:** nada mais fino que um número inteiro de prêmios é jamais divulgado,
e os limiares não são escolhíveis por um atacante, porque a semente é sorteada dentro do
coprocessador e revelada só depois que o período dela fechou.

**O que fizemos a respeito: nada, e aqui está por quê.** O contrato tem um botão exatamente para
isso. `reconcileEvery[t]` é quantos sorteios passam entre publicações do remanescente de um nível,
e aumentá-lo no nível grande publicaria uma contagem por dia em vez de uma por hora, então um
prêmio grande seria atribuído a todo mundo elegível ao longo do dia em vez do punhado elegível em
um sorteio. A execução de justiça mostrou o que isso custa. Um fechamento move toda a liquidez
pública de um nível para dentro do sorteio e ela só volta em uma reconciliação, então com cadência
24 a liquidez pública do nível grande é a cota de colheita de um sorteio em 23 de cada 24
sorteios, e o tamanho do prêmio sai disso, com o bolo acumulado aparecendo à vista apenas no
sorteio da reconciliação. O dinheiro fica oferecido e ganhável o tempo todo, parado no remanescente
cifrado, mas ninguém consegue ver o prêmio grande crescer.

Uma contagem escondida e um prêmio grande visível e acumulando não podem coexistir, e esta
implantação escolheu o prêmio grande visível. Os três níveis rodam em `reconcileEvery = 1`, então
a medição acima roda a uma contagem por nível por sorteio. O botão é um argumento de construtor e
uma implantação que valorize mais a medição lenta do que o bolo visível o coloca mais alto.

## Não é uma limitação, mas vale dizer com clareza

- **Seis dos sete pools sorteiam a cada seis horas, e isso é uma decisão de gás.** Um sorteio com
  cinco poupadores custa `8,456,388` de gás, então sete pools de hora em hora gastariam cerca de
  `1.43 ETH` por dia na Sepolia, que os faucets públicos não conseguem acompanhar. Só o pool de
  USDC, implantado primeiro, ainda sorteia de hora em hora. As chances de nível de cada pool são
  definidas contra o período dele, então o ritmo dos prêmios é o mesmo nos dois relógios.
- **Os dezesseis idiomas são tradução automática.** Os textos da interface e as páginas
  traduzidas da documentação foram escritos por um modelo, não por falantes nativos, e não passaram
  por revisão profissional. O inglês é a fonte da verdade para todo número, nome de contrato e
  afirmação deste site, e uma página que não foi traduzida cai de volta para o inglês em vez de
  para um palpite.
- **Um poupador grande ganha com frequência.** As chances são proporcionais ao saldo ponderado
  pelo tempo, então quem tem muito por muito tempo ganha muito. Isso é o projeto, não um defeito.
- **Tamanhos de prêmio e contagens de prêmios são públicos.** Sempre foram no PoolTogether. O que
  é confidencial aqui é quem ganhou, não quanto o pool gerou.
- **O Hearth não foi auditado por terceiros.** Ele é autoauditado com ataques executados e testes
  de propriedade, e o [modelo de ameaças](security/threat-model.md) é o substituto honesto e não
  uma substituição.
