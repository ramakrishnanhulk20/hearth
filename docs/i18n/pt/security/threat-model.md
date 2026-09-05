# Modelo de ameaças

Nove atacantes, o que cada um deles quer, o que os detém e o que não detém. A última coluna é a
que vale ler. Um modelo de ameaças que só lista defesas é propaganda.

Os contratos centrais do Hearth são imutáveis depois de implantados. Não há proxy nem caminho
de atualização, então nada nesta página pode ser mudado depois do fato, a não ser implantando
um pool novo.

**Cada pool é isolado.** Os sete pools na Sepolia são sete implantações separadas do mesmo
código, uma por token confidencial, e não compartilham armazenamento, saldo nem registro. Um
pool guarda apenas o próprio token, financia apenas o próprio cofre e é conduzido pela própria
conta de keeper, então um bug no wrapper de um token, um dono pausando um cofre ou um keeper
que para não alcança os poupadores nem o dinheiro de prêmio de outro pool. O que segue descreve
um pool, e vale para cada um dos sete por conta própria.

## 1. Um observador curioso

Alguém com um nó de arquivo, um explorador de blocos e tempo. Sem capital, sem acesso
privilegiado.

**Quer:** saber quem poupou quanto, de quem são as melhores chances, e quem ganhou cada
sorteio.

**Detido por:** todo valor por pessoa é um texto cifrado. Principal, ganhos, peso por sorteio e
crédito por sorteio são legíveis apenas pelo poupador que os possui, imposto pela lista de
controle de acesso da Zama, que faz o relayer recusar um pedido de decifragem de qualquer outro
endereço. Não existe transação de resgate para vigiar, e a avaliação não pode ser apontada para
você mesmo, então não existe transação que só um vencedor enviaria. Vencedores e perdedores
recebem escritas idênticas no mesmo lote, porque o pagamento é uma seleção cifrada em vez de um
desvio, então os formatos das transações e os custos de gás batem.

**Um vazamento que este projeto removeu.** Um rascunho anterior publicava o saldo total exato
ponderado pelo tempo do pool a cada sorteio. Com esse número público em dois períodos
consecutivos, e o carimbo de tempo público da transação de um poupador, um poupador que foi o
único a mover dinheiro em um período tinha esse valor recuperado exatamente, não limitado. O
cofre agora publica apenas a faixa de potência de dois acima do total, acompanhada por cinco
comparações cifradas por sorteio, e a equação não tem mais nada a resolver. A afirmação
completa é a regra 1 de
[o que permanece privado](what-stays-private.md).

**Não detido por nada:**

- A lista de poupadores, e o bloco em que cada poupador depositou, sacou ou foi avaliado.
- A faixa em que o total do pool caiu, que com menos de três poupadores fixa o peso de um
  poupador com margem de um fator dois. Veja a regra do conjunto de anonimato em
  [o que permanece privado](what-stays-private.md).
- **Um saldo que o observador consegue fixar tem resultado público em todo sorteio.** Os
  limiares são públicos por projeto, e o teste do vencedor é uma função determinística de um
  segredo e de dados no mais públicos. Empacote 1.000 USDC e deposite 1.000 USDC segundos
  depois e cada ganho e cada perda sua, em todo nível, em todo sorteio dali em diante, é
  aritmética pública.
- **Os ganhos acumulados são um piso público** para um endereço que empacota para dentro e
  desempacota para fora integralmente, porque os dois movimentos são públicos na camada do
  token.
- **Um saldo estático é estreitado lentamente.** As contagens de prêmios publicadas são uma
  pequena medição da distribuição de saldos e se acumulam contra um poupador cujo saldo nunca
  muda. Todo nível publica a contagem dele um sorteio depois, então a medição roda uma vez por
  nível por sorteio. A cadência que a deixaria mais lenta é um botão de construtor que esta
  implantação colocou em um, porque o mesmo passo é o que devolve o dinheiro não ganho ao bolo
  público e mantém o prêmio grande visível. Limitação 14.
- O resíduo comportamental: sacar apenas depois de sorteios que você ganhou, ao longo de muitos
  sorteios.

## 2. Uma baleia

Alguém com muito capital que quer chances baratas.

**Quer:** capturar prêmios sem deixar dinheiro no pool, ou farmar a mecânica.

**Detido por:**

