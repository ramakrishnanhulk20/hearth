# Preguntas frecuentes

## 1. ¿En qué token puedo ahorrar?

En siete: USDC, USDT, WETH, BRON, ZAMA, tGBP y XAUt, todos ellos tokens confidenciales de la
propia Zama en Sepolia. Cada uno es un pool separado con sus propios contratos, sus propios
ahorradores y su propio dinero de premios, y el pool en el que estás es la primera parte de la
URL después de `/app`. El selector muestra también el Confidential tGBP oficial de Zama, en
gris: su token público solo lo puede acuñar el emisor, así que nadie puede envolverlo y no
puede existir ningún pool sobre él. Todo lo demás de esta página se aplica a cada pool por
separado. Los detalles están en [pools y tokens](concepts/pools-and-tokens.md).

## 2. ¿Dónde está el botón de cobro?

En "Mis sorteos" dentro de la aplicación, en la tarjeta de ese sorteo, bajo "Tu resultado", una
vez que lo has abierto con el ojo. Aparece solo cuando ese sorteo te abonó algo y la bóveda
todavía le debe dinero a esta cartera: el mismo ojo abre a la vez el abono de ese sorteo y la
cifra corriente de ganancias sin cobrar de la bóveda, y el botón ofrece la menor de las dos. Esa
segunda cifra es lo que lo hace honesto. El abono de un sorteo no cambia nunca una vez escrito,
así que un botón atado solo al abono ofrecería el mismo premio otra vez tras recargar y la cadena
lo pagaría de tu propio principal. Por debajo, y
a propósito, no es una transacción aparte: los premios se abonan a tu saldo cifrado de
ganancias durante la evaluación, y el botón de cobro, que lleva la cantidad, envía un retiro
corriente por ella, que en la cadena se ve exactamente igual que cualquier otro retiro. En la
mayoría de los protocolos de premios solo los ganadores tienen motivo para enviar una
transacción de cobro, así que la lista de transacciones los va nombrando en silencio; aquí no
hay ninguna transacción así que vigilar. El mismo dinero sale por la pestaña "Fuera de la
bóveda" de Retirar, porque un cobro es un retiro con otro nombre.

## 3. ¿Puedo perder mi principal?

No. Los premios se pagan del rendimiento, nunca del depósito de nadie, y `withdraw` está
siempre abierto, incluso mientras corre un sorteo. Lo único que puedes perder es un premio que
habrías ganado: si el recorrido de evaluación no llega hasta ti dentro de la ventana de dos
periodos, ese sorteo no te paga nada y el dinero vuelve al nivel. Ver la limitación 2.

## 4. ¿Podéis ver mi saldo o mis ganancias?

No. Tu principal, tus ganancias, tu peso en cada sorteo y tu crédito en cada sorteo son valores
cifrados a los que solo tu dirección tiene acceso concedido, y la lista de control de acceso de
Zama lo hace cumplir en la cadena, no como una política que prometemos. Nosotros vemos lo mismo
que un desconocido: que depositaste, cuándo, y nada sobre la cantidad.

## 5. ¿Cómo se calculan mis probabilidades?

Por tu saldo medio a lo largo de todo el periodo, no por tu saldo cuando ocurre el sorteo. Un
periodo es de una hora en el pool de USDC y de seis horas en los otros seis. Mantén 100 USDC
durante un periodo completo de una hora y tu peso son 360.000 saldo-segundos; tus premios
esperados en un nivel son ese peso dividido por la franja publicada, multiplicado por las
probabilidades del nivel y por su número de premios. Repartir tu dinero entre carteras no
cambia nada, porque la esperanza es exactamente proporcional al peso.

## 6. Deposité cinco minutos antes del sorteo y no gané nada. ¿Por qué?

Porque cinco minutos de un periodo de una hora son una doceava parte de las probabilidades que
habrías tenido manteniendo todo el periodo, y una setentaidosava de uno de seis horas. Eso es lo
que impide que alguien enseñe un saldo grande justo antes de cada sorteo, gane y retire;
ejecutamos ese ataque contra nuestro propio diseño anterior y se llevó 19 de 20 sorteos.
Deposita y déjalo ahí, y obtienes tu parte completa desde el siguiente periodo completo.

## 7. ¿Mis ganancias generan probabilidades también?

Por sí solas no. Las ganancias están en un saldo cifrado aparte que no cuenta para tu peso, así
que el interés compuesto no es automático: retíralas y vuelve a depositarlas para ponerlas a
trabajar. Esa separación es lo que hace que retirar un premio se vea idéntico a retirar
ahorros.

