# Experimente na Sepolia

A Sepolia é a rede de testes pública do Ethereum. O dinheiro nela não é real, então você
pode rodar o ciclo inteiro de graça. O pool de USDC sorteia a cada hora e os outros seis
sorteiam a cada seis horas, então escolha USDC se quiser assistir a um sorteio de um período
em que você depositou. O caminho de dois minutos no fim desta página não espera por um.

O aplicativo ao vivo está em https://hearth-ram.vercel.app. Tudo abaixo também pode ser
feito direto de um explorador de blocos, se você preferir ver as chamadas cruas.

## 0. Escolha um token

O Hearth roda sete pools, um para cada token confidencial que a Zama publica na Sepolia.
Cada um é um conjunto separado de contratos com seus próprios poupadores, seu próprio
dinheiro de prêmio e seu próprio relógio, então escolher um token é escolher um pool. O nome
do token no topo da barra lateral abre o seletor, e o pool em que você está é a primeira
parte da URL: `/app/usdc`, `/app/weth` e assim por diante.

| Token | Slug | Sorteia a cada | Token público com o `mint` aberto |
| --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 hora | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` |
| Confidential USDT (Mock) | `usdt` | 6 horas | `0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0` |
| Confidential WETH (Mock) | `weth` | 6 horas | `0xff54739b16576FA5402F211D0b938469Ab9A5f3F` |
| Confidential BRON (Mock) | `bron` | 6 horas | `0xFf021fB13cA64e5354c62c954b949a88cfDEb25E` |
| Confidential ZAMA (Mock) | `zama` | 6 horas | `0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57` |
| Confidential tGBP (Mock) | `tgbp` | 6 horas | `0x93c931278A2aad1916783F952f94276eA5111442` |
| Confidential XAUt (Mock) | `xaut` | 6 horas | `0x24377AE4AA0C45ecEe71225007f17c5D423dd940` |

O seletor também lista o **Confidential tGBP** oficial da Zama, em cinza, porque o mint do
token subjacente pertence ao emissor e mais ninguém consegue obter o token. Escolhê-lo
mostra uma página que nomeia o token, aponta para os dois contratos e não oferece nenhuma
ação de carteira, em vez de um botão de depósito que iria reverter.

O aplicativo é lido em dezesseis idiomas, escolhidos no botão da barra superior. O inglês
mantém as URLs simples e todos os outros idiomas colocam o código na frente, então a mesma
tela em japonês é `/ja/app/usdc`.

## Contratos que você vai tocar

O passo a passo abaixo usa o pool de USDC. Todos os outros pools são o mesmo conjunto de
contratos em endereços diferentes, listados em
[pools e tokens](../concepts/pools-and-tokens.md).

| O quê | Endereço | Quem implantou |
| --- | --- | --- |
| Mock USDC (ERC-20 público, `mint` aberto) | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` | Zama |
| Confidential USDC (`cUSDCMock`, wrapper ERC-7984) | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | Zama |
| HearthVault | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | Hearth |
| HearthPrizePool | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | Hearth |
| SponsoredYieldSource | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` | Hearth |

Os dois endereços da Zama são os que estão publicados na própria referência de endereços do
Confidential Vault da Zama para a Sepolia, então o token de teste é da Zama, não nosso. Todo
wrapper confidencial dessa lista usa 6 casas decimais, o que significa que todo valor na
blockchain dentro do wrapper está em milionésimos: 1.000 USDC se escreve `1000000000`. O
token público por baixo pode usar uma escala diferente, e o `rate()` do wrapper é a
conversão. O mock USDC também usa 6, então os dois concordam. O mock WETH usa 18, então a
taxa dele é um milhão de milhões.

## 1. Consiga ETH da Sepolia

Você precisa de um pouco de ETH da Sepolia para pagar o gás. Qualquer faucet da Sepolia
serve. Os mais usados são o faucet Web3 do Google Cloud, o faucet Sepolia da Alchemy e o
faucet da Chainlink, e cada um paga o suficiente para este passo a passo em um único pedido.
Um décimo de ETH é muito mais do que o necessário.

## 2. Cunhe o token de teste

Cada um dos sete mocks públicos tem um `mint(address, uint256)` público sem checagem de
dono, com teto de um milhão de tokens por chamada, e os endereços estão na tabela acima. O
aplicativo expõe isso como um botão na tela de Depósito de qualquer pool em que você esteja,
no primeiro dos três passos, escrito "Consiga USDC de teste" enquanto sua carteira não tem
nenhum e "Consiga mais um milhão" depois que tem, com o token daquele pool no rótulo. Na
mão, para USDC, é:

```
USDCMock.mint(yourAddress, 1000000000)     // 1,000 USDC
```

Peça mais do que você precisa. Nada aqui vale alguma coisa.

## 3. Blindar: empacotar USDC em USDC confidencial

O Confidential USDC é o wrapper ERC-7984 da Zama em volta daquele mock USDC. O ERC-7984 é o
padrão de token confidencial: os saldos ficam na blockchain como valores cifrados em vez de
números que qualquer um pode ler. Empacotar são duas chamadas:

```
USDCMock.approve(cUSDC, 1000000000)
cUSDC.wrap(yourAddress, 1000000000)
```

No aplicativo essas duas chamadas são o passo 2 do Depósito, "Blinde seu USDC". O botão diz
"Blindar", e "Aprovar o wrapper" enquanto a permissão do wrapper estiver abaixo do valor que
você digitou.

Agora você tem 1.000 USDC confidenciais. Daqui em diante, seu saldo é um handle de texto
cifrado e só você consegue lê-lo.

Empacotar é público. O wrapper emite um evento `Wrap` carregando o valor em texto claro, a
transferência ERC-20 por baixo carrega o valor de novo, e o valor aparece uma terceira vez
no registro de cifragem trivial do coprocessador. Não há como contornar isso: converter um
token público em um confidencial é, por definição, um ato público.

## 4. Deposite no pool

Uma chamada, e o valor já sai cifrado desde o começo:

```
cUSDC.confidentialTransferAndCall(vault, encryptedAmount, inputProof, "")
```

O aplicativo monta a entrada cifrada e a prova dela para você com o SDK da Zama. O gancho de
recebimento do cofre credita exatamente o valor que o token diz que realmente se moveu, não
o valor que você pediu, então uma transferência que veio a menor por qualquer motivo não
consegue criar principal fantasma.

O cofre recusa um depósito cujo valor, ou cujo principal resultante, empurraria você acima
do teto por poupador, que em um período de uma hora é cerca de 5 bilhões de tokens e em um
período de seis horas cerca de 854 milhões. As duas metades
dessa checagem importam: a soma cifrada dá a volta silenciosamente em 64 bits, então limitar
o valor que entra além do total é o que impede um depósito enorme de virar a soma para um
número pequeno e passar batido. A recusa é ela mesma cifrada: o gancho devolve um falso
cifrado e o token te reembolsa dentro da mesma transação, então uma rejeição não conta a
ninguém qual era o seu saldo.

### Por que empacotar e depositar são dois passos, e não um

A maioria dos aplicativos desta área junta "aprovar, empacotar, depositar" atrás de um botão
só. É mais simpático e vaza o seu depósito.

Nós medimos isso na nossa própria implantação anterior. Lendo os registros públicos dos
blocos 11528000 a 11618500 da Sepolia, três dos cinco depósitos ficaram de dois a quatro
blocos depois de um `Wrap` público de exatamente 100 USDC pelo mesmo endereço. Qualquer
pessoa lendo a blockchain poderia precificar esses três depósitos em 100 USDC cada sem
quebrar nada. A própria documentação da Zama nomeia o mesmo problema e o chama de correlação
blindagem-entrada: "Um usuário que empacota 50.000 USDC e entra em um lote minutos depois
publicou, na prática, apenas o limite superior do valor de entrada."

Então o Hearth mantém os dois separados de propósito:

- Empacote uma vez, em um número redondo, na hora que você quiser.
- Mantenha um saldo confidencial permanente e deposite parte dele depois.
- Deposite de novo a partir do mesmo saldo sem empacotar de novo.

A correlação enfraquece com o tempo, com o reuso de um saldo permanente e com o tráfego de
outras pessoas no wrapper. Fazer tudo em um clique remove as três defesas. O aplicativo
mostra o aviso no passo da blindagem em vez de esconder o custo da escolha.

Vale ser direto sobre o que um saldo identificado te custa, porque é mais do que o valor do
depósito. Os limiares são públicos por projeto, já que são eles que tornam o sorteio
verificável. Então qualquer pessoa que saiba o seu saldo pode calcular se você ganhou, em
todo nível, em todo sorteio dali em diante, sem decifrar nada. É por isso que são dois
passos e não um.

## 5. Espere um sorteio

Um período é uma hora no pool de USDC e seis horas nos outros seis, pelo motivo de gás
explicado em [pools e tokens](../concepts/pools-and-tokens.md). O sorteio de um período só
pode ser fechado depois que aquele período terminou, e tudo relativo a ele tem que terminar
dentro dos dois períodos seguintes.
O fechamento em si tem um prazo mais apertado, o meio do segundo desses períodos, para que a
ida e volta da decifragem e a premiação sempre tenham espaço. Então um depósito que você faz
agora ganha chances para o período atual, e o resultado desse período chega dentro das
próximas horas.

O painel mostra o período atual e o tempo restante em "O pool agora", e "Meus sorteios" na
barra lateral mostra o estado dos últimos. Você não precisa fazer nada. Se quiser empurrar
por conta própria, todo passo de um sorteio pode ser chamado por qualquer pessoa, e "Rodar um
sorteio" na barra lateral tem os cinco. Veja [a página do keeper](../operations/keeper.md).

Suas chances em um período são baseadas no seu saldo médio ao longo daquele período inteiro,
não no seu saldo no fim dele. Depositar cinco minutos antes de um período de uma hora fechar
compra um doze avos das chances de ter mantido o mesmo valor o período todo. Isso é
deliberado. Veja
[saldo ponderado pelo tempo](../concepts/time-weighted-balance.md).

## 6. Revele o que você tem e o que você ganhou

Aperte o olho ao lado de "Principal" no cartão "O que você tem" no painel, e assine a
mensagem que sua carteira mostrar. Valores lacrados aparecem como asteriscos até você fazer
isso, e o olho é a única coisa que os abre.

Essa assinatura é a decifragem de usuário EIP-712: uma assinatura tipada fora da blockchain
que prova ao relayer da Zama que você controla o endereço, em troca do texto claro dos
valores a que o contrato te deu acesso. Não é uma transação. Não custa gás e não escreve
nada na blockchain.

Você pode revelar quatro coisas sobre você:

| Valor | Significado |
| --- | --- |
| Principal | O que você poupou. |
| Ganhos | Dinheiro de prêmio creditado a você e ainda não sacado. |
| Peso, por sorteio | Seu saldo ponderado pelo tempo naquele período, o número que o teste do vencedor comparou. |
| Crédito, por sorteio | O que aquele sorteio te pagou. Zero se você não ganhou. |

Os dois primeiros abrem juntos pelo mesmo olho em "O que você tem", no painel. Os dois
últimos abrem juntos pelo olho ao lado de "Seu prêmio", sob "Seu resultado" no cartão daquele
sorteio em "Meus sorteios". Seu saldo e o resultado de um sorteio podem estar abertos ao
mesmo tempo, a assinatura do primeiro serve para o segundo, e apertar um olho aberto lacra
apenas o cartão em que ele está.

Os dois últimos são o que permite conferir o sorteio por conta própria: pegue seu peso, pegue
a semente pública e a faixa pública, recalcule seus limiares e confirme que o crédito bate. O
cofre expõe a aritmética dos limiares como uma função de leitura, `thresholdOf`, para você
comparar suas contas com as do contrato. Veja
[aleatoriedade e verificação](../security/randomness-and-verification.md).

Mais ninguém consegue ler nenhum desses quatro. O relayer recusa um pedido de decifragem
vindo de um endereço a que o contrato não deu acesso, e essa recusa é a imposição, não uma
política.

## 7. Resgatar

Não existe transação de resgate, só um botão de resgate.

Seu prêmio já está no seu saldo de ganhos no momento em que a varredura chega até você. O
passo 6 é como você fica sabendo. Assim que o resultado daquele sorteio está aberto, o cartão
dele em "Meus sorteios" mostra um botão de resgate carregando o valor, algo como "Resgatar
1,00 USDC". Apertá-lo envia um saque comum exatamente daquele valor, e o passo 8 leva o resto
para casa. Na blockchain um resgate e um saque são a mesma chamada com o mesmo formato, e é
isso que impede um vencedor de se destacar.

Também não há nada para apertar para ser creditado. A avaliação percorre a lista de
poupadores a partir de um ponto que a semente daquele sorteio decide. O botão "Avançar o
sorteio" no cartão daquele sorteio, e "Avançar" na tela "Rodar um sorteio", movem essa mesma
varredura compartilhada em vez de escolherem você dentro dela. Um poupador que aperta
qualquer um dos dois não está contando a ninguém que ganhou.

## 8. Sacar

```
vault.withdraw(encryptedAmount, inputProof)      // or vault.withdrawAll()
```

No aplicativo esses são os botões "Sacar" e "Sacar tudo" na tela de Saque, na aba "Para fora
do cofre". "Tudo" ao lado do campo não é uma terceira chamada: preenche o campo com tudo que
você tem, depois que você abriu o seu saldo.

Os saques pagam primeiro dos ganhos, depois do principal. O valor é limitado ao menor entre o
que você tem e o que o cofre tem, porque uma transferência confidencial move o valor inteiro
ou nada, nunca uma parte. Calcular isso antes da transferência é o que mantém o livro exato
sem nenhum conserto depois. Uma transferência confidencial, um evento, um valor cifrado.

O principal nunca fica travado. Você pode sacar no meio de um sorteio, e o peso que o sorteio
já fixou para você não muda.

## 9. Desblindar: desempacotar de volta para USDC público

Duas chamadas, porque desempacotar é assíncrono por projeto. Primeiro `unwrap`, depois
`finalizeUnwrap`. O aplicativo envia as duas pelo botão "Desblindar" na aba "De volta ao USDC
comum" da tela de Saque. Se a segunda ficar por fazer, um cartão de aviso fica acima das duas
abas até você apertar "Terminar a desblindagem" nele. As listas exatas de argumentos estão no
wrapper da Zama, não no nosso.

A primeira chamada queima o valor cifrado e o marca para decifragem pública. A segunda libera
os tokens em texto claro assim que o protocolo da Zama produziu o texto claro e a prova dele.
O valor que você desempacota é público, exatamente como o valor que você empacotou, e é a
primeira chamada que o publica, então um desempacotamento que você nunca finaliza já vazou.

Isso dá uma segunda coisa que vale saber. Se você empacota para dentro e desempacota para
fora integralmente, a diferença entre os dois totais públicos é um piso de tudo que você já
ganhou, e depois que você esvaziou tudo ela é exata. Desempacotar para um endereço novo não
ajuda, porque a transferência confidencial para aquele endereço é ela mesma o elo. Se isso
importa para você, desempacote em números redondos sem relação com a sua posição, ou deixe um
saldo confidencial permanente para trás.

## Experimente em dois minutos

O aplicativo é um console com uma barra à esquerda, uma tarefa por tela, então o caminho é
uma caminhada por essa barra.

1. Abra https://hearth-ram.vercel.app, siga "O pool" no cabeçalho até `/app` e conecte uma
   carteira na Sepolia. Você chega no pool de USDC em `/app/usdc`. O nome do token no topo da
   barra troca de pool. O painel abre com um bloco marcado "Próximo" nomeando a única coisa a
   fazer.
2. "Depósito" na barra lateral, que abre no passo em que a sua carteira está, dos três.
   Clique em "Consiga USDC de teste", depois "Blindar", depois "Depositar".
3. De volta ao painel, aperte o olho ao lado de "Principal" em "O que você tem" e assine: seu
   principal e seus ganhos aparecem, só no navegador.
4. "Rodar um sorteio" na barra lateral, a linha marcada "Qualquer um". Aperte "Fechar",
   depois "Premiar", para fechar e premiar você mesmo o último período terminado, ou veja o
   keeper fazer isso.
5. Aperte "Avançar" na mesma tela. Depois abra "Meus sorteios" e aperte o olho sob "Seu
   resultado" no cartão daquele sorteio: seu peso e seu crédito daquele sorteio aparecem, e o
   saldo do passo 3 continua aberto com uma assinatura só.
6. Abra `/verify?pool=usdc`: a semente pública e a faixa estão lá, "Limiares de um endereço"
   recalcula seus limiares na sua frente, e a comparação bate. Troque o parâmetro `pool` por
   qualquer outro slug para conferir aquele pool.
7. "Saque" na barra lateral, aba "Para fora do cofre", "Sacar tudo". O principal e os ganhos
   voltam em uma transferência.

Nada nesse caminho precisa que a gente esteja no ar. Todo passo do sorteio é aberto a
qualquer pessoa.