- **A ponderação pelo tempo.** As chances vêm do saldo médio ao longo do período inteiro. Um
  depósito feito com 6 minutos restantes de um período de uma hora ganha um décimo das chances
  do mesmo valor mantido o período todo. Esta é a defesa que faltava ao nosso projeto anterior,
  e o ataque que ela permite foi executado: um atacante circulando 9.000 USDC em torno de cada
  sorteio ganhou 19 de 20 sorteios e esvaziou uma reserva de 5.000 USDC.
- **Linearidade.** Os prêmios esperados são exatamente proporcionais ao peso, e a faixa contra
  a qual o sorteio roda não depende de como o peso do pool está dividido entre endereços.
  Dividir uma carteira em seis não ganha nada, e juntar seis em uma não ganha nada.
- **O teto por poupador.** Depósitos são recusados quando o valor, ou o principal resultante,
  fica acima de `(2^64 - 1) / L`, e a recusa é cifrada, então não revela nada. Limitar o valor
  além do total é o que impede a soma cifrada da checagem de dar a volta.

**Não detido:**

- Uma baleia que genuinamente mantém um saldo grande pelo período inteiro ganha com frequência.
  Isso é o produto, não um ataque: o dinheiro dela gerou o rendimento que pagou os prêmios.
- As chances do nível grande são medidas sobre um período, então uma baleia que entra por um
  único período dá um tiro proporcional inteiro em um bolo que levou 24 períodos para ser
  formado. Esse é um desvio declarado do PoolTogether V5 e é a limitação 5.

## 3. Um sabotador registrando poupadores falsos

Alguém que acrescenta muitos endereços sem valor à lista de poupadores.

**Quer:** travar sorteios, diluir chances, ou tornar o pool caro de operar.

O registro é aberto por construção. O gancho de depósito não consegue ver o valor cifrado que
recebeu, então qualquer endereço que o dispare entra na lista de poupadores, mesmo com um zero
cifrado, e a lista nunca é podada.

**Detido por:**

- **As chances não mudam.** Um poupador sem saldo tem peso zero. Peso zero não supera limiar
  nenhum, e não contribui nada para o total, então as chances de cada poupador real são
  exatamente as que seriam sem os falsos. Nosso projeto anterior precisava de uma caução de
  registro para isso. Este não precisa.
- **A avaliação não pode ser travada.** Um poupador já avaliado em um sorteio, um endereço que
  não é poupador, e um poupador cuja primeira observação é posterior ao período são todos
  pulados sem reverter, e o pulo é decidido a partir de carimbos de tempo em texto claro, sem
  custo cifrado. Uma entrada ruim não pode derrubar um lote.
- **Os lotes têm teto** em `4` poupadores precisando de trabalho cifrado por chamada, então
  nenhuma transação sozinha pode ser empurrada além do limite de computação da Zama.

**Não detido:** o custo do keeper por sorteio cresce com a lista de poupadores, que só cresce.
Um sabotador não pode mudar as chances de ninguém, mas pode tornar caro avaliar todo mundo. A
resposta do keeper é um teto de taxa, não um orçamento. `KEEPER_MAX_FEE_GWEI` faz ele ficar de
fora de um tique inteiro enquanto a taxa da rede estiver acima do teto (`gasIsAffordable` em
`packages/keeper/src/keeper.ts`), e abaixo do teto ele continua enviando até o cursor chegar ao
fim da varredura. Poupadores sem observação antes do período são pulados a partir de carimbos
de tempo em texto claro, sem custo cifrado, então encher a lista custa gás ao keeper em vez de
custar prêmios aos poupadores. Nada na blockchain limita a avaliação, então a consequência
honesta é que, se o gás ficar acima do teto em um pool muito sabotado, a varredura pode não
alcançar todo poupador real dentro da janela.
Duas coisas amaciam isso. A varredura começa em um ponto diferente a cada sorteio, derivado da
semente daquele sorteio, então ninguém fica sistematicamente por último. E qualquer um pode
avançar mais a varredura pelo aplicativo, o que custa gás e não revela nada sobre quem está
pedindo. Veja
[a página do keeper](../operations/keeper.md).

## 4. Um keeper preguiçoso ou hostil

O endereço que normalmente empurra os sorteios. O nosso, ou o de outra pessoa.

**Quer:** pular um sorteio que não ganhou, escolher a ordem em que os poupadores são pagos, ou
simplesmente parar de trabalhar.

**Detido por:**

