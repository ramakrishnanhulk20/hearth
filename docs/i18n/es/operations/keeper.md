# El keeper

Los sorteos no ocurren solos. Algo tiene que enviar las transacciones. Esta página es qué hace
ese algo, qué pasa cuando se para y cuánto cuesta.

Un proceso mueve un pool. Hearth tiene siete pools en Sepolia, así que corren siete procesos
keeper, cada uno firmando desde su propia cuenta de la misma frase semilla y cada uno apuntado
al archivo de direcciones de un pool. La sección "Un keeper por pool", más abajo, es la tabla.

Primero el encuadre importante: el keeper no tiene privilegios. Cualquiera puede llamar a todas
las funciones que él llama, y las dos palancas de las que un keeper podría haber abusado, elegir
a quién se evalúa y elegir el orden de pago, ya no son palancas. Es una comodidad que le ahorra
la molestia a los ahorradores, no un rol del que dependa la seguridad del pool.

## El trabajo, en orden, para el sorteo `p`

1. **Cerrar.** Llamar a `closeDraw(p)` una vez terminado el periodo `p` y antes de
   `closeDeadline(p)`, que es la mitad del periodo `p+2`. La buena costumbre es hacerlo al
   principio del periodo `p+1`. Esto fija el tamaño del premio y la liquidez ofrecida de cada
   nivel, mueve esa liquidez al sorteo, saca la semilla cifrada, pide a la bóveda el recuento de
   escala cifrado y la bandera de no vacío, cosecha la fuente de rendimiento y marca los cuatro
   handles como públicamente descifrables.
2. **Traer las pruebas.** Pedir al relayer de Zama que descifre públicamente los cuatro handles
   en el orden `[seed, scaleCount, nonEmpty, harvested]`. El relayer devuelve los textos en claro
   con una firma del servicio de gestión de claves.
3. **Adjudicar.** Llamar a `awardDraw(p, seed, scaleCount, nonEmpty, harvested, proof)`. El
   contrato verifica la firma en la cadena, anota la cosecha en los niveles y abre el sorteo. Los
   ganadores se deciden en este momento.
4. **Evaluar.** Llamar a `evaluate(p, count)` sobre la bóveda, repetidamente, hasta que el
   recorrido vuelva al punto de partida. Cada llamada avanza un cursor propio de cada sorteo por
   la lista de ahorradores desde un inicio derivado de la semilla. El keeper elige `count`, nunca
   qué direcciones; `4` es el máximo de ahorradores con trabajo cifrado que caben en una
   transacción. A los ahorradores sin observación en el periodo `p` o antes los salta el propio
   contrato, a partir de marcas de tiempo en claro, sin coste cifrado.
5. **Finalizar.** Cuando la ventana se cierra al final del periodo `p+2`, llamar a
   `finalizeDraw(p)`. Esto pliega el resto no pagado de cada nivel en el arrastre cifrado de ese
   nivel, publica el contador de no financiado, y marca el arrastre como públicamente descifrable
   para cada nivel al que le toque conciliarse, emitiendo `CarryPublished`.
6. **Conciliar, por cada nivel que toque.** Para cada nivel que publicó `finalizeDraw`, traer el
   texto en claro del arrastre y llamar a `reconcile(tier, carry, proof)`. El pool comprueba la
   prueba contra el handle que publicó la bóveda, anota el número verificado en la liquidez en
   claro del nivel, la bóveda lo resta del arrastre (que puede haber crecido desde que se
   publicó), y se emite `TierReconciled`.

En Sepolia a todos los niveles de todos los pools les toca en cada sorteo, así que el paso 6
corre hasta tres veces después de cada finalización. La cadencia es un argumento de constructor
por nivel y el keeper la lee de la cadena en lugar de suponerla, así que un despliegue que
publique el arrastre de un nivel con menos frecuencia no necesita cambiar el keeper. Por qué este
publica los tres en cada sorteo está en
[premios y niveles](../concepts/prizes-and-tiers.md).

## La regla de orden

