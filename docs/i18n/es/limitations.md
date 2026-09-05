# Limitaciones

Todas las limitaciones que conocemos, numeradas, en un solo sitio. Las demás páginas se refieren
a estos números.

El motivo de que exista esta página es sencillo. Una afirmación de confidencialidad vale lo que
valgan las costuras que su autor estuvo dispuesto a nombrar. Cualquier cosa de aquí abajo que te
sorprenda más tarde es un fallo nuestro, no un descubrimiento.

## 1. La evaluación va por lotes, y los lotes tienen tope

La prueba del ganador corre sobre números cifrados, y Zama limita una sola transacción a
20.000.000 de unidades de cómputo con 5.000.000 de profundidad secuencial en Sepolia. La
evaluación de un ahorrador cuesta
`3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)`
de eso, así que como mucho caben `4` ahorradores con trabajo cifrado en una llamada.

**Qué significa:** un pool con muchos ahorradores necesita muchas transacciones por sorteo. El
coste crece linealmente con el número de ahorradores, y lo paga en gas quien evalúe.

**Qué no significa:** no hay tope de cuántos ahorradores admite el pool. Varios proyectos de este
campo limitan la participación a 32 direcciones. Hearth no limita la participación en absoluto;
limita cuántos caben en una transacción. `evaluate` acepta cualquier número, así que un lote más
pequeño no necesita redespliegue.

## 2. La ventana de dos periodos, y los premios que caducan

Un sorteo tiene que cerrarse, adjudicarse y evaluarse durante los dos periodos siguientes. Son
dos horas en el pool de USDC y medio día en los de seis horas. El cierre tiene un plazo todavía
más estrecho: la mitad del segundo de esos periodos, para que el viaje de ida y vuelta del
descifrado y la adjudicación tengan siempre al menos medio periodo por delante. Cuando la ventana
se cierra, el sorteo se acabó.

**Qué significa:** un ahorrador al que el recorrido de evaluación no llegue dentro de la ventana
pierde ese sorteo, aunque sus umbrales digan que ganó. Su parte de la liquidez del nivel se pliega
en el arrastre del nivel y financia un sorteo posterior. Es el mismo comportamiento que la
caducidad de un premio no cobrado en PoolTogether V5, y es el único caso del sistema en el que un
ahorrador real pierde algo que podría haber tenido.

**Por qué existe la ventana:** acota cuánto tiempo atrás tiene que recordar saldos la bóveda, que
es lo que hace suficientes tres observaciones guardadas por ahorrador. Se probó una ventana de un
periodo y era demasiado frágil frente a un relayer lento.

**Qué la reduce:** el keeper recorre la lista entera, cualquiera puede avanzar más el recorrido
desde la aplicación, y el recorrido empieza en un punto distinto en cada sorteo, así que nadie se
queda permanentemente al final de la cola.

## 3. Hay un tope de cuánto puede tener un ahorrador

Los depósitos se rechazan cuando la cantidad, o el principal resultante, está por encima de
`maxPrincipal = (2^64 - 1) / periodLength`. Con un periodo de una hora son unos 5.000 millones de
tokens, con el periodo de seis horas de los otros pools unos 854 millones, y con un periodo diario
serían unos 213 millones.

**Qué significa:** el tope es real, y con un periodo diario en mainnet es un número al que podría
llegar una institución grande.

**Por qué existe:** los valores cifrados de aquí son de 64 bits, y los saldo-segundos acumulados
de un ahorrador tienen que quedarse dentro de eso. Un desbordamiento cifrado no revierte y nadie
lo ve pasar, así que el tope se impone en la puerta. La comprobación acota la cantidad entrante
además del total resultante, porque si no un depósito lo bastante grande como para hacer dar la
vuelta a la suma más allá de `2^64` produciría un número pequeño que pasaría la comprobación.

**Cómo se comporta el rechazo:** se devuelve como un falso cifrado y el token reembolsa el
depósito en la misma transacción, así que llegar al tope no revela tu saldo.

## 4. Sin nivel de reserva