- **Todo passo é aberto a qualquer pessoa.** Fechar, premiar, avaliar, finalizar e reconciliar
  podem ser chamados por qualquer um, inclusive por qualquer poupador pelo aplicativo. Um
  keeper que se recusa a premiar um sorteio não consegue fazê-lo sumir; outra pessoa premia.
- **O keeper não pode escolher quem é avaliado.** `evaluate(drawId, count)` recebe uma
  contagem, não uma lista. A ordem da varredura é fixada pela semente do sorteio, então o
  keeper não pode se colocar nem colocar um amigo na frente em um nível com sobredemanda, e não
  pode deixar um poupador específico de fora.
- **Um fechamento atrasado é recusado, não tolerado.** Fechar tem que acontecer antes de
  `closeDeadline(p)`, o meio do segundo período da janela. Um fechamento no último bloco da
  janela não teria deixado espaço para a ida e volta da decifragem e teria encalhado o sorteio
  para sempre. Agora aquela transação simplesmente reverte. Um sorteio cujo fechamento nunca
  aconteceu fica sem fechar para sempre: a liquidez dele nunca foi movida para dentro, então
  não há nada a devolver e nada a finalizar.
- **Um sorteio pulado não custa nada.** Liquidez que nunca foi oferecida fica no nível dela e é
  oferecida de novo. Uma premiação atrasada ainda contabiliza a colheita, ainda devolve a
  liquidez oferecida aos níveis, e marca o sorteio como `Skipped`. Aquele período não paga
  prêmio, e nenhum dinheiro se perde nem encalha.
- **O keeper não pode mudar um resultado.** A seleção do vencedor é fixada no momento em que a
  semente e a faixa são verificadas. A avaliação anota um resultado existente.

**Testado por acidente, 3 de setembro de 2026.** O daemon do pm2 morreu junto com o processo de
terminal que o iniciou às 03:45 UTC, e ninguém percebeu até 04:52, então o keeper ficou fora do
ar por 67 minutos. Ao reiniciar, ele finalizou o sorteio 4 na hora e fechou o sorteio 6 às
04:53. O período 6 havia terminado às 04:00, então aquele fechamento estava 53 minutos atrasado
contra um prazo de 05:30, o meio do segundo período seguinte. Nenhum sorteio foi perdido,
nenhuma liquidez encalhou, e ninguém precisou intervir além de reiniciar o processo. Esta é a
afirmação "um keeper travado custa sorteios, nunca dinheiro" [do FAQ](../faq.md) e dos itens
acima, rodada de verdade em vez de argumentada.

**Não detido:**

- Assim que a semente e a faixa são públicas, quem estiver prestes a chamar `awardDraw` pode
  calcular o próprio resultado primeiro e decidir se vale o esforço. Premiar é aberto a
  qualquer pessoa e o aplicativo oferece isso a qualquer um, então isso é um incômodo e não
  censura, mas é real e está declarado.
- Se absolutamente ninguém agir dentro da janela de dois períodos, aquele sorteio não paga
  nada.

## 5. O dono do pool

Nós. O endereço que implantou os contratos.

**Quer:** enumerado aqui para que um poupador não tenha que adivinhar.

**Poderes, por inteiro:**

| Poder | Limite |
| --- | --- |
| Pausar | Interrompe depósitos e o fechamento de sorteios. Nunca interrompe saques, avaliação, premiação, finalização ou reconciliação. |
| Definir a fonte de rendimento | Emite `YieldSourceSet`. Não pode afetar nenhum saldo existente. |
| Resgatar tokens estranhos | Não pode tocar no principal nem nos ganhos de poupadores. |
| Transferir a propriedade | Em dois passos. Renunciar está desabilitado, então a propriedade não pode ser jogada no vazio. |

**Não pode:** ler o principal, os ganhos, o peso ou o crédito de nenhum poupador, porque os
contratos nunca dão ao dono acesso a eles. Não pode mudar o resultado de um sorteio. Não pode
mover o dinheiro de ninguém. Não pode atualizar os contratos, porque não há caminho de
atualização.

**Não detido:** um dono hostil pode pausar depósitos indefinidamente, e pode apontar o pool
para uma fonte de rendimento que não paga nada. Isso esfomeia o lado dos prêmios do produto.
Não para mais o relógio: uma fonte que reverte é capturada, a colheita daquele sorteio é
contabilizada como zero, `HarvestFailed` é emitido e o fechamento dá certo mesmo assim. Nenhum
dos dois poderes tira uma única unidade do principal de ninguém, e os saques continuam
funcionando o tempo todo.

