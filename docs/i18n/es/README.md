# Documentación de Hearth

Hearth es un ahorro con premios y sin pérdidas, confidencial, sobre el Protocolo de Zama.
Depositas un token confidencial, tu saldo permanece cifrado en la cadena, el rendimiento que
gana el pool se reparte como premios en un sorteo periódico y tu principal se puede retirar
en cualquier momento. Nadie, nosotros incluidos, puede leer cuánto ahorraste ni cuánto
ganaste.

En Sepolia funcionan siete pools, uno por cada token confidencial que Zama publica allí,
cada uno con sus propios contratos y su propio keeper. La mayoría de las páginas de abajo
usan USDC en sus ejemplos, porque es el pool con más historial; todas ellas describen los
siete.

Estas páginas son el registro escrito completo de cómo funciona y de lo que no oculta.
`ARCHITECTURE.md`, en la raíz del repositorio, es la especificación de implementación; este
árbol es el mismo diseño explicado para quienes lo usan y para quienes lo auditan.

## Páginas

| Página | Qué cubre |
| --- | --- |
| [Qué es Hearth](getting-started/what-is-hearth.md) | El producto en una página: los cuatro movimientos de un ahorrador y qué oculta exactamente cada uno. |
| [Pruébalo en Sepolia](getting-started/try-it-on-sepolia.md) | Elegir uno de los siete tokens, su faucet, blindar, depositar, un sorteo, revelar, cobrar, retirar y desblindar. |
| [Pools y tokens](concepts/pools-and-tokens.md) | Los siete pools y sus direcciones, por qué seis sortean cada seis horas, las posiciones iniciales por token, el token que Hearth rechaza y las rutas de cada pool. |
| [Cómo funciona un sorteo](concepts/how-a-draw-works.md) | Los periodos, la ventana de dos periodos y el plazo de cierre, los cinco pasos de un sorteo y qué publica la bóveda en lugar del total del pool. |
| [Saldo ponderado por tiempo](concepts/time-weighted-balance.md) | Por qué las probabilidades usan tu saldo medio del periodo, cuánto vale un depósito tardío y por qué bastan tres observaciones guardadas. |
| [Selección del ganador](concepts/winner-selection.md) | La prueba del ganador, la regla por premio de PoolTogether, los umbrales anidados frente a la franja publicada y un ejemplo con tres ahorradores. |
| [Premios y niveles](concepts/prizes-and-tiers.md) | Cómo el rendimiento se convierte en liquidez de premios, el arrastre cifrado y la cadencia de conciliación, los tres niveles en Sepolia, la sobresuscripción y en qué nos apartamos de PoolTogether V5. |
| [Fuente de rendimiento](concepts/yield-source.md) | La fuente patrocinada en Sepolia, por qué la cosecha se verifica en lugar de declararse, y cómo encaja la Confidential Vault de Zama en mainnet. |
| [Por qué Zama](concepts/why-zama.md) | La prueba del borrado: quita el cifrado totalmente homomórfico y no queda producto. Cada pieza de Zama que usamos, con nombre y apellido. |
| [Qué permanece privado](security/what-stays-private.md) | Siete reglas: la franja y la fuga que sustituyó, lo que cuesta un saldo identificado, la costura del envoltorio en ambos sentidos, qué miden los recuentos de premios, la capa del token, por qué la evaluación no delata y el residuo de comportamiento. |
| [Modelo de amenazas](security/threat-model.md) | Nueve atacantes, qué busca cada uno, qué los detiene y qué no. Más los fallos ejecutados de nuestro diseño anterior. |
| [Aleatoriedad y verificación](security/randomness-and-verification.md) | De dónde sale la semilla, por qué nadie puede volver a tirarla ni cambiar el tamaño de lo que gana, y cómo cualquiera recalcula un umbral a posteriori. |
| [Análisis estático](security/static-analysis.md) | Las ejecuciones de slither y solhint, la razón única detrás de cada una de las cinco familias de hallazgos, y la auditoría de dependencias con los dos hallazgos de axios que todavía reporta. |
| [El keeper](operations/keeper.md) | El trabajo del keeper paso a paso, la regla de orden, un proceso por pool, dónde están alojados los siete que están en marcha, qué pasa cuando se cae y el presupuesto de gas. |
| [Despliegue](operations/deploying.md) | Desplegar un pool por token, firmas y parámetros del constructor, verificación, y los dos juegos de parámetros de Sepolia frente a uno de mainnet. |
| [Limitaciones](limitations.md) | Todas las limitaciones documentadas en una sola lista numerada de catorce. |
| [Preguntas frecuentes](faq.md) | Doce respuestas cortas, empezando por en cuál de los siete tokens puedes ahorrar, e incluyendo adónde fue a parar el botón de cobro. |
