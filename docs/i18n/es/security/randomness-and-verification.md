# Aleatoriedad y verificación

Un sorteo solo vale algo si un desconocido puede comprobarlo. Esta página es el cómo.

## De dónde sale la semilla

Una llamada, dentro de la transacción que cierra un sorteo:

```solidity
euint64 seed = FHE.randEuint64();
```

Eso corre dentro del coprocesador de Zama. El número lo produce un generador
criptográficamente seguro bajo la clave FHE de la red, y lo que le vuelve al contrato es un
handle de texto cifrado, no un número. Nadie ha visto el valor en ese momento: ni quien llama,
ni nosotros, ni el minero.

Aquí importan dos propiedades del generador de Zama, y las dos están enunciadas en la
documentación de la propia Zama:

- **Tiene que correr dentro de una transacción.** Generar un valor aleatorio muta el estado del
  generador en la cadena, así que no se puede hacer con `eth_call`, la forma de solo lectura de
  simular una llamada. Nadie puede previsualizar un sorteo fuera de la cadena para ver si
  ganaría.
- **Es criptográficamente seguro y sigue cifrado** hasta que algo lo hace descifrable de forma
  explícita.

## Por qué nadie puede volver a tirarla, ni cambiar el tamaño de lo que gana

Cuatro cosas, juntas.

1. **El cierre funciona una vez.** La máquina de estados del sorteo permite `closeDraw(p)`
   exactamente una vez por sorteo. No hay un segundo intento para comprar un número mejor.
2. **El valor es desconocido cuando se saca.** Como la semilla es texto cifrado en el momento de
   crearse, quien envía la transacción de cierre no aprende nada por haberla enviado. No tiene
   sentido competir por ser quien llama.
3. **El paso de publicación es de un solo sentido.** Después del cierre, la semilla se marca como
   públicamente descifrable. Esa bandera es permanente e irrevocable en la lista de control de
   acceso de Zama, así que el número que ve el mundo es el número al que se comprometió el
   contrato, no uno elegido después.
4. **Los premios se fijan antes de que exista la semilla.** El tamaño del premio de cada nivel y
   la liquidez que ofrece se calculan al principio de esa misma transacción de cierre, antes de
   llamar a `randEuint64`. En un borrador anterior se fijaban más tarde, en la adjudicación, lo
   que dejaba una ventana en la que alguien podía leer la semilla, deducir que había ganado y
   después mover liquidez entre niveles para que esa victoria valiera más. Esa ventana ya no
   existe.

Compara eso con los diseños alternativos. Un sorteo alimentado por un hash de bloque lo puede
volver a tirar un validador al que no le guste el resultado. Un sorteo alimentado por un número
fuera de la cadena se puede elegir directamente. Ninguna de las dos cosas es posible aquí, que es
toda la razón por la que la aleatoriedad se genera en la cadena bajo cifrado y nunca con un
generador externo.

## Qué se hace público, y cuándo

| Valor | Se publica cuando | Por qué tiene que ser público |
| --- | --- | --- |
| La semilla `R` | Al cerrar, legible cuando el relayer la descifra | Sin ella nadie puede recalcular un umbral |
| El recuento de escala, del que sale la franja `M` | Al cerrar | Los umbrales son relativos al tamaño del pool |
| Si el periodo no estaba vacío | Al cerrar | Distingue un sorteo vacío de uno real |
| La cosecha del sorteo | Al cerrar | Es el dinero que financia los premios posteriores |
| El tamaño del premio de cada nivel y su liquidez en claro ofrecida | Al cerrar | Hacen falta para comprobar cuánto paga una victoria |
| El arrastre de cada nivel | En la finalización de cada sorteo, ya que todos los niveles se concilian en cada sorteo | Hace falta para comprobar cuántos premios pagó el nivel |
| El contador de no financiado | Al finalizar | Demuestra que el pool financió cada crédito que escribió la bóveda |

Dos cosas están deliberadamente **fuera** de esa lista. El saldo total exacto ponderado por
tiempo del pool no se publica nunca, porque hacerlo permitía a un observador recuperar
exactamente la cantidad depositada por quien fue el único en moverse; en su lugar se publica la
franja que queda por encima. Y ningún valor de un ahorrador se marca nunca como públicamente
descifrable.

Todo lo de la lista llega después de que el periodo que decide ya haya terminado. Publicar `R` no
puede ayudar a nadie a cambiar un peso, porque los pesos del periodo `p` quedan congelados en el
momento en que termina el periodo `p`, que es antes de que el sorteo se pueda siquiera cerrar.