## 6. O patrocinador

Quem financia a fonte de rendimento na Sepolia.

**Quer:** no caso honesto, dar dinheiro de prêmio à demonstração. No caso adversarial,
cronometrar ou reter prêmios.

**Detido por:** o patrocinador não tem influência sobre quem ganha. Ele financia um saldo; a
semente, os pesos e os limiares não têm nada a ver com ele. Valores de patrocínio, a taxa de
pingo e cada colheita são públicos, então qualquer um pode ver exatamente quanto dinheiro de
prêmio existe e com que velocidade ele está chegando. Um patrocínio é uma doação: não pode ser
sacado depois de feito, e só o dono da fonte pode mudar a taxa de pingo.

**Não detido:** um patrocinador que para de patrocinar acaba com os prêmios quando o saldo
terminar de pingar. Prêmios são rendimento, e sem rendimento não há prêmios. O principal fica
intocado o tempo todo, que é o ponto inteiro de um projeto sem perdas.

## 7. O operador do token

A Zama, como dona dos wrappers de token confidencial. O ativo de todo pool é um contrato deles,
não nosso, e cada pool fica atrás de um wrapper diferente.

**Quer:** enumerado, não alegado.

**Poderes, lidos do código-fonte verificado na Sepolia em 2 de setembro de 2026:**

- `addObserver(address)` dá a um endereço decifragem coringa sobre todo handle em que o token
  tem direitos, **retroativamente**. Um observador nomeado em qualquer data futura pode
  decifrar valores que já estão na blockchain, então monitorar a nomeação e sair não é uma
  defesa. O escopo é todo valor de depósito, todo pagamento de saque, o saldo do próprio token
  no pool, e a única transferência de financiamento de prêmio por lote de avaliação. Não há
  pagamento por vencedor para ler, porque o Hearth não tem transferência de prêmio por
  poupador. Um lote com um único poupador faz do total daquele lote o prêmio exato daquele
  poupador, e o pool ao vivo de cinco poupadores com lote de tamanho 4 produz um lote assim a
  cada sorteio. `evaluate` pega o tamanho do lote de quem chama e é aberto a qualquer pessoa,
  então nenhum lote mínimo pode ser imposto; a [limitação 7](../limitations.md) registra isso
  como um resíduo aceito e nomeia o conserto do lado do contrato. Estado ao vivo naquele dia:
  `observerCount()` era 0 e `observers()` estava vazio.
- Uma lista de bloqueio. Um endereço bloqueado não pode depositar, sacar nem desempacotar,
  porque cada uma dessas coisas é uma transferência de token com aquele endereço de um dos
  lados.
- Um papel de pausador, ao vivo definido no endereço zero, então a pausa está desabilitada no
  momento.
- A implementação é atualizável pelo dono dela, atrás de um proxy.

**Detido por:** nada que a gente controle. Isso é uma suposição de confiança, não uma defesa.

**O que isso não alcança:** o livro do próprio Hearth. Principal, ganhos, pesos e créditos
vivem no cofre, e o token não tem direitos de acesso sobre eles, nem sob uma atualização hostil
do token. Verificamos isso na implantação anterior: o endereço do token devolve falso para
permissão sobre os handles de principal e ganhos de um depositante, enquanto o depositante e o
pool devolvem verdadeiro.

## 8. O quórum do KMS da Zama

As partes que detêm a chave de decifragem da rede.

**Quer:** enumerado porque esta é a suposição mais profunda em qualquer aplicação de FHEVM.

**O que elas poderiam fazer:** o contrato verifica que um texto claro carrega uma assinatura
válida do quórum. Ele não consegue verificar que o texto claro é o texto claro verdadeiro
daquele handle. Um quórum desonesto poderia, portanto, assinar um valor de semente à escolha
dele, e o contrato aceitaria, o que lhe permitiria escolher os vencedores.

**Detido por:** nada no Hearth. Toda aplicação neste protocolo herda isso, e a documentação da
própria Zama declara a fronteira com clareza: o protocolo é confiável para computar corretamente
sobre textos cifrados e para decifrar apenas o que está marcado como publicamente decifrável.

**Vale saber:** o quórum ainda assim não consegue ler nada que não esteja marcado como
publicamente decifrável, e no Hearth isso é só a semente, a contagem de escala, o sinalizador
de não vazio, a colheita, o remanescente de cada nível quando ele está na vez, e o contador de
não financiado. Nenhum valor de poupador individual está nesse conjunto, e o peso total exato
do pool também não.

