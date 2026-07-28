# E-commerce Meal Prep

- La tienda e-commerce vive en su página propia: `/tienda`.
- El desarrollo local de este proyecto debe servirse siempre en `http://localhost:3101`.
- La tienda debe sentirse como un e-commerce editorial premium de meal preps, inspirado en un layout con hero grande, caja/meal kit protagonista, bloque de suscripción, planes semanales/mensuales, pasos de compra y packs familiares.
- El hero, la imagen principal de tienda y el cuadro de suscripción deben ser autogestionables desde backoffice.
- Los planes y packs familiares se gestionan como `menu_items`, con imágenes principal y hover en R2, precio, descripción, información nutricional, tags de beneficios y platos incluidos cuando corresponde.
- En el e-commerce hay dos niveles de detalle: click en el plan abre el lightbox del plan completo; click en un meal prep incluido abre el detalle del plato.
- El hover de plan, producto familiar o plato incluido debe mostrar la segunda foto cuando exista.
- El checkout debe pedir despacho con dirección/comuna o retiro en local.
- La migración `20260709001000_ecommerce_shop_settings.sql` quedó aplicada y la fila `main` de `ecommerce_shop_settings` responde desde Supabase.
- No usar un vector plano para el hero del e-commerce: se ve poco realista y no calza con la estética del sitio.
- Para el hero del e-commerce, usar fotografia de producto realista, con etiqueta circular `FULLNESS LAB` como la de los pouches de la seccion meal prep del landing, fondo transparente para vivir sobre el hero oscuro y sombra natural aplicada por CSS.
- El hero activo de Tienda es `src/assets/ecommerce/fullness-hero-box-dark-cutout-v2.png`, sincronizado en R2 como `images/ecommerce/fullness-hero-box-dark-cutout-v2.png` y configurado en `ecommerce_shop_settings`. Es una caja abierta y bolsas sobre transparencia real. No usar una fotografia con rectangulo crema/blanco de fondo ni añadir un panel detras de la caja.
- La tienda debe mantener persistencia tipografica con el landing usando `Avenir Next`; el tratamiento visual puede adaptarse al prototipo e-commerce, pero sin cambiar la familia tipografica del sitio.
- Direccion visual aprobada para la tienda: hero y suscripcion en negro premium, crema para planes/packs, CTAs burdeos, iconografia cobre/dorada, y una banda de comunidad oscura antes del footer. No cambiar la familia tipografica del sitio.
- En las cards de planes semanales/mensuales se debe mostrar una caja abierta Fullness con bolsitas adentro, no fotos de platos. Los platos quedan para el detalle de meal preps incluidos y para la seccion/packs familiares.
- Assets de plan card en R2: principal `images/ecommerce/fullness-plan-box-card-87fca2f2a7cf.png`; hover `images/ecommerce/fullness-plan-box-card-hover-70f16092b298.png`.
- Las caracteristicas incluidas dentro de las cards de planes deben mostrarse como iconos/beneficios concordantes con la marca, no como fotos de platos. Las fotos de platos se reservan para packs familiares y detalles de meal preps.
- Regla reforzada 2026-07-10: no dejar elementos funcionales montados/solapados en ningun breakpoint. En lightboxes y popups hay que validar tambien viewports cuadrados o de poca altura, como 600x600; si falta espacio, compactar la reticula o esconder elementos secundarios antes que montar iconos, textos o botones.

## Checkout Mercado Pago - 2026-07-20

