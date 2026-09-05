# O que permanece privado

Três coisas importam sobre confidencialidade: o que fica cifrado, se o sorteio é
comprovadamente justo e ponderado pelo depósito, e se todo vazamento está nomeado. Esta página
responde à primeira e à terceira. Nossa posição é que nomear cada costura nós mesmos vale mais
do que uma afirmação que ninguém pode conferir.

Tudo aqui está escrito para um pool, e o Hearth roda sete deles, um por token confidencial.
Eles não compartilham nada, então o conjunto de anonimato de cada pool é o dos próprios
poupadores dele e de mais ninguém, e um pool com três poupadores não é ajudado por outro pool
ter trinta.

## A tabela

| Valor | Estado | Quem pode ler |
| --- | --- | --- |
| Seu principal | Cifrado | Só você, por assinatura EIP-712 |
| Seus ganhos não sacados | Cifrado | Só você |
| Seu peso ponderado pelo tempo, por sorteio | Cifrado | Só você |
| Seu crédito, por sorteio, e portanto se você ganhou | Cifrado | Só você |
| O valor que você deposita | Cifrado de ponta a ponta | Só você |
| O valor que você saca | Cifrado de ponta a ponta | Só você |
| **O peso total do pool em um período** | **Cifrado, nunca publicado** | **Ninguém** |
| O remanescente de cada nível entre reconciliações | Cifrado | Ninguém |
| A faixa em que o total do pool caiu, uma potência de dois | Público quando o período termina | Todo mundo |
| Se alguém tinha saldo no período | Público quando o período termina | Todo mundo |
| A semente aleatória de cada sorteio | Público quando o período termina | Todo mundo |
| O rendimento colhido em cada sorteio | Público quando o período termina | Todo mundo |
| O tamanho do prêmio de cada nível e a liquidez oferecida em texto claro | Público a partir do fechamento | Todo mundo |
| Quantos prêmios o nível frequente pagou | Público um sorteio depois | Todo mundo |
| Quantos prêmios o nível médio pagou | Público um sorteio depois | Todo mundo |
| Quantos prêmios o nível grande pagou | Público um sorteio depois | Todo mundo |
| A lista de endereços dos poupadores | Público | Todo mundo |
| Quando você depositou, sacou ou foi avaliado, e em qual lote | Público | Todo mundo |
| O contador de não financiado | Público na finalização | Todo mundo |
| Valores de patrocínio e a taxa de pingo | Público | Todo mundo |
| O valor que você empacota para dentro, ou desempacota para fora, do token confidencial | Público | Todo mundo |
| Todo limiar que qualquer endereço tinha que superar, em qualquer nível | Publicamente calculável | Todo mundo |

Duas formas de ler essa tabela. A coluna esquerda de segredos é exatamente a informação por
pessoa, mais os dois totais do pool que acabaram se revelando informação por pessoa
disfarçada. A coluna direita de fatos públicos é o que alguém de fora precisa para conferir que
o sorteio foi honesto. Essa divisão é o projeto.

## O que um observador consegue e não consegue deduzir

Um observador com um nó de arquivo completo e paciência ilimitada consegue montar:

- A lista completa de poupadores e o bloco exato em que cada um agiu.
- A semente, a faixa, a colheita e os tamanhos de prêmio de cada sorteio, e a contagem de
  prêmios de cada nível, um sorteio depois do sorteio a que pertence.
- Todo limiar que todo endereço tinha que superar. Ele pode literalmente calcular a sua escada.
- O saldo total do pool no token confidencial dele como um handle cifrado, que ele não
  consegue ler.

Ele não consegue obter:

- Nenhum saldo individual, em nenhum momento.
- Nenhum peso individual, portanto as chances de ninguém.
- Quais endereços ganharam qualquer sorteio, ou quanto alguém recebeu.
- O peso total exato do pool, só a potência de dois acima dele.

A distância entre essas duas listas é o que o Hearth vende. O resto desta página é o relato
honesto de onde essa distância diminui.

## Regra 1: a faixa, e o vazamento que removemos

Até 3 de setembro de 2026 este projeto publicava o saldo total exato ponderado pelo tempo do
pool, `W`, a cada sorteio, com o argumento de que publicá-lo era o que tornava o sorteio
verificável. Uma revisão provou que esse argumento saía caro demais.

Aqui está o vazamento, nos termos do revisor. Para qualquer período fechado `p`,
`W_p = B * L + soma sobre cada ação de D_i * (periodEnd(p) - t_i)`, onde `B` é o principal
total carregado para dentro do período e `D_i` é a mudança com sinal feita por cada ação. `B`,
`L`, `periodEnd(p)` e cada `t_i` são públicos, porque os eventos de depósito e saque carregam
os carimbos de tempo. Então **um poupador que é o único a mover dinheiro em um período tem esse
valor recuperável a partir dos dois totais publicados e do carimbo de tempo público da própria
transação dele.** Não limitado, recuperado exatamente, resto zero. E piora com mais dados, não
melhora: todo período fechado é mais uma equação, toda ação é uma incógnita, a cadeia está
ancorada em zero, e os eventos dizem quem agiu e quando, então dois movimentadores entre dois
períodos calmos também são recuperados exatamente.

