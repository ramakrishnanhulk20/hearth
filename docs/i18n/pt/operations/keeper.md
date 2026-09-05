# O keeper

Sorteios não acontecem sozinhos. Alguma coisa tem que enviar as transações. Esta página é o que
essa coisa faz, o que acontece quando ela para, e quanto custa.

Um processo conduz um pool. O Hearth roda sete pools na Sepolia, então rodam sete processos
keeper, cada um assinando pela própria conta da mesma frase semente e cada um apontado para o
arquivo de endereços de um pool. A seção "Um keeper por pool" abaixo é a tabela.

O enquadramento importante primeiro: o keeper não tem privilégio nenhum. Toda função que ele
chama pode ser chamada por qualquer um, e as duas alavancas de que um keeper poderia ter
abusado, escolher quem é avaliado e escolher a ordem dos pagamentos, não são mais alavancas. Ele
é uma conveniência que poupa trabalho aos poupadores, não um papel de que o pool depende para
ser seguro.

## O trabalho, em ordem, para o sorteio `p`

1. **Fechar.** Chame `closeDraw(p)` depois que o período `p` terminou e antes de
   `closeDeadline(p)`, que é o meio do período `p+2`. O começo do período `p+1` é o hábito
   certo. Isso fixa o tamanho do prêmio e a liquidez oferecida de cada nível, move essa liquidez
   para dentro do sorteio, sorteia a semente cifrada, pede ao cofre a contagem de escala cifrada
   e o sinalizador de não vazio, colhe a fonte de rendimento, e marca os quatro handles como
   publicamente decifráveis.
2. **Buscar as provas.** Peça ao relayer da Zama para decifrar publicamente os quatro handles na
   ordem `[seed, scaleCount, nonEmpty, harvested]`. O relayer devolve os textos claros com uma
   assinatura do serviço de gestão de chaves.
3. **Premiar.** Chame `awardDraw(p, seed, scaleCount, nonEmpty, harvested, proof)`. O contrato
   verifica a assinatura na blockchain, contabiliza a colheita nos níveis, e abre o sorteio. Os
   vencedores são decididos neste momento.
4. **Avaliar.** Chame `evaluate(p, count)` no cofre, repetidamente, até a varredura dar a volta
   até onde começou. Cada chamada avança um cursor por sorteio pela lista de poupadores a partir
   de um início derivado da semente. O keeper escolhe `count`, nunca quais endereços; `4` é o
   máximo de poupadores precisando de trabalho cifrado que cabe em uma transação.
   Poupadores sem observação em ou antes do período `p` são pulados pelo próprio contrato, a
   partir de carimbos de tempo em texto claro, sem custo cifrado.
5. **Finalizar.** Depois que a janela fecha no fim do período `p+2`, chame `finalizeDraw(p)`.
   Isso dobra o resto não pago de cada nível no remanescente cifrado daquele nível, publica o
   contador de não financiado, e marca o remanescente como publicamente decifrável para todo
   nível que esteja na vez de reconciliar, emitindo `CarryPublished`.
6. **Reconciliar, por nível na vez.** Para cada nível que `finalizeDraw` publicou, busque o
   texto claro do remanescente e chame `reconcile(tier, carry, proof)`. O pool confere a prova
   contra o handle que o cofre publicou, contabiliza o número verificado na liquidez em texto
   claro do nível, o cofre subtrai o número do remanescente (que pode ter crescido desde a
   publicação), e `TierReconciled` é emitido.

Na Sepolia todo nível de todo pool está na vez a cada sorteio, então o passo 6 roda até três
vezes depois de cada finalização. A cadência é um argumento de construtor por nível e o keeper a
lê da blockchain em vez de supô-la, então uma implantação que publique o remanescente de um
nível com menos frequência não precisa de mudança no keeper. Por que esta publica os três a cada
sorteio está em
[prêmios e níveis](../concepts/prizes-and-tiers.md).

## A regra de ordem

**Finalize e reconcilie o sorteio `p` no começo do período `p+3`, antes de fechar o sorteio
`p+2` nesse mesmo período.**

