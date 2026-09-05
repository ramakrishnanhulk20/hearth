# Saldo ponderado pelo tempo

Suas chances em um sorteio não são baseadas no que você tem quando o sorteio acontece. São
baseadas no seu saldo médio ao longo do período inteiro. Esta página explica por quê, o que
isso custa a quem deposita tarde, e por que o cofre só precisa lembrar de três momentos por
poupador.

## Por que a média, e não o final

Considere primeiro o projeto simples: pesar cada um pelo saldo que tinha no instante do
sorteio. É fácil de construir, e é quebrado.

Um atacante deposita um valor grande, espera o sorteio, ganha e saca. O dinheiro dele ficou no
pool por um bloco. Ele não gerou rendimento para ninguém, não correu risco nenhum, e levou o
prêmio que os poupadores pacientes financiaram. Depois ele faz de novo no sorteio seguinte.

Nós executamos isso contra o nosso próprio projeto anterior em 2 de setembro de 2026. Em um
pool onde um poupador honesto tinha 100 USDC, um atacante circulando 9.000 USDC para dentro e
para fora em torno de cada sorteio ganhou 19 de 20 sorteios e esvaziou uma reserva de prêmios
de 5.000 USDC. O capital do atacante nunca esteve em risco, porque um pool sem perdas por
definição o devolve. O ciclo inteiro coube até em uma única transação: depositar, abrir o
sorteio, varrer, sacar, gás 2.189.992.

O conserto é o mesmo que o PoolTogether usa. A documentação deles coloca assim: a capacidade
de olhar para trás no tempo importa "para que os usuários possam depositar e sacar livremente
em um prize pool com a contribuição de liquidez deles medida perfeitamente". Meça a
contribuição, não a foto.

## Quanto vale um depósito tardio

Um período é de 3.600 segundos no pool de USDC e de 21.600 nos outros seis. O peso é o saldo
multiplicado pelos segundos em que foi mantido, então é medido em saldo-segundos do token
daquele pool. O exemplo abaixo é o pool de USDC, de uma hora.

| Poupador | O que fez | Peso do período |
| --- | --- | --- |
| Ada | Manteve 100 USDC pelos 3.600 segundos inteiros | 100 x 3600 = 360.000 |
| Ben | Depositou 1.000 USDC faltando 360 segundos | 1.000 x 360 = 360.000 |
| Cy | Manteve 1.000 USDC pelo período inteiro | 1.000 x 3600 = 3.600.000 |

Ben colocou dez vezes o dinheiro da Ada e comprou exatamente as mesmas chances, porque esteve
lá por um décimo do tempo. Cy, que fez aquilo para que o produto existe, tem dez vezes as
chances de qualquer um dos dois.

O caso espelhado também funciona. Saque no instante em que um sorteio fecha e você mantém o
peso que já ganhou para o período encerrado, e carrega quase nada para o próximo. Não dá para
alugar chances.

Nada disso impede alguém que genuinamente mantém um saldo grande por um período inteiro de
ganhar com frequência. Isso não é um ataque. É o produto funcionando: o dinheiro dessa pessoa
estava no pool, gerando o rendimento que paga os prêmios de todo mundo, o tempo todo.

## Como o cofre lembra

O cofre guarda três instantâneos por poupador, chamados de observações. Cada um guarda três
coisas: um total corrente de saldo-segundos, o saldo logo depois daquela mudança, e o carimbo
de tempo. As três posições se chamam `current`, `previous` e `older`.

O total corrente zera no início de cada período. Esse reset é o que mantém o número pequeno:
dentro de um período ele nunca pode passar do saldo multiplicado pela duração do período.

Quando o seu saldo muda, uma de três coisas acontece:

- **Sua primeiríssima mudança.** A posição `current` é criada com total corrente zero e o seu
  novo saldo.
- **Uma mudança no mesmo período de `current`.** O cofre soma os saldo-segundos que você
  acumulou desde a última mudança e depois sobrescreve `current` no lugar. Nenhuma posição
  nova é usada.
- **Uma mudança em um período posterior ao de `current`.** As três posições descem: `older`
  recebe o antigo `previous`, `previous` recebe o antigo `current`, e um `current` novo é
  escrito, carregando os saldo-segundos que você acumulou do início deste período até agora.

Ler o seu peso do período `p` usa a observação mais recente em ou antes daquele período:

- Se ela estiver dentro do período `p`, seu peso é o total corrente que ela carrega mais o seu
  saldo multiplicado pelos segundos daquele momento até o fim do período.
- Se ela estiver antes do período `p`, você não tocou no seu saldo durante o período, então o
  seu peso é simplesmente aquele saldo multiplicado pela duração inteira do período.
