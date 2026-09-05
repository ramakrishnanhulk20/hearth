# Modelo de amenazas

Nueve atacantes, qué busca cada uno, qué los detiene y qué no. La última columna es la que
merece la pena leer. Un modelo de amenazas que solo lista defensas es publicidad.

Los contratos centrales de Hearth son inmutables una vez desplegados. No hay proxy ni vía de
actualización, así que nada de esta página se puede cambiar a posteriori salvo desplegando un
pool nuevo.

**Cada pool está aislado.** Los siete pools de Sepolia son siete despliegues separados del
mismo código, uno por token confidencial, y no comparten almacenamiento, ni saldo, ni registro.
Un pool solo tiene su propio token, solo financia su propia bóveda y lo mueve su propia cuenta
keeper, así que un fallo en el envoltorio de un token, un propietario que pause una bóveda o un
keeper que se pare no pueden llegar a los ahorradores ni al dinero de premios de otro pool. Lo
que sigue describe un pool, y se aplica a cada uno de los siete por separado.

## 1. Un observador curioso

Alguien con un nodo de archivo, un explorador de bloques y tiempo. Sin capital y sin acceso
privilegiado.

**Quiere:** saber quién ahorró cuánto, quién tiene las mejores probabilidades y quién ganó cada
sorteo.

**Lo detiene:** cada valor de cada persona es un texto cifrado. El principal, las ganancias, el
peso por sorteo y el crédito por sorteo solo los puede leer el ahorrador que los posee, y eso lo
hace cumplir la lista de control de acceso de Zama, que hace que el relayer rechace una petición
de descifrado de cualquier otra dirección. No hay ninguna transacción de cobro que vigilar, y la
evaluación no se puede apuntar hacia uno mismo, así que no existe ninguna transacción que solo
enviaría un ganador. Ganadores y perdedores reciben escrituras idénticas en el mismo lote,
porque el pago es una selección cifrada y no una bifurcación, así que las formas de las
transacciones y los costes de gas coinciden.

**Una fuga que este diseño quitó.** Un borrador anterior publicaba el saldo total exacto
ponderado por tiempo del pool en cada sorteo. Con ese número público durante dos periodos
consecutivos, y la marca de tiempo pública de la propia transacción de un ahorrador, un
ahorrador que fue el único en mover dinero en un periodo tenía esa cantidad recuperada
exactamente, no acotada. La bóveda publica ahora solo la franja de potencia de dos por encima
del total, seguida con cinco comparaciones cifradas por sorteo, y a la ecuación no le queda nada
que despejar. El enunciado completo es la regla 1 de
[qué permanece privado](what-stays-private.md).

**No lo detiene nada:**

- La lista de ahorradores, y el bloque en el que cada ahorrador depositó, retiró o fue
  evaluado.
- La franja en la que cayó el total del pool, que con menos de tres ahorradores fija el peso de
  un ahorrador con un margen de un factor dos. Ver la regla del conjunto de anonimato en
  [qué permanece privado](what-stays-private.md).
- **Un saldo que el observador puede identificar tiene un resultado público en cada sorteo.**
  Los umbrales son públicos por diseño, y la prueba del ganador es una función determinista de
  un secreto y de datos por lo demás públicos. Envuelve 1.000 USDC y deposita 1.000 USDC unos
  segundos después y cada victoria y cada derrota tuyas, en cada nivel, en cada sorteo a partir
  de entonces, son aritmética pública.
- **Las ganancias acumuladas son una cota inferior pública** para una dirección que envuelve a
  la entrada y desenvuelve a la salida por completo, porque los dos movimientos son públicos en
  la capa del token.
- **Un saldo estático se va acotando poco a poco.** Los recuentos de premios publicados son una
  pequeña medición de la distribución de saldos y se acumulan contra un ahorrador cuyo saldo no
  cambia nunca. Cada nivel publica su recuento un sorteo después, así que la medición corre una
  vez por nivel y por sorteo. La cadencia que la ralentizaría es un mando de constructor que
  este despliegue puso en uno, porque ese mismo paso es el que devuelve al bote público el
  dinero no ganado y mantiene el bote visible. Limitación 14.