- La tienda usa Checkout Pro con preferencia creada exclusivamente en backend, precios revalidados desde `menu_items`, orden e items persistidos en Supabase y redireccion al sandbox cuando `MERCADOPAGO_TEST_MODE=true`.
- El checkout queda prerrellenado para QA mediante `VITE_CHECKOUT_TEST_MODE=true`, permite despacho con direccion/comuna o retiro en local y conserva el carrito ante rechazo.
- Existen `/api/mercadopago/preferences`, `/api/mercadopago/payments` y `/api/mercadopago/webhook`. El retorno consulta el pago directamente a Mercado Pago y valida orden, monto y moneda antes de actualizar Supabase.
- La migracion `20260720001000_guest_checkout_orders.sql` fue aplicada al proyecto Supabase `allyjctrrtvibwchjouu`: admite ordenes invitadas y enlaza `order_items.product_id` con `menu_items`.
- Las credenciales sandbox viven solo en Vercel Preview. No cargar credenciales de prueba en Production.
- QA validado en desktop y mobile `390x844`: carrito, prellenado, despacho/retiro, acceso a Checkout Pro y retorno fallido. Capturas en `qa/mercadopago/`.
- La Preview verificada para esta integracion es `https://fullness-47dbal05a-prof3sionalcl-2961s-projects.vercel.app/tienda`; mantiene Vercel Authentication y las credenciales sandbox viven solo en el entorno Preview.
- Para completar una compra aprobada se debe ingresar primero con la cuenta de prueba `Comprador` asociada a la aplicacion. El sandbox puede rechazar un comprador invitado aunque use tarjetas oficiales.
- El token del vendedor de prueba no puede crear cuentas `Comprador` por API (`40311`); para generarla o consultar sus credenciales es necesario iniciar sesion con la cuenta productiva en Mercado Pago Developers.
- Antes de produccion: configurar `MERCADOPAGO_WEBHOOK_SECRET`, registrar el webhook HTTPS, cambiar a credenciales productivas, desactivar el prellenado QA y ejecutar una compra real de bajo monto.
- El correo pedido en QA se envia manualmente desde Outlook conectado; el sitio no promete correo transaccional automatico hasta incorporar un proveedor backend.

### Incidencia sandbox 2026-07-21

- El token sandbox debe pertenecer a la misma aplicacion que genera las preferencias. Al corregirlo, la creacion de preferencias en Vercel Preview funciono nuevamente; Production permanece sin credenciales de prueba.
- No declarar una compra sandbox como aprobada por el mero retorno visual. Debe existir el pago aprobado en Mercado Pago y su conciliacion en `orders` y `payments` antes de enviar cualquier correo de confirmacion.
- El navegador interno encontro `ERR_TOO_MANY_REDIRECTS` al pasar desde una sesion personal a `sandbox.mercadopago.cl`; el tokenizado API de tarjeta oficial de prueba devolvio `G001`. Esta es una dependencia externa pendiente con Mercado Pago, no una aprobacion de compra ni un error que deba ocultarse con estados simulados.

### Manual de compra 2026-07-21

- El recorrido visual de usuario queda documentado en `qa/manual-compra/`: entrada, pop-up, formulario, agradecimiento, selección de plan y carrito con retiro/despacho.
- La inscripción del pop-up confirma en UI y persiste en el navegador; no tiene proveedor de email transaccional ni tabla remota asociada. No describirla como suscripción con correo automático hasta implementar ambos elementos.
- El manual debe mantener separada la evidencia del Checkout Pro (capturas ya disponibles) de una compra aprobada. Sólo añadir retorno aprobado, email de compra y conciliación de `orders`/`payments` después de completar los dos hitos externos pendientes.

### Correo transaccional 2026-07-21