O motivo é dinheiro, não correção. Um fechamento dimensiona os prêmios de cada nível pela
liquidez em texto claro daquele nível naquele momento, e a reconciliação é o que transforma o
remanescente de um sorteio anterior de volta em liquidez em texto claro. Reconcilie primeiro e
esse dinheiro conta para o tamanho do prêmio na hora; reconcilie depois e ele espera um sorteio.

Os dois trabalhos ficam disponíveis no mesmo instante. A janela do sorteio `p` termina no fim do
período `p+2`, e o sorteio `p+2` fica fechável no começo do período `p+3`, então o keeper faz a
finalização e as reconciliações devidas primeiro, depois o fechamento.

Nada se perde se a ordem escorregar, mas para que lado ela escorrega importa. Feche antes da
finalização e o remanescente do nível ainda não está pendente, então `openDraw` o dobra na oferta
e aquele dinheiro ainda pode ser ganho; ele só não aumenta o tamanho publicado do prêmio, que o
`closeDraw` fixa apenas a partir da liquidez em texto claro. Finalize, depois feche, depois
reconcilie, e o remanescente está pendente: `openDraw` deixa um remanescente pendente inteiramente
fora do sorteio, então aquele dinheiro não é nem oferecido nem ganhável até a reconciliação
limpar o sinalizador. Na Sepolia todo nível está na vez a cada finalização, então este é o caso
comum, e é por isso que o keeper lê os remanescentes de novo depois das finalizações e reconcilia
antes de fechar. Nada se perde de um jeito nem do outro: o primeiro fechamento depois de uma
reconciliação dobra tudo de volta.

## O que acontece quando o keeper está fora do ar

Nada se perde. Essa é a resposta inteira, e ela vale por causa de como um passo perdido é
tratado:

| Passo perdido | Consequência |
| --- | --- |
| O fechamento nunca acontece, ou acontece depois de `closeDeadline` e reverte | O sorteio fica em `None` e é pulado. A liquidez dele nunca foi movida, então fica nos níveis e é oferecida no próximo sorteio. A colheita é recolhida pelo próximo fechamento. |
| A premiação nunca acontece dentro da janela | Uma premiação atrasada ainda contabiliza a colheita, ainda devolve a liquidez oferecida aos níveis, e marca o sorteio como `Skipped`. Nenhum rendimento e nenhuma liquidez desaparecem. |
| A varredura não alcança todo poupador | Os poupadores que a varredura não alcançou não recebem nada daquele sorteio. A parte deles na oferta é dobrada no remanescente do nível na finalização e é oferecida de novo. Este é o único caso em que um poupador real perde algo que poderia ter ganhado, e é a limitação 2. |
| A finalização ou a reconciliação atrasa | Os níveis carregam menos liquidez em texto claro por um tempo, então os prêmios ficam menores. Um remanescente que uma finalização publicou e nenhuma reconciliação limpou fica fora de todo fechamento até a reconciliação acontecer. Nada se perde: o primeiro fechamento depois de uma reconciliação dobra tudo de volta. |

Um keeper travado custa ao pool sorteios, não dinheiro. Depósitos e saques continuam funcionando
o tempo todo, porque o caminho de pausa nunca os toca e um sorteio travado não tranca nada.

Nossa implantação anterior é o exemplo de advertência: `openDraw` era aberto a qualquer pessoa e
ninguém o chamou, então o pool ao vivo ficou 26 horas com um sorteio pronto para abrir. Aberto a
qualquer pessoa não é a mesma coisa que automatizado. É por isso que este projeto tem um keeper
de verdade e um caminho de redundância por baixo dele.

## Como um poupador avança um sorteio sozinho

Todo passo acima é aberto a qualquer pessoa, e o aplicativo expõe cada um deles na tela "Rodar
um sorteio", em `/app/<slug>/run` para o pool em que a pessoa está, que é a linha da barra
lateral marcada "Qualquer um". Um cartão no topo
nomeia o passo que o pool está esperando, e cada um dos cinco abaixo dele carrega o próprio
botão, desligado com um motivo declarado quando não é a vez daquele passo:

- **Fechar**, depois **Premiar.** Fechar fixa os tamanhos dos prêmios e sorteia a semente
  cifrada. Premiar busca as quatro provas de decifragem no navegador e envia os textos claros
  assinados de volta. A chamada ao relayer é a mesma que o keeper faz, e o SDK a faz a partir da
  página.
- **Avançar.** Roda `evaluate(p, count)` para o sorteio aberto no momento, avançando a varredura
  compartilhada por um lote. A mesma chamada fica no cartão do seu próprio sorteio em "Meus
  sorteios" como "Avançar o sorteio". Este é o botão a apertar se o keeper estiver fora do ar e a
  varredura ainda não tiver chegado em você. Ele não deixa você se escolher, e isso é a
  característica: porque ninguém pode se destacar, enviar esta transação não diz nada sobre se
  você ganhou.
- **Finalizar** e **Reconciliar.** Rodam os dois passos de encerramento para qualquer sorteio
  cuja janela tenha terminado.

Nenhum desses precisa da nossa permissão, das nossas chaves ou dos nossos servidores no ar.

## Chainlink Automation, apenas para o passo de fechamento

O `HearthPrizePool` implementa a interface `checkUpkeep` e `performUpkeep` da Chainlink para o
passo de fechamento. Registrar um upkeep baseado em tempo dá ao pool uma segunda forma
independente de conseguir fechar sorteios no horário, e fechar é o passo que tem prazo, então é
o que vale segurar.

Ele cobre o fechamento e nada mais, e a razão é simples: fechar é o único passo que não precisa
de dados de fora da blockchain. Premiar precisa de uma prova de decifragem buscada no relayer da
Zama. Avaliar precisa ser repetido até um cursor dar a volta. Reconciliar precisa de outra
decifragem. Uma rede de automação na blockchain não consegue buscar nada disso, então fingir que
conseguiria seria teatro.

O upkeep é opcional. Ele precisa de LINK em uma conta de upkeep registrada, e é redundância e
não o caminho principal, e seria um upkeep por pool, cada um no cronograma daquele pool. Nenhum
está registrado em nenhum dos sete ainda, então só os keepers rodam os pools de demonstração.

Declaramos a interface de duas funções localmente em vez de acrescentar o pacote inteiro de
contratos da Chainlink e as dependências dele por dois seletores.

## O orçamento

Custos por sorteio, da implantação ao vivo.

| Passo | Transações por sorteio | Gás de cada |
| --- | --- | --- |
| Fechar | 1 | `1,422,474` |
| Premiar | 1 | `435,578` |
| Avaliar, um lote cheio de 4 | `floor(savers / 4)`, aqui 1 | `3,417,699` |
| Avaliar, o último lote parcial | 0 ou 1, aqui 1 carregando um poupador | `1,291,192` para um poupador, mais `708,836` por cada extra |
| Finalizar | 1 | `509,463` |
| Reconciliar | 3, um por nível, já que todo nível está na vez a cada sorteio | `459,994` |

Com 5 poupadores isso dá `8,456,388` de gás por sorteio, ou cerca de
`0.0085 ETH` a 1 gwei, a taxa base da Sepolia na implantação. Em um período de uma hora isso são
24 sorteios por dia e `0.2030 ETH` por dia; em um período diário são `0.0085 ETH`.

Multiplique por sete pools e essa é a razão inteira de seis deles sortearem a cada seis horas em
vez de a cada hora. De hora em hora nos sete são 168 sorteios por dia, cerca de `1.43 ETH`, que
os faucets públicos não conseguem acompanhar. Um pool de uma hora e seis pools de seis horas são
48 sorteios por dia, cerca de `0.41 ETH`. Cada conta de keeper é financiada separadamente, então
um pool que fica sem gás para apenas os próprios sorteios.

Mais um poupador em um lote custa `708,836` de gás na Sepolia, e um lote carregando um único
poupador custa `1,291,192`, já que a parte fixa da chamada é paga de todo jeito. Em unidades de
computação um poupador é `3,674,128` na tabela de preços do coprocessador mock, que é onde esse
número é legível, porque um recibo ao vivo não reporta unidades de computação. O tamanho de lote
`4` é definido a partir dessa medição contra os limites publicados da Zama para a Sepolia, de
20.000.000 de unidades de computação por transação com 5.000.000 em profundidade sequencial.
`evaluate` aceita qualquer contagem, então se a Zama reprecificar uma operação o keeper pode cair
para um lote menor sem reimplantação.