- El residuo de comportamiento: retirar solo después de los sorteos que ganaste, a lo largo de
  muchos sorteos.

## 2. Una ballena

Alguien con mucho capital que quiere probabilidades baratas.

**Quiere:** llevarse premios sin dejar dinero en el pool, o exprimir la mecánica.

**Lo detiene:**

- **La ponderación por tiempo.** Las probabilidades salen del saldo medio a lo largo de todo el
  periodo. Un depósito hecho cuando quedan 6 minutos de un periodo de una hora gana una décima
  parte de las probabilidades de la misma cantidad mantenida todo el periodo. Esta es la
  defensa que le faltaba a nuestro diseño anterior, y el ataque que permite se ejecutó: un
  atacante que hacía circular 9.000 USDC alrededor de cada sorteo ganó 19 de 20 sorteos y vació
  una reserva de 5.000 USDC.
- **La linealidad.** Los premios esperados son exactamente proporcionales al peso, y la franja
  contra la que corre el sorteo no depende de cómo se reparta el peso del pool entre
  direcciones. Dividir una cartera en seis no gana nada, y juntar seis en una tampoco.
- **El tope por ahorrador.** Los depósitos se rechazan cuando la cantidad, o el principal
  resultante, está por encima de `(2^64 - 1) / L`, y el rechazo va cifrado, así que no revela
  nada. Acotar la cantidad además del total es lo que impide que la suma cifrada de la
  comprobación dé la vuelta.

**No lo detiene:**

- Una ballena que de verdad mantiene un saldo grande durante todo el periodo gana a menudo. Eso
  es el producto, no un ataque: su dinero generó el rendimiento que pagó los premios.
- Las probabilidades del nivel mayor se miden sobre un periodo, así que una ballena que entra
  durante un solo periodo tiene un tiro proporcional completo a un bote que costó 24 periodos
  llenar. Es una desviación declarada respecto a PoolTogether V5 y es la limitación 5.

## 3. Un saboteador que registra ahorradores falsos

Alguien que añade muchas direcciones sin valor a la lista de ahorradores.

**Quiere:** atascar sorteos, diluir probabilidades o hacer caro mantener el pool.

El registro es abierto por construcción. El gancho del depósito no puede ver la cantidad cifrada
que se le entrega, así que cualquier dirección que lo dispare entra en la lista de ahorradores,
aunque sea con un cero cifrado, y la lista no se poda nunca.

**Lo detiene:**

- **Las probabilidades no se tocan.** Un ahorrador sin saldo tiene peso cero. Un peso cero no
  puede superar ningún umbral, y no aporta nada al total, así que las probabilidades de todos
  los ahorradores reales son exactamente las que serían sin los falsos. Nuestro diseño anterior
  necesitaba una fianza de registro para esto. Este no.
- **La evaluación no se puede atascar.** Un ahorrador ya evaluado en un sorteo, una dirección
  que no es ahorradora y un ahorrador cuya primera observación es posterior al periodo se saltan
  todos sin revertir, y ese salto se decide a partir de marcas de tiempo en claro, sin coste
  cifrado. Una entrada mala no puede hacer fallar un lote.
- **Los lotes tienen tope** de `4` ahorradores que necesiten trabajo cifrado por llamada, así
  que ninguna transacción se puede empujar más allá del límite de cómputo de Zama.

