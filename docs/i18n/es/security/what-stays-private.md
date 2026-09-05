# Qué permanece privado

Sobre la confidencialidad importan tres cosas: qué sigue cifrado, si el sorteo es
demostrablemente justo y ponderado por el depósito, y si todas las fugas están nombradas. Esta
página responde a la primera y a la tercera. Nuestra postura es que nombrar nosotros mismos
todas las costuras vale más que una afirmación que nadie puede comprobar.

Todo lo que hay aquí está escrito para un pool, y Hearth tiene siete, uno por token
confidencial. No comparten nada, así que el conjunto de anonimato de cada pool son sus propios
ahorradores y nadie más, y a un pool con tres ahorradores no le sirve de nada que otro pool
tenga treinta.

## La tabla

| Valor | Estado | Quién puede leerlo |
| --- | --- | --- |
| Tu principal | Cifrado | Solo tú, mediante firma EIP-712 |
| Tus ganancias sin cobrar | Cifrado | Solo tú |
| Tu peso ponderado por tiempo, por sorteo | Cifrado | Solo tú |
| Tu crédito, por sorteo, y por tanto si ganaste | Cifrado | Solo tú |
| La cantidad que depositas | Cifrada de punta a punta | Solo tú |
| La cantidad que retiras | Cifrada de punta a punta | Solo tú |
| **El peso total del pool en un periodo** | **Cifrado, no se publica nunca** | **Nadie** |
| El arrastre de cada nivel entre conciliaciones | Cifrado | Nadie |
| La franja en la que cayó el total del pool, una potencia de dos | Pública al terminar el periodo | Todo el mundo |
| Si alguien tenía saldo en el periodo | Pública al terminar el periodo | Todo el mundo |
| La semilla aleatoria de cada sorteo | Pública al terminar el periodo | Todo el mundo |
| El rendimiento cosechado en cada sorteo | Público al terminar el periodo | Todo el mundo |
| El tamaño del premio de cada nivel y su liquidez en claro ofrecida | Públicos desde el cierre | Todo el mundo |
| Cuántos premios pagó el nivel frecuente | Público un sorteo después | Todo el mundo |
| Cuántos premios pagó el nivel medio | Público un sorteo después | Todo el mundo |
| Cuántos premios pagó el nivel mayor | Público un sorteo después | Todo el mundo |
| La lista de direcciones de ahorradores | Pública | Todo el mundo |
| Cuándo depositaste, retiraste o fuiste evaluado, y en qué lote | Público | Todo el mundo |
| El contador de no financiado | Público al finalizar | Todo el mundo |
| Las cantidades patrocinadas y la tasa de goteo | Públicas | Todo el mundo |
| La cantidad que envuelves hacia el token confidencial, o que desenvuelves de él | Pública | Todo el mundo |
| Todos los umbrales que tuvo que superar cualquier dirección, en cualquier nivel | Calculables públicamente | Todo el mundo |

Esa tabla se lee de dos maneras. La columna izquierda de secretos es exactamente la
información de cada persona, más los dos totales de todo el pool que resultaron ser
información personal disfrazada. La columna derecha de hechos públicos es lo que necesita
alguien de fuera para comprobar que el sorteo fue honesto. Ese reparto es el diseño.

## Qué puede y qué no puede deducir un observador

Un observador con un nodo de archivo completo y paciencia infinita puede construir:

- La lista completa de ahorradores y el bloque exacto en el que actuó cada uno.
- La semilla, la franja, la cosecha y los tamaños de los premios de cada sorteo, y el recuento
  de premios de cada nivel, un sorteo después del sorteo al que pertenece.
- Todos los umbrales que tuvo que superar cada dirección. Puede calcular literalmente tu
  escalera.
- Las tenencias totales del pool en su token confidencial como un handle cifrado, que no puede
  leer.

Lo que no puede conseguir:

- Ningún saldo individual, en ningún momento.
- Ningún peso individual, y por tanto las probabilidades de nadie.
- Qué direcciones ganaron un sorteo, ni cuánto le pagaron a nadie.
- El peso total exacto del pool, solo la potencia de dos que queda por encima.

La distancia entre esas dos listas es lo que vende Hearth. El resto de esta página es el relato
honesto de dónde se estrecha esa distancia.

## Regla 1: la franja, y la fuga que quitamos

Hasta el 3 de septiembre de 2026, este diseño publicaba el saldo total exacto ponderado por
tiempo del pool, `W`, en cada sorteo, con el argumento de que publicarlo era lo que hacía
verificable el sorteo. Una revisión demostró que ese argumento salía demasiado caro.

Aquí está la fuga, en los términos del revisor. Para cualquier periodo cerrado `p`,
`W_p = B * L + suma sobre cada acción de D_i * (periodEnd(p) - t_i)`, donde `B` es el principal
total que entró al periodo y `D_i` es el cambio con signo de cada acción. `B`, `L`,
`periodEnd(p)` y todos los `t_i` son públicos, porque los eventos de depósito y de retiro
llevan las marcas de tiempo. Así que **un ahorrador que es el único que mueve dinero en un
periodo tiene esa cantidad recuperable a partir de los dos totales publicados y de la marca de
tiempo pública de su propia transacción.** No acotada: recuperada exactamente, resto cero. Y
empeora con más datos, no mejora: cada periodo cerrado es una ecuación más, cada acción es una
incógnita, la cadena está anclada en cero, y los eventos nombran quién actuó y cuándo, así que
dos que se mueven entre dos periodos tranquilos también quedan recuperados exactamente.

Esa fuga ya no está, porque el número que necesita ya no se publica. Lo que publica ahora la
bóveda es la franja: la menor potencia de dos igual o superior a `W`, escrita `M`. Cinco
comparaciones cifradas por sorteo siguen dónde se sitúa `W` respecto a la franja del sorteo
anterior, y solo se descifra el pequeño recuento que suman. Entre cruces de una potencia de
dos, sorteos consecutivos publican el mismo número, y restarlos da cero.

Lo que queda es una versión mucho más pequeña de lo mismo.

- **Un ahorrador.** La franja publicada es el peso de ese ahorrador con un margen de un factor
  dos.
- **Dos ahorradores.** Cada uno puede restar su propio peso y acotar el del otro, de nuevo con
  un margen de un factor dos.
- **Tres o más.** Cualquier reparto compatible con la franja es posible, y el conjunto crece
  con cada ahorrador adicional.

La aplicación lo dice encima de todas las pantallas siempre que el pool tiene menos de tres
ahorradores. La propia documentación de Zama hace la misma observación sobre su agrupador, con
las mismas palabras: "la suma de un solo valor es el valor". Una franja es una versión más
débil de esa frase, no una escapatoria.

## Regla 2: un saldo que un observador puede identificar no tiene ninguna privacidad en el sorteo

Esta es la afirmación más afilada de la página, así que tiene su propia regla.

La prueba del ganador es una función determinista de un secreto, tu peso, y por lo demás de
datos completamente públicos. Los umbrales son públicos por diseño, porque son lo que hace
comprobable el sorteo. Así que **cualquiera que pueda identificar tu saldo calcula si ganaste o
perdiste en cada nivel de cada sorteo, sin descifrar nada**, y en todos los sorteos posteriores
también, ya que las ganancias están en un saldo aparte que nunca entra en las probabilidades.

La forma habitual de identificar un saldo es la costura del envoltorio de la regla 3: envolver
un token público en su forma confidencial es un movimiento público, así que un ahorrador que
envuelve y después deposita la misma cantidad segundos más tarde ha publicado su depósito. A
partir de ese punto, sus resultados en los sorteos son aritmética pública.

Incluso una cota holgada muerde. Un observador que solo tenga una cota superior de tu saldo
demuestra una derrota segura en cualquier nivel cuyo umbral quede por encima de esa cota.

