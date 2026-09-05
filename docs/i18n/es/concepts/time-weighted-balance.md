# Saldo ponderado por tiempo

Tus probabilidades en un sorteo no dependen de lo que tienes cuando ocurre el sorteo.
Dependen de tu saldo medio a lo largo de todo el periodo. Esta página explica por qué, qué le
cuesta a quien deposita tarde y por qué a la bóveda le basta con recordar tres momentos por
ahorrador.

## Por qué la media y no el saldo final

Empecemos por el diseño sencillo: ponderar a cada uno por su saldo en el instante en que se
hace el sorteo. Es fácil de construir y está roto.

Un atacante deposita una cantidad grande, espera al sorteo, gana y retira. Su dinero estuvo en
el pool un bloque. No generó rendimiento para nadie, no asumió ningún riesgo y se llevó el
premio que financiaron los ahorradores pacientes. Y después lo repite en el sorteo siguiente.

Ejecutamos esto contra nuestro propio diseño anterior el 2 de septiembre de 2026. En un pool
donde un ahorrador honesto tenía 100 USDC, un atacante que hacía entrar y salir 9.000 USDC
alrededor de cada sorteo ganó 19 de 20 sorteos y vació una reserva de premios de 5.000 USDC.
El capital del atacante nunca estuvo en riesgo, porque un pool sin pérdidas por definición lo
devuelve. El ciclo entero cabía incluso dentro de una sola transacción: depositar, abrir el
sorteo, escanear, retirar, gas 2,189,992.

El arreglo es el que usa PoolTogether. Su propia documentación lo dice así: poder mirar hacia
atrás en el tiempo importa "para que los usuarios puedan depositar y retirar libremente en un
fondo de premios mientras su aportación de liquidez se mide con exactitud". Mide la
aportación, no la foto fija.

## Cuánto vale un depósito tardío

Un periodo son 3.600 segundos en el pool de USDC y 21.600 en los otros seis. El peso es el
saldo multiplicado por los segundos que se mantuvo, así que se mide en saldo-segundos del
token propio de ese pool. El ejemplo de abajo es el pool horario de USDC.

| Ahorrador | Qué hizo | Peso del periodo |
| --- | --- | --- |
| Ada | Mantuvo 100 USDC durante los 3.600 segundos | 100 x 3600 = 360.000 |
| Ben | Depositó 1.000 USDC cuando quedaban 360 segundos | 1.000 x 360 = 360.000 |
| Cy | Mantuvo 1.000 USDC durante todo el periodo | 1.000 x 3600 = 3.600.000 |

Ben puso diez veces el dinero de Ada y compró exactamente las mismas probabilidades, porque
estuvo una décima parte del tiempo. Cy, que hizo aquello para lo que existe el producto, tiene
diez veces las probabilidades de cualquiera de los dos.

El caso espejo también funciona. Retira en el instante en que se cierra un sorteo y conservas
el peso que ya te ganaste en el periodo terminado, y no arrastras casi nada al siguiente. Las
probabilidades no se pueden alquilar.

Nada de esto impide que alguien que de verdad mantiene un saldo grande durante un periodo
entero gane a menudo. Eso no es un ataque. Eso es el producto funcionando: su dinero estuvo en
el pool todo el tiempo, generando el rendimiento que paga los premios de todos.

## Cómo recuerda la bóveda

La bóveda guarda tres instantáneas por ahorrador, llamadas observaciones. Cada una contiene
tres cosas: un total acumulado de saldo-segundos, el saldo justo después de ese cambio y la
marca de tiempo. Las tres casillas se llaman `current`, `previous` y `older`.

El total acumulado se reinicia al principio de cada periodo. Ese reinicio es lo que mantiene
pequeño el número: dentro de un periodo nunca puede superar el saldo multiplicado por la
duración del periodo.

Cuando tu saldo cambia, pasa una de estas tres cosas:

- **Tu primer cambio de todos.** Se crea la casilla `current` con un total acumulado de cero y
  tu saldo nuevo.
- **Un cambio en el mismo periodo que `current`.** La bóveda suma los saldo-segundos que
  ganaste desde el último cambio y después sobrescribe `current` en su sitio. No se usa
  ninguna casilla nueva.
- **Un cambio en un periodo posterior al de `current`.** Las tres casillas se desplazan:
  `older` toma el antiguo `previous`, `previous` toma el antiguo `current`, y se escribe un
  `current` nuevo que lleva los saldo-segundos que ganaste desde el principio de este periodo
  hasta ahora.

Leer tu peso del periodo `p` usa la observación más reciente que esté en ese periodo o antes:

- Si está dentro del periodo `p`, tu peso es el total acumulado que lleva más tu saldo
  multiplicado por los segundos que van de ese momento al final del periodo.
- Si está antes del periodo `p`, no tocaste tu saldo durante el periodo, así que tu peso es
  sencillamente ese saldo multiplicado por la duración completa del periodo.