**No lo detiene:** el coste del keeper por sorteo crece con la lista de ahorradores, que solo
añade. Un saboteador no puede cambiar las probabilidades de nadie, pero sí puede encarecer
evaluar a todo el mundo. La respuesta del keeper es un techo de comisión, no un presupuesto.
`KEEPER_MAX_FEE_GWEI` hace que se quede quieto durante todo un ciclo mientras la comisión de red
esté por encima del tope (`gasIsAffordable` en `packages/keeper/src/keeper.ts`), y por debajo
del tope sigue enviando hasta que el cursor llega al final del recorrido. Los ahorradores sin
observación anterior al periodo se saltan a partir de marcas de tiempo en claro y sin coste
cifrado, así que rellenar la lista le cuesta gas al keeper en lugar de costarles los premios a
los ahorradores. Nada en la cadena pone tope a la evaluación, así que la consecuencia honesta es
que si el gas se mantiene por encima del techo en un pool muy saboteado, el recorrido puede no
llegar a todos los ahorradores reales dentro de la ventana. Dos cosas lo suavizan. El recorrido
empieza en un punto distinto en cada sorteo, derivado de la semilla de ese sorteo, así que nadie
es el último de forma sistemática. Y cualquiera puede avanzar más el recorrido desde la
aplicación, lo que cuesta gas y no revela nada sobre quién lo pide. Ver
[la página del keeper](../operations/keeper.md).

## 4. Un keeper perezoso u hostil

La dirección que normalmente empuja los sorteos. La nuestra, o la de otra persona.

**Quiere:** saltarse un sorteo que no ganó, elegir el orden en el que se paga a los ahorradores,
o simplemente dejar de trabajar.

**Lo detiene:**

- **Todos los pasos son sin permisos.** Cerrar, adjudicar, evaluar, finalizar y conciliar los
  puede llamar cualquiera, incluido cualquier ahorrador desde la aplicación. Un keeper que se
  niegue a adjudicar un sorteo no puede hacerlo desaparecer; lo adjudica otra persona.
- **El keeper no puede elegir a quién se evalúa.** `evaluate(drawId, count)` toma un número, no
  una lista. El orden del recorrido lo fija la semilla del sorteo, así que el keeper no puede
  ponerse a sí mismo ni a un amigo primero en un nivel sobresuscrito, y no puede dejar fuera a
  un ahorrador concreto.
- **Un cierre tardío se rechaza, no se tolera.** El cierre tiene que llegar antes de
  `closeDeadline(p)`, la mitad del segundo periodo de la ventana. Un cierre en el último bloque
  de la ventana no habría dejado sitio para el viaje de ida y vuelta del descifrado y habría
  dejado el sorteo varado para siempre. Ahora esa transacción simplemente revierte. Un sorteo
  cuyo cierre no llegó nunca se queda sin cerrar para siempre: su liquidez nunca se movió, así
  que no hay nada que devolver ni nada que finalizar.
- **Un sorteo saltado no cuesta nada.** La liquidez que nunca se ofreció se queda en su nivel y
  se vuelve a ofrecer. Una adjudicación tardía sigue anotando la cosecha, sigue devolviendo la
  liquidez ofrecida a los niveles y marca el sorteo `Skipped`. Ese periodo no paga premio, y no
  se pierde ni se queda varado ningún dinero.
- **El keeper no puede cambiar un resultado.** La selección del ganador queda fijada en el
  momento en que se verifican la semilla y la franja. La evaluación pone por escrito un
  resultado que ya existe.

**Probado por accidente, el 3 de septiembre de 2026.** El demonio de pm2 murió con el proceso de
terminal que lo arrancó, a las 03:45 UTC, y nadie se dio cuenta hasta las 04:52, así que el
keeper estuvo apagado 67 minutos. Al reiniciar, finalizó el sorteo 4 de inmediato y cerró el
sorteo 6 a las 04:53. El periodo 6 había terminado a las 04:00, así que ese cierre llegó 53
minutos tarde frente a un plazo de las 05:30, la mitad del segundo periodo siguiente. No se
perdió ningún sorteo, no quedó varada ninguna liquidez y nadie tuvo que intervenir más allá de
reiniciar el proceso. Esta es la afirmación de que "un keeper atascado cuesta sorteos, nunca
dinero" de [las preguntas frecuentes](../faq.md) y de los puntos de arriba, ejecutada de verdad
en lugar de argumentada.

