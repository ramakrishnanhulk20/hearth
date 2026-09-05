# Perguntas frequentes

## 1. Em qual token eu posso poupar?

Sete: USDC, USDT, WETH, BRON, ZAMA, tGBP e XAUt, todos eles tokens confidenciais da própria Zama
na Sepolia. Cada um é um pool separado com os próprios contratos, os próprios poupadores e o
próprio dinheiro de prêmio, e o pool em que você está é a primeira parte da URL depois de `/app`.
O seletor também mostra o Confidential tGBP oficial da Zama, em cinza: o token público dele só
pode ser cunhado pelo emissor, então ninguém consegue empacotá-lo e nenhum pool pode existir sobre
ele. Todo o resto desta página vale para cada pool por conta própria. Detalhes em
[pools e tokens](concepts/pools-and-tokens.md).

## 2. Onde está o botão de resgate?

Em "Meus sorteios" no aplicativo, no cartão daquele sorteio, sob "Seu resultado", depois que você
o abriu com o olho. Ele aparece apenas quando aquele sorteio te creditou alguma coisa e o cofre
ainda deve dinheiro a essa carteira: o mesmo olho abre juntos o crédito daquele sorteio e o total
corrente de ganhos não resgatados do cofre, e o botão oferece o menor dos dois. É esse segundo
número que o torna honesto. O crédito de um sorteio nunca muda depois de escrito, então um botão
preso só ao crédito ofereceria o mesmo prêmio de novo depois de um recarregamento, e a blockchain
o pagaria com o seu próprio principal. Por baixo
ele deliberadamente não é uma transação separada: os prêmios são creditados no seu saldo cifrado
de ganhos durante a avaliação, e o botão de resgate, que carrega o valor, envia um saque comum
daquele valor, o que na blockchain se parece exatamente com qualquer outro saque. Na maioria dos
protocolos de prêmio só os vencedores têm motivo para enviar uma transação de resgate, então a
lista de transações silenciosamente os nomeia; aqui não existe essa transação para vigiar. O mesmo
dinheiro sai pela aba "Para fora do cofre" no Saque, porque um resgate é um saque com outro nome.

## 3. Eu posso perder o meu principal?

Não. Os prêmios são pagos com rendimento, nunca com o depósito de ninguém, e `withdraw` está
sempre aberto, inclusive enquanto um sorteio está rodando. A única coisa que você pode perder é um
prêmio que teria ganhado: se a varredura de avaliação não chegar em você dentro da janela de dois
períodos, aquele sorteio não te paga nada e o dinheiro volta para o nível. Veja a limitação 2.

## 4. Vocês conseguem ver o meu saldo ou os meus ganhos?

Não. Seu principal, seus ganhos, seu peso em cada sorteio e seu crédito em cada sorteio são
valores cifrados a que só o seu endereço tem acesso, e a lista de controle de acesso da Zama impõe
isso na blockchain, não como uma política que a gente promete. Nós vemos as mesmas coisas que um
estranho vê: que você depositou, quando, e nada sobre o valor.

## 5. Como as minhas chances são calculadas?

Pelo seu saldo médio ao longo do período inteiro, não pelo seu saldo quando o sorteio acontece. Um
período é de uma hora no pool de USDC e de seis horas nos outros seis.
Mantenha 100 USDC por um período completo de uma hora e o seu peso é 360.000 saldo-segundos; os
seus prêmios esperados em um nível são esse peso dividido pela faixa publicada, multiplicado pelas
chances e pela contagem de prêmios daquele nível. Dividir o seu dinheiro entre carteiras não muda
nada, porque a expectativa é exatamente proporcional ao peso.

## 6. Depositei cinco minutos antes do sorteio e não ganhei nada. Por quê?

Porque cinco minutos de um período de uma hora são um doze avos das chances que você teria
mantendo o valor o período todo, e um setenta e dois avos em um período de seis horas. É isso que
impede alguém de mostrar um saldo grande logo antes de cada sorteio, ganhar e sacar; nós
executamos esse ataque contra o nosso próprio projeto anterior e ele levou 19 de 20 sorteios.
Deposite e deixe lá, e você recebe a sua fatia completa a partir do próximo período completo.

## 7. Os meus ganhos também rendem chances?