- Si no tienes ninguna observación en el periodo `p` o antes, todavía no eras ahorrador, y tu
  peso es cero. Ese caso se decide a partir de marcas de tiempo públicas, sin ninguna
  aritmética cifrada.

Cada paso cifrado de aquí es una multiplicación por un número público y una suma. Eso es lo
que mantiene la evaluación lo bastante barata como para agruparla en lotes.

Un detalle que importa para el argumento de conteo de más abajo. Toda salida escribe una
observación, haya movido principal o no, porque la bóveda no puede ver de cuál de tus dos
saldos salió el retiro. Es inofensivo: una casilla solo se desplaza cuando ha empezado un
periodo nuevo, así que un retiro que sea solo de ganancias no consume ninguna casilla más allá
de la que tu periodo iba a usar de todos modos.

## Por qué bastan tres observaciones

Esta es la pregunta que debería hacer un revisor, y la respuesta es un argumento de conteo.

Solo se empuja una casilla nueva cuando un cambio de saldo cae en un periodo posterior a aquel
en el que está `current`. Como mucho hay un empujón por periodo, por muchas veces que
deposites o retires dentro de él.

El sorteo `p` solo se puede cerrar, adjudicar y evaluar durante los periodos `p+1` y `p+2`. Así
que para cuando alguien lee tu peso del periodo `p`, han empezado como mucho dos periodos
posteriores a `p`, y por tanto se han empujado como mucho dos observaciones nuevas encima de la
que era la más reciente en el periodo `p` o antes. Tres casillas lo aguantan: la que
necesitamos, más las dos como mucho que cayeron después.

Por eso la ventana es de dos periodos y no más larga. Si amplías la ventana necesitas una
cuarta casilla; si la dejas en un periodo, una sola respuesta lenta del relayer puede perder un
sorteo, que es lo que un periodo corto hacía dolorosamente probable. El cierre tiene su propio
plazo, medio periodo antes del final de la ventana, así que esas mismas tres casillas cubren
siempre el viaje de ida y vuelta que sigue a un cierre.

La bóveda guarda esas mismas tres observaciones para el saldo total del pool, de modo que el
peso agregado de un periodo se calcula con la regla idéntica y es válido durante la misma
ventana. Ese agregado no se publica nunca. Lo que la bóveda publica es la franja de potencia de
dos que queda por encima, y calcula esa franja comparando bajo cifrado ese mismo número
acumulado contra cinco potencias de dos fijas. Ver
[qué permanece privado](../security/what-stays-private.md).

## Los dos límites de tamaño

Los valores cifrados de aquí son enteros sin signo de 64 bits, así que la aritmética tiene que
quedarse dentro de ese rango. Desbordar un número cifrado es peor que desbordar uno normal,
porque no revierte nada y nadie ve que pasa.

**Por ahorrador.** La bóveda rechaza cualquier depósito cuya cantidad, o cuyo principal
resultante, quede por encima de `maxPrincipal = (2^64 - 1) / L`. Con un periodo de una hora eso
son unos 5.000 millones de tokens, con uno de seis horas unos 854 millones y con uno diario
unos 213 millones. Como tu total acumulado no puede superar tu saldo multiplicado por la
duración del periodo, y tu saldo no puede superar ese tope, tu total acumulado no puede pasar
de 64 bits. El rechazo se devuelve como un falso cifrado y el token te reembolsa en la misma
transacción, así que tocar el tope no revela tu saldo.

La comprobación acota la cantidad entrante además del resultado, y esa segunda cota no es
decoración. La suma cifrada da la vuelta a los 64 bits sin revertir, así que un depósito de
`2^64` menos tu principal produciría una suma de cero, y una comprobación que solo mirara la
suma lo dejaría pasar. Con la cantidad y el principal existente los dos por debajo del tope, la
suma no puede llegar a `2^64` con ninguna duración de periodo que permita el constructor, así
que el desbordamiento es inalcanzable y no meramente improbable.

**Para el total del pool.** El acumulador del total es de 128 bits en lugar de 64, así que el
agregado no puede desbordar con ninguna emisión que el envoltorio sea capaz de acuñar.

Una versión anterior de este diseño afirmaba que un acumulador de 64 bits no podía desbordar.
Era falso, una revisión de diseño lo detectó, y el tope más el total de 128 bits son el
arreglo.

## Qué no cubre esta página

No cubre qué pasa una vez que se conoce tu peso. Eso es la
[prueba del ganador](winner-selection.md). Tampoco afirma que la ponderación por tiempo sea una
función de privacidad: tu peso está cifrado, pero la franja en la que cae el total del pool se
publica en cada sorteo, y con muy pocos ahorradores esa franja fija un peso con un margen de un
factor dos. Ver [qué permanece privado](../security/what-stays-private.md).