**No lo detiene:**

- Una vez que la semilla y la franja son públicas, quien esté a punto de llamar a `awardDraw`
  puede calcular antes su propio resultado y decidir si le compensa. Adjudicar es sin permisos y
  la aplicación se lo ofrece a cualquiera, así que esto es una molestia y no censura, pero es
  real y queda dicho.
- Si nadie actúa dentro de la ventana de dos periodos, ese sorteo no paga nada.

## 5. El propietario del pool

Nosotros. La dirección que desplegó los contratos.

**Quiere:** enumerado aquí para que un ahorrador no tenga que adivinarlo.

**Poderes, al completo:**

| Poder | Límite |
| --- | --- |
| Pausar | Detiene los depósitos y el cierre de sorteos. Nunca detiene los retiros, la evaluación, la adjudicación, la finalización ni la conciliación. |
| Fijar la fuente de rendimiento | Emite `YieldSourceSet`. No puede afectar a ningún saldo existente. |
| Rescatar tokens ajenos | No puede tocar el principal ni las ganancias de los ahorradores. |
| Transferir la propiedad | En dos pasos. La renuncia está desactivada, así que la propiedad no se puede tirar al vacío. |

**No puede:** leer el principal, las ganancias, el peso ni el crédito de ningún ahorrador,
porque los contratos nunca conceden acceso al propietario. No puede cambiar el resultado de un
sorteo. No puede mover el dinero de nadie. No puede actualizar los contratos, porque no hay vía
de actualización.

**No lo detiene:** un propietario hostil puede pausar los depósitos indefinidamente, y puede
apuntar el pool a una fuente de rendimiento que no pague nada. Eso deja sin comer al lado de los
premios del producto. Ya no para el reloj: una fuente que revierte se captura, la cosecha de ese
sorteo se anota como cero, se emite `HarvestFailed` y el cierre funciona igualmente. Ninguno de
los dos poderes se lleva una sola unidad del principal de nadie, y los retiros siguen
funcionando durante todo el proceso.

## 6. El patrocinador

Quien financia la fuente de rendimiento de Sepolia.

**Quiere:** en el caso honesto, dar dinero de premios a la demostración. En el caso adversario,
programar o retener los premios.

**Lo detiene:** el patrocinador no tiene ninguna influencia sobre quién gana. Financia un saldo;
la semilla, los pesos y los umbrales no tienen nada que ver con él. Las cantidades
patrocinadas, la tasa de goteo y todas las cosechas son públicas, así que cualquiera puede ver
exactamente cuánto dinero de premios existe y a qué velocidad está llegando. Un patrocinio es
una donación: no se puede retirar una vez hecho, y solo el propietario de la fuente puede
cambiar la tasa de goteo.

**No lo detiene:** un patrocinador que deja de patrocinar acaba con los premios en cuanto el
saldo termina de gotear. Los premios son rendimiento, y sin rendimiento no hay premios. El
principal queda intacto en todo momento, que es la razón de ser de un diseño sin pérdidas.

## 7. El operador del token

Zama, como propietaria de los envoltorios de token confidencial. El activo de cada pool es su
contrato, no el nuestro, y cada pool está detrás de uno distinto de ellos.

**Quiere:** enumerado, no supuesto.

**Poderes, leídos del código fuente verificado de Sepolia el 2 de septiembre de 2026:**

- `addObserver(address)` concede a una dirección descifrado comodín sobre todos los handles
  sobre los que el token tiene derechos, **con efecto retroactivo**. Un observador nombrado en
  cualquier fecha futura puede descifrar cantidades que ya están en la cadena, así que vigilar
  el nombramiento y salir no es una defensa. El alcance son todas las cantidades depositadas,
  todos los pagos de retiro, el propio saldo de token del pool y la única transferencia de
  financiación de premios por lote de evaluación. No hay ningún pago por ganador que leer,
  porque Hearth no tiene ninguna transferencia de premio por ahorrador. Un lote que contiene un
  solo ahorrador sí convierte el total de ese lote en el premio exacto de ese ahorrador, y el
  pool real de cinco ahorradores con tamaño de lote 4 produce un lote así en cada sorteo.
  `evaluate` toma su tamaño de lote de quien llama y es sin permisos, así que no se puede
  imponer ningún lote mínimo; la [limitación 7](../limitations.md) lo recoge como residuo
  aceptado y nombra el arreglo del lado del contrato. Estado real ese día: `observerCount()` era
  0 y `observers()` estaba vacío.
