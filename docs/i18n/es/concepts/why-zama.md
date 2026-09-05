# Por qué esto necesita a Zama

La prueba que hay que aplicar a cualquier proyecto que dice necesitar una tecnología
concreta: borra esa tecnología y mira si el producto sobrevive. Si sigue funcionando, la
tecnología era decoración.

## Borra el cifrado y no hay producto

El cifrado totalmente homomórfico, que se suele abreviar como FHE, significa hacer aritmética
directamente sobre números cifrados, produciendo una respuesta cifrada, sin descifrar nunca las
entradas. El Protocolo de Zama lo trae a Ethereum: un contrato en Solidity puede sumar,
comparar y elegir entre valores que no puede leer.

Quítaselo a Hearth y esto es lo que queda.

| Pieza de Hearth | Sin FHE |
| --- | --- |
| Tu saldo | Un número público. Cualquiera puede poner precio a tus ahorros y a tus probabilidades. |
| La prueba del ganador | Una comparación pública. El resultado lo ve todo el mundo en el instante en que se ejecuta. |
| Quién ganó un sorteo | Público, porque el crédito que aterriza en el saldo de alguien es un número visible. |
| La semilla aleatoria | O bien un número público que alguien puede ver venir, o bien un número fuera de la cadena que alguien puede elegir. |
| Los créditos de premio | Transferencias públicas a ganadores identificados. |

Lo que te queda es PoolTogether. PoolTogether ya existe, funciona y lleva años en marcha. No
hay ningún motivo para reconstruirlo.

El producto que Hearth vende de verdad es aquello que PoolTogether no puede ofrecer: un ahorro
con premios donde tu saldo, tus probabilidades y tus victorias son solo tuyos, mientras el
sorteo sigue siendo comprobable por desconocidos. Esas dos propiedades están en tensión en una
cadena transparente. El cómputo cifrado es lo único que las resuelve, y el Protocolo de Zama es
el único sitio de Ethereum que lo hace hoy.

No hay versión parcial. Cada una de las cinco filas de arriba es una promesa central. Quita el
cifrado de cualquiera de ellas y el producto falla en esa fila.

## Las piezas exactas que usamos

No "construido sobre Zama". Aquí está la lista, con lo que hace cada una para nosotros.

### Enteros cifrados

`euint64` para el dinero y los pesos, `euint128` para el acumulador del total del pool, `ebool`
para el resultado de una comparación. El principal, las ganancias, el peso y el crédito de cada
ahorrador son uno de estos, y también lo es el arrastre de cada nivel. La aritmética que
hacemos sobre ellos es `FHE.add`, `FHE.sub`, `FHE.mul` por un número público, `FHE.min`,
`FHE.gt`, `FHE.le`, `FHE.and` y `FHE.select`.

La comparación hace aquí más trabajo que la prueba del ganador por sí sola. Cinco comparaciones
cifradas por sorteo sitúan el peso total del pool frente a las potencias de dos alrededor de su
última franja conocida, y lo único que sale del mundo cifrado es el pequeño recuento de a
cuántas de las cinco superó. Así es como el sorteo consigue una escala pública contra la que
correr sin que el total llegue nunca a ser un número.

`FHE.select` merece una nota, porque es lo que hace posible todo el diseño. Es una sentencia
condicional cuya condición está cifrada: devuelve uno de dos valores cifrados y la cadena no
puede saber cuál. Así es como un ganador y un perdedor producen transacciones idénticas. En
Hearth nada se bifurca sobre un secreto en ninguna parte.

`FHE.fromExternal` toma un valor cifrado que un usuario construyó en su navegador, con su
prueba, y lo convierte en un valor que el contrato puede usar. Así es como una cantidad
depositada llega cifrada de punta a punta.

### ERC-7984, el estándar de token confidencial

El activo de cada pool es uno de los tokens confidenciales de Zama, un envoltorio ERC-7984
alrededor de un ERC-20 corriente: cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP o cXAUt. Los saldos
en ellos son valores cifrados y no números públicos.

Los depósitos llegan por `confidentialTransferAndCall`, que transfiere una cantidad cifrada y
llama al gancho del receptor en la misma transacción. Al gancho de la bóveda se le entrega la
cantidad que el token movió de verdad, que es como la bóveda abona la realidad y no una
petición. Los pagos van en el otro sentido por `confidentialTransfer`.

Usar el token estándar, en lugar de escribir el nuestro, importa. Varios proyectos de este
campo se fabricaron a mano un token "al estilo ERC-7984". Todos los nuestros son tokens que
desplegó Zama, así que el saldo confidencial de un ahorrador se puede usar fuera de Hearth y el
comportamiento del token no es algo que podamos definir a nuestro favor. También significa que
Hearth puede abrir un pool sobre un token confidencial nuevo el mismo día que Zama lo publica,
que es como se añadieron seis de los siete, y que puede no abrir ninguno sobre un token cuyo
mint se guarda el emisor.

### Aleatoriedad cifrada

