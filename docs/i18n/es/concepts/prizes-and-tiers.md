# Premios y niveles

El rendimiento entra de golpe una vez por periodo. Los niveles son la forma de convertir ese
golpe en una mezcla de premios pequeños y frecuentes y uno grande y raro. Esta página explica
la parte del dinero: cómo se reparte la liquidez, cómo se dimensiona un premio, qué pasa
cuando un nivel paga más de lo previsto y los tres puntos en los que nos apartamos a
propósito de PoolTogether V5.

Los tamaños de los premios, la liquidez de los niveles y los recuentos de premios siempre han
sido públicos en PoolTogether, y aquí la parte en claro de los tres también lo es. Lo que
sigue cifrado es quién ganó, y un total acumulado por nivel llamado arrastre.

## Liquidez y participaciones

Cada nivel tiene un bote llamado su liquidez, en números en claro que cualquiera puede leer.
Entran en él dos cosas:

- **Cosechas.** Cada adjudicación reparte la cosecha verificada entre los niveles según sus
  pesos de participación. El resto entero de ese reparto, las pocas unidades base que no
  dividen exacto, va al nivel mayor en lugar de perderse. Una cosecha anotada en la
  adjudicación del sorteo `p` se ofrece en el cierre siguiente, no en el del propio sorteo
  `p`.
- **Arrastre conciliado.** Todo lo que un nivel ofreció en un sorteo anterior y nadie ganó
  vuelve cuando ese nivel se concilia, que en Sepolia es un sorteo después.

Cada nivel tiene además un segundo bote, el **arrastre**, y ese va cifrado. Es el total
acumulado de todo lo que el nivel ofreció y nadie ganó, y se suma a la oferta del nivel en
cada cierre aunque su tamaño sea secreto.

Al cerrar, para cada nivel:

```
prize[t]     = liquidity[t] * UTILISATION / count[t]     // plaintext only
offered[t]   = liquidity[t] + carry[t]                   // plaintext plus encrypted
liquidity[t] = 0                                         // until the tier reconciles
```

De ahí se leen dos cosas. Los tamaños de los premios salen solo de la parte en claro, que es
lo que los mantiene públicos. El arrastre cifrado solo añade capacidad, así que un nivel
siempre puede pagar al menos tanto como sugiere su tamaño de premio público.

`UTILISATION` es el 50 por ciento. Es la tasa de utilización de PoolTogether, y es la defensa
contra la sobresuscripción: un nivel ofrece toda su liquidez pero dimensiona cada premio como
si solo tuviera la mitad. Por tanto, un nivel puede pagar el doble de premios de los que
espera antes de quedarse seco.

**Todo esto se fija al cerrar, antes de que exista la semilla aleatoria de ese sorteo.** La
semilla se saca más tarde en la misma transacción. Nadie puede ver una semilla, deducir que ha
ganado y después mover dinero entre niveles para que la victoria sea mayor.

## Los tres niveles de Sepolia

Cada pool lleva su propio juego de niveles, porque las probabilidades son una fracción del
periodo propio de ese pool. El pool horario de USDC:

| Nivel | Premios por sorteo (`count`) | Probabilidad | Participaciones | Se concilia cada | Cómo se siente |
| --- | --- | --- | --- | --- | --- |
| Mayor | 1 | 1 entre 24 | 40 | 1 sorteo | Raro y grande |
| Medio | 1 | 1 entre 6 | 20 | 1 sorteo | Unas cuantas veces al día |
| Frecuente | 4 | 1 entre 1 | 40 | 1 sorteo | Cuatro premios en cada sorteo |

Los seis pools que sortean cada seis horas mantienen las mismas cantidades, participaciones y
cadencia, y cambian solo las probabilidades: mayor 1 entre 4, medio 1 entre 2, frecuente 1
entre 1. Un sorteo de seis horas es seis veces más raro, así que 1 entre 4 hace caer el premio
mayor una vez al día, el mismo ritmo que da el juego horario. El nivel medio es la única
diferencia: unas dos veces al día en los pools de seis horas frente a unas cuatro veces al día
en el horario. Por qué seis horas: [pools y
tokens](pools-and-tokens.md).

Las participaciones suman 100 en los dos juegos, así que el nivel mayor se lleva el 40 por
ciento de cada cosecha, el nivel medio el 20 por ciento y el nivel frecuente el 40 por ciento.
Todos los niveles de todos los pools se concilian en cada sorteo, que es una decisión con un
coste por ambos lados; tiene su propia sección más abajo.

### Qué producen esos ajustes