- Una lista de bloqueo. Una dirección bloqueada no puede depositar, retirar ni desenvolver,
  porque cada una de esas cosas es una transferencia del token con esa dirección en un lado.
- Un rol de pausador, fijado en la práctica en la dirección cero, así que la pausa está
  desactivada ahora mismo.
- El propietario puede actualizar la implementación detrás de un proxy.

**Lo detiene:** nada que controlemos nosotros. Esto es una suposición de confianza, no una
defensa.

**Adónde no llega:** al libro propio de Hearth. El principal, las ganancias, los pesos y los
créditos viven en la bóveda, y el token no tiene derechos de acceso sobre ninguno de ellos, ni
siquiera con una actualización hostil del token. Lo verificamos en el despliegue anterior: la
dirección del token devuelve falso al preguntar por permiso sobre los handles del principal y de
las ganancias de un depositante, mientras que el depositante y el pool devuelven verdadero.

## 8. El quórum del KMS de Zama

Las partes que custodian la clave de descifrado de la red.

**Quiere:** enumerado porque esta es la suposición más profunda de cualquier aplicación FHEVM.

**Qué podría hacer:** el contrato verifica que un texto en claro lleva una firma válida del
quórum. Lo que no puede verificar es que ese texto en claro sea el verdadero texto en claro del
handle. Un quórum deshonesto podría, por tanto, firmar el valor de semilla que quisiera, y el
contrato lo aceptaría, lo que le permitiría elegir ganadores.

**Lo detiene:** nada dentro de Hearth. Todas las aplicaciones de este protocolo lo heredan, y la
propia documentación de Zama enuncia el límite con claridad: se confía en que el protocolo
calcule correctamente sobre textos cifrados y descifre solo lo que está marcado como
públicamente descifrable.

**Conviene saber:** el quórum sigue sin poder leer nada que no esté marcado como públicamente
descifrable, y en Hearth eso son solo la semilla, el recuento de escala, la bandera de no vacío,
la cosecha, el arrastre de cada nivel cuando le toca, y el contador de no financiado. Ningún
valor de un ahorrador individual está nunca en ese conjunto, y el peso total exacto del pool
tampoco.

## 9. El relayer

El servicio que encamina las peticiones de descifrado entre los navegadores y el protocolo.

**Quiere:** enumerado.

**Puede:** negar o retrasar el servicio, lo que retrasa un sorteo. También ve qué dirección pidió
descifrar qué handle, así que se entera de que consultaste tus propios números, aunque no de lo
que dicen.

**No puede:** descifrar nada por sí mismo, ya que no tiene la clave. No puede falsificar una
firma del KMS, que es para lo que está la verificación en cadena. No puede concederse acceso a
un handle, ya que eso es trabajo de la lista de control de acceso y vive en la cadena.

**Lo detiene:** la ventana de dos periodos absorbe un relayer lento, y el plazo de cierre
garantiza que al menos medio periodo sigue por delante cuando arranca el viaje de ida y vuelta.
Más allá de eso el sorteo se salta, la cosecha se anota igualmente y la liquidez sigue ahí. Una
caída del relayer cuesta un sorteo, nunca dinero.

## Qué hizo mal el diseño antiguo, y cómo lo cierra este

Antes de esta reconstrucción, Hearth era un único contrato llamado `LanternPool` que ponderaba a
los ahorradores por su saldo en el instante del sorteo y escaneaba a los depositantes por
tramos. Lo auditamos contra nosotros mismos el 2 de septiembre de 2026 y ejecutamos los ataques
en lugar de razonarlos. Seis de los ocho hallazgos de abajo se reprodujeron en código en marcha.

