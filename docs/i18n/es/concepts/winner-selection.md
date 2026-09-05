# Selección del ganador

Este es el corazón del producto: decidir quién ganó, sobre números que nadie puede leer, de
una forma que un desconocido pueda comprobar igualmente.

**La frase que importa: la selección del ganador queda fijada en el sorteo, y la evaluación
solo la pone por escrito.** En el momento en que el pool verifica la semilla aleatoria y la
franja en la que cae el total del pool, el resultado de cada ahorrador en cada nivel ya está
determinado. Los umbrales son números públicos que cualquiera puede recalcular, y el peso
cifrado contra el que se comparan ya no puede cambiar. La evaluación es contabilidad. No se
puede dirigir, ni adelantar, ni saltar de un modo que cambie quién ganó.

## Qué queda fijado cuando se adjudica un sorteo

| Símbolo | Qué es | ¿Público? |
| --- | --- | --- |
| `R` | La semilla aleatoria de este sorteo | Sí, una vez terminado el periodo |
| `M` | La franja en la que cayó el peso total del pool, una potencia de dos | Sí, una vez terminado el periodo |
| `prize[t]` | Lo que paga un premio del nivel `t` | Sí, fijado al cerrar |
| `offered[t]` | La liquidez que el nivel `t` aportó a este sorteo | Sí, fijada al cerrar |
| `count[t]` | Cuántos premios ofrece el nivel `t` por sorteo | Sí, fijado en el despliegue |
| `odds[t]` | Con qué frecuencia se dispara el nivel `t`, como fracción | Sí, fijada en el despliegue |
| `W` | El saldo total ponderado por tiempo del pool en el periodo | **No. No se publica nunca** |
| `twab` | El saldo ponderado por tiempo de un ahorrador en el periodo | No, cifrado, legible por ese ahorrador |

Las dos últimas filas son los secretos. `twab` es de cada persona. `W` es la suma de todos los
`twab`, y se guarda porque publicarlo exacto le da a un observador la forma de recuperar por
resta la cantidad depositada por quien fue el único en moverse. Contra lo que se ejecuta el
sorteo en su lugar es `M`: la menor potencia de dos igual o superior a `W`. Así que `M` queda
en algún punto entre `W` y `2W`, y lo único que aprende un observador de un sorteo al
siguiente es si el pool cruzó una potencia de dos.

## La regla de PoolTogether, y la nuestra

PoolTogether V5 da a cada ahorrador `count[t]` oportunidades independientes en el nivel `t`.
Cada oportunidad se gana con probabilidad `min(1, twab * odds[t] / W)`. Así que el número
esperado de premios de un ahorrador en un nivel es su parte del pool, multiplicada por las
probabilidades del nivel, multiplicada por el número de premios.

Hacer eso literalmente sobre números cifrados significaría sacar un número aleatorio nuevo por
ahorrador y por premio, y haría falta la `W` exacta. Hearth reproduce la misma forma con un
único número aleatorio uniforme por ahorrador y nivel, una escalera de umbrales anidados y `M`
en lugar de `W`.

Escribe `z = twab * odds[t] * count[t] / M`. Ese es el número esperado de premios que gana
este ahorrador en este nivel. Hearth le paga `floor(z)` o `ceil(z)` premios, con tope en
`count[t]`, y la media a lo largo de muchos sorteos es exactamente `z`.

Como el denominador es `M` y no `W`, la esperanza de cada ahorrador queda escalada por
`W / M`, un número entre un medio y uno. Suma los ahorradores y un nivel paga entre la mitad y
la totalidad de sus `count * odds` premios nominales por sorteo. Con eso no se pierde nada. Lo
que un nivel no paga se queda en su arrastre cifrado y se vuelve a ofrecer en el cierre
siguiente, así que con el tiempo todo el rendimiento sale igualmente; los premios simplemente
se estabilizan más altos. Ver [premios y niveles](prizes-and-tiers.md).

## La prueba, paso a paso

Para un ahorrador `u` en el nivel `t` del sorteo `p`:

1. Se deriva su número aleatorio para este nivel. `prn = keccak256(R, p, u, t)`. Como la
   dirección del ahorrador y el índice del nivel entran en el hash, cada ahorrador recibe su
   propio número y cada nivel recibe uno distinto, todos a partir de la única semilla `R`.
