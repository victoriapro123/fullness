# Diagnóstico: productos de orden no guardados

02/11/2026, petición de Carlos: reporte de cliente «No pudimos guardar los productos de la orden». Diagnóstico inicial anterior a la autorización de corregir/publicar registrada más abajo. No se reintentaron compras ni cobros.

Se consultaron guía Cerebro, contrato central transitorio, instrucciones locales, integración Comercio, cierre de planes/carta y guía Supabase. Cerebro central sigue sin cliente/API operativos; registro local pendiente de importación. Memoria sólo como recordatorio de separar QA aislada de aceptación productiva; hechos de este incidente verificados directamente.

`server/mercadopago-checkout.mjs` inserta orden y después `order_items`; si falla el segundo paso cancela la orden y devuelve el mensaje reportado, antes de outbox/Core y preferencia MP. Antes del hotfix, `buildProductSnapshot` incluía siempre `customPlan: product.custom_plan || null`. Para familiares esto es null JSON explícito.

El trigger `capture_custom_plan` de la migración vigente `20261031154839_custom_plan_six_twentyfour_max_two.sql` comprueba `g is null` (SQL NULL), pero null JSON no satisface esa condición y cae en «Identidad de plan incompleta» (P0001). Reproducción aislada PGlite con el cuerpo EXACTO de esa función, tablas sintéticas y familiar con modalidad habilitada: snapshot `{customPlan:null}` falla P0001; snapshot `{}` se guarda. Sin modificar función/migraciones/código de producto. Es un defecto comprobado del contrato snapshot/trigger que explica el síntoma de una compra familiar; no se recuperó el payload del cliente para identificar el producto exacto.

Lectura REST privada de los ocho pedidos más recientes (sin datos personales en salida): dos intentos del 02/11 a las 14:37:20 y 14:37:35 UTC (11:37 Chile), cancelados, pago pending, cero ítems y sin corePlanCheckout. Para ambos, consultas acotadas de payments y core360_commerce_outbox devolvieron cero filas. No se crearon pedidos, preferencias, pagos ni stock como prueba. Los demás pedidos no se alteraron.

Logs Vercel recientes no dieron causa de checkout: el handler no registra el error interno y sólo devuelve su mensaje genérico; consulta 3h por preferences sin resultados. Una consulta 1d fue rechazada por retención; no equivale a ausencia de logs. No se amplió retención ni permisos.

Corrección elegida tras la autorización: omitir customPlan en snapshots de productos sin plan, conservando el veto a mealpreps individuales y todas las reglas de planes. No se modifica SQL. Añadir regresiones de familiares con snapshot REAL serializado (los tests actuales prueban `{}` y no el snapshot producido). Publicación por Main según circuito vigente, sin repetir pedidos cancelados ni cobros reales.

## Corrección autorizada y validada

Carlos respondió «si» a corregir/publicar. Main verificó turno01a19d7c-c201-79c0-a687-ff849ffbd9e3/mensaje01a19d7c-c4ca-78a3-907e-a7f54db4b359. Cambio mínimo de una línea: incluir customPlan sólo si existe product.custom_plan; planes conservan su snapshot íntegro. No migración/config/Core ni normalización SQL necesaria. Root preserva WIP de servidor compartido; Main integra sólo hunk y pruebas sobre producción limpia.

PASS scripts/test-family-checkout-snapshot.mjs: createCheckoutPreference real, snapshot serializado, tres triggers exactos de migración vigente, PGlite sintético/fetch bloqueado; viejo null reproduce P0001 y familiar corregido guarda y llega a preferencia MP simulada. PASS test-plan-checkout-flow con aserción explícita de igualdad customPlan y planStructure, test-checkout-catalog-identifiers y node --check del servidor. Sin pedidos/pagos reales. Publicación Main en curso; aún no nuevo SHA/Ready en esta anotación.