| # | Qué salió mal | Evidencia | Cómo lo cierra este diseño |
| --- | --- | --- | --- |
| 1 | **Depósito relámpago.** Sin ponderación por tiempo, un depósito hecho un bloque antes del sorteo contaba entero. | Ejecutado sobre el mock: 20 ciclos, el atacante ganó 19 de 20 y vació una reserva de 5.000 USDC. El ciclo entero cabía además en una transacción, 2,189,992 de gas. | Las probabilidades salen de la media ponderada por tiempo de todo el periodo. Un depósito de última hora gana su fracción del periodo y nada más. |
| 2 | **La transacción de cobro delataba al ganador.** Los cobros de ganador y de perdedor eran idénticos, pero solo un ganador tenía motivo para enviar uno. | Ejecutado: el cobro del ganador y el del perdedor costaron 391,944 de gas cada uno sobre el mock, con registros idénticos. En Sepolia un cobro llegó 48 segundos después de una liquidación. | No hay función de cobro. Los premios aterrizan en un saldo cifrado de ganancias durante la evaluación, `withdraw` es la única salida, y la evaluación no se puede apuntar hacia uno mismo. |
| 3 | **Un bit público en cada sorteo.** El handle de ganancias de un boleto de la casa se volvía a publicar como públicamente descifrable en cada sorteo, filtrando si la casa había ganado, lo que con un solo ahorrador real nombraba al ganador. | Ejecutado sobre el mock a lo largo de 16 sorteos, y confirmado en Sepolia en tres sorteos liquidados. | No hay boleto de la casa. Los únicos valores públicamente descifrables son la semilla, el recuento de escala, la bandera de no vacío, la cosecha, los arrastres de los niveles y el contador de no financiado. Ninguno es por ahorrador. |
| 4 | **No verificable públicamente.** El total del pool no se publicaba nunca, así que alguien de fuera no podía comprobar el sorteo en absoluto. | Leído del código desplegado y confirmado en vivo. | La semilla y la franja se publican con una prueba del KMS verificada en la cadena, y cualquiera puede recalcular todos los umbrales a partir de esos dos números. |
| 5 | **Rendimiento anotado a partir de un informe.** Las recargas de la reserva se anotaban a partir de la cantidad pasada, mientras que el envoltorio acuña `amount / rate()`. Latente en Sepolia solo porque la tasa resultaba ser 1. | Ejecutado contra un token de prueba de 18 decimales, donde la tasa es un millón de millones. | El pool anota solo la cantidad verificada por el KMS que la fuente transfirió de verdad. |
| 6 | **Sabotaje por registro gratuito.** Una cartera que nunca tuvo el token podía registrarse a sí misma, y un operador podía registrar otras carteras con un mismo cero cifrado reutilizado. | Ejecutado. | El registro sigue siendo abierto, por construcción. Los ahorradores falsos llevan peso cero, no cambian las probabilidades de nadie y se saltan en claro. El único coste es el gas del keeper, y lo que el keeper acota es el precio del gas que está dispuesto a pagar, no el trabajo que va a hacer. |
| 7 | **La costura del envoltorio, sin mitigar.** La aplicación envolvía y depositaba en un solo flujo. | Medido en vivo: tres de cinco depósitos estaban a dos o cuatro bloques de un envoltorio público de 100 USDC. | Envolver y depositar son pasos separados y la aplicación explica por qué. La costura se reduce, no se elimina, y es la limitación 10. |
| 8 | **Sin keeper.** Los sorteos eran sin permisos pero nadie los ejecutaba: el pool real estuvo 26 horas con un sorteo abrible. | Leído en vivo de la cadena. | Un script keeper ejecuta todos los pasos y cualquier ahorrador puede avanzar un sorteo desde la aplicación. El pool implementa la interfaz de automatización de Chainlink para el paso del cierre como redundancia adicional, aunque todavía no hay ningún upkeep registrado. |