2. Se reduce a la franja. `r = prn mod M`, un número entero de `0` a `M - 1`. `M` es una
   potencia de dos, así que esto es un resto simple de un hash de 256 bits por una potencia de
   dos, que es exactamente uniforme y no tiene sesgo que corregir. Es aritmética pública sobre
   valores públicos.
3. Se construye la escalera. Para cada premio `k` de `0` a `count[t] - 1`:
   `threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))`.
   Son números públicos. Cualquiera puede calcularlos para cualquier dirección, y el contrato
   expone la misma aritmética como función de solo lectura,
   `thresholdOf(drawId, saver, tier, k)`, de modo que el panel de verificación de la
   aplicación, las pruebas y cualquier verificador externo usan una única implementación.
4. Se compara. El premio `k` se gana cuando el peso cifrado del ahorrador es mayor que
   `threshold_k`. Este es el único paso que toca un secreto, y es una comparación cifrada cuyo
   resultado es un verdadero o falso cifrado que nadie puede leer.
5. Se paga. Cada premio ganado suma `prize[t]` al pago cifrado del ahorrador en este nivel,
   mediante una selección cifrada y no una sentencia condicional, así que la transacción se ve
   idéntica tanto si no ganó nada como si lo ganó todo.
6. Se limita. El pago del nivel a este ahorrador es la menor de dos cifras: lo que ganó y lo
   que le queda al nivel. Esa resta actualiza la liquidez cifrada restante del nivel.
7. Se abona. La cantidad limitada se suma a las ganancias cifradas del ahorrador.

Los umbrales suben con `k`, así que un ahorrador gana los premios `0` a `j-1` para algún `j` y
después se detiene. La condición para el premio `k` es exactamente
`twab * odds * count > r + k * M`.

### La única bifurcación en claro

Si un umbral es mayor que `2^64 - 1`, ningún peso de 64 bits puede superarlo, así que la
respuesta es falsa y la comparación se salta por completo. Esto pasa en un nivel de
probabilidad baja cuando `M` es muy grande. Como los umbrales solo suben con `k`, el bucle del
nivel se detiene en el primer umbral así en lugar de comprobar el resto. La bifurcación es
sobre un número público. En Hearth nada se bifurca nunca sobre un secreto.

## Ejemplo resuelto: tres ahorradores, un nivel

Un pool diminuto, para que los números se lean bien. Un nivel: el nivel frecuente, `count = 4`,
`odds = 1` (es decir, `oddsNum = 1`, `oddsDen = 1`). Los pesos van en saldo-segundos del token
que tenga ese pool; el ejemplo los lee como USDC.

| Ahorrador | Peso | Parte de `W` | `z = weight * 4 / M` |
| --- | --- | --- | --- |
| Ada | 600 | 60% | 2,34 |
| Ben | 300 | 30% | 1,17 |
| Cy | 100 | 10% | 0,39 |
| **`W` total** | **1.000** | 100% | **3,91** |

`W` es 1.000, así que la franja es `M = 1,024`, la menor potencia de dos igual o superior. Nadie
fuera del pool ve el 1.000. Ven el 1.024.

Fíjate en la columna del total. El pago nominal del nivel es `count * odds = 4` premios por
sorteo. Lo que espera pagar de verdad es `4 * W / M = 4 * 1000 / 1024 = 3,91`. Ese es el
escalado por `W / M`, y aquí supone un recorte del 2,3 por ciento porque 1.000 queda cerca de
lo alto de su franja. Un pool de 520 quedaría cerca del fondo de esa misma franja y el nivel
esperaría unos 2,03 premios.

Ahora ocurre el sorteo. La `r` de cada ahorrador sale de aplicar el hash a la semilla junto con
su propia dirección, así que es un número distinto para cada uno, y cae entre 0 y 1.023.

**Ada, `r = 271`.** Los umbrales son `floor((271 + k * 1024) / 4)`:

| k | Umbral | ¿El peso 600 de Ada lo supera? |
| --- | --- | --- |
| 0 | 67 | Sí |
| 1 | 323 | Sí |
| 2 | 579 | Sí |
| 3 | 835 | No |