Aquele vazamento acabou, porque o número de que ele precisa não é mais publicado. O que o cofre
publica agora é a faixa: a menor potência de dois igual ou acima de `W`, escrita `M`. Cinco
comparações cifradas por sorteio acompanham onde `W` está em relação à faixa do sorteio
anterior, e só a pequena contagem que elas somam é decifrada. Entre cruzamentos de uma potência
de dois, sorteios consecutivos publicam o mesmo número, e subtrair um do outro dá zero.

O que resta é uma versão bem menor da mesma coisa.

- **Um poupador.** A faixa publicada é o peso desse poupador com margem de um fator dois.
- **Dois poupadores.** Cada um pode subtrair o próprio peso e limitar o do outro, de novo com
  margem de um fator dois.
- **Três ou mais.** Qualquer divisão compatível com a faixa é possível, e o conjunto cresce a
  cada poupador adicional.

O aplicativo declara isso acima de toda tela sempre que o pool tem menos de três poupadores. A
própria documentação da Zama faz o mesmo ponto sobre o batcher deles, com as mesmas palavras:
"a soma de um valor é o valor". Uma faixa é uma versão mais fraca dessa frase, não uma fuga
dela.

## Regra 2: um saldo que um observador consegue fixar não tem privacidade nenhuma no sorteio

Esta é a afirmação mais afiada da página, então ela ganha uma regra própria.

O teste do vencedor é uma função determinística de um segredo, o seu peso, e de dados no mais
inteiramente públicos. Os limiares são públicos por projeto, porque são eles que tornam o
sorteio verificável. Então **qualquer um que consiga fixar o seu saldo calcula o seu resultado
de ganhou ou perdeu em todo nível de todo sorteio, sem nenhuma decifragem**, e em todo sorteio
posterior também, já que os ganhos ficam em um saldo separado que nunca entra nas chances.

A forma usual de um saldo ser fixado é a costura do empacotamento da regra 3: empacotar um
token público na forma confidencial dele é um movimento público, então um poupador que empacota
e depois deposita o mesmo
valor segundos depois publicou o depósito. A partir daí os resultados dele nos sorteios são
aritmética pública.

Até um limite frouxo morde. Um observador que tenha apenas um teto do seu saldo prova uma
derrota certa em qualquer nível cujo limiar fique acima daquele teto.

O que o aplicativo faz a respeito: mantém blindar e depositar como passos separados da tela de
Depósito, e no passo da blindagem diz em um parágrafo para você usar um número redondo, de modo
que uma blindagem seja um balde e não um depósito exato, para blindar na hora que você quiser,
e para depositar parte depois, de modo que um depósito saia de um acúmulo de composição
desconhecida. O que nenhuma mudança de contrato consegue fazer é tornar um limiar privado,
porque um limiar privado é um sorteio inverificável.

## Regra 3: a costura do empacotamento, nos dois sentidos

Transformar um token público na forma confidencial dele é um movimento ERC-20 público. O valor
aparece
no evento `Wrap` do wrapper, no `Transfer` do token subjacente, e de novo no registro do
coprocessador ao cifrar aquele texto claro. Não existe forma confidencial de converter um token
público.

Nós medimos a correlação na nossa própria implantação anterior. Varrendo os blocos 11528000 a
11618500 da Sepolia, três de cinco depósitos ficaram de dois a quatro blocos depois de um
empacotamento público de exatamente 100 USDC pelo mesmo endereço. Qualquer pessoa lendo
registros públicos poderia precificar esses três depósitos em 100 USDC sem quebrar uma única
garantia criptográfica. A Zama documenta o mesmo efeito para o batcher deles e o chama de
correlação blindagem-entrada.

Desempacotar também publica um valor, e é a primeira das duas chamadas de desempacotamento que
faz isso, então um desempacotamento que nunca é finalizado ainda assim vaza. Isso dá uma
segunda divulgação nomeada: **os ganhos acumulados viram um piso público para qualquer endereço
que empacota para dentro e desempacota para fora integralmente.** Para um endereço cuja única
contraparte naquele token confidencial é
o Hearth, o total público desempacotado menos o total público empacotado é exatamente os ganhos
de toda a vida que foram sacados, menos o principal e o saldo confidencial que aquele endereço
ainda tem. Os dois estão escondidos e não são negativos, então a diferença é sempre um piso, e
ela vira exata assim que o endereço esvazia tudo.