Escribe `H` para la cosecha recogida en un periodo. El número esperado nominal de premios de
un nivel por sorteo es `count * odds`. Mete eso de vuelta en la fórmula de dimensionado y cada
nivel se estabiliza en un estado de reposo:

| Nivel | Liquidez en reposo | Tamaño del premio | Pago esperado por sorteo | Con qué frecuencia se dispara |
| --- | --- | --- | --- | --- |
| Mayor | 19,2 H | 9,6 H | 0,4 H | Una vez al día aproximadamente |
| Medio | 2,4 H | 1,2 H | 0,2 H | Cada seis horas aproximadamente |
| Frecuente | 0,8 H | 0,1 H | 0,4 H (cuatro premios) | En cada sorteo |

Los tres pagos esperados suman exactamente `H`. Todo el rendimiento sale como premios y nada
se acumula para siempre.

Esa tabla es la del pool horario. Un pool de seis horas recoge seis veces más en un periodo y
sortea seis veces menos a menudo, y sus probabilidades más cortas reparten ese ingreso entre
el mismo número de premios: el nivel mayor se estabiliza en 3,2 H de liquidez y un premio de
1,6 H, el nivel medio en 0,8 H y 0,4 H, y el nivel frecuente no cambia, en 0,1 H por premio.
Medido en dinero real y no en `H`, el premio mayor de un pool de seis horas es del mismo
tamaño que el premio mayor de uno horario que gane al mismo ritmo, porque un sorteo más raro
lleva seis veces la cosecha.

Esas son las cifras nominales. El sorteo se ejecuta contra la franja `M` y no contra el total
exacto `W`, y `M` queda entre `W` y `2W`, así que un nivel paga en realidad entre la mitad y
la totalidad de su recuento nominal de premios en cada sorteo. Ver
[selección del ganador](winner-selection.md). Lo que no paga va al arrastre y se vuelve a
ofrecer, así que no se pierde nada; lo que ocurre en su lugar es que los tamaños de los
premios se estabilizan en algún punto entre las cifras de arriba y el doble, según dónde caiga
el total del pool dentro de su franja. Un pool cerca de lo alto de una franja paga cerca de la
tabla. Un pool que acaba de cruzar una potencia de dos paga durante un tiempo menos premios y
más grandes.

Un motivo por el que la tabla describe el despliegue real y no un ideal: todos los niveles se
concilian en cada sorteo. Lo que un nivel ofreció y nadie ganó se publica en la finalización de
ese sorteo y se anota directamente de vuelta en su liquidez pública, así que la liquidez en
reposo de un nivel se asienta de verdad donde dice la tabla, y el bote que muestra la
aplicación es el bote que lleva el nivel. Con una cadencia más lenta ese mismo dinero seguiría
ofreciéndose y seguiría siendo ganable, pero estaría en el arrastre cifrado entre
conciliaciones, y la liquidez pública, que es la que dimensiona el premio, sería solo la
cosecha anotada desde la última conciliación de ese nivel. La sección siguiente es ese
compromiso al completo.

Por poner un número, supongamos que la fuente de USDC en Sepolia gotea 10 USDC por periodo.
Entonces el premio mayor queda cerca de 96 USDC y cae una vez al día aproximadamente, el
premio medio cerca de 12 USDC cada seis horas aproximadamente, y cuatro premios de alrededor
de 1 USDC caen en cada sorteo, con cada una de esas cifras libre de llegar hasta el doble
según la franja. La tasa de goteo real en ese pool es de
`5,555 base units a second, which is 19.998 USDC a period`, la tasa de cada pool está listada
en [pools y tokens](pools-and-tokens.md), y los tamaños reales de los premios están en la
tarjeta "El pool ahora mismo" del panel de ese pool, en `/app/<slug>`, leídos de la cadena.

Estos son argumentos de constructor, elegidos con la fórmula de probabilidades de PoolTogether
V5 y escritos por pool en `packages/contracts/hearth.config.ts`. Un despliegue en mainnet con
un periodo diario usaría otros distintos; ver [despliegue](../operations/deploying.md).

## La cadencia de conciliación, y lo que cuesta subirla

Conciliar un nivel publica su arrastre, y el arrastre es exactamente el dinero que ese nivel
ofreció y nadie ganó. Réstalo de lo ofrecido, divide por el tamaño del premio, y sabes cuántos
premios pagó ese nivel. Ese número es una revelación real: es una medición de los saldos
cifrados, de la forma "cuántos de estos ahorradores tenían un peso por encima de su propio
umbral publicado".