**O keeper avalia a varredura inteira.** Nada na blockchain limita quanto a avaliação custa, e o
keeper também não para no meio; o que ele impõe é um teto de taxa
(`KEEPER_MAX_FEE_GWEI`), abaixo do qual ele continua enviando até o cursor chegar ao fim. A
consequência honesta está declarada no [modelo de ameaças](../security/threat-model.md): um pool
enchido com endereços sem valor custa mais gás por sorteio ao keeper, não os prêmios dos
poupadores, porque endereços sem observação antes do período são pulados sem nenhum trabalho
cifrado. Se o keeper estiver fora do ar, qualquer um pode apertar "Avançar", e como a varredura
começa em um ponto diferente a cada sorteio, ninguém fica permanentemente no fim.

## Um keeper por pool

Um processo sabe qual pool conduz pelo `HEARTH_ADDRESSES_FILE`, o arquivo de endereços que a
implantação daquele pool escreveu, que também lhe dá o símbolo do token, as casas decimais e o
índice de conta com que assinar. `KEEPER_NAME` é a etiqueta que toda linha de log carrega.
`packages/keeper/ecosystem.config.cjs` sobe todos os sete sob o pm2 em uma máquina, um processo
cada.

| Processo pm2 | `HEARTH_ADDRESSES_FILE` | `KEEPER_ACCOUNT_INDEX` |
| --- | --- | --- |
| `hearth-keeper-usdc` | `hearth.json` | 1 |
| `hearth-keeper-usdt` | `hearth.usdt.json` | 10 |
| `hearth-keeper-weth` | `hearth.weth.json` | 11 |
| `hearth-keeper-bron` | `hearth.bron.json` | 12 |
| `hearth-keeper-zama` | `hearth.zama.json` | 13 |
| `hearth-keeper-tgbp` | `hearth.tgbp.json` | 14 |
| `hearth-keeper-xaut` | `hearth.xaut.json` | 15 |

O processo `usdc` aponta para `hearth.json` em vez de `hearth.usdc.json` porque esse é o arquivo
que a primeira implantação escreveu, antes de os pools terem slugs, e o keeper que está rodando
está apontado para ele há dias. Os dois arquivos carregam os mesmos endereços.

Os índices são espaçados para que um pool posterior possa ser acrescentado sem renumerar, e cada
conta precisa do próprio ETH da Sepolia. O índice 0 é o implantador e o keeper o recusa.

## Onde rodam os sete que estão no ar

O pm2 num laptop é um jeito de rodar os sete e ele continua funcionando. Não é o que está no ar.
Os sete keepers da Sepolia rodam na Railway, um serviço por pool, então um laptop fechado não
para sorteio nenhum.

Um keeper é um processo de longa duração, e não uma função agendada: uma passada pode gastar
dois minutos esperando o serviço de gestão de chaves (KMS), mais tempo do que a maioria das
plataformas serverless permite. Serve qualquer hospedagem que mantenha um processo Node vivo, e
o repositório carrega a configuração desta aqui:

- O `railway.json`, na raiz do repositório, conduz o pool `usdc`.
- O `railway/hearth-keeper-<slug>.json` conduz cada um dos outros seis. Cada comando de início
  define ali mesmo o `KEEPER_NAME`, o `KEEPER_ACCOUNT_INDEX` e o `HEARTH_ADDRESSES_FILE` daquele
  pool, então um serviço construído a partir de um deles só precisa de `RECOVERY_PHRASE` e
  `SEPOLIA_RPC_URL`.

O build é `npm run build -w @hearth/keeper` e o início é
`node packages/keeper/dist/src/index.js`, em qualquer hospedagem. As ABIs de contrato de que o
keeper precisa estão versionadas em `packages/keeper/abi`, então uma hospedagem que nunca compila
os contratos ainda assim o roda, e a checagem de arranque compara a ABI carregada com as funções
que o keeper chama, de modo que um desvio é relatado na partida e não na primeira transação. Os
arquivos de endereços precisam estar versionados pelo mesmo motivo, e estão, em
`packages/contracts/deployments/sepolia/`.