Lo que hace la aplicación al respecto: mantiene el blindaje y el depósito como pasos separados
de la pantalla de Depósito, y en el paso del blindaje te dice en un párrafo que uses una cifra
redonda para que un blindaje sea un cubo y no un depósito exacto, que blindes en el momento que
elijas y que deposites una parte más tarde, de modo que un depósito salga de una acumulación de
composición desconocida. Lo que ningún cambio de contrato puede hacer es volver privado un
umbral, porque un umbral privado es un sorteo incomprobable.

## Regla 3: la costura del envoltorio, en las dos direcciones

Convertir un token público en su forma confidencial es un movimiento ERC-20 público. La
cantidad aparece en el evento `Wrap` del envoltorio, en el `Transfer` del token subyacente, y
otra vez en el registro que hace el coprocesador de cifrar ese texto en claro. No hay forma
confidencial de convertir un token público.

Medimos la correlación en nuestro propio despliegue anterior. Recorriendo los bloques de
Sepolia 11528000 a 11618500, tres de cinco depósitos estaban a dos o cuatro bloques de un
envoltorio público de exactamente 100 USDC de la misma dirección. Cualquiera que leyera los
registros públicos podía poner precio a esos tres depósitos en 100 USDC sin romper ni una sola
garantía criptográfica. Zama documenta el mismo efecto para su agrupador y lo llama correlación
entre blindaje y entrada.

Desenvolver también publica una cantidad, y es la primera de las dos llamadas de desenvolver la
que lo hace, así que un desenvolver que nunca se finaliza filtra igualmente. Eso da una segunda
revelación con nombre: **las ganancias acumuladas se convierten en una cota inferior pública
para cualquier dirección que envuelve a la entrada y desenvuelve a la salida por completo.**
Para una dirección cuya única contraparte en ese token confidencial sea Hearth, el total
público desenvuelto menos el total público envuelto son exactamente las ganancias retiradas de
toda su vida, menos el principal y el saldo confidencial que esa dirección todavía tenga. Esas
dos cosas están ocultas y no son negativas, así que la diferencia es siempre una cota inferior,
y pasa a ser exacta en cuanto la dirección se ha vaciado.

Desenvolver hacia una dirección nueva no ayuda, porque la transferencia confidencial a esa
dirección es en sí misma el vínculo.

Lo que hace Hearth: pasos separados, un aviso en el paso de blindaje del Depósito, una línea en
ese paso y otra en la pestaña "De vuelta a USDC normal" del Retiro que te dice que muevas una
cifra redonda, y la sugerencia de dejar detrás un saldo confidencial permanente. La cantidad la
escribes tú en cualquier caso; la aplicación no ofrece un juego de denominaciones. Lo que Hearth
no puede hacer: quitar nada de esto.

## Regla 4: los recuentos de premios publicados son una medición lenta

Cada conciliación publica cuántos premios pagó un nivel. Como el umbral de cada ahorrador es
público, ese recuento es una restricción dura de la forma "cuántos de estos ahorradores tenían
un peso por encima de su propio umbral publicado". Lleva solo unos pocos bits, pero es una
medición real, y se acumula.

**Un saldo que no cambia a lo largo de muchos sorteos queda progresivamente acotado por esos
recuentos.** Un ahorrador que deposita o retira reinicia su propia incógnita y el estrechamiento
vuelve a empezar.

Dos cosas limitan el ritmo. Los recuentos son gruesos: nunca se revela nada más fino que un
número entero de premios. Y un atacante no puede elegir los umbrales, porque la semilla se saca
dentro del coprocesador y se revela solo cuando su periodo ha cerrado, así que nadie puede
apuntar una consulta a un saldo sospechado.

