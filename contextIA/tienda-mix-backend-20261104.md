# Tienda libre y Fullness Rewards — backend local, 04/11/2026

Alcance autorizado por Carlos: integrar la maqueta aprobada de /tienda con el backend real, preservando biblioteca, historial y pagos pendientes. Corrección posterior: la semana se completa acumulando seis mealpreps entre uno o varios pedidos; no se exige una sola compra de seis. Cuenta mínima nombre/correo/teléfono; identidad de Rewards obtenida en servidor con JWT Supabase y correo confirmado, nunca por el correo escrito en el despacho. Guest conserva compra normal y beneficio por volumen.

## Contrato

- Nuevo carrito: `{kind:'mealprep',libraryMealId,quantity}` desde una unidad, sin tamaño de caja ni límite de duplicación. Las cantidades son enteras y están acotadas por seguridad a1000porproducto. Familiares conservan slug comercial real y su validación existente; no se cuentan para Rewards.
- La biblioteca original activa, ofrecida y con precio es la fuente. El modelo nuevo no requiere una carta activa; los planes históricos sí conservan carta/revisión y validación previas. `readSaleOffers` añade `saleCategory` sin inferir o sobrescribir datos editoriales.
- El servidor resuelve cada precio/identidad y el SQL vuelve a comprobarlos bajo bloqueo. Se conserva precio bruto y cantidad en cada línea; descuento separado en la orden. No hay movimientos ni reservas numéricas de stock nuevos.
- Quote y creación reciben el Bearer de la sesión. `auth.getUser(token)` verifica usuario/correo; un token inválido falla, no se acepta `userId` enviado por cliente. Los RPC privados son sólo `service_role`, SECURITY INVOKER; no se amplían políticas RLS ni se crean tablas públicas.
- Quote/result/resume devuelven `amount,subtotal,discount,rewards,deliveryFee,currency`. `rewards` incluye `rate,discount,kind,completedWeeks,currentWeekUnits,weeklyEligible,message`. Las compras anteriores conservan modelo/tarifa cuando se reintenta exactamente su checkoutKey.
-10% desde24individuales sobre subtotal de individuales;35% en el pedido que completa el total6de la cuarta semana válida del mes. Primeras tres semanas: cada una suma al menos6unidades pagadas/noanuladas. Se agrupa por semana lunes–domingo, fecha de pago en America/Santiago, dentro del mes calendario. El canje35está reservado por usuario y mes al preparar la compra, con advisory lock transaccional. Se aplica el mayor descuento sin acumular. No se modifican pedidos previos ni se cobran devoluciones retroactivas.
- Si hay un canje pendiente, no se adjudica otro. Su vencimiento requiere la reconciliación existente de preferencia y búsqueda de pagos; no basta un reloj ni un clic para liberar el beneficio. Replay conserva orden y preferencia; una respuesta perdida se recupera sin repetir el POSTde pago.
- Mercado Pago recibe líneas con precios netos CLPenteros distribuyendo el descuento elegible sin tocar familiares. Una cantidad se puede separar en dos precios unitarios para conservar el total exacto si el redondeo lo requiere. Se verifica identidad/precio/cantidad/total de la preferencia contra la orden.
- Retiro0; despacho se cotiza/cobra por separado después de aprobación. Sólo productos se pagan online en el nuevo modelo. Correos nuevos usan confirmaciones específicas y CTA«Arma tu mix»; correos/pagos históricos mantienen su texto/tarifa.

## SQL y validación

Migración aditiva creada por CLI: `20261104172613_fullness_mix_rewards.sql`. Conserva la función previa de preparación para carritos históricos y amplía el trigger existente sólo para snapshots `mix_v1` comprobados contra la biblioteca. Añade categoría nullable en biblioteca, columnas de elegibilidad e índice parcial por usuario/fecha de pago. Sin valores nuevos, inversión de fotos, cambio masivo de precio ni activaciones.

Pruebas locales PASS:

- `test-mix-commerce.mjs --pglite-module <PGlite instalado>`: una/seis/23/24/25unidades; familiar excluido; retiro y todas las comunas sin tarifa automática; SQL/autorización; redondeo entero MP; identidad no falsificable por correo; varias compras que suman6; anulaciones y cambio de mes; dos intentos concurrentes con un único canje; pago y replay; respuesta perdida y recuperación; stock/biblioteca intactos; plan legado después de la migración y reintento familiar antiguo con$3990de despacho.
- `test-library-plan-source.mjs`: regresión completa de biblioteca original, permisos owner y flujo legado de pago/settlement.
- `verify-order-email-flow.mjs`: sólo transporte simulado; confirma nuevos textos, descuento, tarifa legado, deduplicación y aislamiento TEST.

PGlite es PostgreSQL embebido local. La prueba de Rewards reemplaza únicamente la expresión de reloj de su función temporal para recorrer noviembre/diciembre2026; el SQL versionado usa siempre `now()`de la base. La simulación concurrente comprueba el segundo prepare tras reclamar el primer beneficio; el bloqueo PostgreSQL queda explícito en SQL. No se certifica carga/concurrencia de sesiones productivas con esta prueba.

Docs Supabase consultados: changelog.md (incluye CLIv3localpor defecto) y auth-getUser; sin actualización SDK. No se ejecutaron advisors sobre remoto: este lote no tiene autorización de SQL remoto/publicación. Quedan migración productiva y verificación del despliegue para el chat integrador cuando Carlos lo autorice. Ningún pago, correo, cambio Core360, push o commit ejecutado por esta subtarea. WIP ajeno preservado. Cerebro central no operativo; registro local transitorio.