Cada uno de esos números llega al contrato con una firma del servicio de gestión de claves de
Zama, verificada en la cadena por `FHE.checkSignatures`. La prueba está ligada a los handles en
un orden fijo: `[seed, scaleCount, nonEmpty, harvested]` en la adjudicación, y un handle de
arrastre por conciliación. Nada se puede barajar entre huecos ni reutilizar contra otro sorteo. La
máquina de estados del sorteo es la protección contra reutilización: cada paso funciona una vez
por sorteo, y la conciliación una vez por nivel.

## La franja, y cómo la sigue la bóveda

El saldo total ponderado por tiempo del pool en un periodo, `W`, sigue cifrado. El número contra
el que corre el sorteo es `M = 2^m`, la menor potencia de dos igual o superior a `W`.

La bóveda sigue `m` de sorteo en sorteo en lugar de calcularla desde cero. En cada cierre compara
`W` bajo cifrado contra las cinco potencias de dos alrededor de la `m` del sorteo anterior, suma
los cinco resultados en un único recuento cifrado pequeño y marca ese recuento como públicamente
descifrable. El pool lee el recuento verificado y deduce la nueva `m`, que puede moverse como
mucho tres escalones por sorteo. Una comparación cifrada aparte contra 1 da la bandera de no
vacío.

Así que el registro público por sorteo es un entero pequeño, y solo cambia cuando el pool cruza
una potencia de dos. `scaleBits()` en el pool lee la `m` actual; el despliegue la siembra con
`initialScaleBits`, la longitud en bits esperada del total del primer periodo, y el seguidor
corrige cualquier error a razón de hasta tres bits por sorteo.

## Cómo recalcula cualquiera un umbral

Todo lo de abajo usa solo datos públicos. Sin cartera, sin firma, sin permisos.

Para el sorteo `p`, la dirección de ahorrador `u` y el nivel `t` con `count[t]` premios y
probabilidades `oddsNum[t] / oddsDen[t]`:

```
prn         = keccak256(abi.encode(R, p, u, t))
r           = prn mod M                                        // 0 <= r < M
threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))
```

para cada `k` de `0` a `count[t] - 1`. Ese ahorrador ganó el premio `k` si y solo si su peso
ponderado por tiempo del periodo `p` fue estrictamente mayor que `threshold_k`.

No hace falta que lo reimplementes. La bóveda expone `thresholdOf(drawId, saver, tier, k)` como
una función pura de solo lectura sobre la misma aritmética que usa la evaluación, así que el
panel de verificación de la aplicación, el conjunto de pruebas y cualquiera con un explorador de
bloques leen la misma implementación. Reimplementarlo fuera de la cadena son cuatro líneas de
aritmética de enteros grandes, si prefieres contrastar el contrato con tu propio código.

Hay un ejemplo resuelto con números pequeños en
[selección del ganador](../concepts/winner-selection.md). Un ejemplo relleno de un sorteo real de
Sepolia está aquí, tomado del pool `usdc`, cuyo fondo de premios es
`0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2`. Cada pool publica los mismos campos para sus
propios sorteos:

| Campo | Valor |
| --- | --- |
| Sorteo | `2, the period from 23:00 to 00:00 UTC on 2 September 2026` |
| Semilla `R` | `5625525180683981523` |
| Franja `M` | `2^43, which is 8,796,093,022,208 balance-seconds` |
| Cosecha | `19.531380 USDC` |
| Tamaños de premio por nivel | `3.559644 / 1.779822 / 0.889911 USDC, grand / mid / frequent` |
| Premios pagados por nivel | `0 / 0 / 5, against a funded capacity of 2 / 2 / 8` |

Leído de la cadena: la semilla y la franja vienen del evento `DrawAwarded` del pool, los tamaños
de los premios y la liquidez ofrecida de `drawParams(2)`, y los premios pagados de los tres
eventos `TierReconciled` de ese sorteo, ya que lo que un nivel ofreció y no pagó es exactamente el
arrastre que publicó. El nivel mayor y el medio no pagaron nada en este sorteo y devolvieron toda
su oferta, que es lo que hacen la mayoría de las veces un nivel de 1 entre 24 y uno de 1 entre 6.

El panel de verificación de la aplicación hace esta aritmética en el navegador para cualquier
dirección que escribas, en `/verify?pool=<slug>` para el pool que quieras. No tiene ningún acceso
privilegiado; son las mismas entradas públicas y la misma fórmula.

## Por qué el resto no tiene sesgo

