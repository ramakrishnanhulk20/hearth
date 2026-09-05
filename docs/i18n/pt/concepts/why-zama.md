# Por que isto precisa da Zama

O teste a aplicar em qualquer projeto que afirme precisar de uma tecnologia específica: apague
aquela tecnologia e veja se o produto sobrevive. Se ele continua funcionando, a tecnologia era
enfeite.

## Apague a criptografia e não sobra produto

Criptografia totalmente homomórfica, geralmente abreviada como FHE, significa aritmética feita
diretamente sobre números cifrados, produzindo uma resposta cifrada, sem nunca decifrar as
entradas. O Protocolo da Zama traz isso para o Ethereum: um contrato em Solidity pode somar,
comparar e escolher entre valores que ele não consegue ler.

Tire isso do Hearth e veja o que sobra.

| Peça do Hearth | Sem FHE |
| --- | --- |
| Seu saldo | Um número público. Qualquer um precifica sua poupança e suas chances. |
| O teste do vencedor | Uma comparação pública. O resultado fica visível para todo mundo no instante em que roda. |
| Quem ganhou um sorteio | Público, porque o crédito que cai no saldo de alguém é um número visível. |
| A semente aleatória | Ou um número público que alguém vê chegando, ou um número fora da blockchain que alguém escolhe. |
| Créditos de prêmio | Transferências públicas para vencedores identificados. |

O que você obtém é o PoolTogether. O PoolTogether já existe, funciona e roda há anos. Não há
motivo para reconstruí-lo.

O produto que o Hearth de fato vende é a coisa que o PoolTogether não pode oferecer: poupança
premiada em que o seu saldo, as suas chances e os seus ganhos são só seus, enquanto o sorteio
segue verificável por estranhos. Essas duas propriedades estão em tensão numa blockchain
transparente. A computação cifrada é a única coisa que as resolve, e o Protocolo da Zama é o
único lugar no Ethereum que faz isso hoje.

Não existe versão parcial. Cada uma das cinco linhas acima é uma promessa central. Remova a
criptografia de qualquer uma e o produto falha naquela linha.

## As peças exatas que usamos

Não "construído sobre a Zama". Aqui está a lista, com o que cada peça faz por nós.

### Inteiros cifrados

`euint64` para dinheiro e pesos, `euint128` para o acumulador do total do pool, `ebool` para o
resultado de uma comparação. O principal, os ganhos, o peso e o crédito de cada poupador são
um desses, e o remanescente de cada nível também. A aritmética que fazemos sobre eles é
`FHE.add`, `FHE.sub`, `FHE.mul` por um número público, `FHE.min`, `FHE.gt`, `FHE.le`,
`FHE.and` e `FHE.select`.

A comparação está fazendo mais trabalho aqui do que só o teste do vencedor. Cinco comparações
cifradas por sorteio colocam o peso total do pool contra as potências de dois em volta da
última faixa conhecida, e a única coisa que sai do mundo cifrado é a pequena contagem de
quantas das cinco ele superou. É assim que o sorteio ganha uma escala pública para rodar
contra, sem que o total em si jamais vire um número.

`FHE.select` merece uma nota, porque é o que torna o projeto inteiro possível. É um "se" cuja
condição é cifrada: ele devolve um de dois valores cifrados e a blockchain não consegue dizer
qual. É assim que um vencedor e um perdedor produzem transações idênticas. Nada desvia sobre um
segredo em lugar nenhum do Hearth.

`FHE.fromExternal` pega um valor cifrado que o usuário montou no navegador, com a prova dele, e
o transforma em um valor que o contrato pode usar. É assim que um valor de depósito chega
cifrado de ponta a ponta.

### ERC-7984, o padrão de token confidencial

O ativo de cada pool é um dos tokens confidenciais da Zama, um wrapper ERC-7984 em volta de um
ERC-20 comum: cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP ou cXAUt. Os saldos neles são valores
cifrados em vez de números públicos.

Os depósitos chegam por `confidentialTransferAndCall`, que transfere um valor cifrado e chama
o gancho do destinatário na mesma transação. O gancho do cofre recebe o valor que o token
realmente moveu, e é assim que o cofre credita a realidade em vez de um pedido. Os pagamentos
vão pelo caminho contrário, por `confidentialTransfer`.

Usar o token padrão, em vez de escrever o nosso, importa. Vários projetos desta área
improvisaram um token "no estilo ERC-7984". Todos os nossos são tokens que a Zama implantou,
então o saldo confidencial de um poupador é usável fora do Hearth e o comportamento do próprio
token não é algo que a gente define a nosso favor. Também significa que o Hearth pode abrir um
pool sobre um token confidencial novo no dia em que a Zama o publica, que foi como seis dos
sete foram acrescentados, e que ele pode não abrir nenhum sobre um token cujo mint o emissor
guarda para si.

### Aleatoriedade cifrada