- Resend es el proveedor elegido para los correos de Fullness Lab. El dominio `fullnesslab.com` se agregó en la región São Paulo, se configuraron en Squarespace los registros DKIM, MX de retorno, SPF de subdominio `send` y DMARC, y Resend lo marcó como verificado. Google Workspace y Vercel se mantienen sin cambios.
- En Vercel, `RESEND_API_KEY`, `EMAIL_FROM=Fullness Lab <hola@fullnesslab.com>` y `EMAIL_REPLY_TO=hola@fullnesslab.com` están configurados como secretos de Production y Preview. La clave tiene sólo permiso de envío y queda restringida a `fullnesslab.com`; nunca copiarla a la repo, React ni documentación.
- La versión `3f0e1a1` (`feat: add transactional email delivery`) fue desplegada manualmente a Production desde Vercel porque la integración Git no había creado el despliegue automático. El endpoint público `/api/subscriptions` responde y valida entradas en producción.
- La migración `20260721001000_transactional_email.sql` ya fue aplicada mediante la API de gestión de Supabase y verificada por la existencia de `email_subscribers` y `email_deliveries`. No reutilizar una pestaña de SQL que tenga una consulta ajena seleccionada.
- Supabase Auth usa SMTP personalizado de Resend: `smtp.resend.com`, puerto `465`, usuario `resend`, remitente `hola@fullnesslab.com` y nombre `Fullness Lab`. El panel enviaba erróneamente el puerto como número; la API de gestión lo aceptó como texto (`"465"`) y se verificó por lectura posterior de la configuración.
- Se creó una clave de envío dedicada para el SMTP de Supabase y los tokens temporales de Supabase usados para configuración y migración se revocaron al terminar. Las claves no se registran en código ni documentación.
- La prueba de alta real en producción para `carlos@prof3sional.com` devolvió `201` desde `/api/subscriptions`; Resend registró el asunto `Bienvenida a Fullness Lab` con estado `delivered`.
- Para revisión de diseño se enviaron a `carlos@prof3sional.com` 15 muestras con estado `delivered`: bienvenida, confirmación de pedido y las 13 plantillas de Supabase Auth. Las muestras están rotuladas como tales y sus URLs/códigos son de demostración; no corresponden a operaciones reales ni deben reutilizarse como mecanismo de prueba funcional de Auth.
- Incidente a recordar: el editor SQL de Supabase cambió a una consulta previa sin título durante el primer intento y ejecutó una modificación existente sobre `orders`. Se dejó de usar ese editor, se aplicó la migración correcta mediante API y no se revirtió la consulta ajena. Revisar el esquema de `orders.client_id` y su clave foránea antes de asumir su estado en trabajo futuro.
- La suscripción del lightbox queda persistida y dispara bienvenida; una orden sólo dispara su confirmación cuando Mercado Pago devuelve estado `approved`. Los reintentos de retorno/webhook reutilizan la misma clave de entrega para no duplicar correos.

### QA backoffice 2026-07-21

- Se validó desde UI con una cuenta administrativa temporal: acceso al Backoffice, carga del catálogo, edición del formulario, cambio de tipo a `Familiar`, guardado de Tienda y toggle/guardado/reversión de Lightbox. La cuenta temporal se eliminó al terminar.
- La subida se comprobó contra el endpoint real autenticado que consume la UI (`/api/upload-media`): cuatro imágenes de prueba llegaron a R2 y sus URLs se ingresaron en el formulario. Los cuatro objetos se eliminaron al finalizar. El selector nativo de archivos no se pudo accionar desde la automatización del navegador, por lo que aún requiere un smoke test manual en una sesión administrativa normal.
- Hallazgo bloqueante: al cargar/guardar `menu_items`, Supabase responde que no encuentra `nutrition_detail` en su schema cache. El catálogo muestra tres ítems de ejemplo y el plan QA no persistió, por lo que crear/editar/eliminar meal preps no puede aprobarse hasta aplicar `20260609001000_menu_item_product_detail.sql` al proyecto correcto o recargar el esquema PostgREST después de confirmar que ya está aplicada.
- Comunidad permite ingresar una actividad en el estado de UI, pero no persistió de forma durable durante el QA (volvió a las cinco actividades iniciales). Revisar si esa sección debe persistir remotamente antes de considerarla un backoffice operativo.

### Revalidación backoffice 2026-07-21