Reducir un número aleatorio grande a un rango con un resto simple suele tener sesgo. Si `2^256` no
es múltiplo exacto del rango, los residuos bajos salen algo más a menudo, y ese sesgo cae de forma
desigual sobre los ahorradores. PoolTogether V5 lo resuelve con muestreo por rechazo, y un
borrador anterior de Hearth también.

Hearth ya no lo necesita. `M` es una potencia de dos por construcción, y `2^256` es múltiplo
exacto de todas las potencias de dos hasta `2^256`. Así que `prn mod M` son sencillamente los `m`
bits bajos de un hash de 256 bits, y todos los valores de `0` a `M - 1` salen exactamente del
mismo número de entradas. **El sesgo es cero, no pequeño**, sin bucle, sin rechazo y sin nada que
un verificador tenga que reproducir con cuidado.

Es un beneficio colateral de publicar la franja en lugar del total exacto, y merece la pena
decirlo porque elimina un trozo de código que cualquiera que comprobara el sorteo tendría que
replicar exactamente.

## Fabricar direcciones a la carta no funciona

Una vez que `R` es pública, alguien podría generar direcciones hasta encontrar una con un umbral
bajo. Sería inútil. Los umbrales se comparan contra un peso del periodo `p`, y una dirección
recién creada no tiene observaciones en el periodo `p` ni antes, así que su peso es cero. Cero no
supera ningún umbral. Para tener peso en el periodo `p` había que mantener un saldo durante el
periodo `p`, que ya había terminado antes de que existiera `R`.

Fabricarlas para un sorteo futuro falla por el otro motivo: la semilla de ese sorteo todavía no se
ha generado, y es impredecible.

## Qué demuestra la verificación, y qué no

Ser preciso en esto es el sentido de la página.

**Demuestra:**

- Que la semilla se generó en la cadena, dentro de una transacción, bajo la clave de la red, y se
  publicó exactamente una vez.
- Que los tamaños de los premios y la liquidez ofrecida se fijaron antes de que existiera esa
  semilla.
- Que la regla aplicada a cada ahorrador es pública, uniforme y recalculable por cualquiera.
- Que los tamaños de los premios se derivan de la liquidez del nivel y de sus parámetros por
  aritmética pública.
- Que el número de premios que pagó cada nivel cuadra con lo que el nivel ofreció menos lo que
  volvió en su arrastre.
- Que el pool financió cada crédito que escribió la bóveda, ya que el contador de no financiado se
  publica y vale cero.

**No demuestra:**

- Que el generador del coprocesador sea uniforme. Ese es el motor de Zama, y es de confianza, no
  algo que se verifique aquí.
- Que el servicio de gestión de claves firmara el verdadero texto en claro del handle de la
  semilla. El contrato comprueba la firma, no la semántica. Un quórum deshonesto podría firmar el
  valor que quisiera. Todas las aplicaciones de este protocolo comparten esa suposición; es el
  atacante 8 del [modelo de amenazas](threat-model.md).
- Que la franja publicada sea de verdad la franja de la suma de los pesos de todos los
  ahorradores. Alguien de fuera no puede sumar pesos cifrados, y ahora tampoco puede ver la suma.
  Lo que tiene en su lugar es que el mismo código público e inmutable calculó las comparaciones y
  el peso de cada ahorrador a partir de las mismas observaciones, y que se cumplen las
  invariantes de conservación: lo pagado es igual a lo abonado, y nadie retira más que su
  principal más sus ganancias.
- Nada sobre quién ganó. Esa es toda la gracia, y es por lo que publicar más haría la
  verificación más fuerte y el producto peor. Publicar el total exacto es el ejemplo concreto:
  hacía comprobable el tamaño del pool, y hacía también recuperable hasta la unidad base el
  depósito de quien fuera el único en moverse.

## Qué puede comprobar un ahorrador que nadie más puede

Un ahorrador puede ir un paso más allá que alguien de fuera, porque puede descifrar su propio peso
y su propio crédito de un sorteo.

1. Revela tu peso del sorteo `p`.
2. Recalcula tus propios umbrales a partir de la `R` y la `M` públicas, o léelos de `thresholdOf`.
3. Cuenta a cuántos superaste y multiplica por el tamaño del premio de ese nivel.
4. Revela tu crédito del sorteo `p` y comprueba que cuadra.

Si no cuadra, o bien un nivel se agotó antes de que el recorrido llegara a ti, que es el límite
documentado, o bien algo va mal y tienes los números para demostrarlo. La aplicación hace los
cuatro pasos por ti y muestra la aritmética.