Rode exatamente um processo por pool, onde quer que ele rode. Dois keepers assinando pela mesma
conta disputam o mesmo nonce, então pare a cópia local antes de subir uma hospedada para o mesmo
pool. A configuração passo a passo, serviço por serviço, está no README do próprio pacote do
keeper, `packages/keeper/README.md`.

## Rodando

O keeper é o pacote `@hearth/keeper`. Ele assina com uma conta da mesma `RECOVERY_PHRASE` que a
implantação usa e lê `SEPOLIA_RPC_URL` de
`packages/contracts/.env`; as configurações dele ficam em `packages/keeper/.env`:

```
HEARTH_ADDRESSES_FILE=../contracts/deployments/sepolia/hearth.weth.json
KEEPER_ACCOUNT_INDEX=11            # defaults to the index in the address file
KEEPER_NAME=weth                   # defaults to the slug in the address file
KEEPER_BATCH=4                     # savers of encrypted work per evaluate call
KEEPER_POLL_SECONDS=30
KEEPER_MAX_FEE_GWEI=20             # refuse to send above this
```

```
npm run compile -w @hearth/contracts    # the keeper reads the compiled ABI
npm run build -w @hearth/keeper
npm run plan -w @hearth/keeper          # one pass, simulates every call, sends nothing
npm run once -w @hearth/keeper          # one live pass
pm2 start packages/keeper/ecosystem.config.cjs   # all seven
pm2 logs hearth-keeper-weth                      # one pool
```

`plan` e `once` conduzem o pool para o qual o `HEARTH_ADDRESSES_FILE` aponta, então conferir
outro pool é uma variável na frente do comando. Se `HEARTH_VAULT` e `HEARTH_POOL` ainda estiverem
em `packages/keeper/.env` de uma configuração de pool único, tire-os de lá: eles são lidos antes
do arquivo de endereços, então os sete processos conduziriam um pool só.

Uma passada registra uma linha por fato, e toda linha é etiquetada com o pool que o processo
conduz, então sete logs entrelaçados continuam legíveis. Os valores carregam o símbolo daquele
pool e as casas decimais dele, ambos lidos do arquivo de endereços:

```
09:14:37 [usdc] closed draw 41 (gas 1,422,474)
09:14:39 [usdc] draw 41: asking the relayer for the seed, the scale, the empty flag and the harvest
09:14:53 [usdc] awarded draw 41: 3 tiers, prizes 12.40 / 2.10 / 0.40 cUSDC, harvest 3.60 cUSDC (gas 435,578)
09:15:07 [usdc] evaluated draw 41: 4 of 9 savers done (gas 3,417,699)
09:15:38 [usdc] nothing to do: period 43, draw 41 has 8 of 9 savers evaluated
```

O processo do WETH imprime as mesmas linhas sob `[weth]`, em `cWETH`. O que cada tipo de linha
significa, linha por linha, está no README do próprio pacote do keeper,
`packages/keeper/README.md`.

O keeper não guarda estado entre tiques: ele lê o estado do sorteio, o cursor de avaliação e a
cadência de reconciliação da blockchain e descobre o que fazer. Reiniciá-lo não perde nada. Rode
exatamente uma instância por pool, e nunca duas em uma conta: na blockchain todo passo dá certo
exatamente uma vez por sorteio e por nível, e duas chamadas de avaliação simplesmente avançam o
mesmo cursor, mas dois keepers em uma conta correm um contra o outro pelo nonce da transação.

## O que esta página não cobre

Ela não cobre o que as transações do keeper de fato fazem com o dinheiro, que é
[como funciona um sorteio](../concepts/how-a-draw-works.md). Não cobre implantação, que é
[implantação](deploying.md). E não faz nenhuma promessa de disponibilidade: nós rodamos um
keeper, não o garantimos, e o projeto foi feito para que não garanti-lo seja aceitável.