**Finaliza y concilia el sorteo `p` al principio del periodo `p+3`, antes de cerrar el sorteo
`p+2` en ese mismo periodo.**

El motivo es el dinero, no la corrección. Un cierre dimensiona los premios de cada nivel a partir
de la liquidez en claro del nivel en ese momento, y la conciliación es lo que convierte el
arrastre de un sorteo anterior otra vez en liquidez en claro. Concilia primero y ese dinero cuenta
para el tamaño del premio de inmediato; concilia después y espera un sorteo.

Los dos trabajos quedan disponibles en el mismo instante. La ventana del sorteo `p` termina al
final del periodo `p+2`, y el sorteo `p+2` se puede cerrar al principio del periodo `p+3`, así que
el keeper hace primero la finalización y las conciliaciones que toquen, y después el cierre.

No se pierde nada si el orden se desliza, pero importa hacia dónde se desliza. Cierra antes de la
finalización y el arrastre del nivel todavía no está pendiente, así que `openDraw` lo pliega en la
oferta y ese dinero se puede ganar igualmente; lo que no hace es subir el tamaño del premio
publicado, que `closeDraw` fija solo a partir de la liquidez en claro. Finaliza, después cierra y
después concilia, y el arrastre queda pendiente: `openDraw` deja un arrastre pendiente fuera del
sorteo por completo, así que ese dinero ni se ofrece ni se puede ganar hasta que la conciliación
limpia la bandera. En Sepolia a todos los niveles les toca en cada finalización, así que este es
el caso corriente, y por eso el keeper vuelve a leer los arrastres después de sus finalizaciones y
concilia antes de cerrar. En ningún caso se pierde nada: el primer cierre posterior a una
conciliación lo vuelve a plegar todo.

## Qué pasa cuando el keeper está caído

No se pierde nada. Esa es la respuesta entera, y se sostiene por cómo se trata un paso perdido:

| Paso perdido | Consecuencia |
| --- | --- |
| El cierre no ocurre nunca, u ocurre después de `closeDeadline` y revierte | El sorteo se queda en `None` y se salta. Su liquidez nunca se movió, así que se queda en los niveles y se ofrece en el sorteo siguiente. La cosecha la recoge el cierre siguiente. |
| La adjudicación no ocurre dentro de la ventana | Una adjudicación tardía sigue anotando la cosecha, sigue devolviendo la liquidez ofrecida a los niveles y marca el sorteo `Skipped`. No desaparece ni rendimiento ni liquidez. |
| El recorrido no llega a todos los ahorradores | Los ahorradores a los que el recorrido no llegó no reciben nada de ese sorteo. Su parte de la oferta se pliega en el arrastre del nivel al finalizar y se vuelve a ofrecer. Este es el único caso en el que un ahorrador real pierde algo que podría haber ganado, y es la limitación 2. |
| La finalización o la conciliación llegan tarde | Los niveles tienen menos liquidez en claro durante un tiempo, así que los premios son más pequeños. Un arrastre que publicó una finalización y que ninguna conciliación ha limpiado se queda fuera de todos los cierres hasta que llegue la conciliación. No se pierde nada: el primer cierre posterior a una conciliación lo vuelve a plegar todo. |

Un keeper atascado le cuesta sorteos al pool, no dinero. Los depósitos y los retiros siguen
funcionando durante todo el proceso, porque la vía de pausa no los toca y un sorteo atascado no
bloquea nada.

Nuestro despliegue anterior es el ejemplo que sirve de aviso: `openDraw` era sin permisos y nadie
lo llamaba, así que el pool real estuvo 26 horas con un sorteo listo para abrirse. Sin permisos no
es lo mismo que automatizado. Por eso este diseño tiene un keeper de verdad y una vía de
redundancia por debajo.

## Cómo avanza un sorteo un ahorrador por su cuenta

Todos los pasos de arriba son sin permisos, y la aplicación los expone todos en su pantalla
"Ejecutar un sorteo", en `/app/<slug>/run` para el pool en el que esté, que es la fila de la barra
lateral marcada "Cualquiera". Una tarjeta arriba nombra el paso que el pool está esperando, y cada
uno de los cinco de abajo lleva su propio botón, apagado y con un motivo escrito cuando no es el
turno de ese paso:

- **Cerrar**, y después **Adjudicar.** El cierre fija los tamaños de los premios y saca la semilla
  cifrada. La adjudicación trae las cuatro pruebas de descifrado en el navegador y devuelve los
  textos en claro firmados. La llamada al relayer es la misma que hace el keeper, y el SDK la hace
  desde la página.
- **Avanzar.** Ejecuta `evaluate(p, count)` para el sorteo abierto en ese momento, avanzando el
  recorrido compartido en un lote. La misma llamada está en la tarjeta de tu propio sorteo en "Mis
  sorteos" como "Avanzar el sorteo". Este es el botón que hay que pulsar si el keeper está caído y
  el recorrido todavía no ha llegado hasta ti. No te permite elegirte a ti mismo, y esa es la
  gracia: como nadie puede señalarse a sí mismo, enviar esta transacción no dice nada sobre si
  ganaste.
- **Finalizar** y **Conciliar.** Ejecutan los dos pasos de cierre de cualquier sorteo cuya ventana
  haya terminado.

Ninguno de estos necesita nuestro permiso, nuestras claves ni que nuestros servidores estén en
marcha.

## Chainlink Automation, solo para el paso del cierre

`HearthPrizePool` implementa la interfaz `checkUpkeep` y `performUpkeep` de Chainlink para el paso
del cierre. Registrar un upkeep por tiempo le da al pool una segunda vía independiente para que
los sorteos se cierren a su hora, y el cierre es el paso que tiene un plazo, así que es el que
merece la pena asegurar.

Cubre el cierre y nada más, y el motivo es sencillo: el cierre es el único paso que no necesita
datos de fuera de la cadena. La adjudicación necesita una prueba de descifrado traída del relayer
de Zama. La evaluación hay que repetirla hasta que un cursor dé la vuelta. La conciliación
necesita otro descifrado. Una red de automatización en cadena no puede traer nada de eso, así que
fingir que podría sería teatro.

El upkeep es opcional. Necesita LINK en una cuenta de upkeep registrada, es redundancia y no la
vía principal, y sería un upkeep por pool, cada uno con su propio calendario. Todavía no hay
ninguno registrado en ninguno de los siete, así que los keepers por sí solos mueven los pools de
demostración.

Declaramos la interfaz de dos funciones en local en lugar de añadir todo el paquete de contratos
de Chainlink y sus dependencias por dos selectores.

## El presupuesto

Costes por sorteo, del despliegue real.

| Paso | Transacciones por sorteo | Gas de cada una |
| --- | --- | --- |
| Cierre | 1 | `1,422,474` |
| Adjudicación | 1 | `435,578` |
| Evaluación, un lote completo de 4 | `floor(savers / 4)`, aquí 1 | `3,417,699` |
| Evaluación, el último lote parcial | 0 o 1, aquí 1 con un solo ahorrador | `1,291,192` por un ahorrador, más `708,836` por cada extra |
| Finalización | 1 | `509,463` |
| Conciliación | 3, una por nivel, ya que a todos los niveles les toca en cada sorteo | `459,994` |

Con 5 ahorradores eso son `8,456,388` de gas por sorteo, o alrededor de `0.0085 ETH` a 1 gwei, la
comisión base de Sepolia en el momento del despliegue. Con un periodo de una hora eso son 24
sorteos al día y `0.2030 ETH` al día; con un periodo diario son `0.0085 ETH`.

Multiplica eso por siete pools y ahí está toda la razón de que seis de ellos sorteen cada seis
horas y no cada hora. Cada hora en los siete son 168 sorteos al día, unos `1.43 ETH`, que los
faucets públicos no pueden seguir. Un pool horario y seis pools de seis horas son 48 sorteos al
día, unos `0.41 ETH`. Cada cuenta keeper se financia por separado, así que un pool que se quede
sin gas para solo sus propios sorteos.