`reconcileEvery[t]` es el mando de esa revelación, y es un argumento de constructor por nivel.
Subirlo esconde el recuento durante esos sorteos y después publica un solo número para todo el
tramo. Pon el nivel mayor en 24 y su recuento pasa a ser una cifra diaria, y las personas que
podría ser son todas las que fueron elegibles en algún momento de ese día, en lugar del cuatro
por ciento aproximado del pool que es elegible en un solo sorteo. En un nivel de 1 entre 24 esa
diferencia no es cosmética: un recuento por sorteo nombra a un ganador del bote dentro de un
conjunto pequeño.

El precio de subirlo es el bote mismo. Un cierre mueve toda la liquidez pública de un nivel al
sorteo y deja el nivel a cero, y ese dinero solo vuelve en una conciliación. Así que con una
cadencia de 24, en 23 de cada 24 sorteos la liquidez pública del nivel mayor es solo la cosecha
anotada desde la última conciliación, el premio publicado se dimensiona sobre la parte de ese
único sorteo, y el bote acumulado aparece a la vista solo en el sorteo de la conciliación. El
dinero no está ocioso mientras tanto, porque el arrastre cifrado se suma a la oferta del nivel
en cada cierre y se puede ganar en todo momento. Pero es invisible, y un bote que nadie puede
ver crecer no es realmente un bote.

Un recuento de premios oculto y un bote visible que se acumula no pueden darse a la vez. **Este
despliegue eligió el bote visible.** Los tres niveles van con `reconcileEvery = 1`, así que el
arrastre de cada nivel se publica en la finalización del sorteo del que salió, se verifica en
la cadena contra el handle que publicó la bóveda, y `reconcile` lo anota de vuelta en la
liquidez pública. El bote se acumula a la vista, como el de PoolTogether, y cuántos premios
pagó cada nivel se hace público un sorteo después, también como en PoolTogether. Nunca quién
ganó, en ninguno de los dos casos.

Eso convierte el recuento de arriba en un residuo revelado y no en uno mitigado. El
razonamiento no cambia y sigue siendo cierto: un recuento por sorteo en un nivel de 1 entre 24
es una medición sobre el pequeño conjunto de ahorradores elegibles en ese sorteo, y se acumula
contra un saldo que nunca se mueve. Es una medición más débil en los pools de seis horas, cuyo
nivel mayor es de 1 entre 4, así que cada recuento cubre alrededor de una cuarta parte del pool
en lugar de una veinticuatroava, y hay cuatro al día en lugar de veinticuatro. Está redactado
en [qué permanece privado](../security/what-stays-private.md) y recogido en la
[lista de limitaciones](../limitations.md). Dos cosas siguen limitándolo. Los recuentos son
gruesos, ya que nunca se publica nada más fino que un número entero de premios. Y los umbrales
no se pueden apuntar a un saldo sospechado, porque la semilla se saca dentro del coprocesador y
se revela solo cuando su periodo ha terminado.

Un despliegue que prefiera la medición más lenta al bote visible sube el mando y acepta el
compromiso en la otra dirección. Es un redespliegue.

## Sobresuscripción: cuando un nivel paga más de lo previsto

Los premios son independientes, así que un nivel que espera cuatro premios a veces reparte seis
o nueve. Cada premio es un octavo de la liquidez del nivel frecuente, así que puede pagar ocho.
Pasado eso, el nivel está vacío.

Hearth resuelve esto con un contador cifrado por nivel y por sorteo. Cada pago se limita a la
menor de dos cifras, lo que ganó el ahorrador y lo que le queda al nivel, y el contador baja en
la cantidad limitada. Ninguna transacción revierte y a nadie se le desborda la aritmética.

### Qué experimenta un ganador tardío

La evaluación recorre la lista de ahorradores desde un punto de partida derivado de la semilla
de ese sorteo. Si el nivel se vacía a mitad del recorrido:

- El ahorrador que se está evaluando en ese momento se lleva lo que quede, que puede ser menos
  que los premios que dicen sus umbrales que ganó.
- Los ahorradores más adelante en el recorrido no reciben nada de ese nivel en ese sorteo. Los
  demás niveles no se ven afectados: cada nivel tiene su propio contador.

Nadie puede comprar un sitio mejor en esa cola. El orden del recorrido lo fija la semilla, quien
llama a `evaluate` elige a cuántos ahorradores avanzar y nunca a cuáles, y el punto de partida
se mueve en cada sorteo, así que ninguna dirección es la última de forma sistemática.