Ada gana 3 premios. Su esperanza era 2,34, así que 3 es el lado alto del `floor` o el `ceil`.

**Ben, `r = 812`.** Umbrales `floor((812 + k * 1024) / 4)`:

| k | Umbral | ¿El peso 300 de Ben lo supera? |
| --- | --- | --- |
| 0 | 203 | Sí |
| 1 | 459 | No |

Ben gana 1 premio, frente a una esperanza de 1,17.

**Cy, `r = 155`.** Umbrales `floor((155 + k * 1024) / 4)`:

| k | Umbral | ¿El peso 100 de Cy lo supera? |
| --- | --- | --- |
| 0 | 38 | Sí |
| 1 | 294 | No |

Cy gana 1 premio. Su esperanza era 0,39, así que este es su día bueno. A lo largo de muchos
sorteos gana un premio alrededor del 39 por ciento de las veces y nada el resto.

Se repartieron cinco premios donde se esperaban 3,91. No pasa nada: cada premio es un octavo de
la liquidez del nivel, así que el nivel puede pagar ocho antes de quedarse seco. Ver
[sobresuscripción](prizes-and-tiers.md).

Fíjate ahora en lo que ve un observador al final de todo eso. Puede calcular las tres tablas él
mismo, porque `R`, `M`, los umbrales y las direcciones son públicos. Lo que no puede es
rellenar la columna de la derecha, porque los pesos están cifrados, y tampoco puede recuperar
el 1.000, porque solo se publicó el 1.024. Cuando el nivel se concilia, un sorteo después, se
entera de cuántos premios pagó. Nunca se entera de a quién.

## Por qué repartir tu cartera no gana nada

Esta es la propiedad que pierde una versión mal construida.

Los premios esperados de un ahorrador en un nivel son `z = twab * odds * count / M`, que es
lineal en su peso, y `M` no depende de cómo se reparta el peso del pool entre direcciones.
Divide un peso de 600 en dos carteras de 300 y cada una obtiene `z = 1,17`, con un total de
2,34. Exactamente lo mismo. Divídelo en seis carteras de 100 y cada una obtiene 0,39, total
2,34. Exactamente lo mismo otra vez. No hay ningún umbral que manipular ni ningún redondeo que
explotar, solo más gas que pagar.

Una versión anterior de este diseño metía el número de premios dentro de una única zona ganadora
más ancha, de modo que cada ahorrador podía ganar como mucho un premio por nivel. Eso ponía
techo a los grandes tenedores por debajo de lo que les correspondía y pagaba a la gente por
repartirse. Una revisión de diseño lo detectó y la escalera anidada lo sustituyó.

## Cuánto cuesta

Por ahorrador y sorteo el trabajo cifrado es: una multiplicación y una suma para calcular el
peso, y después, por cada nivel, una comparación y una selección por premio, más un límite. Con
los tres niveles de Sepolia eso son 6 comparaciones, 6 selecciones y alrededor de una docena de
sumas, restas y mínimos.

Zama publica el presupuesto por transacción en Sepolia como 20.000.000 de unidades de cómputo
en total con 5.000.000 de profundidad secuencial, y pone precio a una suma de 64 bits en
162.000, a una comparación en unos 118.000, a una selección en 55.000 y a una multiplicación
por un número público en 365.000. Esos números sitúan a un ahorrador en los pocos millones de
unidades de cómputo, y por eso la evaluación se agrupa en lotes de `4` ahorradores por
transacción. La cifra medida es
`3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)` por ahorrador y el gas medido es `708,836 (the marginal cost of one more saver in a batch; a batch of one costs 1,291,192)`.

## Qué no cubre esta página

No cubre de dónde viene `R` ni cómo verificarla, que es
[aleatoriedad y verificación](../security/randomness-and-verification.md). No cubre cómo se
dimensiona `prize[t]` ni qué pasa cuando un nivel se agota a mitad de sorteo, que es
[premios y niveles](prizes-and-tiers.md). Y no afirma nada sobre ocultar quién participó: la
lista de ahorradores, los lotes de evaluación y los recuentos de premios por nivel son todos
públicos. Ver [qué permanece privado](../security/what-stays-private.md).