Desempacotar para um endereço novo não ajuda, porque a transferência confidencial para aquele
endereço é ela mesma o elo.

O que o Hearth faz: passos separados, um aviso no passo da blindagem do Depósito, uma linha
naquele passo e outra na aba "De volta ao USDC comum" do Saque dizendo para você mover um
número redondo, e a sugestão de deixar um saldo confidencial permanente para trás. O valor é
seu para digitar de qualquer jeito; o aplicativo não oferece um conjunto de denominações. O que
o Hearth não pode fazer: remover nada disso.

## Regra 4: as contagens de prêmios publicadas são uma medição lenta

Toda reconciliação publica quantos prêmios um nível pagou. Como o limiar de todo poupador é
público, essa contagem é uma restrição dura da forma "quantos destes poupadores tinham um peso
acima do próprio limiar publicado". Ela carrega poucos bits, mas é uma medição real, e ela se
acumula.

**Um saldo que nunca muda ao longo de muitos sorteios é progressivamente estreitado por essas
contagens.** Um poupador que deposita ou saca reinicia a própria incógnita e recomeça o
estreitamento do zero.

Duas coisas limitam a velocidade. As contagens são grosseiras: nada mais fino que um número
inteiro de prêmios é jamais divulgado. E os limiares não são escolhíveis por um atacante,
porque a semente é sorteada dentro do coprocessador e revelada só depois que o período dela
fechou, então ninguém pode mirar uma consulta em um saldo suspeito.

Um terceiro amortecedor estava disponível, e esta implantação abriu mão dele de propósito.
`reconcileEvery[t]` define quantos sorteios passam entre publicações do remanescente de um
nível. Aumentá-lo publica uma contagem por intervalo em vez de uma por sorteio, então um prêmio
grande é atribuído a todo mundo que foi elegível naquele intervalo. O que isso custa é o
próprio prêmio grande: um fechamento move toda a liquidez pública de um nível para dentro do
sorteio, e esse dinheiro só volta em uma reconciliação, então numa cadência de 24 a liquidez
pública do nível grande é a cota de colheita de um único sorteio em 23 de cada 24 sorteios, o
prêmio publicado é dimensionado a partir disso, e o bolo acumulado aparece à vista apenas no
sorteio da reconciliação. O dinheiro fica oferecido e ganhável o tempo todo dentro do
remanescente cifrado. Ninguém consegue vê-lo.

Então os três níveis rodam em `reconcileEvery = 1`. O bolo se acumula em público, a contagem de
cada nível vira pública um sorteio depois, e a medição acima roda na velocidade máxima de uma
contagem por nível por sorteio. No nível grande isso significa que um pagamento aponta para os
poupadores elegíveis naquele único sorteio, cerca de quatro por cento do pool, em vez de para
um dia deles. Este é um resíduo divulgado, não um mitigado, e é a limitação 14. A cadência
segue sendo um argumento de construtor, então uma implantação que queira a medição mais lenta
pode tê-la.

## Regra 5: a camada do token é da Zama, não nossa

O ativo de todo pool é um dos tokens confidenciais da Zama. Isso é deliberado, e significa que
os poderes do próprio token se aplicam ao dinheiro que passa pelo Hearth, pool por pool: sete
wrappers, os mesmos poderes em cada um. Nomeando esses poderes:

O contrato na Sepolia é um `ConfidentialWrapper` atrás de um proxy atualizável, de propriedade
da Zama, com propriedade em dois passos e renúncia desabilitada. Ler o código-fonte verificado
dele em 2 de setembro de 2026 dá três fatos que importam para a privacidade:

1. **Observadores, retroativamente.** O dono pode chamar `addObserver(address)`, que dá àquele
   endereço decifragem de usuário coringa sobre todo handle em que o contrato do token tem
   direitos. Isso cobre todo valor de depósito, todo pagamento de saque, e todo valor de
   financiamento de prêmio por lote que o pool envia ao cofre. A palavra que importa é
   retroativa: um observador nomeado em qualquer momento futuro pode decifrar valores que já
   estão na blockchain, então "vigiar o `ObserverAdded` e sair" não é uma defesa. Estado ao
   vivo em 2 de setembro de 2026: `observerCount()` é 0 e `observers()` está vazio.
2. **Lista de bloqueio e pausa.** O dono pode bloquear um endereço, o que o impede de
   depositar, sacar ou desempacotar, porque cada uma dessas coisas é uma atualização do token
   com aquele endereço de um dos lados. Existe um papel de pausador; ao vivo ele está no
   endereço zero, então a pausa está desabilitada no momento.
3. **Atualizabilidade.** A implementação pode ser substituída pelo dono dela, então o
   comportamento do token, inclusive como ele trata os handles em que tem direitos, pode mudar
   por baixo de nós.

