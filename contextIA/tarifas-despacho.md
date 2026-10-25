# Tarifas de despacho por comuna

Nota vigente posterior al cierre tarifario: Carlos corrigió el corte de planes del jueves a17:00 y separó despacho coordinado de sueltos/familiares. Ver `disponibilidad-semanal.md`; ese incremento es local y no cambia aún la publicación tarifaria acreditada abajo. No reinterpretar las referencias históricas a jueves23:59 como la instrucción nueva.

## Decisión de Carlos (2026-10-25)

- Lo Barnechea: $3.990 CLP. Las Condes y Vitacura: $5.990 CLP.
- Las demás comunas requieren coordinación por WhatsApp. No equivalen a envío gratis y no pueden generar preferencia de pago sin cotización.
- La comuna se identifica junto a la dirección, sin geocodificación inferida ni selector de fecha. Se conservan martes/viernes y cortes lunes 17:00/jueves 23:59. Carlos autorizó ahora publicar las tarifas y expresamente «Autorizar servicio en Core360 y cobro online».
- El cálculo actual añade una tarifa por pedido, no por plato ni cantidad. No se inventa un multiplicador de cuatro envíos para mensual; si se define cobro por cada entrega del mensual, se debe acordar antes de cambiar ese modelo.

## Implementación local

`src/lib/delivery-rates.js` comparte tarifas versionadas, normalización exacta de comunas (mayúsculas, espacios y tildes) y distinción entre retiro sin recargo, tarifa conocida y coordinación. No se deduce una comuna desde texto ambiguo de calle ni se integra geocodificación. El formulario conserva dirección y comuna en su persistencia existente y ofrece sugerencias nativas de las tres comunas.

El carrito separa subtotal, envío y total. Otras comunas muestran total por confirmar y enlace WhatsApp con comuna/pedido; el enlace requiere clic, no envía mensajes. Las FAQ reflejan la instrucción nueva. Se conserva el carrito y los datos al cambiar modalidad o recargar.

El servidor recalcula desde la comuna; ignora importes del navegador, persiste `orders.delivery_fee_clp`, `subtotal_clp`, `total_clp` y snapshot con versión/importe/comuna. Mercado Pago utiliza `shipments.cost` y `mode=not_specified`, sin inflar precios de productos. Backoffice y correos muestran el desglose. No requiere migración ni cambios a pedidos existentes.

## Integración Core360 autorizada

Se crearon mediante la UI canónica, sesión existente de Carlos y empresa Fullnesslab verificada (tenant `a4abbf5c-2591-5d41-beee-d3aee59dbfac`, company `f8d85871-8871-5103-91a7-b2489747ee21`), exactamente dos servicios: `FULL-DESPACHO-LB`, UUID `b7c4620f-e066-43ff-9807-10e94c8418fa`, bruto3990; `FULL-DESPACHO-LC-VIT`, UUID `ef8d4c67-4afb-4ee0-af4d-15f9c702e6d4`, bruto5990. Ambos son servicio, no inventariables, venta habilitada, compra deshabilitada, unidad canónica `UN`, CLP, base gross e IVA19% configurado en Core. Se confirmó guardado por UI y lectura API; ningún producto previo, stock, orden o documento fiscal se modificó.

`server/delivery-service.mjs` vincula explícitamente esos UUID, sin matching por nombre ni inventar un menú ficticio. El checkout vuelve a leer Core y exige identidad, tipo service, no inventariable, activo/vendible, UOM, versión, impuesto y precio bruto exactos. Guarda la evidencia congelada en `customer_snapshot.deliveryService`; el outbox añade una única línea de servicio al POST/orders, además de las líneas que forman el subtotal. Descuentos sin regla y servicios ausentes/incompatibles siguen bloqueados. No se modifica un outbox ya sellado ni se reescribe un pago.

La cotización previa `POST /api/commerce/checkout-quote` reutiliza la lectura/validación comercial y termina antes de cualquier INSERT, outbox, preferencia MP o correo. Sólo recibe slug/cantidad/modalidad/comuna; no requiere datos personales. La UI coteja el total cotizado antes de iniciar pago, y `expectedAmount` se vuelve a contrastar en el servidor para impedir cobrar un total cambiado entre cotización y preferencia. El retorno/webhook consulta ahora subtotal/descuento/envío junto al total canónico para construir el evento completo, sin omitir el cargo.

No hay migración ni credenciales/scopes nuevos. Los flags productivos READ/POLL/PREVIEW/SYNC/DELIVERY se verificaron en true mediante CLI autenticada sin cambiarlos. El conector Vercel negó acceso a metadata de entorno (403); se utilizó la CLI existente con equipo/proyecto explícitos, sin mostrar secretos. La credencial local de lectura Core no tiene orders.write y su preview devolvió 403 API_SCOPE_REQUIRED; no se amplió su alcance. La comprobación real de preview se hará mediante el endpoint read-only desplegado con la credencial productiva ya existente.

## Evidencia

- Pruebas simuladas aprobadas: `test-delivery-rates`, `test-core360-checkout-preflight`, `test-product-availability`, `test-mercadopago-test-checkout`, `verify-order-email-flow`. Cubren tarifas/totales exactos, intento de manipular importe, retiro, comuna desconocida, snapshot y rechazo Core sin efectos externos. El QA de correo valida el desglose sin enviar correos reales.
- El QA nuevo también concilia un pago emulado con el envío incluido y rechaza sin escrituras un pago que sólo cubre productos. La prueba adicional antigua `test-checkout-payment-side-effects` no pasó: su fixture declara `live_mode=false` para una orden LIVE y el guard del candidato TEST existente la rechaza con 409 antes de efectos secundarios. No se alteró ese fixture ajeno ni se presentó la suite completa como aprobada.
- Navegador local con catálogo público real: tres tarifas, WhatsApp con comuna, retiro, conservación de dirección/comuna tras recarga y resumen/carrito sin overflow a 320/390/768/1440 px. Ejemplo familiar $27.800 + $3.990 = $31.790. Captura de trabajo `output/playwright/shipping-mobile-qa.png` inspeccionada. Las imágenes `/api/media` sin credenciales del servidor local generan errores de medios conocidos; no se atribuyen a producción ni al cálculo.
- Build Vite con Node 24 aprobado; conserva advertencias de tamaño de bundle y recursos media resueltos en runtime.
- Pruebas nuevas `test-core360-delivery-service` y `test-delivery-rates`: 2 servicios vinculados, línea única por pedido, producto×2 más un envío, total de preview/outbox exacto, freeze íntegro, manipulación de precio/identidad/versión rechazada, cotización sin escrituras y total esperado desactualizado bloqueado antes de orden/pago. La copia limpia de main conserva fuera el candidato checkout TEST.
- Dos servicios reales creados por UI con autorización. Cero pedidos, preferencias, cobros, correos, SQL, movimientos de stock o cambios de flags. Publicación autorizada en este turno; ver recibo final al completar verificación.
- Fuente técnica consultada: documentación oficial MP `https://www.mercadopago.cl/developers/es/docs/checkout-pro-preferences/additional-settings/shipping-cost` y Supabase `https://supabase.com/docs/reference/javascript/insert`; changelog de Supabase revisado sin cambio aplicable al INSERT JSON existente.
- Cerebro: consulta/escritura remota sigue pendiente conforme al contrato central; este registro es ContextIA transitorio, no recibo online.