## 9. O relayer

O serviço que encaminha pedidos de decifragem entre navegadores e o protocolo.

**Quer:** enumerado.

**Pode:** recusar ou atrasar o serviço, o que atrasa um sorteio. Ele também vê qual endereço
pediu para decifrar qual handle, então fica sabendo que você conferiu os seus números, ainda
que não o que eles dizem.

**Não pode:** decifrar nada sozinho, já que não detém a chave. Não pode forjar uma assinatura
do KMS, que é para isso que existe a verificação na blockchain. Não pode dar acesso a si mesmo
sobre um handle, já que isso é trabalho da lista de controle de acesso e ela vive na
blockchain.

**Detido por:** a janela de dois períodos absorve um relayer lento, e o prazo de fechamento
garante que pelo menos meio período dela ainda está à frente quando a ida e volta começa. Além
disso o sorteio é pulado, a colheita ainda é contabilizada e a liquidez continua lá. Uma queda
do relayer custa um sorteio, nunca dinheiro.

## O que o projeto antigo errou, e como este fecha isso

Antes desta reconstrução, o Hearth era um único contrato chamado `LanternPool` que pesava os
poupadores pelo saldo no instante do sorteio e varria depositantes em blocos. Nós o auditamos
contra nós mesmos em 2 de setembro de 2026 e executamos os ataques em vez de raciocinar sobre
eles. Seis dos oito achados abaixo foram reproduzidos em código rodando.

| # | O que deu errado | Evidência | Como este projeto fecha |
| --- | --- | --- | --- |
| 1 | **Depósito relâmpago.** Sem ponderação pelo tempo, então um depósito feito um bloco antes do sorteio contava por inteiro. | Executado no mock: 20 ciclos, o atacante ganhou 19 de 20 e drenou uma reserva de 5.000 USDC. O ciclo inteiro também coube em uma transação, 2.189.992 de gás. | As chances vêm da média ponderada pelo tempo ao longo do período inteiro. Um depósito de última hora ganha a fração dele do período e nada mais. |
| 2 | **A transação de resgate entregava o vencedor.** Os resgates de vencedor e perdedor eram idênticos, mas só um vencedor tinha motivo para enviar um. | Executado: o resgate de vencedor e o de perdedor custaram 391.944 de gás cada no mock, com registros idênticos. Na Sepolia um resgate caiu 48 segundos depois de uma liquidação. | Não existe função de resgate. Os prêmios caem em um saldo cifrado de ganhos durante a avaliação, `withdraw` é a única saída, e a avaliação não pode ser apontada para você mesmo. |
| 3 | **Um bit público a cada sorteio.** O handle de ganhos de um bilhete da casa era republicado como publicamente decifrável em todo sorteio, vazando se a casa ganhou, o que com um único poupador real nomeava o vencedor. | Executado no mock ao longo de 16 sorteios, e confirmado na Sepolia em três sorteios liquidados. | Não existe bilhete da casa. Os únicos valores publicamente decifráveis são a semente, a contagem de escala, o sinalizador de não vazio, a colheita, os remanescentes dos níveis e o contador de não financiado. Nenhum é por poupador. |
| 4 | **Não verificável publicamente.** O total do pool nunca era publicado, então alguém de fora não conseguia conferir o sorteio de jeito nenhum. | Lido do código-fonte implantado e confirmado ao vivo. | A semente e a faixa são publicadas com uma prova do KMS verificada na blockchain, e todo limiar é recalculável por qualquer um a partir desses dois números. |
| 5 | **Rendimento contabilizado por declaração.** As recargas da reserva eram contabilizadas pelo valor passado na chamada, enquanto o wrapper cunha `amount / rate()`. Latente na Sepolia só porque a taxa por acaso era 1. | Executado contra um token de teste de 18 casas decimais, onde a taxa é um milhão de milhões. | O pool contabiliza apenas o valor verificado pelo KMS que a fonte de fato transferiu. |
| 6 | **Sabotagem por registro gratuito.** Uma carteira que nunca teve o token podia se registrar, e um operador podia registrar outras carteiras com um zero cifrado reaproveitado. | Executado. | O registro segue aberto, por construção. Poupadores falsos carregam peso zero, não mudam as chances de ninguém e são pulados em texto claro. O único custo é gás do keeper, e o que o keeper limita é o preço de gás que ele paga, não o trabalho que faz. |
| 7 | **A costura do empacotamento, sem mitigação.** O aplicativo empacotava e depositava em um fluxo só. | Medido ao vivo: três de cinco depósitos ficaram de dois a quatro blocos depois de um empacotamento público de 100 USDC. | Empacotar e depositar são passos separados e o aplicativo explica por quê. A costura é reduzida, não removida, e é a limitação 10. |
| 8 | **Sem keeper.** Os sorteios eram abertos a qualquer pessoa mas ninguém os rodava: o pool ao vivo ficou 26 horas com um sorteio pronto para abrir. | Lido ao vivo da blockchain. | Um script keeper roda todo passo e qualquer poupador pode avançar um sorteio pelo aplicativo. O pool implementa a interface de automação da Chainlink para o passo de fechamento como redundância adicional, embora nenhum upkeep esteja registrado ainda. |