Esto es visible para el ahorrador afectado, no silencioso. Tanto su peso guardado como su
crédito guardado de ese sorteo los puede descifrar él, así que puede recalcular sus umbrales a
partir de la semilla pública y ver que su crédito se queda corto.

### Con qué frecuencia pasa

Para el nivel frecuente, con muchos ahorradores pequeños, el número de premios repartidos se
acerca a una distribución de Poisson de media 4, y el nivel puede pagar 8. La probabilidad de
necesitar un noveno es de alrededor del 2 por ciento por sorteo. Como el sorteo se ejecuta
contra la franja y no contra el total exacto, el recuento esperado real está entre 2 y 4, así
que ese 2 por ciento es el techo y no el caso típico. Para los dos niveles con `count = 1`, el
número esperado de premios está muy por debajo de uno mientras la capacidad sigue siendo dos,
así que allí el límite es más raro por órdenes de magnitud.

Esa aproximación supone un pool de muchos ahorradores pequeños. En un pool de tres ahorradores
de tamaños muy distintos la dispersión es otra, y en el pequeño pool de demostración de Sepolia
es fácil construir un sorteo que llegue al límite. Eso es una consecuencia del tamaño de la
demostración, no un fallo.

## Tres diferencias deliberadas con PoolTogether V5

Las tres se dicen aquí en lugar de esconderse, porque un revisor que conozca V5 las va a
buscar.

### 1. El sorteo se ejecuta contra una franja, no contra el total exacto

V5 ejecuta su prueba del ganador contra la emisión total exacta del sorteo, cosa que puede
hacer porque ese número es público en una cadena transparente. Publicar aquí el total exacto
filtraría cantidades depositadas individuales, así que Hearth publica solo la franja de
potencia de dos que queda por encima.

La consecuencia es la que se describe arriba: un nivel paga entre la mitad y la totalidad de su
recuento nominal de premios en cada sorteo, y los tamaños de los premios se estabilizan
correspondientemente más altos. No se pierde dinero y las probabilidades de ningún ahorrador se
distorsionan respecto a las de otro, porque todos los ahorradores de un nivel están escalados
por el mismo `W / M`. Es la limitación 12.

### 2. Sin nivel de reserva

V5 se lleva una parte de cada aportación a una reserva. La reserva financia el incentivo para
adjudicar el sorteo y amortigua un nivel sobresuscrito recargándolo.

Hearth no tiene reserva. La tasa de utilización del 50 por ciento es la única amortiguación, que
es la alternativa que nombra la propia documentación de V5 para los despliegues que usan
`tierLiquidityUtilizationRate` con este fin. La consecuencia es el límite descrito arriba: en el
raro sorteo sobresuscrito, los últimos ganadores en el orden del recorrido se quedan cortos en
lugar de que se les recargue.

Elegimos esto porque una reserva necesita una vía de retirada controlada por el propietario para
ser útil, y cada poder del propietario en un pool confidencial es algo en lo que un ahorrador
tiene que confiar. El compromiso está escrito en la [lista de limitaciones](../limitations.md)
como limitación 4.

### 3. Las probabilidades del nivel mayor se miden sobre un periodo

V5 mide las probabilidades del nivel mayor sobre toda la ventana de acumulación del nivel, así
que la posibilidad de llevarse un bote que lleva un año creciendo refleja un año de
participación.

Hearth mide las probabilidades del nivel mayor sobre un único periodo, como todos los demás
niveles. Eso significa que un gran tenedor que aparece durante un periodo tiene un tiro
proporcional completo a un bote que otra gente tardó 24 periodos en llenar. Es una asimetría
real y está enunciada como limitación 5.

El arreglo barato es conocido y está anotado para una versión posterior: seguir los
saldo-segundos acumulados desde el último pago del nivel mayor y ponderar ese nivel por eso en
lugar de por el peso de un único periodo. Se dejó fuera de la versión uno porque añade un
segundo acumulador con su propio análisis de desbordamiento, y publicar lo sencillo que está
plenamente probado ganó a publicar lo mejor que no lo está.

## Qué no cubre esta página

No cubre de dónde viene la cosecha ni cómo se verifica, que es
[fuente de rendimiento](yield-source.md). No cubre la prueba por ahorrador que decide quién
gana, que es [selección del ganador](winner-selection.md). Y no hace ninguna afirmación de
privacidad sobre los tamaños de los premios: aquí son públicos por diseño, y lo que sí revelan
los recuentos de premios publicados está expuesto en
[qué permanece privado](../security/what-stays-private.md).