PoolTogether V5 mantiene una participación de reserva que recarga un nivel sobresuscrito. Hearth
no tiene reserva. La tasa de utilización del 50 por ciento es la única amortiguación.

**Qué significa:** cuando un nivel reparte más premios de los que puede financiar, cosa que pasa
como mucho en alrededor del 2 por ciento de los sorteos en el nivel frecuente, los ahorradores a
los que el recorrido llega los últimos reciben menos o nada en lugar de que se les recargue.

**Por qué:** una reserva necesita una vía de retirada controlada por el propietario para ser útil,
y cada poder del propietario en un pool confidencial es algo en lo que un ahorrador tiene que
confiar.

## 5. Las probabilidades del nivel mayor se miden sobre un periodo

V5 mide las probabilidades del nivel mayor sobre toda la ventana de acumulación del nivel. Hearth
las mide sobre un único periodo, como todos los demás niveles.

**Qué significa:** un gran tenedor que entra durante un periodo tiene un tiro proporcional
completo a un bote que costó 24 periodos llenar. Alguien que ahorró durante los 24 no tiene
ningún derecho adicional sobre él.

**El arreglo conocido, aplazado:** acumular saldo-segundos desde el último pago del nivel mayor y
ponderar ese nivel por eso. Añade un segundo acumulador con su propio análisis de desbordamiento,
así que es un cambio de la versión dos y no un añadido sin probar a la versión uno.

## 6. La privacidad necesita tres o más ahorradores

El saldo total exacto ponderado por tiempo del pool no se publica nunca. Lo que se publica en cada
sorteo es la menor potencia de dos por encima de él, porque el sorteo necesita alguna escala
pública contra la que correr.

**La fuga que esto sustituyó:** publicar el total exacto permitía a cualquiera recuperar
exactamente la cantidad depositada por quien fuera el único en moverse. Dos totales consecutivos,
las marcas de tiempo públicas de los eventos de depósito y de retiro, y la aritmética es una única
división sin resto. Ese fue el diseño hasta el 3 de septiembre de 2026 y una revisión lo rompió.

**Qué significa ahora:** con un ahorrador, la franja publicada es el peso de ese ahorrador con un
margen de un factor dos. Con dos, cada uno puede acotar al otro de la misma manera. Por debajo de
tres ahorradores no hay un conjunto de anonimato con sentido. Las franjas consecutivas se pueden
seguir restando, pero son iguales salvo que el pool haya cruzado una potencia de dos, así que esa
resta da una banda y no un número.

**Qué hace la aplicación:** lo dice siempre que el pool tiene menos de tres ahorradores, en lugar
de mostrar una afirmación de privacidad que no es cierta a ese tamaño.

## 7. La capa del token es de Zama, y sus poderes se aplican

El activo de Hearth es el envoltorio de USDC confidencial de Zama, no el nuestro.

**Qué significa:** su propietario puede nombrar observadores capaces de descifrar todas las
cantidades que se mueven por el token, y hacerlo **con efecto retroactivo**, así que las
cantidades que ya están en la cadena quedan expuestas a un observador nombrado después. Vigilar el
nombramiento y salir no es una defensa. El alcance son las cantidades depositadas, los pagos de
retiro, el propio saldo del pool y la única transferencia de financiación de premios por lote de
evaluación. El propietario puede además bloquear una dirección, y el contrato es actualizable. A 2
de septiembre de 2026 no había observadores y el pausador estaba sin fijar.

**Adónde no llega:** al libro propio de Hearth. El principal, las ganancias, los pesos por sorteo
y los créditos por sorteo viven en la bóveda, y el token no tiene derechos de acceso sobre ellos.

**Una consecuencia para el producto, y todos los pools reales la sufren en cada sorteo:** la
transferencia de financiación de un lote lleva el total abonado a todos los de ese lote, así que
un lote de uno lleva el premio exacto de un ahorrador, bajo la suposición del observador. El
último lote del recorrido tiene un solo ahorrador siempre que el número de ahorradores no sea
múltiplo del tamaño del lote. Cada uno de los siete pools está sembrado con cinco ahorradores y un
tamaño de lote de 4 (`KEEPER_BATCH`, `packages/keeper/src/config.ts`), así que todos los sorteos
terminan con un lote de uno, y el evento `Evaluated` de esa misma transacción nombra al ahorrador
al que pertenece.