## 8. ¿Quién dispara los sorteos, y qué pasa si dejan de hacerlo?

Nosotros ejecutamos un proceso keeper por pool, cada uno en su propia cuenta, así que un keeper
que se para le cuesta sus sorteos a un pool y deja los otros seis en marcha. El pool implementa
además la interfaz de automatización de Chainlink, así que un upkeep por tiempo podría cubrir el
paso del cierre, aunque todavía no hay ninguno registrado en ningún pool. En cualquier caso,
cualquiera puede llamar a cada paso de un sorteo, tú incluido desde la aplicación. El cierre
tiene un plazo propio, medio periodo antes de que termine la ventana, para que un cierre nunca
pueda llegar demasiado tarde como para que la adjudicación no quepa después. Si no se ejecuta
nada, ese sorteo se salta: su liquidez se queda en los niveles para el sorteo siguiente, el
rendimiento se anota cuando llegue una adjudicación tardía, y los depósitos y los retiros
siguen funcionando. Un keeper atascado cuesta sorteos, nunca dinero.

## 9. ¿Podríais amañar el número aleatorio, o el tamaño del premio?

Ninguno de los dos. La semilla se genera dentro del coprocesador de Zama como texto cifrado,
así que nadie la ve en el momento en que se saca, y cerrar un sorteo funciona exactamente una
vez, así que no hay segunda tirada. Los tamaños de los premios se fijan antes, en esa misma
transacción, antes de que exista la semilla, así que nadie puede leer una semilla, deducir que
ha ganado y después hacer la victoria más grande. Cuando termina el periodo, la semilla se
publica con una firma del servicio de gestión de claves de Zama que el contrato verifica en la
cadena, y a partir de ella cualquiera puede recalcular el umbral exacto que tenía que superar
cualquier dirección.

## 10. ¿Por qué el pool publica solo un tamaño aproximado en lugar de su total exacto?

Porque el total exacto delata depósitos individuales. Dos totales consecutivos, más la marca de
tiempo pública de tu propio depósito, permiten a cualquiera despejar tu cantidad exacta si
fuiste el único que movió dinero en ese periodo. No una estimación: el número. Así que la
bóveda publica solo la menor potencia de dos por encima del total, y el sorteo se ejecuta
contra ella. El coste es que un nivel paga entre la mitad y la totalidad de su recuento nominal
de premios en cada sorteo, con el resto arrastrado y ofrecido de nuevo, así que los tamaños de
los premios se estabilizan un poco más altos. Las probabilidades de nadie se distorsionan
respecto a las de otro.

## 11. ¿De dónde sale el dinero de los premios?

En Sepolia, de un saldo financiado por un patrocinador que gotea a una tasa fija, uno por pool,
porque ningún sitio de Sepolia paga rendimiento sobre los tokens mock de Zama. En mainnet, esa
misma interfaz se conecta a la Confidential Vault de Zama, que mete USDC confidencial en una
bóveda de rendimiento ERC-4626 real a través de un agrupador. En los dos casos el pool anota
solo la cantidad que un descifrado verificado por el KMS dice que llegó de verdad, nunca un
número que la fuente declare sobre sí misma.

## 12. ¿Qué puede aprender sobre mí alguien que vigile la cadena?

Que eres un ahorrador, en qué bloque depositaste o retiraste, y en qué lote de evaluación
estabas. No tu saldo, ni tus probabilidades, ni si ganaste. Hay cuatro costuras que conviene
conocer. La franja publicada se acerca a la información personal cuando hay menos de tres
ahorradores. Si alguien puede identificar tu saldo, normalmente vigilando un envoltorio público
seguido de un depósito del mismo tamaño, entonces tu resultado en cada sorteo es aritmética
pública a partir de ese momento, porque los umbrales son públicos por diseño. Envolver a la
entrada y desenvolver a la salida por completo publica una cota inferior de todo lo que has
ganado. Y cada nivel publica cuántos premios pagó, un sorteo después, que es una medición
gruesa de los saldos cifrados y va estrechando poco a poco un saldo que nunca se mueve.
Publicamos ese recuento en cada sorteo porque es el mismo paso que devuelve al bote público el
dinero no ganado, que es lo que permite que el bote se acumule donde lo puedes ver. Las cuatro
están cubiertas en [qué permanece privado](security/what-stays-private.md).