- Después de aplicar la migración/corrección del esquema, `menu_items` dejó de devolver el error de `nutrition_detail`. Se aprobó por UI el flujo crear, refrescar catálogo, editar y eliminar un producto familiar; el registro temporal apareció como cuarto producto, se actualizó y se retiró nuevamente desde el panel.
- El precio CLP del Backoffice ahora permite cualquier peso entero (`step="1"`); no debe exigir múltiplos de $100. Se verificó que `$12.345` persiste y se presenta como tal.
- Un producto que conserva una imagen placeholder heredada puede tomar contenido visual de muestra, pero nunca puede reemplazar sus datos comerciales. El precio mostrado y usado en carrito/checkout debe ser siempre `menu_items.price_clp` gestionado desde Backoffice.
- Incidente 2026-07-27: las cards `Plan semanal antinflamatorio` y `Plan mensual Fullness` eran fallback visual cuando no existían planes en `menu_items`; por eso no aparecían en Backoffice y sus precios no podían editarse. Se crearon como registros reales activos, con sus imágenes de caja e ítems incluidos, conservando los tres productos familiares existentes. No volver a mostrar un catálogo de demostración como si fuera contenido administrable.
- El formulario de Meal preps protege cada cambio en dos capas: `localStorage` inmediato y copia por administradora en `backoffice_drafts` de Supabase. Cambiar de producto o crear uno nuevo nunca puede descartar el trabajo actual: conserva un borrador adicional recuperable. Sólo el icono de eliminar borrador, con confirmación explícita, puede retirarlo; un guardado exitoso elimina sólo el borrador que se publicó. La migración `20260727001000_backoffice_drafts.sql` debe aplicarse antes de aprobar sincronización entre dispositivos.
- El video de Cecilia permitió identificar datos incompletos del intento `meal prep semanal`, pero por indicación posterior no se debe volver a precargar ni restaurar ese borrador. Los borradores existentes se muestran sólo en el selector; abrir el Backoffice debe iniciar con un formulario limpio para que la administradora pueda crear un meal prep nuevo de inmediato.
- Antes de un despliegue que toque catálogo, ejecutar `npm run qa:catalog`. Valida que cada producto activo sea una fila real de `menu_items` con precio, descripción, foto principal, segunda foto, y que existan planes semanales y mensuales con meal preps incluidos. Un producto incompleto debe quedar inactivo hasta ser completado desde Backoffice, nunca sustituirse visualmente por una demo.
- Las imágenes se volvieron a verificar contra R2 usando el endpoint autenticado de la UI. Las URLs principal y hover se guardaron en el producto de QA y los cinco objetos generados durante la prueba se eliminaron; la cuenta administrativa temporal también fue eliminada.

### Backoffice: suscripciones y biblioteca 2026-07-21

- El Backoffice debe tener una vista de clientes con suscripción operativa, filtrable por estado (`Activa`, `Pausada`, `Cancelada`) y frecuencia (`Semanal`, `Mensual`), sin mezclar esos clientes con personas inscritas solamente al lightbox/newsletter.
- Los platos reutilizables viven en una biblioteca propia. Al cargarlos dentro de un plan se copian sus datos de ficha, fotos, tags, ingredientes, información nutricional y alérgenos, y se guarda la referencia de biblioteca en el JSON del plan; así un mismo plato puede incorporarse a varios meal preps sin volver a escribirlo.
- Corrección 2026-07-27: un plato creado dentro de un plan se puede guardar directamente en la Biblioteca con su propia acción, aun cuando el plan comercial esté incompleto. Queda enlazado a esa biblioteca y se puede reutilizar; esto no publica el plan.
- Si un plan no se puede publicar, el backoffice debe indicar los campos que faltan (nombre, slug válido, precio o descripción) y conservarlo como borrador.
- Corrección 2026-07-27: la información nutricional pertenece exclusivamente a cada plato reutilizable o incluido, no al meal prep o plan principal (`menu_items`). Se captura y presenta en la ficha del plato, y el formulario del meal prep principal no contiene campos nutricionales. Los campos históricos de `menu_items` se preservan fuera del flujo para evitar una nueva pérdida de datos.
- La migración histórica `20260727003000_remove_dish_nutrition.sql` se aplicó antes de esta corrección y no debe ejecutarse nuevamente. Los seis platos activos de los planes semanal y mensual se recuperaron desde la versión de catálogo anterior, que coincidía por ID, nombre, descripción, tags e ingredientes; se restauraron sólo su descripción, beneficios y tabla nutricional.
- La migración requerida es `20260721002000_backoffice_subscriptions_and_meal_library.sql`. Crea `meal_library_items` y `customer_subscriptions` con RLS sólo para administradores.
- QA posterior a aplicar la migración: creación de plato de biblioteca, carga en un plan y persistencia del plan aprobadas por UI. Se creó una suscripción semanal y una mensual de QA; la vista las cargó y el filtro semanal dejó visible sólo la semanal. Todas las filas y la cuenta administrativa temporal se eliminaron al terminar. El cuadro nativo de confirmación impidió automatizar el último click de borrado del plan, por lo que se limpió directamente por Supabase; el botón sí abrió el diálogo de confirmación.