`FHE.randEuint64()` gera um número aleatório dentro do coprocessador da Zama, sob a chave FHE
da rede, a partir de uma semente que é pública mas inútil sem aquela chave. O número sai como
texto cifrado. Ninguém, nós inclusive e quem envia a transação inclusive, vê o número no
momento em que ele é criado.

Ele tem que ser gerado dentro de uma transação, porque muta o estado do gerador na blockchain.
Isso descarta o truque de pré-visualizar um sorteio fora da blockchain com `eth_call` para ver
se você ganharia, e é por isso que fechar um sorteio é uma transação de verdade que dá certo
exatamente uma vez. Ninguém pode sortear de novo uma semente de que não gostou.

### A lista de controle de acesso

A lista de controle de acesso na blockchain da Zama decide quem pode decifrar qual texto
cifrado. É imposição, não política: o relayer recusa um pedido sobre um handle a que quem
chamou não tem direito.

O Hearth usa quatro chamadas dela. `FHE.allowThis` mantém um valor utilizável pelo contrato em
transações posteriores. `FHE.allow` dá a um poupador acesso permanente de leitura ao próprio
principal, aos próprios ganhos e ao peso e crédito por sorteio. `FHE.allowTransient` dá acesso
pela duração de uma transação, que é como o cofre entrega ao pool uma permissão única sobre o
total de um lote de avaliação sem nunca lhe dar acesso permanente. `FHE.makePubliclyDecryptable`
abre um valor para todo mundo, e nós a usamos em exatamente seis tipos de valor: a semente, a
contagem de escala que dá a faixa, o sinalizador de não vazio, a colheita, o remanescente de um
nível quando aquele nível está na vez de reconciliar, e o contador de não financiado. O peso
total exato do pool está deliberadamente fora dessa lista.

Essa última chamada é de mão única e permanente. É a coisa mais consequente que um contrato
neste protocolo pode fazer, então todo uso dela no Hearth está listado em
[o que permanece privado](../security/what-stays-private.md).

### Decifragem de usuário EIP-712

É assim que um poupador lê os próprios números. Ele assina uma mensagem estruturada e tipada,
que é um padrão de assinatura que mostra ao signatário exatamente o que ele está aprovando, e o
relayer da Zama devolve o texto claro dos valores a que aquele poupador tem direito.

É um pedido fora da blockchain. Sem transação, sem gás, sem rastro. É por isso que o Hearth
pode não ter função de resgate nenhuma: descobrir que você ganhou não custa nada e não deixa
nada para trás. A outra metade dessa promessa é que a avaliação também não pode ser apontada
para você mesmo, então não existe transação de tipo algum que só um vencedor enviaria.

Tanto o saldo quanto os ganhos são decifráveis pelo dono. O Hearth também concede o peso e o
crédito por sorteio, para que um poupador possa verificar a aritmética do sorteio contra as
próprias entradas em vez de ser convidado a confiar nela.

### Decifragem pública assinada pelo KMS

O caminho contrário. Um contrato marca um valor como publicamente decifrável, qualquer um pede
o texto claro ao relayer, e o relayer o devolve com uma assinatura do serviço de gestão de
chaves, o grupo que detém a chave de decifragem da rede. O contrato então verifica essa
assinatura na blockchain com `FHE.checkSignatures` antes de agir sobre o número.

É isso que transforma "a gente diz que a semente foi 12345" em um número que o próprio contrato
se recusa a aceitar sem prova. O Hearth usa isso uma vez por sorteio para a semente, a contagem
de escala, o sinalizador de não vazio e a colheita, juntos no momento da premiação, e de novo
para o remanescente de um nível sempre que aquele nível está na vez de reconciliar, o que na
Sepolia é todo nível em todo sorteio. Toda prova é amarrada aos handles dela em uma ordem fixa,
então nada pode ser embaralhado nem reaproveitado em outro sorteio ou em outro nível.

## Em que um poupador de fato confia

Nomear isso é o objetivo da página.

- **No Protocolo da Zama**, para computar corretamente sobre textos cifrados e decifrar apenas
  o que está marcado como decifrável. Toda decifragem sobre a qual os contratos agem carrega
  uma prova verificada na blockchain. Essa é a mesma fronteira de confiança que o Confidential
  Vault da própria Zama documenta.
- **Nos wrappers de token confidencial**, que são contratos da Zama e não nossos, e que são
  atualizáveis pelo dono deles. Veja a seção da camada do token em
  [o que permanece privado](../security/what-stays-private.md).
- **Nos contratos do próprio Hearth**, que são imutáveis depois de implantados, sem proxy e
  sem caminho de atualização. Os poderes que restam ao dono são estreitos e estão listados no
  [modelo de ameaças](../security/threat-model.md): uma pausa que interrompe depósitos e o
  fechamento de sorteios mas nunca saques nem avaliação, um seletor de fonte de rendimento, um
  caminho de resgate para tokens estranhos que não pode tocar saldos de poupadores, e
  transferência de propriedade em dois passos com renúncia desabilitada.

Nada nessa lista é uma pessoa em quem pedimos que você acredite.