Duas outras mudanças de projeto saíram da revisão de 3 de setembro e não estão naquela tabela,
porque o projeto antigo não chegou longe o bastante para tê-las: publicar o agregado exato foi
substituído pela faixa (atacante 1 acima), e os tamanhos dos prêmios foram movidos da premiação
para o fechamento, de modo que nenhum prêmio possa ser redimensionado depois de a semente dele
existir.

## O que é conferido, e como

Toda afirmação acima tem um teste. As saídas executadas ficam em `docs/security/attacks` e os
números estão colados no README.

| Afirmação | A conferência |
| --- | --- |
| Um estranho não pode ler os valores de um poupador | Peça ao relayer para decifrar o principal, os ganhos, o peso e o crédito de outro endereço. Espere recusa nos quatro. |
| O total exato do pool não é obtenível | Peça ao relayer o handle do peso agregado. Espere recusa. Depois subtraia as faixas publicadas de sorteios consecutivos em um pool onde um poupador se moveu, e mostre que a resposta é uma banda de fator dois, não um número. |
| Um depósito relâmpago ganha quase nada | Deposite perto do fim de um período, avalie, e compare o peso guardado com o de quem manteve o período inteiro. |
| Poupadores falsos não podem travar um sorteio | Registre muitos endereços vazios, depois rode um sorteio completo. |
| Ninguém pode escolher quem é avaliado | Chame `evaluate` do endereço de um poupador e mostre que a varredura avança a partir do cursor derivado da semente, não daquele poupador. |
| Um fechamento atrasado é recusado | Chame `closeDraw` depois de `closeDeadline` e espere uma reversão; depois confirme que o sorteio é pulável e a liquidez dele está intocada. |
| Uma premiação perdida não perde nada | Deixe a janela passar, premie atrasado, e confira que a colheita foi contabilizada, que a liquidez oferecida voltou aos níveis e que o sorteio lê `Skipped`. |
| Uma fonte de rendimento que reverte não para o relógio | Conecte uma fonte que reverte, feche um sorteio, e espere sucesso mais `HarvestFailed`. |
| Um nível com sobredemanda limita em vez de pagar demais | Force mais vencedores do que o nível consegue financiar e confira que o pago nunca passa do oferecido. |
| Uma prova não pode ser reaproveitada | Reenvie uma prova de premiação contra outro sorteio. Espere uma reversão. |
| Ninguém saca mais do que possui | Teste de propriedade: para toda conta, os saques nunca passam do principal mais os ganhos. |
| O dinheiro é conservado | Teste de propriedade: o saldo de tokens do cofre é igual ao principal total mais os ganhos totais não sacados, e o saldo de tokens do pool é igual à liquidez em texto claro mais todo remanescente cifrado mais a liquidez oferecida e ainda não finalizada mais as colheitas recebidas no fechamento e ainda não contabilizadas por uma premiação. Esse último termo é a colheita entre o fechamento que a recebe e a premiação que a divide entre os níveis, quando ela não pertence a nenhum nível nem a nenhum sorteio. |

## O que este modelo de ameaças não cobre

- Qualquer coisa fora da blockchain: seu dispositivo, o tratamento de chaves da sua carteira, o
  endpoint de RPC que você usa, e metadados em nível de rede.
- Ataques econômicos ao próprio lugar que gera o rendimento. Na mainnet, o risco do cofre é
  herdado por inteiro do cofre ERC-4626 atrás do batcher da Zama.
- Verificação formal. O Hearth é autoauditado com ataques executados e testes de propriedade.
  Ele não foi auditado por terceiros, e esta página é o substituto honesto, não uma
  substituição.