### Mercado Pago producción 2026-07-21

- La aplicación oficial `Fullness Lab - Tienda` usa Checkout Pro y credenciales productivas. Sus secretos se guardan exclusivamente en Vercel Production; no registrarlos ni exponerlos en cliente, repo, documentación o Preview.
- Production tiene `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `VITE_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_TEST_MODE=false`, `VITE_CHECKOUT_TEST_MODE=false` y `CHECKOUT_SITE_URL=https://www.fullnesslab.com`. Preview conserva sus credenciales sandbox y flags de QA.
- El dominio canónico productivo es `https://www.fullnesslab.com`; `fullnesslab.com` redirige con 308. El webhook de Mercado Pago se registró en `https://www.fullnesslab.com/api/mercadopago/webhook` para el evento `Pagos (legacy)` (`payment`).
- La configuración de webhook generó una firma secreta, se cargó en Production y se reimplementó el deployment productivo `7bq4ooNkuzudAakK2Gg6pT56rbMU`. La prueba sin firma devolvió `401`, verificando que el runtime reconoce el secreto sin crear orden, pago ni cobro.
- Antes de declarar la pasarela plenamente validada de cara al negocio, realizar una compra real controlada de bajo monto y confirmar la conciliación, el webhook y el correo de confirmación. No ejecutar esa compra automáticamente.

### Acceso Backoffice 2026-07-22

- La cuenta de prueba `cecilia.prueba@fullnesslab.com` tiene `profiles.is_admin=true`. Es una administradora completa: puede usar el Backoffice, gestionar catálogo, planes, biblioteca, suscripciones, ajustes e imágenes. Mantenerla fuera de la segmentación de clientes y revocar el permiso cambiando ese campo a `false` cuando deje de necesitarse.
- Verificación 2026-07-27: el proyecto remoto respondió `PGRST205` para `backoffice_drafts`; la tabla no está aplicada o no está visible en el caché PostgREST. Por ello, un borrador de meal prep sólo queda en el navegador de Cecilia y no puede recuperarse ni publicarse desde otro dispositivo hasta aplicar `20260727001000_backoffice_drafts.sql` al proyecto Supabase `allyjctrrtvibwchjouu` y verificar su lectura autenticada. No sustituir ni recrear un borrador local sin abrirlo primero en la sesión de su autora.
- Conexión Supabase 2026-07-27: la credencial propia de Fullness confirmó que `menu_items` y `meal_library_items` están disponibles, pero `backoffice_drafts` no. La Biblioteca estaba vacía; los 2 planes activos contenían 3 platos cada uno y 0 referencias `libraryMealId`. Antes de cualquier recuperación, aprobar explícitamente el backfill de 6 registros de Biblioteca y la actualización de los 2 planes activos; verificar después los 6 enlaces y conservar el script idempotente para no duplicar platos.
- Recuperación autorizada 2026-07-27: se crearon o reutilizaron 6 platos de Biblioteca y se enlazaron los 3 platos de cada plan activo con un `libraryMealId` válido. El Backoffice dispone además de `Guardar platos en Biblioteca`, que persiste todos los platos nuevos sin exigir publicar el meal prep; `Guardar meal prep` usa validación propia para explicar campos comerciales faltantes y el botón individual ya no se comprime a 36 px.
