# Pruébalo en Sepolia

Sepolia es la red de pruebas pública de Ethereum. El dinero que hay en ella no es real, así
que puedes recorrer el ciclo entero gratis. El pool de USDC sortea cada hora y los otros seis
cada seis horas, así que elige USDC si quieres ver un sorteo de un periodo en el que
depositaste. El camino de dos minutos del final de esta página no espera a ninguno.

La aplicación en vivo está en https://hearth-ram.vercel.app. Todo lo de abajo se puede hacer también
directamente desde un explorador de bloques si prefieres ver las llamadas en crudo.

## 0. Elige un token

Hearth tiene siete pools, uno por cada token confidencial que Zama publica en Sepolia. Cada
uno es un conjunto separado de contratos con sus propios ahorradores, su propio dinero de
premios y su propio reloj, así que elegir un token es elegir un pool. El nombre del token en
lo alto de la barra lateral abre el selector, y el pool en el que estás es la primera parte
de la URL: `/app/usdc`, `/app/weth` y así.

| Token | Slug | Sorteo cada | Token público con el `mint` abierto |
| --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 hora | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` |
| Confidential USDT (Mock) | `usdt` | 6 horas | `0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0` |
| Confidential WETH (Mock) | `weth` | 6 horas | `0xff54739b16576FA5402F211D0b938469Ab9A5f3F` |
| Confidential BRON (Mock) | `bron` | 6 horas | `0xFf021fB13cA64e5354c62c954b949a88cfDEb25E` |
| Confidential ZAMA (Mock) | `zama` | 6 horas | `0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57` |
| Confidential tGBP (Mock) | `tgbp` | 6 horas | `0x93c931278A2aad1916783F952f94276eA5111442` |
| Confidential XAUt (Mock) | `xaut` | 6 horas | `0x24377AE4AA0C45ecEe71225007f17c5D423dd940` |

El selector también lista el **Confidential tGBP** oficial de Zama, en gris, porque el mint
de su token subyacente pertenece al emisor y nadie más puede conseguir el token. Elegirlo
muestra una página que nombra el token, enlaza los dos contratos y no ofrece ninguna acción
de cartera, en lugar de un botón de depósito que revertiría.

La aplicación se lee en dieciséis idiomas, que se eligen desde el botón de la barra
superior. El inglés conserva las URL simples y cada uno de los demás idiomas antepone su
código, así que la misma pantalla en japonés es `/ja/app/usdc`.

## Contratos que vas a tocar

El recorrido de abajo usa el pool de USDC. Cualquier otro pool es el mismo conjunto de
contratos en direcciones distintas, listadas en
[pools y tokens](../concepts/pools-and-tokens.md).

| Qué | Dirección | Quién lo desplegó |
| --- | --- | --- |
| Mock USDC (ERC-20 público, `mint` abierto) | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` | Zama |
| Confidential USDC (`cUSDCMock`, envoltorio ERC-7984) | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | Zama |
| HearthVault | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | Hearth |
| HearthPrizePool | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | Hearth |
| SponsoredYieldSource | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` | Hearth |

Las dos direcciones de Zama son las publicadas en la propia referencia de direcciones de la
Confidential Vault de Zama para Sepolia, así que el token de prueba es de Zama y no nuestro.
Todos los envoltorios confidenciales de esa lista usan 6 decimales, lo que significa que
todas las cantidades en la cadena dentro del envoltorio van en millonésimas: 1.000 USDC se
escribe `1000000000`. El token público de debajo puede usar otra escala, y el `rate()` del
envoltorio es la conversión. El mock de USDC también usa 6, así que los dos coinciden; el
mock de WETH usa 18, así que su tasa es un millón de millones.

## 1. Consigue ETH de Sepolia

Necesitas una cantidad pequeña de ETH de Sepolia para pagar el gas. Sirve cualquier faucet de
Sepolia. Los de uso más común son el faucet Web3 de Google Cloud, el faucet de Sepolia de
Alchemy y el faucet de Chainlink, y cada uno reparte de sobra para este recorrido en una sola
petición. Una décima de ETH es mucho más de lo necesario.

## 2. Acuña el token de prueba

Cada uno de los siete mocks públicos tiene un `mint(address, uint256)` público sin
comprobación de propietario, limitado a un millón de tokens por llamada, y las direcciones
están en la tabla de arriba. La aplicación lo expone como un botón en la pantalla de Depósito
del pool en el que estés, en el primero de sus tres pasos, con la etiqueta "Consigue USDC de
prueba" mientras tu cartera no tenga ninguno y "Consigue un millón más" en cuanto tenga, con
el token de ese pool en la etiqueta. A mano, para USDC, es:

```
USDCMock.mint(yourAddress, 1000000000)     // 1,000 USDC
```

Pide más de lo que necesitas. Aquí nada vale nada.

## 3. Blindar: envolver USDC en USDC confidencial

El USDC confidencial es el envoltorio ERC-7984 de Zama alrededor de ese mock de USDC.
ERC-7984 es el estándar de token confidencial: los saldos viven en la cadena como valores
cifrados en lugar de números que cualquiera puede leer. Envolver son dos llamadas:

```
USDCMock.approve(cUSDC, 1000000000)
cUSDC.wrap(yourAddress, 1000000000)
```

En la aplicación esas dos llamadas son el paso 2 del Depósito, "Blinda tus USDC". El botón
dice "Blindar", y "Aprobar el envoltorio" mientras la autorización del envoltorio no llegue a
la cantidad que escribiste.

Ahora tienes 1.000 USDC confidenciales. A partir de aquí, tu saldo es un handle de texto
cifrado y solo tú puedes leerlo.

Envolver es público. El envoltorio emite un evento `Wrap` que lleva la cantidad en claro, la
transferencia ERC-20 subyacente la lleva otra vez, y la cantidad aparece una tercera vez en
el registro de cifrado trivial del coprocesador. No hay forma de evitarlo: convertir un token
público en uno confidencial es por definición un acto público.

## 4. Deposita en el pool

Una llamada, y la cantidad va cifrada desde el principio:

```
cUSDC.confidentialTransferAndCall(vault, encryptedAmount, inputProof, "")
```

La aplicación construye la entrada cifrada y su prueba por ti con el SDK de Zama. El gancho
de recepción de la bóveda abona exactamente la cantidad que el token dice que se movió de
verdad, no la que pediste, así que una transferencia que se quede corta por el motivo que sea
no puede crear principal fantasma.

La bóveda rechaza un depósito cuya cantidad, o cuyo principal resultante, te empujaría por
encima del límite por ahorrador, que en un periodo de una hora es de unos 5.000 millones de
tokens y en uno de seis horas de unos 854 millones. Las dos mitades de esa comprobación
importan: la suma cifrada desborda en silencio a 64 bits, así que acotar tanto la cantidad
entrante como el total es lo que impide que un depósito enorme haga dar la vuelta a la suma
hasta un número pequeño y se cuele. El rechazo va cifrado él mismo: el gancho devuelve un
falso cifrado y el token te reembolsa dentro de la misma transacción, así que un rechazo no
le dice a nadie cuál era tu saldo.

### Por qué envolver y depositar son dos pasos y no uno

La mayoría de las aplicaciones de este campo agrupan "aprobar, envolver, depositar" detrás de
un solo botón. Es más amable y filtra tu depósito.

Lo medimos en nuestro propio despliegue anterior. Leyendo los registros públicos de los
bloques 11528000 a 11618500 de Sepolia, tres de los cinco depósitos estaban a dos o cuatro
bloques de un `Wrap` público de exactamente 100 USDC de la misma dirección. Cualquiera que
leyera la cadena podía poner precio a esos tres depósitos en 100 USDC cada uno sin romper
nada. La propia documentación de Zama nombra el mismo problema y lo llama correlación entre
blindaje y entrada: "Un usuario que envuelve 50.000 USDC y se une a un lote minutos después
ha publicado, en la práctica, solo la cota superior de la cantidad con la que entró".

Así que Hearth los mantiene separados a propósito:

- Envuelve una vez, en una cifra redonda, en el momento que elijas.
- Mantén un saldo confidencial permanente y deposita una parte de él más tarde.
- Vuelve a depositar desde ese mismo saldo sin envolver otra vez.

La correlación se debilita con el tiempo, con la reutilización de un saldo permanente y con
el tráfico de otras personas en el envoltorio. Hacerlo en un clic elimina las tres defensas.
La aplicación muestra el aviso en el paso de blindaje en lugar de esconder el compromiso.

Conviene ser franco sobre lo que te cuesta un saldo identificado, porque es más que la
cantidad del depósito. Los umbrales son públicos por diseño, ya que son lo que hace
comprobable el sorteo. Así que cualquiera que conozca tu saldo puede calcular si ganaste, en
cada nivel y en cada sorteo a partir de ese momento, sin descifrar nada. Por eso esto son dos
pasos y no uno.

## 5. Espera a un sorteo

Un periodo es de una hora en el pool de USDC y de seis horas en los otros seis, por el motivo
de gas que se explica en [pools y tokens](../concepts/pools-and-tokens.md). El sorteo de un
periodo solo se puede cerrar una vez terminado ese periodo, y todo lo relativo a él tiene que
acabar dentro de los dos periodos siguientes. El cierre en sí tiene un plazo más estrecho, la
mitad del segundo de esos periodos, para que el viaje de ida y vuelta del descifrado y la
adjudicación siempre tengan sitio. Así que un depósito que hagas ahora gana probabilidades
para el periodo actual, y el resultado de ese periodo llega dentro del par de horas
siguientes.

El panel muestra el periodo actual y el tiempo que queda en "El pool ahora mismo", y "Mis
sorteos", en la barra lateral, muestra el estado de los últimos. No tienes que hacer nada. Si
quieres empujarlo tú, cualquiera puede llamar a cada paso de un sorteo, y "Ejecutar un
sorteo", en la barra lateral, tiene los cinco; ver [la página del keeper](../operations/keeper.md).

Tus probabilidades de un periodo se basan en tu saldo medio a lo largo de todo ese periodo,
no en tu saldo al final. Depositar cinco minutos antes de que cierre un periodo de una hora
te compra una doceava parte de las probabilidades de haber tenido la misma cantidad todo el
periodo. Es deliberado; ver
[saldo ponderado por tiempo](../concepts/time-weighted-balance.md).

## 6. Revela lo que tienes y lo que ganaste

Pulsa el ojo junto a "Principal" en la tarjeta "Lo que tienes" del panel, y firma el mensaje
que te muestre tu cartera. Los valores sellados se muestran como asteriscos hasta que lo
haces, y el ojo es lo único que los abre.

Esa firma es un descifrado de usuario EIP-712: una firma tipada fuera de la cadena que
demuestra al relayer de Zama que controlas la dirección, a cambio del texto en claro de los
valores a los que el contrato te ha dado acceso. No es una transacción. No cuesta gas y no
escribe nada en la cadena.

Puedes revelar cuatro cosas sobre ti:

| Valor | Significado |
| --- | --- |
| Principal | Lo que has ahorrado. |
| Ganancias | Dinero de premios abonado a tu nombre y todavía no retirado. |
| Peso, por sorteo | Tu saldo ponderado por tiempo de ese periodo, el número que comparó la prueba del ganador. |
| Crédito, por sorteo | Lo que te pagó ese sorteo. Cero si no ganaste. |

Los dos primeros se abren juntos desde el único ojo de "Lo que tienes", en el panel. Los dos
últimos se abren juntos desde el ojo que hay junto a "Tu premio", bajo "Tu resultado", en la
tarjeta de ese sorteo dentro de "Mis sorteos". Tu saldo y el resultado de un sorteo pueden
estar abiertos a la vez, la firma del primero sirve para el segundo, y pulsar un ojo abierto
sella solo la tarjeta en la que está.

Los dos últimos son los que te permiten comprobar el sorteo tú mismo: coge tu peso, coge la
semilla pública y la franja pública, recalcula tus umbrales y confirma que el crédito
cuadra. La bóveda expone la aritmética del umbral como función de solo lectura,
`thresholdOf`, para que puedas comparar tus cuentas con las del contrato. Ver
[aleatoriedad y verificación](../security/randomness-and-verification.md).

Nadie más puede leer ninguna de esas cuatro cosas. El relayer rechaza una petición de
descifrado de una dirección a la que el contrato no ha dado acceso, y ese rechazo es la
garantía, no una política.

## 7. Cobrar

No hay transacción de cobro, solo un botón de cobro.

Tu premio ya está en tu saldo de ganancias en el momento en que el recorrido llega hasta ti.
El paso 6 es cómo te enteras. Una vez abierto el resultado de ese sorteo, su tarjeta en "Mis
sorteos" muestra un botón de cobro con la cantidad, del tipo "Cobrar 1,00 USDC"; pulsarlo
envía un retiro corriente por exactamente esa cantidad, y el paso 8 se lleva el resto a casa.
En la cadena, un cobro y un retiro son la misma llamada con la misma forma, y eso es lo que
evita que un ganador destaque.

Tampoco hay nada que pulsar para que te abonen. La evaluación recorre la lista de ahorradores
desde un punto que decide la semilla de ese sorteo. El botón "Avanzar el sorteo" en la
tarjeta de ese sorteo, y "Avanzar" en la pantalla "Ejecutar un sorteo", mueven los dos ese
recorrido compartido hacia adelante, en lugar de señalarte dentro de él. Un ahorrador que
pulse cualquiera de los dos no le está diciendo a nadie que ganó.

## 8. Retirar

```
vault.withdraw(encryptedAmount, inputProof)      // or vault.withdrawAll()
```

En la aplicación esos son los botones "Retirar" y "Retirar todo" de la pantalla de Retiro, en
su pestaña "Fuera de la bóveda". "Todo" junto al campo no es una tercera llamada: rellena el
campo con todo lo que tienes, una vez que has abierto tu saldo.

Los retiros pagan primero de las ganancias y después del principal. La cantidad se limita a
la menor de dos cifras, lo que tienes y lo que tiene la bóveda, porque una transferencia
confidencial mueve la cantidad entera o nada, nunca una parte. Calcular eso antes de la
transferencia es lo que mantiene el libro exacto sin ninguna reparación posterior. Una
transferencia confidencial, un evento, una cantidad cifrada.

El principal nunca queda bloqueado. Puedes retirar en mitad de un sorteo, y el peso que el
sorteo ya te fijó no cambia.

## 9. Desblindar: desenvolver de vuelta a USDC público

Dos llamadas, porque desenvolver es asíncrono por diseño. Primero `unwrap`, después
`finalizeUnwrap`. La aplicación envía las dos desde el botón "Desblindar" de la pestaña "De
vuelta a USDC normal" en la pantalla de Retiro. Si la segunda queda alguna vez sin hacer, una
tarjeta de aviso se queda encima de las dos pestañas hasta que pulsas "Terminar el
desblindaje". Las listas exactas de argumentos están en el envoltorio de Zama, no en el
nuestro.

La primera llamada quema la cantidad cifrada y la marca para descifrado público. La segunda
libera los tokens en claro una vez que el protocolo de Zama ha producido el texto en claro y
su prueba. La cantidad que desenvuelves es pública, igual que la que envolviste, y es la
primera llamada la que la publica, así que un desenvolver que nunca finalizas ya ha filtrado.

Eso da una segunda cosa que conviene saber. Si envuelves a la entrada y desenvuelves a la
salida por completo, la diferencia entre los dos totales públicos es una cota inferior de
todo lo que has ganado, y en cuanto te has vaciado es exacta. Desenvolver hacia una dirección
nueva no ayuda, porque la transferencia confidencial a esa dirección es en sí misma el
vínculo. Si te importa, desenvuelve en cifras redondas sin relación con tu posición, o deja
detrás un saldo confidencial permanente.

## Pruébalo en dos minutos

La aplicación es una consola con una barra a la izquierda, una tarea por pantalla, así que el
camino es un paseo por esa barra.

1. Abre https://hearth-ram.vercel.app, sigue "El pool" en la cabecera hasta `/app` y conecta una
   cartera en Sepolia. Aterrizas en el pool de USDC, en `/app/usdc`; el nombre del token en lo
   alto de la barra cambia de pool. El panel se abre con un bloque marcado "Siguiente" que
   nombra la única cosa que hay que hacer.
2. "Depositar" en la barra lateral, que se abre en el paso de sus tres en el que esté tu
   cartera. Pulsa "Consigue USDC de prueba", después "Blindar" y después "Depositar".
3. De vuelta en el panel, pulsa el ojo junto a "Principal" en "Lo que tienes" y firma: tu
   principal y tus ganancias aparecen los dos, solo en el navegador.
4. "Ejecutar un sorteo" en la barra lateral, la fila marcada "Cualquiera". Pulsa "Cerrar" y
   después "Adjudicar", para cerrar y adjudicar tú mismo el último periodo terminado, o mira
   cómo lo hace el keeper.
5. Pulsa "Avanzar" en esa misma pantalla. Después abre "Mis sorteos" y pulsa el ojo bajo "Tu
   resultado" en la tarjeta de ese sorteo: tu peso y tu crédito de ese sorteo aparecen, y el
   saldo del paso 3 sigue abierto con una sola firma.
6. Abre `/verify?pool=usdc`: la semilla y la franja públicas están ahí, "Umbrales de una
   dirección" recalcula tus umbrales delante de ti, y la comparación cuadra. Cambia el
   parámetro `pool` por cualquier otro slug para comprobar ese pool.
7. "Retirar" en la barra lateral, pestaña "Fuera de la bóveda", "Retirar todo". El principal y
   cualquier ganancia vuelven en una sola transferencia.

Nada de ese camino nos necesita en línea. Cada paso del sorteo es sin permisos.