Los siete pools son siete envoltorios separados con los poderes de siete propietarios separados,
así que esto se aplica pool a pool y no una sola vez para todos.

Ningún lote mínimo puede arreglarlo, porque `evaluate(uint32,uint256)`
(`packages/contracts/contracts/HearthVault.sol`) es sin permisos y toma el tamaño de lote de quien
llama, así que cualquier observador puede forzar un lote de uno haga lo que haga el keeper. Lo
registramos como residuo aceptado: solo muerde bajo la suposición del observador, y el
`observerCount()` real es 0. El arreglo del lado del contrato, aplazado: acumular los créditos por
sorteo y enviar una única transferencia de financiación al finalizar, o rellenar el total de todos
los lotes.

**La alternativa que rechazamos:** escribir nuestro propio token confidencial. Eso cambia un
contrato conocido, auditado y operado por Zama por otro que calificamos nosotros mismos.

## 8. Los sorteos dependen de que alguien envíe transacciones

Nada en la cadena se dispara solo.

**Qué significa:** si no corre ningún keeper y ningún ahorrador actúa, el sorteo se salta y ese
periodo no paga premio. Un cierre que se pasa de plazo se rechaza sin más en lugar de dejar el
sorteo varado, y una adjudicación que llega después de la ventana sigue anotando la cosecha,
devuelve la liquidez ofrecida y marca el sorteo `Skipped`.

**Qué no significa:** dinero en riesgo. Un sorteo saltado mantiene su liquidez en los niveles, la
cosecha la anota una adjudicación tardía, y los depósitos y los retiros no se ven afectados en
ningún momento.

**Qué lo reduce:** todos los pasos son sin permisos y la aplicación los expone, así que cualquier
ahorrador puede empujar un sorteo. El pool implementa además la interfaz de automatización de
Chainlink para el paso del cierre, que es el único paso que no necesita datos de fuera de la
cadena y el único con plazo, pero no hay ningún upkeep registrado en ninguno de los siete pools,
así que hoy los keepers y la aplicación son todo lo que hay. Cada pool tiene su propio proceso
keeper en su propia cuenta, así que un keeper que se para, o una cuenta que se queda sin ETH de
Sepolia, le cuesta sus sorteos a ese pool y deja los otros seis en marcha.

## 9. El rendimiento en Sepolia está patrocinado, no ganado

El dinero de premios de cada pool sale de su propio saldo financiado por un patrocinador, que
gotea a una tasa fijada.

**Qué significa:** no es rendimiento real. Nadie lo está ganando prestando ni con una bóveda.
Cuando el saldo patrocinado se acaba, los premios paran. Un patrocinio no se puede recuperar una
vez hecho, y solo el propietario de la fuente puede cambiar la tasa.

**Por qué:** no hay ningún sitio en Sepolia que pague rendimiento sobre los tokens mock de Zama.
Aave rechaza esos depósitos, Compound quiere el USDC propio de Circle, y la bóveda de Zama en
Sepolia es solo de reposo y sin adaptador de rendimiento, que es la descripción que hace de ella
la propia Zama.

**Qué tiene de real:** cada unidad de dinero de premios se envolvió de verdad, se transfirió de
verdad al pool como transferencia cifrada y se verificó de verdad con un descifrado firmado por el
KMS antes de abonarse. Una fuente que revierte tampoco para ya un sorteo: la cosecha se anota como
cero, se emite `HarvestFailed` y el cierre funciona. El origen del dinero es un mock. La fontanería
no.

## 10. La costura del envoltorio, y lo que cuesta un saldo identificado

Convertir USDC público en USDC confidencial es una transferencia pública, así que la cantidad se
ve.

