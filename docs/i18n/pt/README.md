# Documentação do Hearth

O Hearth é uma poupança premiada confidencial e sem perdas, construída sobre o Protocolo da
Zama. Você deposita um token confidencial, seu saldo fica cifrado na blockchain, o
rendimento que o pool gera é distribuído como prêmios em um sorteio periódico e o seu
principal pode ser sacado a qualquer momento. Ninguém, nem mesmo nós, consegue ler quanto
você poupou ou quanto você ganhou.

Sete pools rodam na Sepolia, um para cada token confidencial que a Zama publica lá, cada um
com seus próprios contratos e seu próprio keeper. A maioria das páginas abaixo usa USDC nos
exemplos, porque é o pool com o histórico mais longo. Todas elas descrevem os sete.

Estas páginas são o registro escrito completo de como o produto funciona e do que ele não
esconde. O `ARCHITECTURE.md`, na raiz do repositório, é a especificação de implementação.
Esta árvore é o mesmo projeto explicado para quem usa e para quem audita.

## Páginas

| Página | O que cobre |
| --- | --- |
| [O que é o Hearth](getting-started/what-is-hearth.md) | O produto em uma página: os quatro movimentos de um poupador e exatamente o que cada um esconde. |
| [Experimente na Sepolia](getting-started/try-it-on-sepolia.md) | Escolher um dos sete tokens, o faucet dele, blindar, depositar, um sorteio, revelar, resgatar, sacar e desblindar. |
| [Pools e tokens](concepts/pools-and-tokens.md) | Os sete pools e seus endereços, por que seis deles sorteiam a cada seis horas, as posições iniciais por token, o token que o Hearth recusa e as rotas de cada pool. |
| [Como funciona um sorteio](concepts/how-a-draw-works.md) | Os períodos, a janela de dois períodos e o prazo de fechamento, os cinco passos de um sorteio e o que o cofre publica no lugar do total do pool. |
| [Saldo ponderado pelo tempo](concepts/time-weighted-balance.md) | Por que as chances usam o seu saldo médio do período, quanto vale um depósito tardio e por que três observações guardadas bastam. |
| [Seleção do vencedor](concepts/winner-selection.md) | O teste do vencedor, a regra por prêmio do PoolTogether, os limiares aninhados contra a faixa publicada e um exemplo resolvido com três poupadores. |
| [Prêmios e níveis](concepts/prizes-and-tiers.md) | Como o rendimento vira liquidez de prêmio, o remanescente cifrado e a cadência de reconciliação, os três níveis na Sepolia, a sobredemanda e onde nos afastamos do PoolTogether V5. |
| [Fonte de rendimento](concepts/yield-source.md) | A fonte patrocinada na Sepolia, por que a colheita é verificada em vez de declarada, e como o Confidential Vault da Zama se encaixa na mainnet. |
| [Por que Zama](concepts/why-zama.md) | O teste da exclusão: tire a criptografia totalmente homomórfica e não sobra produto. Cada peça da Zama que usamos, com nome. |
| [O que permanece privado](security/what-stays-private.md) | Sete regras: a faixa e o vazamento que ela substituiu, o que custa um saldo identificado, a costura do empacotamento nos dois sentidos, o que as contagens de prêmios medem, a camada do token, por que a avaliação não entrega ninguém e o resíduo comportamental. |
| [Modelo de ameaças](security/threat-model.md) | Nove atacantes, o que cada um quer, o que os detém e o que não detém. Mais as falhas executadas do nosso projeto anterior. |
| [Aleatoriedade e verificação](security/randomness-and-verification.md) | De onde vem a semente, por que ninguém pode sorteá-la de novo nem mudar o tamanho do que ela ganha, e como qualquer pessoa recalcula um limiar depois do fato. |
| [Análise estática](security/static-analysis.md) | As execuções do slither e do solhint, e a razão única por trás de cada uma das cinco famílias de achados. |
| [O keeper](operations/keeper.md) | O trabalho do keeper passo a passo, a regra de ordem, um processo por pool, o que acontece quando ele cai e o orçamento de gás. |
| [Implantação](operations/deploying.md) | Implantar um pool por token, assinaturas e parâmetros do construtor, verificação, e os dois conjuntos de parâmetros da Sepolia contra um de mainnet. |
| [Limitações](limitations.md) | Todas as limitações documentadas em uma lista numerada de catorze. |
| [Perguntas frequentes](faq.md) | Doze respostas curtas, começando por em qual dos sete tokens você pode poupar, e incluindo para onde foi o botão de resgate. |