Un ahorrador más en un lote cuesta `708,836` de gas en Sepolia, y un lote con un solo ahorrador
cuesta `1,291,192`, ya que la parte fija de la llamada se paga igual. En unidades de cómputo, un
ahorrador son `3,674,128` según la tabla de precios del coprocesador simulado, que es donde esa
cifra se puede leer, porque un recibo real no reporta unidades de cómputo. El tamaño de lote `4`
está fijado a partir de esa medición frente a los límites publicados por Zama para Sepolia, de
20.000.000 de unidades de cómputo por transacción con 5.000.000 de profundidad secuencial.
`evaluate` acepta cualquier número, así que si Zama cambia el precio de una operación el keeper
puede bajar a un lote más pequeño sin redesplegar.

**El keeper evalúa el recorrido entero.** Nada en la cadena limita cuánto cuesta la evaluación, y
el keeper tampoco se para a medias; lo que impone es un techo de comisión
(`KEEPER_MAX_FEE_GWEI`), por debajo del cual sigue enviando hasta que el cursor llega al final. La
consecuencia honesta está enunciada en el [modelo de amenazas](../security/threat-model.md): un
pool rellenado con direcciones sin valor le cuesta más gas por sorteo al keeper, no sus premios a
los ahorradores, porque las direcciones sin observación anterior al periodo se saltan sin ningún
trabajo cifrado. Si el keeper está caído, cualquiera puede pulsar "Avanzar", y como el recorrido
empieza en un punto distinto en cada sorteo, nadie se queda permanentemente al final.

## Un keeper por pool

A un proceso se le dice qué pool mueve con `HEARTH_ADDRESSES_FILE`, el archivo de direcciones que
escribió el despliegue de ese pool, que también le da el símbolo del token, los decimales y el
índice de cuenta con el que firmar. `KEEPER_NAME` es la etiqueta que lleva cada línea de registro.
`packages/keeper/ecosystem.config.cjs` arranca los siete bajo pm2 en una sola máquina, un proceso
cada uno.

| Proceso pm2 | `HEARTH_ADDRESSES_FILE` | `KEEPER_ACCOUNT_INDEX` |
| --- | --- | --- |
| `hearth-keeper-usdc` | `hearth.json` | 1 |
| `hearth-keeper-usdt` | `hearth.usdt.json` | 10 |
| `hearth-keeper-weth` | `hearth.weth.json` | 11 |
| `hearth-keeper-bron` | `hearth.bron.json` | 12 |
| `hearth-keeper-zama` | `hearth.zama.json` | 13 |
| `hearth-keeper-tgbp` | `hearth.tgbp.json` | 14 |
| `hearth-keeper-xaut` | `hearth.xaut.json` | 15 |

El proceso `usdc` apunta a `hearth.json` y no a `hearth.usdc.json` porque ese es el archivo que
escribió el primer despliegue, antes de que los pools tuvieran slug, y el keeper en marcha lleva
días apuntado a él. Los dos archivos llevan las mismas direcciones.

Los índices están separados para que se pueda añadir un pool posterior sin renumerar, y cada
cuenta necesita su propio ETH de Sepolia. El índice 0 es el desplegador y el keeper lo rechaza.

## Dónde corren los siete que están en marcha

pm2 en un portátil es una manera de correr los siete y sigue funcionando. El keeper de cUSDC corre
en Railway; los otros seis corren bajo pm2 hasta que existan sus propios servicios de Railway, un
servicio por pool, para que un portátil cerrado no detenga ningún sorteo.

Un keeper es un proceso de larga duración y no una función programada: una pasada puede pasarse
dos minutos esperando al servicio de gestión de claves, que es más de lo que permiten casi todas
las plataformas sin servidor. Vale cualquier hosting que mantenga vivo un proceso de Node, y el
repositorio lleva la configuración para este:

- `railway.json` en la raíz del repositorio es a partir de lo que se construyó el servicio `usdc`.
- `railway/hearth-keeper-<slug>.json` recoge los valores de cada uno de los otros seis. Railway ya
  no lee un archivo de configuración para un servicio nuevo, así que esos valores van en los
  ajustes del propio servicio: los comandos de construcción y arranque que aparecen aquí, y luego
  `RECOVERY_PHRASE`, `SEPOLIA_RPC_URL`, `HEARTH_ADDRESSES_FILE`, `KEEPER_ACCOUNT_INDEX` y
  `KEEPER_NAME` como variables.

La construcción es `npm run build -w @hearth/keeper` y el arranque es
`node packages/keeper/dist/src/index.js` en cualquier hosting. Los ABI de los contratos que el
keeper necesita están en el repositorio bajo `packages/keeper/abi`, así que un hosting que nunca
compila los contratos lo ejecuta igual, y la comprobación de arranque compara el ABI cargado con
las funciones que el keeper llama, de modo que una desviación se avisa al arrancar y no en la
primera transacción. Los archivos de direcciones tienen que estar en el repositorio por la misma
razón, y lo están, bajo `packages/contracts/deployments/sepolia/`.

Corra donde corra, ejecuta exactamente un proceso por pool. Dos keepers que firman desde una misma
cuenta se pelean por el mismo nonce, así que para una copia local antes de arrancar una alojada
para el mismo pool. La puesta en marcha paso a paso, servicio a servicio, está en el README propio
del paquete del keeper, `packages/keeper/README.md`.

## Cómo ejecutarlo

El keeper es el paquete `@hearth/keeper`. Firma con una cuenta de la misma `RECOVERY_PHRASE` que
usa el despliegue y lee `SEPOLIA_RPC_URL` de `packages/contracts/.env`; sus propios ajustes viven
en `packages/keeper/.env`:

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

`plan` y `once` mueven el pool al que apunte `HEARTH_ADDRESSES_FILE`, así que comprobar otro pool
es una variable delante del comando. Si `HEARTH_VAULT` y `HEARTH_POOL` siguen en
`packages/keeper/.env` de una configuración de un solo pool, quítalos: se leen antes que el
archivo de direcciones, así que los siete procesos moverían un mismo pool.

Una pasada registra una línea por hecho, y cada línea lleva la etiqueta del pool que mueve el
proceso, así que siete registros entrelazados siguen siendo legibles. Las cantidades llevan el
símbolo y los decimales propios de ese pool, leídos los dos del archivo de direcciones:

```
09:14:37 [usdc] closed draw 41 (gas 1,422,474)
09:14:39 [usdc] draw 41: asking the relayer for the seed, the scale, the empty flag and the harvest
09:14:53 [usdc] awarded draw 41: 3 tiers, prizes 12.40 / 2.10 / 0.40 cUSDC, harvest 3.60 cUSDC (gas 435,578)
09:15:07 [usdc] evaluated draw 41: 4 of 9 savers done (gas 3,417,699)
09:15:38 [usdc] nothing to do: period 43, draw 41 has 8 of 9 savers evaluated
```

El proceso de WETH imprime las mismas líneas bajo `[weth]`, en `cWETH`. Qué significa cada tipo de
línea, una por una, está en el README propio del paquete del keeper,
`packages/keeper/README.md`.

El keeper no guarda estado entre ciclos: lee de la cadena el estado del sorteo, el cursor de
evaluación y la cadencia de conciliación, y deduce qué hacer. Reiniciarlo no pierde nada. Ejecuta
exactamente una instancia por pool, y nunca dos en una misma cuenta: en la cadena cada paso
funciona exactamente una vez por sorteo y por nivel, y dos llamadas a evaluate simplemente avanzan
el mismo cursor, pero dos keepers en una cuenta se pelean por el nonce de la transacción.

## Qué no cubre esta página

No cubre qué le hacen al dinero las transacciones del keeper, que es
[cómo funciona un sorteo](../concepts/how-a-draw-works.md). No cubre el despliegue, que es
[despliegue](deploying.md). Y no hace ninguna promesa de disponibilidad: nosotros ejecutamos un
keeper, no lo garantizamos, y el diseño está hecho para que no garantizarlo sea aceptable.