Note o escopo preciso do item 1. Não existe transferência de prêmio por poupador no Hearth,
então não existe pagamento por vencedor para um observador ler. O que se move na camada do
token é uma transferência de financiamento por lote de avaliação, do pool para o cofre,
carregando o total creditado a todo mundo daquele lote. Um lote de um faz desse total o prêmio
exato de um poupador, e o pool ao vivo de cinco poupadores com lote de tamanho 4 termina toda
varredura com um lote de um. `evaluate` é aberto a qualquer pessoa e pega o tamanho do lote de
quem chama, então nenhum lote mínimo pode ser imposto. A [limitação 7](../limitations.md)
registra isso como um resíduo aceito e nomeia o conserto do lado do contrato.

O que um observador na camada do token não obteria é o livro do próprio Hearth. Seu principal,
seus ganhos, seu peso e seu crédito vivem no armazenamento do cofre, e o token não tem direitos
de controle de acesso sobre nenhum deles. Verificamos isso na implantação anterior: o endereço
do token devolve falso para permissão sobre os handles de ganhos e principal de um
depositante, enquanto o depositante e o pool devolvem verdadeiro.

Então a afirmação honesta é: use o Hearth e você confia ao wrapper da Zama os valores que
passam por ele, exatamente como qualquer aplicativo ERC-7984 faz. Você não confia a ele a sua
posição.

A alternativa era escrever o nosso próprio token confidencial, coisa que vários projetos desta
área fizeram. Isso troca um contrato conhecido, auditado e operado pela Zama por um que nós
mesmos avaliaríamos. Preferimos documentar a fronteira de confiança real a fabricar uma menor.

## Regra 6: a avaliação não entrega ninguém, e ninguém escolhe a ordem

`evaluate(drawId, count)` recebe um número, não uma lista de endereços. O cofre percorre a
lista de poupadores a partir de um ponto derivado da semente daquele sorteio, na ordem da
lista, e quem chama só decide o quanto avançar. Um poupador que quer o próprio resultado avança
a mesma varredura que o keeper avança.

Isso fecha duas coisas de uma vez.

Fecha a denúncia por autoavaliação. Em uma versão anterior, a avaliação recebia uma lista de
endereços, então um poupador podia calcular o próprio resultado a partir das entradas públicas
e depois pagar para ser avaliado só quando tivesse ganhado. Enviar aquela transação teria sido
uma denúncia de vencedor tão alta quanto uma função de resgate. Agora não existe transação que
só um vencedor enviaria.

Fecha a alavanca de ordenação. Quando um nível fica com sobredemanda e seca, quem a varredura
alcança por último fica curto. Aquela ordem é fixada pela semente, então ninguém pode comprar
um lugar melhor com gás, e o ponto de partida muda a cada sorteio, então nenhum endereço fica
sistematicamente por último. A consequência para a justiça está descrita em
[prêmios e níveis](../concepts/prizes-and-tiers.md) e é a limitação 11.

Todo poupador avaliado em um sorteio recebe as mesmas escritas, no mesmo formato, tenha ganhado
ou não, porque o pagamento passa por uma seleção cifrada em vez de um desvio. O lote em que um
poupador caiu, e a posição dele dentro do lote, são públicos e não dizem nada sobre o resultado
dele.

## Regra 7: o resíduo comportamental

O Hearth não tem transação de resgate, então não existe ação em formato de vencedor para
vigiar. Descobrir que você ganhou é uma assinatura fora da blockchain que não toca em nada, e o
botão de resgate do aplicativo, que carrega o valor, envia um saque comum que se parece com
todo outro saque.

O resíduo é o que você faz em seguida. Um poupador que saca imediatamente depois de todo
sorteio que ganhou, e nunca fora disso, entrega a um observador uma pista estatística ao longo
do tempo. Ela é fraca, leva muitos sorteios para se formar, e está inteiramente sob controle do
poupador. A mitigação é comportamental, não criptográfica: saque no seu próprio ritmo, ou deixe
os ganhos acumularem.

Declaramos isso porque a alternativa, afirmar que o comportamento na blockchain não revela
nada, é falsa em todo projeto deste tipo. Projetos desta área que removeram a função de resgate
chegaram à mesma conclusão e escreveram isso. Nós também.

## O que esta página não cobre

Ela não cobre atacantes e as motivações deles, que é o
[modelo de ameaças](threat-model.md). Não cobre como conferir um sorteio por conta própria, que
é [aleatoriedade e verificação](randomness-and-verification.md). E não faz nenhuma afirmação
sobre privacidade em nível de rede: o endereço IP de onde você conecta, o provedor de RPC que
você usa e o pedido ao relayer que você envia estão fora da blockchain e fora desta análise.
