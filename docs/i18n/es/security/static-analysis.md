# Análisis estático

Todos los contratos pasan por slither 0.11.6 y por solhint antes de un despliegue, y cada hallazgo
o bien se arregla o bien se explica aquí. Los siete pools son siete despliegues de estos mismos
tres contratos, así que una sola ejecución los cubre todos. Esta página es la explicación. La
ejecución en crudo es repetible:

```bash
npm run lint -w @hearth/contracts
```

para solhint, que pasa con cero avisos con el juego de reglas ajustado de `.solhint.json`, y para
slither una compilación simple de esas mismas fuentes sin el plugin de FHEVM para Hardhat, porque
el plugin reescribe `ZamaConfig.sol` en tiempo de compilación y entonces slither ya no puede
mapear los desplazamientos de código al archivo en disco. La compilación simple usa exactamente
los mismos ajustes de compilador (0.8.27, optimizador a 800 pasadas, cancun), así que el bytecode
que lee slither es el bytecode que se publica.

## La ejecución

slither analizó 46 contratos con 102 detectores y reportó 88 resultados, 85 de ellos en los
contratos propios de Hearth. Ninguno es un fallo. Se agrupan en cinco familias, y cada familia
tiene una razón.

| Familia | Cantidad | Gravedad que asigna slither | Por qué no es un hallazgo |
| --- | --- | --- | --- |
| `unused-return` | 38 | Media | 36 de ellos son `FHE.allow`, `FHE.allowThis`, `FHE.allowTransient` y `FHE.makePubliclyDecryptable`, que devuelven el handle que se les dio para poder encadenar llamadas. Ignorar ese retorno es el uso documentado en todos los ejemplos de Zama. Los otros dos están más abajo. |
| `reentrancy-no-eth`, `reentrancy-benign`, `reentrancy-events` | 20 | Media y baja | slither trata cada operación `FHE.*` como una llamada externa, porque cada una es una llamada al contrato del coprocesador. Esas llamadas llevan handles de texto cifrado, no control, y dentro de ellas no corre ningún contrato de usuario. Las llamadas realmente externas son el token y la bóveda, las dos fijadas en la construcción, y toda función que mueve valor es `nonReentrant` y escribe su estado antes de la transferencia. |
| `timestamp` e `incorrect-equality` | 18 | Baja y media | Los periodos se definen por `block.timestamp` a propósito, y las igualdades estrictas comparan números de periodo y banderas de cero, nunca saldos. Un validador puede desplazar una marca de tiempo unos segundos frente a periodos de una hora o de seis, lo que mueve el peso de un ahorrador esos segundos sobre 3.600 o 21.600. |
| `uninitialized-local` | 8 | Media | Acumuladores y contadores que arrancan en el cero por defecto de Solidity a propósito: `offered`, `assigned`, `totalShares`, `processed`, `heavy`, `marked`, `cleared`. A `harvestHandle` se le asigna valor en todos los caminos del try/catch que sigue a su declaración. |
| `calls-loop` | 1 | Baja | `finalizeDraw` pregunta al pool por la cadencia de conciliación de cada uno de los tres niveles. El bucle está acotado en tres y el pool es el de la propia bóveda, fijado una vez por el propietario. |

Los dos resultados de `unused-return` que no son llamadas de control de acceso:

- `HearthVault._withdraw` ignora el handle que devuelve `confidentialTransfer`. Una transferencia
  ERC-7984 mueve la cantidad entera o nada, y la bóveda ya ha limitado la cantidad a la menor
  entre lo que tiene el ahorrador y lo que tiene la bóveda dentro de la misma transacción, así que
  la cantidad transferida es la cantidad pedida por construcción. El libro se actualizó antes de
  la llamada.
- `SponsoredYieldSource.sponsor` ignora lo que devuelve `wrap`. El patrocinador es aquí la parte
  de confianza por definición, y lo que el pool anota en un cierre nunca es la cifra que dice el
  patrocinador, sino la cantidad verificada por el KMS que la fuente transfirió de verdad en la
  cosecha.

## Qué no puede ver slither

slither razona sobre el flujo de control en claro. No puede saber si una comparación cifrada es la
comparación correcta, si falta una concesión en la lista de control de acceso, o si se publica un
valor que no debería. Esas propiedades las cubren las pruebas unitarias, las pruebas de equidad y
de invariantes, y los scripts de ataque ejecutados que hay en
[el modelo de amenazas](threat-model.md).

## Auditoría de dependencias

`npm audit --omit=dev` en la raíz del repositorio reporta dos hallazgos a 6 de septiembre de 2026,
los dos en `axios`, y los dos en código que la aplicación nunca ejecuta:

- `axios@0.21.4` bajo `hardhat-deploy@0.11.45`, en el paquete de contratos. Es herramienta de
  despliegue que corre en la máquina del operador y nunca se publica dentro de un bundle.
  `hardhat-deploy` 0.11 fija la línea 0.21, así que el único arreglo es una subida de versión mayor
  de la herramienta de despliegue, que cambiaría los registros de despliegue de los que depende
  este repositorio.
- `axios` bajo `@coinbase/cdp-sdk`, que `@wagmi/connectors` arrastra con el conector de
  WalletConnect. Hearth nunca importa axios ni llama al SDK de Coinbase; los avisos tratan del
  manejo de proxy en el servidor y de la falsificación de peticiones en Node, no de un bundle de
  navegador. `npm audit fix` mueve la copia anidada a otra versión vulnerable en lugar de sacarla
  del rango, así que se deja tal como la registra el lockfile.

El paquete web por su cuenta, con el conector quitado, audita limpio, y así es como salió la cifra
de cero hallazgos del 3 de septiembre.