**Qué significa:** un ahorrador que envuelve e inmediatamente deposita la misma cantidad ha
publicado su depósito. Lo medimos en nuestro propio despliegue anterior: tres de cinco depósitos
reales estaban a dos o cuatro bloques de un envoltorio público de exactamente 100 USDC.

**Qué cuesta, más allá de la cantidad:** los umbrales son públicos, porque son lo que hace
comprobable el sorteo. Así que un saldo que un observador puede identificar tiene un resultado
público en cada sorteo y en cada nivel, calculado sin descifrar nada, y en todos los sorteos
posteriores también, ya que las ganancias no entran nunca en las probabilidades. Incluso una cota
superior holgada demuestra una derrota segura en cualquier nivel cuyo umbral quede por encima.

**Qué hace Hearth:** mantiene envolver y depositar como pasos separados, te dice en el paso de
envolver que uses una cifra redonda para que el envoltorio sea un cubo y no una cifra exacta,
avisa en el paso del depósito, y deja que un ahorrador mantenga un saldo confidencial permanente
para que un depósito salga de una acumulación de composición desconocida.

**Qué no puede hacer Hearth:** quitarlo. No hay forma confidencial de convertir un token público,
y no hay forma de volver privado un umbral sin hacer incomprobable el sorteo.

## 11. El orden del recorrido decide a quién le falta en un nivel sobresuscrito

Cuando un nivel se agota a mitad de sorteo, el ahorrador al que el recorrido llega en ese momento
se lleva el resto y los posteriores no reciben nada de ese nivel.

**Qué significa:** en el raro sorteo sobresuscrito, alguien sale perjudicado por una posición que
no eligió.

**Qué ya no es:** una palanca. Una versión anterior permitía a quien llamaba a `evaluate` entregar
una lista de direcciones, lo que ponía el orden en manos del keeper y permitía a un ahorrador
comprar el principio de la cola. Ahora quien llama pasa un número, el recorrido empieza en un
punto derivado de la semilla del sorteo, y ese inicio se mueve en cada sorteo.

**Qué lo reduce:** el ahorrador afectado lo puede ver, porque su peso y su crédito de ese sorteo
los puede descifrar él, así que un crédito corto es demostrable y no misterioso.

## 12. El sorteo corre contra una franja, así que un nivel paga entre la mitad y todos sus premios

La prueba del ganador usa `M`, la menor potencia de dos por encima del peso total del pool, en
lugar del total mismo. Por tanto `M` queda entre `W` y `2W`.

**Qué significa:** el recuento esperado de premios de cada ahorrador queda escalado por `W / M`,
un número entre un medio y uno, así que un nivel paga entre la mitad y la totalidad de sus
`count * odds` premios nominales en cada sorteo. Un pool que acaba de cruzar una potencia de dos
paga en la parte baja de ese rango hasta que crece dentro de su franja.

**Qué no significa:** dinero perdido ni probabilidades distorsionadas. Todos los ahorradores de un
nivel están escalados por el mismo factor, así que la parte de nadie cambia respecto a la de otro.
Lo que un nivel no paga va a su arrastre cifrado y se vuelve a ofrecer, así que los tamaños de los
premios se estabilizan en algún punto entre las cifras nominales y el doble, y todo el rendimiento
sigue saliendo.

**Por qué lo aceptamos:** la alternativa era publicar el total exacto, que es la limitación 6.

## 13. Las ganancias acumuladas se hacen públicas si haces un viaje de ida y vuelta por el envoltorio

Envolver a la entrada y desenvolver a la salida son los dos movimientos públicos en la capa del
token, y la primera de las dos llamadas de desenvolver es la que publica la cantidad, así que un
desenvolver que nunca finalizas ya la ha filtrado.

**Qué significa:** para una dirección cuya única contraparte en USDC confidencial es Hearth, el
total público desenvuelto menos el total público envuelto es una cota inferior de las ganancias
retiradas de toda su vida, y pasa a ser exacta en cuanto esa dirección se ha vaciado. Desenvolver
hacia una dirección nueva no ayuda, porque la transferencia confidencial a esa dirección es en sí
misma el vínculo.