De la revisión del 3 de septiembre salieron dos cambios de diseño más que no están en esa tabla,
porque el diseño antiguo no llegó lo bastante lejos como para tenerlos: publicar el agregado
exacto se sustituyó por la franja (atacante 1 de arriba), y los tamaños de los premios se
movieron de la adjudicación al cierre, para que ningún premio se pueda redimensionar después de
que exista su semilla.

## Qué se comprueba, y cómo

Cada afirmación de arriba tiene una prueba. Las salidas ejecutadas quedan bajo
`docs/security/attacks` y los números están pegados en el README.

| Afirmación | La comprobación |
| --- | --- |
| Un desconocido no puede leer los valores de un ahorrador | Pedir al relayer que descifre el principal, las ganancias, el peso y el crédito de otra dirección. Esperar rechazo en los cuatro. |
| El total exacto del pool no se puede obtener | Pedir al relayer el handle del peso agregado. Esperar rechazo. Después restar las franjas publicadas de sorteos consecutivos en un pool donde se movió un ahorrador, y mostrar que la respuesta es una banda de un factor dos, no un número. |
| Un depósito relámpago casi no gana nada | Depositar cerca del final de un periodo, evaluar, y comparar el peso guardado con el de alguien que mantuvo todo el periodo. |
| Los ahorradores falsos no pueden atascar un sorteo | Registrar muchas direcciones vacías y después ejecutar un sorteo completo. |
| Nadie puede elegir a quién se evalúa | Llamar a `evaluate` desde la propia dirección de un ahorrador y mostrar que el recorrido avanza desde el cursor derivado de la semilla, no desde ese ahorrador. |
| Un cierre tardío se rechaza | Llamar a `closeDraw` después de `closeDeadline` y esperar una reversión; después confirmar que el sorteo se puede saltar y que su liquidez queda intacta. |
| Una adjudicación perdida no pierde nada | Dejar pasar la ventana, adjudicar tarde, y comprobar que la cosecha se anota, que la liquidez ofrecida vuelve a los niveles y que el sorteo aparece como `Skipped`. |
| Una fuente de rendimiento que revierte no para el reloj | Conectar una fuente que revierte, cerrar un sorteo, y esperar éxito más `HarvestFailed`. |
| Un nivel sobresuscrito limita en lugar de pagar de más | Forzar más ganadores de los que el nivel puede financiar y comprobar que lo pagado nunca supera lo ofrecido. |
| Una prueba no se puede reutilizar | Reenviar una prueba de adjudicación contra un sorteo distinto. Esperar una reversión. |
| Nadie retira más de lo que posee | Prueba de propiedad: para toda cuenta, los retiros nunca superan el principal más las ganancias. |
| El dinero se conserva | Prueba de propiedad: el saldo de token de la bóveda es igual al principal total más las ganancias totales sin cobrar, y el saldo de token del pool es igual a la liquidez en claro más todos los arrastres cifrados más la liquidez ofrecida y todavía no finalizada más las cosechas recibidas en el cierre y todavía no anotadas por una adjudicación. Este último término es la cosecha que hay entre el cierre que la recibe y la adjudicación que la reparte entre los niveles, cuando no pertenece a ningún nivel ni a ningún sorteo. |

## Qué no cubre este modelo de amenazas

- Todo lo que queda fuera de la cadena: tu dispositivo, cómo maneja las claves tu cartera, el
  punto de acceso RPC que usas y los metadatos a nivel de red.
- Los ataques económicos contra el propio sitio de rendimiento. En mainnet, el riesgo de bóveda
  se hereda íntegro de la bóveda ERC-4626 que hay detrás del agrupador de Zama.
- La verificación formal. Hearth está autoauditado con ataques ejecutados y pruebas de
  propiedades. No lo ha auditado un tercero, y esta página es el sustituto honesto, no un
  reemplazo.