- Se você não tem observação em ou antes do período `p`, você ainda não era poupador, e o seu
  peso é zero. Esse caso é decidido a partir de carimbos de tempo públicos sem nenhuma
  aritmética cifrada.

Cada passo cifrado aqui é uma multiplicação por um número público e uma soma. É isso que
mantém a avaliação barata o bastante para agrupar em lotes.

Um detalhe que importa para o argumento de contagem abaixo. Toda saída escreve uma observação,
tenha movido principal ou não, porque o cofre não consegue ver de qual dos seus dois saldos o
saque saiu. Isso é inofensivo: uma posição só desce quando um período novo começou, então um
saque só de ganhos não consome nenhuma posição além da que o seu período já ia usar.

## Por que três observações bastam

Esta é a pergunta que um revisor deveria fazer, e a resposta é um argumento de contagem.

Uma posição nova é empurrada apenas quando uma mudança de saldo cai em um período posterior ao
período em que `current` está. No máximo um empurrão acontece por período, não importa quantas
vezes você deposite ou saque dentro dele.

O sorteio `p` só pode ser fechado, premiado e avaliado durante os períodos `p+1` e `p+2`.
Então, quando alguém lê o seu peso do período `p`, no máximo dois períodos posteriores a `p`
começaram, e portanto no máximo duas observações novas foram empurradas por cima da que era a
mais recente em ou antes do período `p`. Três posições dão conta: a de que precisamos, mais as
no máximo duas que chegaram depois dela.

É por isso que a janela é de dois períodos e não mais. Alargue a janela e você precisa de uma
quarta posição; mantenha em um período e uma única resposta atrasada do relayer pode perder um
sorteio, o que um período curto tornava dolorosamente provável. Fechar tem um prazo próprio,
meio período antes do fim da janela, então as mesmas três posições sempre cobrem a ida e volta
que segue um fechamento.

O cofre guarda as mesmas três observações para o saldo total do pool, então o peso agregado de
um período é calculado pela regra idêntica e é válido pela mesma janela. Esse agregado nunca é
publicado. O que o cofre publica é a faixa de potência de dois acima dele, e ele descobre essa
faixa comparando o mesmo número acumulado contra cinco potências de dois fixas, sob cifragem.
Veja
[o que permanece privado](../security/what-stays-private.md).

## Os dois limites de tamanho

Os valores cifrados aqui são inteiros sem sinal de 64 bits, então a aritmética tem que ficar
dentro dessa faixa. Estourar um número cifrado é pior do que estourar um número comum, porque
nada reverte e ninguém vê acontecer.

**Por poupador.** O cofre recusa qualquer depósito cujo valor, ou cujo principal resultante,
ficaria acima de `maxPrincipal = (2^64 - 1) / L`. Em um período de uma hora isso dá cerca de 5
bilhões de tokens, em um período de seis horas cerca de 854 milhões, e em um período diário
cerca de 213 milhões. Como o seu total corrente
não pode passar do seu saldo multiplicado pela duração do período, e o seu saldo não pode
passar desse teto, o seu total corrente não pode passar de 64 bits. A recusa volta como um
falso cifrado e o token te reembolsa na mesma transação, então bater no teto não revela o seu
saldo.

A checagem limita o valor que entra além do resultado, e esse segundo limite não é enfeite. A
soma cifrada dá a volta em 64 bits sem reverter, então um depósito de `2^64` menos o seu
principal produziria uma soma zero, e uma checagem que só olhasse a soma deixaria passar. Com
o valor e o principal existente ambos abaixo do teto, a soma não pode alcançar `2^64` em
nenhuma duração de período que o construtor permita, então a volta é inalcançável em vez de
apenas improvável.

**Para o total do pool.** O acumulador corrente do total tem 128 bits em vez de 64, então o
agregado não pode estourar para nenhuma emissão que o wrapper consiga cunhar.

Uma versão anterior deste projeto afirmava que um acumulador de 64 bits não podia estourar.
Estava errado, uma revisão de projeto pegou isso, e o teto mais o total de 128 bits são o
conserto.

## O que esta página não cobre

Ela não cobre o que acontece depois que o seu peso é conhecido. Isso é o
[teste do vencedor](winner-selection.md). Ela também não afirma que a ponderação pelo tempo é
um recurso de privacidade: o seu peso é cifrado, mas a faixa em que o total do pool cai é
publicada a cada sorteio, e com pouquíssimos poupadores essa faixa fixa um peso com margem de
um fator dois. Veja [o que permanece privado](../security/what-stays-private.md).
