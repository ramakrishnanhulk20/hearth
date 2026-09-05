# Pools y tokens

Hearth no es un pool. Son siete, uno por cada token confidencial de la libreta de
direcciones de Zama en Sepolia, y cada uno tiene su propio `HearthVault`, su propio
`HearthPrizePool` y su propio `SponsoredYieldSource`, con sus propios ahorradores, su propio
dinero de premios y su propio keeper.

Los contratos son el mismo código, desplegado siete veces con argumentos de constructor
distintos. No se comparte nada en la cadena: ni registro, ni enrutador, ni saldo común. Un
ahorrador del pool de WETH no puede ver ni tocar el pool de USDC, ni ser tocado por él, y una
bóveda pausada o un keeper atascado en un token deja los otros seis funcionando.

## Los siete pools

| Token | Slug | Sorteo cada | Bóveda | Fondo de premios | Fuente de rendimiento |
| --- | --- | --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 hora | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` |
| Confidential USDT (Mock) | `usdt` | 6 horas | `0xe54F44dE64F8A7abc0647eaae547dD59ce0EFfac` | `0x6a83Beb2Dc3f258107Cad5e17BC57657fAd4fbd1` | `0x5bb1Cd5380Cb9f2B15569030fF0dB7a445cF54cA` |
| Confidential WETH (Mock) | `weth` | 6 horas | `0x3D1A182782B68fE270A66294C9adaC7F005c4f14` | `0x1a11e7C689F244fA8Dd5f4abA8F2F3131090cc1C` | `0x40DF298f15c6136294eC651aD7b0c1C6F221DE8F` |
| Confidential BRON (Mock) | `bron` | 6 horas | `0x18086DC8271f8A73c5Ea985fd519527Dbb991279` | `0x2Ed982979CD184494B947a1E38E597494a38ACe4` | `0x0cD1155D752bD81b3a437a6f0B3965CAA2A1C8e9` |
| Confidential ZAMA (Mock) | `zama` | 6 horas | `0xEEC26386F273c6678cA538AcA18e1d9384eA9F09` | `0x873B285404199D46325a294Aa0EC7a79C30A7fF7` | `0xdD352D70311E834ab75307f53d5C276060081d23` |
| Confidential tGBP (Mock) | `tgbp` | 6 horas | `0xCe95dAa01f5354aA8887A5952E403D26d452c323` | `0xC531D54ee2c695e0eBfe8b8258e9Fd80fd507095` | `0xDEa2BD6351072F735B6ea83c357bF157d83c01af` |
| Confidential XAUt (Mock) | `xaut` | 6 horas | `0x77f701101d66FbD522A3bFdC2c00DB09a4F57daE` | `0x9a2888aca42c707A3BC0D561FdF6ff8Abfda5201` | `0x03fDdAA7C4323C53CE511CC49D4c33B26B492af7` |

Todos los contratos de arriba están verificados en Etherscan. El par de tokens que tiene cada
pool es de Zama, no nuestro, y está listado en
[pruébalo en Sepolia](../getting-started/try-it-on-sepolia.md).

El pool de USDC se desplegó primero, el 2 de septiembre de 2026 en el bloque `11622398`, y
desde entonces ha hecho sorteos cada hora, y por eso es el pool con historial detrás y el
pool sobre el que se grabó la transcripción de la prueba que hay en el README. Los otros seis
se desplegaron el 5 de septiembre de 2026, en los bloques `11641314` a `11641523`.

## Por qué seis horas, y no una hora para los siete

Gas. Un sorteo en un pool de cinco ahorradores son `8,456,388` de gas, medidos sobre recibos
reales de Sepolia: un cierre, una adjudicación, dos lotes de evaluación, una finalización y
una conciliación por nivel. A 1 gwei eso son `0.0085 ETH`. Siete pools sorteando cada hora
serían 168 sorteos al día, unos `1.43 ETH`, que no se pueden mantener financiados con faucets
públicos durante una ventana de evaluación. Un pool de diez ahorradores son `12,582,923` de
gas por sorteo, y la factura crece con él.

Así que los seis pools desplegados después sortean cada seis horas. Eso son cuatro sorteos al
día cada uno, así que los siete pools juntos cuestan unos `0.41 ETH` al día en lugar de
`1.43`, y cuatro sorteos al día siguen siendo suficientes para que un visitante vea caer uno
dentro de una sola visita. El pool de USDC conserva su reloj horario y los sorteos de
historia que vinieron con él.

Las probabilidades se fijan contra el periodo propio de cada pool en lugar de arrastrarse, de
modo que la sensación del producto es la misma con los dos relojes:

| Nivel | Pool horario (`usdc`) | Pools de seis horas |
| --- | --- | --- |
| Mayor | cantidad 1, probabilidad 1 entre 24, participaciones 40 | cantidad 1, probabilidad 1 entre 4, participaciones 40 |
| Medio | cantidad 1, probabilidad 1 entre 6, participaciones 20 | cantidad 1, probabilidad 1 entre 2, participaciones 20 |
| Frecuente | cantidad 4, probabilidad 1 entre 1, participaciones 40 | cantidad 4, probabilidad 1 entre 1, participaciones 40 |

El premio mayor paga, por tanto, aproximadamente una vez al día en todos los pools. El nivel
medio es el único punto en el que los dos relojes difieren: unas cuatro veces al día en el
pool horario y unas dos veces al día en los de seis horas, porque partir la probabilidad por
la mitad no compensa del todo tener la sexta parte de sorteos. Todos los niveles de todos los
pools se concilian en cada sorteo, por el motivo que se explica en
[premios y niveles](prizes-and-tiers.md).

## Decimales, y qué significa una cantidad

Todos los envoltorios confidenciales de la libreta de direcciones de Zama en Sepolia declaran
seis decimales, sean los que sean los del token público de debajo, porque el envoltorio se
limita a sí mismo a seis y carga la diferencia a su `rate()`. El WETH confidencial es el caso
más claro: su subyacente tiene 18 decimales, así que el `rate()` del envoltorio es un millón
de millones, y una unidad base del envoltorio son un millón de millones de unidades base del
token público.

Todas las cantidades de `packages/contracts/hearth.config.ts` están en unidades base del
envoltorio, y tanto el despliegue como las tareas multiplican por la tasa que leen en la
cadena antes de tocar el token público. Esto no es un detalle. Nuestra propia auditoría
encontró un fallo en el que un pool anotaba la cantidad que pasaba quien llamaba en lugar de
la que acuñó el envoltorio, lo que en un token de 18 decimales inflaba el dinero de premios
por un factor de un millón de millones. Ver [fuente de rendimiento](yield-source.md).

## Con qué se siembra cada pool

`hearth:seed --token <slug>` patrocina la fuente de rendimiento y mete cinco ahorradores de
demostración, de los índices de cuenta 2 al 6, para que un primer visitante aterrice en un
pool poblado. Las posiciones cambian según el token, porque un pool tiene que parecerse al
activo que guarda: 1.200 de una moneda estable en dólares y 0,6 de éter son ahorradores del
mismo tamaño.

| Pool | Cinco posiciones de demostración | Patrocinio | Dinero de premios liberado |
| --- | --- | --- | --- |
| `usdc` | 1.200 / 600 / 300 / 150 / 75 | 10.000 USDC | 20 USDC por hora, o sea 19,998 por sorteo |
| `usdt` | 1.200 / 600 / 300 / 150 / 75 | 10.000 USDT | 20 USDT por hora, o sea 119,98 por sorteo |
| `weth` | 0,6 / 0,3 / 0,15 / 0,075 / 0,04 | 5 WETH | 0,01 WETH por hora, redondeado a la baja a 0,0432 por sorteo |
| `bron` | 2.000 / 1.000 / 500 / 250 / 125 | 15.000 BRON | 30 BRON por hora, o sea 179,99 por sorteo |
| `zama` | 2.000 / 1.000 / 500 / 250 / 125 | 15.000 ZAMA | 30 ZAMA por hora, o sea 179,99 por sorteo |
| `tgbp` | 1.000 / 500 / 250 / 125 / 60 | 8.000 tGBP | 16 tGBP por hora, o sea 95,99 por sorteo |
| `xaut` | 0,4 / 0,2 / 0,1 / 0,05 / 0,025 | 3 XAUt | 0,006 XAUt por hora, redondeado a la baja a 0,0216 por sorteo |

La tasa de una fuente son unidades base enteras por segundo, así que las dos tasas más
pequeñas se redondean a la baja: 0,01 WETH por hora son 2,77 unidades base por segundo y
libera 2, y 0,006 XAUt por hora son 1,67 y libera 1. Cada patrocinio está dimensionado para
durar más de ochenta sorteos, es decir veinte días o más, así que nadie tiene que recargar un
pool durante una ventana de evaluación.

## El token que Hearth rechaza

Zama publica también un **Confidential tGBP** que no es mock en Sepolia, en
`0x167DC962808B32CFFFc7e14B5018c0bE06A3A208` sobre el token público
`0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3`. El mint de su subyacente está restringido al
emisor, así que nadie salvo el emisor puede conseguir el token público, nadie puede envolver
hacia el confidencial y no se puede abrir ningún pool sobre él.

Hearth lo lista igualmente en el selector de pools, en gris, con el motivo escrito bajo su
nombre. El archivo de despliegue enuncia ese motivo una sola vez, en inglés, como
`mint restricted to the issuer`, y la aplicación lo imprime en el idioma en el que estás
leyendo. Elegirlo abre una página que nombra el token, enlaza los dos contratos en Etherscan,
dice de quién es la restricción y no ofrece ninguna acción de cartera, porque un botón de
depósito que revierte es peor que ningún botón.

Dejar el token fuera de la lista habría sido más fácil y habría parecido que Hearth
sencillamente no había llegado a él. Un ahorrador que va buscando tGBP encuentra dos
entradas: el pool mock que funciona y el token oficial que no, con el motivo.

## Qué muestra la fila de pools

La página de inicio termina con una fila de todos los pools, y cada celda lleva el premio gordo
de ese pool ahora mismo, leído en el servidor con un solo multicall y enviado dentro de la
propia página, así que la fila ya está rellena cuando la historia deja de desplazarse. El
selector de dentro de la consola muestra las mismas cifras con las mismas reglas.

Dos de esas reglas existen porque un número puede engañar:

- Un pool cuya lectura no ha vuelto dice `sin leer`, nunca `0.00`. Un nodo que no ha contestado
  y un bote vacío se ven igual en cuanto se escribe un cero.
- Un pool que todavía no ha cerrado su primer sorteo dice **Primer sorteo HH:MM UTC** en lugar
  de una cifra, tanto en la fila como bajo su nombre en el selector. El dinero de los premios
  solo llega a los niveles cuando se adjudica el primer sorteo, así que antes de ese cierre la
  respuesta honesta es una hora y no `0.00`. Cuál de las dos muestra una celda lo decide que
  `lastClosedDraw` siga leyendo cero, y la hora en sí es `firstPeriodAt` más `periodLength`, el
  final del primer periodo y el momento más temprano en que el sorteo 1 puede cerrar. El reloj
  es de veinticuatro horas y en UTC en todos los idiomas.

## De dónde saca la aplicación las direcciones

La aplicación no lleva nunca una dirección escrita a mano. Cada pool abierto en
`packages/web/src/lib/chain/pools.json` se genera a partir de un archivo que escribió el
script de despliegue, con:

```
node scripts/sync-pools.mjs        # from packages/web
```

Ese script lee `packages/contracts/deployments/sepolia/hearth.<slug>.json`, rechaza cualquier
archivo al que le falte una dirección, rechaza dos pools que reclamen el mismo slug y añade la
única entrada restringida que no tiene despliegue. Ejecútalo después de cada despliegue. Las
variables de entorno que antes guardaban las tres direcciones de un único pool ya no existen.

El pool que está mirando un ahorrador es el primer segmento después de `/app`:

| Ruta | Qué muestra |
| --- | --- |
| `/app` | Redirige al pool que el ahorrador usó por última vez, o a `usdc` en la primera visita |
| `/app/<slug>` | El panel de ese pool |
| `/app/<slug>/deposit` | Acuñar, blindar y depositar para ese token |
| `/app/<slug>/withdraw` | Retirar y desblindar para ese token |
| `/app/<slug>/draws` | Los sorteos de ese pool, y el resultado propio del ahorrador en cada uno |
| `/app/<slug>/run` | Los cinco pasos del sorteo, sin permisos, para ese pool |
| `/verify?pool=<slug>` | La semilla, la franja y los umbrales públicos de ese pool |

Delante de todas ellas va un código de idioma en todos los idiomas menos el inglés, así que
el panel de un lector japonés es `/ja/app/weth`.

## Un keeper por pool

Siete pools significan siete procesos keeper, cada uno firmando desde su propio índice de
cuenta de la misma frase semilla, porque dos procesos en una misma cuenta se pelean por el
mismo nonce. La tabla y el archivo de pm2 están en [el keeper](../operations/keeper.md).