Había un tercer amortiguador, y este despliegue renunció a él a propósito. `reconcileEvery[t]`
fija cuántos sorteos pasan entre publicaciones del arrastre de un nivel. Subirlo publica un
recuento por tramo en lugar de uno por sorteo, así que un bote se atribuye a todos los elegibles
de ese tramo. Lo que cuesta es el bote mismo: un cierre mueve toda la liquidez pública de un
nivel al sorteo, y ese dinero solo vuelve en una conciliación, así que con una cadencia de 24 la
liquidez pública del nivel mayor es la parte de la cosecha de un solo sorteo en 23 de cada 24
sorteos, el premio publicado se dimensiona sobre eso, y el bote acumulado aparece a la vista
solo en el sorteo de la conciliación. El dinero se ofrece y se puede ganar todo el tiempo dentro
del arrastre cifrado. Nadie puede verlo.

Así que los tres niveles van con `reconcileEvery = 1`. El bote se acumula en público, el
recuento de cada nivel se hace público un sorteo después, y la medición de arriba corre a su
ritmo pleno de un recuento por nivel y por sorteo. En el nivel mayor eso significa que un pago
apunta a los ahorradores elegibles en ese único sorteo, alrededor del cuatro por ciento del
pool, y no a un día de ellos. Es un residuo revelado, no uno mitigado, y es la limitación 14. La
cadencia sigue siendo un argumento de constructor, así que un despliegue que prefiera la
medición más lenta al bote visible puede tenerla.

## Regla 5: la capa del token es de Zama, no nuestra

El activo de cada pool es uno de los tokens confidenciales de Zama. Es deliberado, y significa
que los poderes propios del token se aplican al dinero que se mueve por Hearth, pool a pool:
siete envoltorios, los mismos poderes en cada uno. Vamos a nombrarlos:

El contrato de Sepolia es un `ConfidentialWrapper` detrás de un proxy actualizable, propiedad de
Zama, con propiedad en dos pasos y la renuncia desactivada. Leer su código fuente verificado el
2 de septiembre de 2026 da tres hechos que importan para la privacidad:

1. **Observadores, con efecto retroactivo.** El propietario puede llamar a
   `addObserver(address)`, que concede a esa dirección descifrado de usuario comodín sobre todos
   los handles sobre los que el contrato del token tiene derechos. Eso cubre todas las
   cantidades depositadas, todos los pagos de retiro y todas las cantidades de financiación por
   lote que el pool manda a la bóveda. La palabra que importa es retroactivo: un observador
   nombrado en cualquier momento futuro puede descifrar cantidades que ya están en la cadena,
   así que "vigilar `ObserverAdded` y salir" no es una defensa. Estado real el 2 de septiembre
   de 2026: `observerCount()` es 0 y `observers()` está vacío.
2. **Lista de bloqueo y pausa.** El propietario puede bloquear una dirección, lo que le impide
   depositar, retirar o desenvolver, porque cada una de esas cosas es una actualización del
   token con esa dirección en un lado. Existe un rol de pausador; en la práctica está fijado en
   la dirección cero, así que la pausa está desactivada ahora mismo.
3. **Actualizabilidad.** El propietario puede sustituir la implementación, así que el
   comportamiento del token, incluido cómo trata los handles sobre los que tiene derechos, puede
   cambiar bajo nuestros pies.

Fíjate en el alcance exacto del punto 1. En Hearth no hay ninguna transferencia de premio por
ahorrador, así que no hay ningún pago por ganador que un observador pueda leer. Lo que se mueve
en la capa del token es una transferencia de financiación por lote de evaluación, del pool a la
bóveda, que lleva el total abonado a todos los de ese lote. Un lote de uno convierte ese total en
el premio exacto de un ahorrador, y el pool real de cinco ahorradores con tamaño de lote 4
termina cada recorrido con un lote de uno. `evaluate` es sin permisos y toma su tamaño de lote de
quien llama, así que no se puede imponer ningún lote mínimo. La
[limitación 7](../limitations.md) lo recoge como residuo aceptado y nombra el arreglo del lado
del contrato.