Sozinhos, não. Os ganhos ficam em um saldo cifrado separado que não conta para o seu peso, então
os juros compostos não são automáticos: saque e deposite de volta para colocá-los para trabalhar.
Essa separação é o que faz um saque de prêmio parecer idêntico a um saque de poupança.

## 8. Quem dispara os sorteios, e o que acontece se pararem?

Nós rodamos um processo keeper por pool, cada um na própria conta, então um keeper que para custa
a um pool os sorteios dele e deixa os outros seis rodando. O pool também implementa a interface de
automação da Chainlink, então um upkeep baseado em tempo poderia cobrir o passo de fechamento,
embora nenhum esteja registrado em nenhum pool ainda. De qualquer forma, todo passo de um sorteio
pode ser chamado por qualquer pessoa, inclusive por você pelo aplicativo.
Fechar tem um prazo próprio, meio período antes do fim da janela, para que um fechamento nunca
possa acontecer tarde demais para a premiação seguir. Se nada rodar, aquele sorteio é pulado: a
liquidez dele fica nos níveis para o próximo sorteio, o rendimento é contabilizado quando uma
premiação atrasada acontecer, e depósitos e saques continuam funcionando. Um keeper travado custa
sorteios, nunca dinheiro.

## 9. Vocês poderiam viciar o número aleatório, ou o tamanho do prêmio?

Nenhum dos dois. A semente é gerada dentro do coprocessador da Zama como texto cifrado, então
ninguém a vê no momento em que é sorteada, e fechar um sorteio dá certo exatamente uma vez, então
não há segunda rolagem. Os tamanhos dos prêmios são fixados mais cedo nessa mesma transação, antes
de a semente existir, então ninguém pode ler uma semente, descobrir que ganhou e depois aumentar o
ganho. Depois que o período termina, a semente é publicada com uma assinatura do serviço de gestão
de chaves da Zama que o contrato verifica na blockchain, e a partir dela qualquer um pode
recalcular o limiar exato que qualquer endereço tinha que superar.

## 10. Por que o pool publica só um tamanho aproximado em vez do total exato?

Porque o total exato entrega depósitos individuais. Dois totais consecutivos, mais o carimbo de
tempo público do seu próprio depósito, deixam qualquer um resolver para o seu valor exato se você
foi o único que moveu dinheiro naquele período. Não uma estimativa, o número. Então o cofre publica
apenas a menor potência de dois acima do total, contra a qual o sorteio roda. O custo é que um
nível paga entre metade e todos os prêmios nominais dele a cada sorteio, com o resto carregado
adiante e oferecido de novo, então os tamanhos dos prêmios se acomodam um pouco maiores. As
chances de ninguém ficam distorcidas em relação às de outro.

## 11. De onde vem o dinheiro dos prêmios?

Na Sepolia, de um saldo financiado por patrocinador que pinga a uma taxa fixa, um por pool, porque
nenhum lugar na Sepolia paga rendimento sobre os tokens mock da Zama. Na mainnet a mesma interface
se encaixa no Confidential Vault da Zama, que coloca USDC confidencial em um cofre de rendimento
ERC-4626 de verdade através de um batcher. De qualquer forma, o pool contabiliza apenas o valor
que uma decifragem verificada pelo KMS diz que de fato chegou, nunca um número que a fonte declara
sobre si mesma.

## 12. O que alguém que observa a blockchain consegue aprender sobre mim?

Que você é um poupador, em qual bloco você depositou ou sacou, e em qual lote de avaliação você
estava. Não o seu saldo, não as suas chances, não se você ganhou. Quatro costuras valem saber. A
faixa publicada fica perto de informação pessoal quando há menos de três poupadores. Se alguém
consegue fixar o seu saldo, normalmente vigiando um empacotamento público seguido de um depósito
do mesmo tamanho, então o seu resultado em todo sorteio é aritmética pública dali em diante,
porque os limiares são públicos por projeto. Empacotar para dentro e desempacotar para fora
integralmente publica um piso de tudo que você ganhou. E cada nível publica quantos prêmios pagou,
um sorteio depois, o que é uma medição grosseira dos saldos cifrados e estreita lentamente um
saldo que nunca se move. Publicamos essa contagem a cada sorteio porque é o mesmo passo que
devolve o dinheiro não ganho ao bolo público, que é o que permite ao prêmio grande acumular onde
você pode vê-lo. As quatro estão cobertas em
[o que permanece privado](security/what-stays-private.md).