`FHE.randEuint64()` genera un número aleatorio dentro del coprocesador de Zama, bajo la clave
FHE de la red, a partir de una semilla que es pública pero inútil sin esa clave. El número sale
como texto cifrado. Nadie, ni nosotros ni quien envíe la transacción, lo ve en el momento en
que se crea.

Tiene que generarse dentro de una transacción, porque muta el estado del generador en la
cadena. Eso descarta el truco de previsualizar un sorteo fuera de la cadena con `eth_call` para
ver si ganarías, y es por lo que cerrar un sorteo es una transacción real que funciona
exactamente una vez. Nadie puede volver a tirar una semilla que no le gusta.

### La lista de control de acceso

La ACL en cadena de Zama decide quién puede descifrar qué texto cifrado. Es una garantía, no
una política: el relayer rechaza una petición sobre un handle en el que quien llama no tiene
permiso.

Hearth usa cuatro llamadas sobre ella. `FHE.allowThis` mantiene un valor utilizable por el
contrato en transacciones posteriores. `FHE.allow` concede a un ahorrador acceso de lectura
permanente a su propio principal, sus ganancias, su peso por sorteo y su crédito por sorteo.
`FHE.allowTransient` concede acceso durante lo que dura una transacción, que es como la bóveda
entrega al pool una autorización de una sola vez sobre el total de un lote de evaluación sin
darle nunca acceso permanente. `FHE.makePubliclyDecryptable` abre un valor a todo el mundo, y
la usamos sobre exactamente seis tipos de valor: la semilla, el recuento de escala que da la
franja, la bandera de no vacío, la cosecha, el arrastre de un nivel cuando a ese nivel le toca
conciliarse, y el contador de no financiado. El peso total exacto del pool queda deliberadamente
fuera de esa lista.

Esa última llamada es de un solo sentido y permanente. Es lo más trascendente que puede hacer
un contrato en este protocolo, así que cada uso de ella en Hearth está listado en
[qué permanece privado](../security/what-stays-private.md).

### Descifrado de usuario EIP-712

Así es como un ahorrador lee sus propios números. Firma un mensaje estructurado y tipado, que
es un estándar de firma que le muestra al firmante exactamente qué está aprobando, y el relayer
de Zama devuelve el texto en claro de los valores sobre los que ese ahorrador tiene permiso.

Es una petición fuera de la cadena. Sin transacción, sin gas, sin rastro. Por eso Hearth puede
no tener ninguna función de cobro: enterarte de que ganaste no cuesta nada y no deja nada
detrás. La otra mitad de esa promesa es que la evaluación tampoco se puede apuntar hacia uno
mismo, así que no hay ninguna transacción de ningún tipo que solo enviaría un ganador.

Tanto el saldo como las ganancias los puede descifrar su dueño. Hearth concede además el peso
por sorteo y el crédito por sorteo, para que un ahorrador pueda verificar la aritmética del
sorteo contra sus propias entradas en lugar de que se le pida confiar en ella.

### Descifrado público firmado por el KMS

La otra dirección. Un contrato marca un valor como públicamente descifrable, cualquiera pide al
relayer el texto en claro, y el relayer lo devuelve con una firma del servicio de gestión de
claves, el grupo que custodia la clave de descifrado de la red. El contrato verifica después esa
firma en la cadena con `FHE.checkSignatures` antes de actuar sobre el número.

Esto es lo que convierte "decimos que la semilla era 12345" en un número que el propio contrato
se niega a aceptar sin prueba. Hearth lo usa una vez por sorteo para la semilla, el recuento de
escala, la bandera de no vacío y la cosecha juntos en el momento de la adjudicación, y otra vez
para el arrastre de un nivel siempre que a ese nivel le toque conciliarse, que en Sepolia es
cada nivel en cada sorteo. Cada prueba está ligada a sus handles en un orden fijo, así que nada
se puede barajar ni reutilizar en otro sorteo o en otro nivel.

## En qué confía realmente un ahorrador

Nombrar esto es el sentido de la página.

- **En el Protocolo de Zama**, para calcular correctamente sobre textos cifrados y para
  descifrar solo lo que está marcado como descifrable. Cada descifrado sobre el que actúan los
  contratos lleva una prueba verificada en la cadena. Este es el mismo límite de confianza que
  documenta la propia Confidential Vault de Zama.
- **En los envoltorios de token confidencial**, que son contratos de Zama y no nuestros, y que
  su propietario puede actualizar. Ver la sección de la capa del token en
  [qué permanece privado](../security/what-stays-private.md).
- **En los contratos propios de Hearth**, que son inmutables una vez desplegados, sin proxy y
  sin vía de actualización. Los poderes que le quedan al propietario son estrechos y están
  listados en el [modelo de amenazas](../security/threat-model.md): una pausa que detiene los
  depósitos y el cierre de sorteos pero nunca los retiros ni la evaluación, un ajustador de la
  fuente de rendimiento, una vía de rescate para tokens ajenos que no puede tocar los saldos de
  los ahorradores, y una transferencia de propiedad en dos pasos con la renuncia desactivada.

Nada de esa lista es una persona en la que te pidamos creer.