Lo que un observador en la capa del token no conseguiría es el libro propio de Hearth. Tu
principal, tus ganancias, tu peso y tu crédito viven en el almacenamiento de la bóveda, y el
token no tiene derechos de control de acceso sobre ninguno de ellos. Lo verificamos en el
despliegue anterior: la dirección del token devuelve falso al preguntar por permiso sobre los
handles de las ganancias y del principal de un depositante, mientras que el depositante y el
pool devuelven verdadero.

Así que la afirmación honesta es: usa Hearth y confías al envoltorio de Zama las cantidades que
lo cruzan, exactamente igual que cualquier aplicación ERC-7984. No le confías tu posición.

La alternativa era escribir nuestro propio token confidencial, cosa que hicieron varios
proyectos de este campo. Eso cambia un contrato conocido, auditado y operado por Zama por otro
que nos calificaríamos nosotros mismos. Preferimos documentar el límite de confianza real antes
que fabricar uno más pequeño.

## Regla 6: la evaluación no delata, y nadie elige el orden

`evaluate(drawId, count)` toma un número, no una lista de direcciones. La bóveda recorre la
lista de ahorradores desde un punto de partida derivado de la semilla de ese sorteo, en el orden
de la lista, y quien llama solo decide cuánto avanzarla. Un ahorrador que quiere su propio
resultado avanza el mismo recorrido que avanza el keeper.

Eso cierra dos cosas a la vez.

Cierra el chivato de la autoevaluación. En una versión anterior, la evaluación tomaba una lista
de direcciones, así que un ahorrador podía calcular su propio resultado a partir de las entradas
públicas y después pagar por ser evaluado solo cuando había ganado. Enviar esa transacción
habría sido un chivato de ganador tan ruidoso como una función de cobro. Ahora no hay ninguna
transacción que solo enviaría un ganador.

Cierra la palanca del orden. Cuando un nivel se sobresuscribe y se agota, aquel al que el
recorrido llega el último se queda corto. Ese orden lo fija la semilla, así que nadie puede
comprar un sitio mejor con gas, y el punto de partida se mueve en cada sorteo, así que ninguna
dirección es la última de forma sistemática. La consecuencia para la equidad está descrita en
[premios y niveles](../concepts/prizes-and-tiers.md) y es la limitación 11.

Todo ahorrador evaluado en un sorteo recibe las mismas escrituras, con la misma forma, haya
ganado o no, porque el pago pasa por una selección cifrada y no por una bifurcación. El lote en
el que cayó un ahorrador, y su posición dentro de él, son públicos y no dicen nada sobre su
resultado.

## Regla 7: el residuo de comportamiento

Hearth no tiene transacción de cobro, así que no hay ninguna acción con forma de ganador que
vigilar. Enterarte de que ganaste es una firma fuera de la cadena que no toca nada, y el botón
de cobro de la aplicación, que lleva la cantidad, envía un retiro corriente que se ve como
cualquier otro retiro.

El residuo es lo que haces después. Un ahorrador que retira inmediatamente después de cada
sorteo que gana, y nunca en otro momento, le da a un observador una pista estadística con el
tiempo. Es débil, tarda muchos sorteos en formarse y está enteramente bajo el control del
ahorrador. La mitigación es de comportamiento, no criptográfica: retira según tu propio
calendario, o deja que las ganancias se acumulen.

Decimos esto porque la alternativa, afirmar que el comportamiento en la cadena no revela nada,
es falsa en todos los diseños de este tipo. Los proyectos de este campo que quitaron su función
de cobro llegaron a la misma conclusión y lo pusieron por escrito. Nosotros también.

## Qué no cubre esta página

No cubre los atacantes y sus motivos, que es el [modelo de amenazas](threat-model.md). No cubre
cómo comprobar un sorteo tú mismo, que es
[aleatoriedad y verificación](randomness-and-verification.md). Y no hace ninguna afirmación
sobre la privacidad a nivel de red: la dirección IP desde la que te conectas, el proveedor de
RPC que usas y la petición que envías al relayer quedan fuera de la cadena y fuera de este
análisis.