**Qué lo reduce:** desenvuelve en denominaciones redondas sin relación con tu posición, o deja
detrás un saldo confidencial permanente y no hagas nunca el viaje de ida y vuelta completo.

## 14. Un saldo que nunca cambia queda acotado por los recuentos de premios publicados

Cada conciliación publica cuántos premios pagó un nivel. Como todos los umbrales son públicos, ese
recuento es una restricción de la forma "cuántos de estos ahorradores tenían un peso por encima de
su propio umbral publicado", y las restricciones se acumulan.

**Qué significa:** un ahorrador cuyo saldo no cambia a lo largo de muchos sorteos queda
progresivamente acotado por esos recuentos. Un ahorrador que deposita o retira reinicia su propia
incógnita.

**Qué limita el ritmo:** nunca se revela nada más fino que un número entero de premios, y un
atacante no puede elegir los umbrales, porque la semilla se saca dentro del coprocesador y se
revela solo cuando su periodo ha cerrado.

**Qué hicimos al respecto: nada, y este es el motivo.** El contrato tiene un mando para
exactamente esto. `reconcileEvery[t]` es cuántos sorteos pasan entre publicaciones del arrastre de
un nivel, y subirlo en el nivel mayor publicaría un recuento al día en lugar de uno por hora, así
que un bote se atribuiría a todos los elegibles del día y no al puñado de elegibles de un sorteo.
La ejecución de equidad mostró lo que eso cuesta. Un cierre mueve toda la liquidez pública de un
nivel al sorteo y solo vuelve en una conciliación, así que con una cadencia de 24 la liquidez
pública del nivel mayor es la parte de la cosecha de un solo sorteo en 23 de cada 24 sorteos, y el
tamaño del premio se saca de eso, con el bote acumulado a la vista solo en el sorteo de la
conciliación. El dinero se ofrece y se puede ganar en todo momento, dentro del arrastre cifrado,
pero nadie puede ver crecer el bote.

Un recuento oculto y un bote visible que se acumula no pueden darse a la vez, y este despliegue
eligió el bote visible. Los tres niveles van con `reconcileEvery = 1`, así que la medición de
arriba corre a un recuento por nivel y por sorteo. El mando es un argumento de constructor y un
despliegue que valore la medición más lenta por encima del bote visible lo pone más alto.

## No es una limitación, pero conviene decirlo con claridad

- **Seis de los siete pools sortean cada seis horas, y es una decisión de gas.** Un sorteo con
  cinco ahorradores cuesta `8,456,388` de gas, así que siete pools horarios gastarían alrededor de
  `1.43 ETH` al día en Sepolia, y los faucets públicos no dan para eso. Solo el pool de USDC,
  desplegado primero, sigue sorteando cada hora. Las probabilidades de los niveles de cada pool se
  fijan contra su propio periodo, así que el ritmo de premios es el mismo con los dos relojes.
- **Los dieciséis idiomas son traducción automática.** Los textos de la interfaz y las páginas
  traducidas de la documentación los escribió un modelo, no hablantes nativos, y no los ha
  revisado un profesional. El inglés es la fuente de verdad de todos los números, nombres de
  contrato y afirmaciones de este sitio, y una página que no se ha traducido recurre al inglés en
  lugar de a una conjetura.
- **Un ahorrador grande gana a menudo.** Las probabilidades son proporcionales al saldo ponderado
  por tiempo, así que quien tiene mucho durante mucho tiempo gana mucho. Eso es el diseño, no un
  defecto.
- **Los tamaños y los recuentos de premios son públicos.** Siempre lo fueron en PoolTogether. Lo
  confidencial aquí es quién ganó, no cuánto ganó el pool.
- **A Hearth no lo ha auditado un tercero.** Está autoauditado con ataques ejecutados y pruebas de
  propiedades, y el [modelo de amenazas](security/threat-model.md) es el sustituto honesto y no un
  reemplazo.
