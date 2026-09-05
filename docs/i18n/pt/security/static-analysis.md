# Análise estática

Todo contrato passa pelo slither 0.11.6 e pelo solhint antes de uma implantação, e todo achado é
consertado ou explicado aqui. Os sete pools são sete implantações desses mesmos três contratos,
então uma execução cobre todos eles. Esta página é a explicação. A execução crua é repetível:

```bash
npm run lint -w @hearth/contracts
```

para o solhint, que passa com zero avisos no conjunto de regras ajustado em `.solhint.json`, e
para o slither uma compilação simples das mesmas fontes sem o plugin FHEVM do Hardhat, porque o
plugin reescreve o `ZamaConfig.sol` em tempo de compilação e o slither então não consegue mais
mapear os deslocamentos de código de volta para o arquivo em disco. A compilação simples usa as
configurações idênticas do compilador (0.8.27, otimizador em 800 execuções, cancun), então o
bytecode que o slither lê é o bytecode que vai para produção.

## A execução

O slither analisou 46 contratos com 102 detectores e reportou 88 resultados, 85 deles nos
contratos do próprio Hearth. Nenhum é um bug. Eles caem em cinco famílias, e cada família tem
uma razão.

| Família | Quantidade | Severidade que o slither atribui | Por que não é um achado |
| --- | --- | --- | --- |
| `unused-return` | 38 | Média | 36 deles são `FHE.allow`, `FHE.allowThis`, `FHE.allowTransient` e `FHE.makePubliclyDecryptable`, que devolvem o handle que receberam para que as chamadas possam ser encadeadas. Ignorar esse retorno é o uso documentado em todo exemplo da Zama. Os outros dois estão abaixo. |
| `reentrancy-no-eth`, `reentrancy-benign`, `reentrancy-events` | 20 | Média e Baixa | O slither trata toda operação `FHE.*` como uma chamada externa, porque cada uma é uma chamada ao contrato do coprocessador. Essas chamadas carregam handles de texto cifrado, não controle, e nenhum contrato de usuário roda dentro delas. As chamadas genuinamente externas são o token e o cofre, ambos fixados na construção, e toda função que move valor é `nonReentrant` e escreve o estado dela antes da transferência. |
| `timestamp` e `incorrect-equality` | 18 | Baixa e Média | Os períodos são definidos por `block.timestamp` de propósito, e as igualdades estritas comparam números de período e sinalizadores zero, nunca saldos. Um validador pode deslocar um carimbo de tempo em segundos contra períodos de uma ou seis horas, o que move o peso de um poupador por esses segundos dentro de 3.600 ou 21.600. |
| `uninitialized-local` | 8 | Média | Acumuladores e contadores que começam no zero padrão do Solidity por intenção: `offered`, `assigned`, `totalShares`, `processed`, `heavy`, `marked`, `cleared`. `harvestHandle` recebe valor em todo caminho do try/catch que segue a declaração dele. |
| `calls-loop` | 1 | Baixa | `finalizeDraw` pergunta ao pool a cadência de reconciliação de cada um dos três níveis. O laço é limitado em três e o pool é o do próprio cofre, definido uma vez pelo dono. |

Os dois resultados de `unused-return` que não são chamadas de controle de acesso:

- `HearthVault._withdraw` ignora o handle que `confidentialTransfer` devolve. Uma transferência
  ERC-7984 move o valor inteiro ou nada, e o cofre já limitou o valor ao menor entre o que o
  poupador tem e o que o cofre tem na mesma transação, então o valor transferido é o valor
  pedido por construção. O livro foi atualizado antes da chamada.
- `SponsoredYieldSource.sponsor` ignora o que `wrap` devolve. O patrocinador é a parte confiável
  aqui por definição, e o que o pool contabiliza em um fechamento nunca é o número do próprio
  patrocinador, mas o valor verificado pelo KMS que a fonte de fato transferiu na colheita.

## O que o slither não consegue ver

O slither raciocina sobre fluxo de controle em texto claro. Ele não consegue dizer se uma
comparação cifrada é a comparação certa, se falta uma concessão na lista de controle de acesso,
ou se um valor que não deveria está sendo publicado. Essas propriedades são cobertas pelos
testes unitários, pelos testes de justiça e de invariantes, e pelos scripts de ataque executados
em [o modelo de ameaças](threat-model.md).
