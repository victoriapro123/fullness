# E-commerce Meal Prep

- La tienda e-commerce vive en su página propia: `/tienda`.
- El desarrollo local de este proyecto debe servirse siempre en `http://localhost:3101`.
- La tienda debe sentirse como un e-commerce editorial premium de meal preps, inspirado en un layout con hero grande, caja/meal kit protagonista, bloque de suscripción, planes semanales/mensuales, pasos de compra y packs familiares.
- El hero, la imagen principal de tienda y el cuadro de suscripción deben ser autogestionables desde backoffice.
- Los planes y mealpreps familiares se gestionan como `menu_items`, con imagen principal obligatoria, segunda foto opcional para hover, precio, descripción e información comercial. Los mealpreps individuales de un plan conservan su propia ficha nutricional, tags y beneficios.
- En el e-commerce hay tres conceptos: `Planes` semanales o mensuales, `Mealpreps` individuales dentro de esos planes y `Mealpreps familiares` vendidos directamente.
- El hover de plan, mealprep familiar o mealprep incluido debe mostrar la segunda foto cuando exista.
- El checkout debe pedir despacho con dirección/comuna o retiro en local.
- La migración `20260709001000_ecommerce_shop_settings.sql` quedó aplicada y la fila `main` de `ecommerce_shop_settings` responde desde Supabase.
- No usar un vector plano para el hero del e-commerce: se ve poco realista y no calza con la estética del sitio.
- Para el hero del e-commerce, usar fotografia de producto realista, con etiqueta circular `FULLNESS LAB` como la de los pouches de la seccion meal prep del landing, fondo transparente para vivir sobre el hero oscuro y sombra natural aplicada por CSS.
- El hero activo de Tienda es `src/assets/ecommerce/fullness-hero-box-dark-cutout-v2.png`, sincronizado en R2 como `images/ecommerce/fullness-hero-box-dark-cutout-v2.png` y configurado en `ecommerce_shop_settings`. Es una caja abierta y bolsas sobre transparencia real. No usar una fotografia con rectangulo crema/blanco de fondo ni añadir un panel detras de la caja.
- La tienda debe mantener persistencia tipografica con el landing usando `Avenir Next`; el tratamiento visual puede adaptarse al prototipo e-commerce, pero sin cambiar la familia tipografica del sitio.
- Direccion visual aprobada para la tienda: hero y suscripcion en negro premium, crema para planes/packs, CTAs burdeos, iconografia cobre/dorada, y una banda de comunidad oscura antes del footer. No cambiar la familia tipografica del sitio.
- En las cards de planes semanales/mensuales se debe mostrar una caja abierta Fullness con bolsitas adentro, no fotos de preparaciones. Las fotos gastronómicas quedan para el detalle de los mealpreps incluidos y para los mealpreps familiares.
- Assets de plan card en R2: principal `images/ecommerce/fullness-plan-box-card-87fca2f2a7cf.png`; hover `images/ecommerce/fullness-plan-box-card-hover-70f16092b298.png`.
- Las caracteristicas incluidas dentro de las cards de planes deben mostrarse como iconos/beneficios concordantes con la marca. Las fotos gastronómicas se reservan para mealpreps familiares y detalles de mealpreps.
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
- El formulario de Planes, Mealpreps y Mealpreps familiares protege cada cambio en dos capas: `localStorage` inmediato y copia por administradora en `backoffice_drafts` de Supabase. Cambiar de producto, crear uno nuevo, cambiar de módulo, cerrar una pestaña o dejar la aplicación en segundo plano nunca puede descartar el trabajo actual: conserva un borrador adicional recuperable y fuerza un último intento de sincronización remota. La interfaz dice explícitamente si el borrador está en servidor o sólo en el dispositivo. Sólo el icono de eliminar borrador, con confirmación explícita, puede retirarlo; un guardado exitoso elimina sólo el borrador que se publicó. La migración `20260728003000_backoffice_drafts_server_sync.sql` crea o corrige la tabla de manera idempotente y permite los alcances `meal-prep` y `meal-library`.
- El video de Cecilia permitió identificar datos incompletos del intento `meal prep semanal`, pero por indicación posterior no se debe volver a precargar ni restaurar ese borrador. Los borradores existentes se muestran sólo en el selector; abrir el Backoffice debe iniciar con un formulario limpio para que la administradora pueda crear un meal prep nuevo de inmediato.
- Antes de un despliegue que toque catálogo, ejecutar `npm run qa:catalog`. Valida que cada producto activo sea una fila real de `menu_items` con precio, descripción y foto principal, y que existan planes semanales y mensuales con meal preps incluidos. La segunda foto es opcional y sólo activa el hover cuando existe. Un producto incompleto debe quedar inactivo hasta ser completado desde Backoffice, nunca sustituirse visualmente por una demo.
- Las imágenes se volvieron a verificar contra R2 usando el endpoint autenticado de la UI. Las URLs principal y hover se guardaron en el producto de QA y los cinco objetos generados durante la prueba se eliminaron; la cuenta administrativa temporal también fue eliminada.

### Backoffice: suscripciones y biblioteca 2026-07-21

- El Backoffice debe tener una vista de clientes con suscripción operativa, filtrable por estado (`Activa`, `Pausada`, `Cancelada`) y frecuencia (`Semanal`, `Mensual`), sin mezclar esos clientes con personas inscritas solamente al lightbox/newsletter.
- Los mealpreps individuales viven en una biblioteca propia. Al cargarlos dentro de un plan se copian sus datos de ficha, fotos, tags, ingredientes, información nutricional y alérgenos, y se guarda la referencia en el JSON del plan; así un mismo mealprep puede incorporarse a varios planes sin volver a escribirlo.
- Un mealprep creado dentro de un plan se puede guardar directamente en su catálogo aun cuando el plan esté incompleto. Esto no publica el plan.
- Si un plan no se puede publicar, el backoffice debe indicar los campos que faltan (nombre, slug válido, precio o descripción) y conservarlo como borrador.
- Corrección semántica definitiva 2026-07-28: la información nutricional pertenece exclusivamente a cada mealprep individual o familiar, no al plan principal (`menu_items.product_type = plan`). Se captura y presenta en la ficha del mealprep; el plan sólo reúne las bolsas y administra frecuencia, precio, caja, descripción comercial y publicación.
- La migración histórica `20260727003000_remove_dish_nutrition.sql` se aplicó con una interpretación incorrecta y no debe ejecutarse nuevamente. Eliminó nutrición de `meal_library_items` y de los elementos internos de planes. Cualquier recuperación debe validarse con Cecilia antes de escribir datos.
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
- Verificación 2026-07-28: se aplicó `20260728003000_backoffice_drafts_server_sync.sql` con la sesión owner del proyecto `allyjctrrtvibwchjouu`. `backoffice_drafts` quedó visible mediante PostgREST (respuesta `200`), con RLS por administradora y alcances `meal-prep` y `meal-library`. La interfaz puede indicar "Respaldo en servidor" una vez que termine la sincronización; mientras se completa o falla, debe comunicar de forma honesta "Guardando en servidor" o "Solo en este dispositivo". No sustituir ni recrear un borrador local sin abrirlo primero en la sesión de su autora.
- Verificación con sesión owner 2026-07-28: Fullness está en plan Free y la pantalla `Database Backups` confirma `No backups`; el plan no incluye respaldos programados ni recuperación a un punto anterior. Los logs disponibles de `menu_items`, `meal_library_items` y `backoffice_drafts` conservan rutas, métodos y estados, pero no el cuerpo enviado por Cecilia, por lo que no permiten reconstruir fichas eliminadas. La recuperación debe apoyarse en datos vigentes, R2, grabaciones y aprobación de Cecilia, siempre de forma aditiva.
- Regla de catálogo 2026-07-28: cada mealprep y cada mealprep familiar debe incluir `Alérgenos` como campo de texto libre. Debe estar disponible en la ficha completa, ser buscable en Backoffice y mostrarse en la ficha de tienda; cuando no exista información se comunica `Por confirmar` en vez de ocultar el dato.
- Conexión Supabase 2026-07-27: la credencial propia de Fullness confirmó que `menu_items` y `meal_library_items` están disponibles, pero `backoffice_drafts` no. La Biblioteca estaba vacía; los 2 planes activos contenían 3 platos cada uno y 0 referencias `libraryMealId`. Antes de cualquier recuperación, aprobar explícitamente el backfill de 6 registros de Biblioteca y la actualización de los 2 planes activos; verificar después los 6 enlaces y conservar el script idempotente para no duplicar platos.
- Recuperación autorizada 2026-07-27: se crearon o reutilizaron fichas en `meal_library_items` y se enlazaron elementos internos mediante `libraryMealId`. En la taxonomía definitiva esas fichas son mealpreps y los registros comerciales que los agrupan son planes.

### Parametros de catalogo y QA productivo 2026-07-28

- Beneficios y tags se administran desde el modulo `Parametros`. Supabase contiene 12 beneficios ilustrados y 12 tags iniciales; los iconos WebP viven en R2 bajo `assets/benefits/`.
- Cada plato de Biblioteca guarda `tag_ids`, `benefit_assignments` y una explicacion libre por beneficio. Los planes heredan y deduplican esos datos desde sus platos; la ficha del plan no guarda nutricion propia.
- Los productos familiares son platos comerciales: pueden cargar una ficha de Biblioteca mediante `library_meal_id` y conservan nutricion, ingredientes, tags y beneficios.
- En tienda, los beneficios estandarizados se presentan como iconos editoriales interactivos. El lightbox muestra titulo, contexto del plato y explicacion. Las descripciones largas de platos se acotan visualmente y abren su detalle completo.
- Ajuste visual final 2026-07-28: los beneficios usan ilustraciones PNG transparentes y monocromaticas en tinta burdeos, derivadas del set botanico aprobado (jengibre, granada, alcachofa, corazon anatomico, escudo botanico y bowl, entre otros). No sustituirlas por pictogramas genericos ni usar acuarelas, multiples colores, fondos incrustados o tarjetas individuales alrededor de cada icono. Las superficies del e-commerce conservan la crema neutra previa; no volver a teñir planes, platos, fichas o lightboxes con marfil amarillento.
- Jerarquia visual 2026-07-28: los tags burdeos describen el plan completo. Los beneficios ilustrados pertenecen a la ficha de cada plato (incluidos los familiares), nunca deben flotar entre la descripcion del plan y sus platos. Se presentan como sellos circulares de borde burdeos y texto de alto contraste, integrados al cierre de la descripcion. Los platos del plan se separan con lineas editoriales sobre el mismo papel, no con tarjetas blancas. Las etiquetas Semanal/Mensual se anclan al borde inferior de un marco de imagen de proporción fija.
- El onepage PDF ya fue enviado a Cecilia y queda fuera de mantenimiento. No modificarlo ni regenerarlo salvo solicitud explicita del cliente.
- Se aprobo responsive dedicado en escritorio y telefono de 390 x 844: grilla editorial de planes, carruseles tactiles de platos y familiares, lightboxes de pantalla completa y CTAs sin montajes.
- QA UI aprobado en produccion de datos: crear y editar plato, subir foto real a R2, asignar nutricion/tag/beneficio, reutilizarlo en familiar, aceptar precio `$12.345`, eliminar ambos registros y limpiar la imagen R2.
- Al guardar un plan existente se encontro y corrigio `tagDefinitions is not defined`. Se comprobo por UI y Supabase el cambio reversible `$58.200 -> $58.201 -> $58.200`; no existe restriccion por multiplos de 100.
- Esta validacion reemplaza la nota antigua que indicaba que el selector nativo de archivos no estaba probado.
- Evidencias: `demo-clienta/qa-catalogo-2026-07-28/`. Onepage para Cecilia: `demo-clienta/onepage-sistema-platos-beneficios.pdf`.
- Migracion aplicada: `20260728001000_catalog_parameters_and_dish_benefits.sql`.

### Arquitectura UX del Backoffice 2026-07-28

- `Mealprep` es el formato físico de entrega de una preparación: una bolsa que se conserva y calienta siguiendo sus indicaciones, incluido baño María cuando corresponda.
- El Backoffice tiene tres catálogos: `Mealpreps familiares` para formatos grandes vendidos directamente, `Planes` semanales o mensuales compuestos por una caja de mealpreps y `Mealpreps` individuales disponibles para incorporar a esos planes.
- Técnicamente se mantienen `menu_items.product_type = family` para mealpreps familiares, `menu_items.product_type = plan` para planes y `meal_library_items` para mealpreps individuales. No renombrar tablas, tipos, IDs ni referencias sólo por semántica.
- El plan sólo administra frecuencia, precio, descripción, fotos de la caja y publicación. La nutrición, ingredientes, tags, beneficios, alérgenos y fotos gastronómicas pertenecen a cada mealprep.
- El Backoffice usa navegación lateral en escritorio y navegación horizontal táctil en móvil. Cada módulo abre primero un catálogo con listado, buscador y acciones claras; no se abre directamente un formulario largo.
- Crear o editar un plan abre un espacio de trabajo amplio con pestañas `Información general`, `Mealpreps` y `Publicación`. El plan debe contener al menos un mealprep completo antes de poder guardarse: nombre, descripción, foto principal, descripción nutricional y al menos un valor nutricional. Beneficios y tags nutricionales se administran desde la ficha de cada mealprep.
- Crear o editar un mealprep dentro del plan abre un segundo lightbox contextual con la ruta `Planes / plan / Mealprep N`.
- La edición de mealpreps dentro de un plan conserva los modos `Rápida` y `Completa`. La rápida permite avanzar con nombre, descripción, alérgenos y foto principal. La completa muestra, en un único recorrido, información, ingredientes, alérgenos, descripción nutricional, valores nutricionales, tags, beneficios e imágenes. La foto principal es obligatoria; la segunda es opcional. `Guardar mealprep` lo guarda en `Mealpreps` para reutilizarlo y `Guardar plan` sincroniza automáticamente todos sus mealpreps con esa biblioteca. Volver al plan conserva los cambios en su borrador.
- Cada mealprep individual incluye `Cómo retermalizar / preparar` como texto libre. Se guarda en `meal_library_items.rethermalization_instructions`, se conserva dentro de los mealpreps de un plan y se muestra en su detalle de tienda. Los mealpreps familiares usan el campo comercial existente `menu_items.recipe_summary` con la misma etiqueta. La migración `20260728004000_mealprep_rethermalization.sql` se aplicó en producción el 2026-07-28; no eliminar ni reemplazar instrucciones existentes al actualizar otras partes de la ficha.
- Los valores nutricionales combinan campos guiados y `Datos nutricionales JSON`, siempre visible dentro de la ficha completa del mealprep. El JSON debe seguir aceptando claves personalizadas y conservar las que Cecilia ya use; la validación se hace al guardar y exige un objeto JSON válido. No esconderlo en un desplegable avanzado.
- Al guardar un mealprep incluido, una referencia `libraryMealId` que ya no exista no puede bloquear el trabajo: se crea una nueva ficha de Biblioteca con el contenido del plan, se reemplaza el vínculo local y se informa que hay que guardar el plan para persistirlo. No crear duplicados cuando el vínculo sí existe.
- Borradores de mealpreps: editar una ficha directamente en `Mealpreps` o dentro de un plan debe generar el mismo respaldo individual en `meal-library`, primero en el dispositivo y luego en Supabase. El editor interno muestra su propio estado de respaldo; su borrador se puede recuperar desde `Mealpreps` aunque el plan no se haya terminado. Guardar exitosamente ese mealprep, solo o junto al plan, limpia su borrador individual.
- Ante una interrupción de red al guardar un mealprep, nunca mostrar el error técnico crudo. Comunicar que no se pudo conectar, conservar el borrador y permitir que la administradora reintente. No reintentar automáticamente una creación cuyo resultado sea incierto, porque podría duplicar un mealprep.
- La carga de iconos de beneficios acepta únicamente PNG, WebP, JPEG, GIF o AVIF y limita los archivos a 3 MB para no exceder el cuerpo de solicitudes de producción. Si falla la carga, conservar el formulario y mostrar un error accionable; una excepción visual de Parámetros debe quedar contenida en ese módulo y nunca derribar el Backoffice completo.
- Al crear un beneficio desde la ficha de un mealprep, el prompt de IA debe reemplazar automáticamente `[NOMBRE DEL BENEFICIO]` por el nombre que Cecilia esté escribiendo; el campo visible y el texto copiado deben ser idénticos.
- El prompt para íconos de beneficios explica que Fullness Lab es una marca chilena de mealpreps de alimentación consciente y traduce cada beneficio a una metáfora natural/alimentaria simple. Debe conservar el lenguaje de los íconos aprobados: una silueta editorial botánica monocromática en tinta burdeos, con un máximo de tres elementos y sin pictogramas genéricos ni escenas complejas. Es un ícono de interfaz pensado para 80 px, por lo que solicita PNG de 512 x 512 px, optimizado y liviano. No se debe pedir transparencia a Gemini: el prompt exige fondo chroma key verde fluor #00FF00, plano y uniforme, para retirarlo posteriormente con una aplicación de transparencia; prohíbe expresamente dameros, fondos blancos, texturas, degradados y sombras. Incluye los ejemplos guía: `Fuerza` son manos que sostienen una raíz o alimento natural pesado; `Regeneración Celular`, una hélice mínima formada por rama joven y hojas.
- El formulario de creación de beneficios en `Parámetros` comparte con el alta rápida de mealpreps la misma experiencia para el icono: carga de imagen personalizada, prompt dinámico y acción de copiar. Los campos adicionales de orden, estado y código interno siguen siendo propios del módulo de Parámetros.
- El diálogo de alta rápida de beneficio o tag no puede ser un `<form>` anidado dentro del formulario de mealprep. Su botón crea y asigna exclusivamente el parámetro, conserva abierto el editor de mealprep y no debe activar guardado, cierre ni navegación del formulario externo.
- Los códigos históricos se mantienen aunque sus prefijos respondan a la nomenclatura anterior. Son información interna de solo lectura y no justifican migrar registros existentes.
- Guardar debe mostrar un lightbox de progreso y un resultado inequívoco. Los errores indican exactamente qué falta y recuerdan que el borrador sigue protegido.
- La interfaz evita negritas pesadas: títulos en peso regular y controles en peso medio. La jerarquía se construye con tamaño, espacio, pestañas, color y contexto.
- QA aprobado en `1440x1000` y `390x844`: catálogo, búsqueda, creación de plan, mealprep rápido/completo, ficha nutricional, mealpreps familiares, validación de guardado, nombres largos y ausencia de desbordes horizontales.
- `Planes`, `Mealpreps` y `Mealpreps familiares` comparten el patrón de catálogo: encabezado, acción de creación, buscador y resultados en filas combinadas.
- Los listados de beneficios y tags en `Parámetros` conservan sus cuadros modulares y tienen buscadores independientes. Suscripciones mantiene su filtro y buscador propio, que cubren el mismo objetivo sin repetir una segunda interfaz de búsqueda.
- Todos los campos de texto y selectores de los formularios de Backoffice deben usar una altura visual fija de `48px`. No depender del alto nativo del navegador para los selectores ni permitir que un input quede más alto que el selector contiguo.
- El menú lateral del Backoffice debe conservar margen respecto del área de trabajo: vive como columna contenida con borde completo, radio de `8px`, altura máxima y scroll propio. No debe pegarse al contenido, expandirse indefinidamente ni usar un `sticky` con un desplazamiento que deje espacio muerto al recorrer módulos largos.
- Las cargas de foto en planes, mealpreps y mealpreps familiares deben reportar el error dentro del recuadro exacto que falló (`Foto principal` o `Segunda foto`), además del aviso general. Traducir tamaño excesivo, formato no admitido, sesión vencida, red y rechazo de R2 a mensajes accionables. Las fallas de lectura o red deben devolver un resultado controlado para restaurar el botón de carga.
- Al guardar un plan, nuevo o existente, la confirmación debe volver al listado de `Planes`; nunca puede dejar abierto el lightbox del plan ni del mealprep interno. Las fichas existentes de mealprep individual o familiar pueden mantenerse abiertas para ajustes consecutivos.
- La cabecera del editor de planes mantiene una sola franja en escritorio: ruta y título a la izquierda; estado de respaldo, selector de borradores y estado de publicación alineados a la derecha. El selector no puede ocupar una fila independiente ni empujar el estado `Activo`; en pantallas angostas, el selector pasa a una segunda fila y los estados se mantienen juntos en la primera.
- `Parámetros` separa `Beneficios` y `Tags` en pestañas para que cada biblioteca y su formulario tenga ancho completo. `Contenido web` consolida los antiguos módulos `Tienda`, `Lightbox` y `Comunidad` bajo tres pestañas, conservando sus propios formularios y mecanismos de guardado.
- Las pestañas de `Parámetros` deben renderizar exclusivamente su panel activo; no depender sólo del atributo HTML `hidden`, porque ambas bibliotecas pueden terminar visibles por reglas de layout heredadas. Al cambiar de pestaña, la otra biblioteca y formulario no deben ocupar espacio ni permanecer en el DOM.

### Alta rápida de beneficios y tags 2026-07-28

- Mientras se edita la ficha nutricional de un mealprep, el administrador puede usar `Crear tag` o `Crear beneficio` sin abandonar la ficha. Ambos se guardan como parámetros globales reutilizables; si se edita dentro de un plan, el cambio permanece en el borrador hasta publicar el plan.
- El alta rápida de un tag pide solamente su nombre. El alta de un beneficio pide nombre, una descripción general opcional y permite elegir una ilustración aprobada o subir una imagen personalizada a R2 desde ese mismo diálogo. El icono no se deja vacío ni se reemplaza por un pictograma genérico.
- El diálogo de alta rápida incluye un prompt base copiable para generar una ilustración con IA. Debe mantenerse como apoyo operativo dentro del flujo de administración y no como contenido público.
- Si el nombre ya existe, se usa el beneficio o tag existente en vez de crear un duplicado o mostrar un error técnico. Esta acción se ofrece al editar mealpreps individuales y familiares.
- Los nombres visibles de beneficios y tags aceptan espacios y los conservan al publicar. El código interno se genera automáticamente a partir del nombre, con guiones, y no debe confundirse con el texto que verá la clienta.
- La explicación de cada beneficio dentro de un mealprep debe conservar todos los espacios mientras se escribe. No aplicar `trim()` ni otra normalización al valor controlado; el saneamiento puede ocurrir recién al persistir la ficha.

### Refinamiento UX Backoffice 2026-07-28

- `Contenido web` usa un único módulo con pestañas `Tienda`, `Lightbox` y `Comunidad`. Cada pestaña se organiza en bandas de edición con encabezado, campos relacionados y una acción final clara; no se debe volver a una columna larga sin agrupación.
- En `Tienda`, separar el hero y el bloque de suscripción. La imagen debe tener su propia zona de vista previa, carga y URL, mientras que las llamadas a la acción se mantienen junto al texto que modifican.
- En `Lightbox`, separar visibilidad, mensaje e imagen. Restaurar y guardar viven juntos al final para evitar que una acción destructiva o de confirmación quede perdida entre campos.
- En `Comunidad`, primero se muestra la agenda actual y luego el formulario para agregar una actividad. Las actividades son filas repetidas, no tarjetas decorativas anidadas.
- `Clientes` conserva un único buscador y filtros. En escritorio se presenta como tabla alineada; en móvil cada fila se reorganiza con rótulos de columna para que no exista scroll horizontal ni datos ambiguos.
- `Operaciones` se divide en dos bandas: exportación de CSV y recuperación de contraseña. Cada exportación comunica explícitamente que está preparando el archivo cuando corresponde.
- Tipografía Backoffice: evitar negritas duras. Usar peso medio (`500`) para controles, etiquetas, estados y énfasis; construir jerarquía con tamaño, aire, color y separación.

### Recuperacion conservadora 2026-07-28

- Antes de 2026-07-28, la lectura remota confirmó que `backoffice_drafts` no existía en el schema cache productivo (`PGRST205`). La tabla se habilitó posteriormente; los borradores nunca sincronizados antes de esa activación sólo pueden recuperarse desde el `localStorage` del navegador y perfil donde Cecilia trabajó, salvo que exista un respaldo de base tomado mientras la tabla sí estuvo presente.
- La clave `service_role` permite leer el estado actual, pero no listar ni restaurar respaldos históricos. Esa operación requiere acceso propietario al Dashboard o Management API del proyecto.
- Si hay respaldo diario o PITR disponible, se debe restaurar a un proyecto nuevo de análisis. Nunca restaurar una versión anterior encima de producción sólo para buscar borradores.
- El plan semanal actual conserva dos mealpreps avanzados dentro de `menu_items.included_items`: Apple Golden Chicken y Merluza austral con crispy quinoa salad, ambos con fotos, ingredientes, alérgenos y nutrición. Esos datos no deben sobrescribirse.
- Antes de aplicar cualquier recuperación, producir un PDF para Cecilia con cada ficha candidata, su fuente, campos recuperados y casillas de aprobación.

### Decision de QA y no recuperacion 2026-07-28

- Carlos definio que no se recuperaran ni se reinsertaran borradores historicos. Las referencias encontradas quedan solo como antecedente; no deben volver a produccion sin una nueva autorizacion explicita.
- Para QA productivo, crear exclusivamente registros con prefijo y fecha `QA YYYY-MM-DD`, validarlos por la interfaz y eliminarlos al terminar. La limpieza debe comprobarse con conteos finales de cero en las tablas afectadas.
- La evidencia se entrega como PDF con capturas del flujo y una declaracion clara de alcance. No afirmar que una version local esta publicada: la version publicada usada en QA aun conserva etiquetas historicas del catalogo hasta que se realice un deploy separado.

### Lightboxes de tienda 2026-07-28

- La vista rápida de un plan o plato debe mostrar siempre la foto completa con `object-fit: contain`, sobre fondo oscuro que continúe la fotografía; no usar `cover` si corta la caja o el plato.
- En escritorio el lightbox usa una altura acotada y sólo su columna de contenido desplaza. En móvil el overlay completo inicia desde arriba y tiene scroll natural; el botón de cierre queda fijo y visible mientras se revisa una ficha larga. No centrar verticalmente un panel más alto que la pantalla, porque oculta el inicio y aparenta que no existe scroll.

### Lightbox De Suscripción 2026-08-03

- La configuración del lightbox es contenido remoto de `ecommerce_shop_settings`, no un ajuste exclusivo de `localStorage`. Incluye visibilidad, textos, CTAs, URL de fondo y clave R2 para que el resultado se conserve entre equipos, sesiones y recargas.
- En Backoffice > Contenido web > Lightbox, usar el botón explícito `Elegir imagen` para abrir el selector de archivos del sistema. La carga usa R2 bajo `images/lightbox/` y sólo se publica al pulsar `Guardar lightbox`; después de subir, la interfaz debe decirlo con claridad.
- El guardado de tienda/lightbox refresca la sesión antes de escribir para evitar que una sesión vencida se perciba como pérdida de datos. Validar cada cambio con recarga de la página y lectura de la fila `main` en Supabase.

### Contenido Web Persistente 2026-08-03

- Los contenidos editables de Backoffice usan R2 para imágenes y `ecommerce_shop_settings` como fuente remota para los textos, tienda, lightbox y agenda de Comunidad. La agenda se serializa como `community_activities` JSONB; `null` representa una instalación heredada que aún puede conservar su respaldo local, mientras que `[]` es una agenda publicada intencionalmente vacía.
- Las imágenes de mealpreps, mealpreps familiares, planes, hero de tienda, lightbox y beneficios deben abrir el selector nativo del sistema desde un botón explícito. La carga nunca puede cerrar el editor actual; informa el error junto al campo que falló y conserva el formulario.
- Todo cambio manual de URL de imagen debe limpiar su clave R2 asociada. Las cargas exitosas muestran que falta guardar/publicar cuando corresponde.
- Antes de crear, editar o eliminar mealpreps y planes, refrescar la sesión de Supabase. Si falla la red o vence la sesión, mantener el borrador y explicar cómo reintentar, sin mostrar errores técnicos crudos.

### Confirmaciones de compra 2026-08-02

- Un pago `approved` de Mercado Pago dispara dos correos independientes y deduplicados en `email_deliveries`: `order_confirmation:<orden>` al cliente y `order_notification:<orden>` a operaciones. Ambos se ejecutan desde el mismo estado confirmado, tanto si llega por webhook como si se sincroniza al volver desde Checkout Pro.
- El aviso operativo incluye número de orden, productos, total, datos de contacto, modalidad, dirección/comuna cuando aplica y notas. Producción usa `ORDER_NOTIFICATION_RECIPIENT=cecilia@fullnesslab.com`; no reemplazarlo por el correo de la persona compradora.
- Si una entrega no es aceptada por Resend, el procesamiento devuelve error para conservar el evento de pago reintentable. Las entregas ya aceptadas no se duplican; las fallidas vuelven a intentarse en la siguiente sincronización del pago.
- `npm run qa:checkout-emails` cubre el correo de cliente, el aviso a operaciones, la deduplicación y el desvío completo al destinatario de QA cuando `MERCADOPAGO_TEST_MODE=true`.

### Operación de pedidos 2026-08-02

- El backoffice agrega un módulo propio de `Pedidos`: listado buscable con filtros de avance/pago, detalle de productos, datos del cliente y dirección, además de enlaces precompuestos a WhatsApp y `mailto:`. La información expuesta se limita a lo necesario para ejecutar el pedido.
- La progresión operativa válida es `paid -> preparing -> ready -> out_for_delivery/delivered`, con cancelación desde cualquier estado en curso. `pending_payment` sólo se puede cancelar; los pedidos cancelados, reembolsados o entregados no vuelven hacia atrás desde la UI.
- Cada transición manual se registra en `order_status_events` y dispara un correo de estado una sola vez. No duplicar la confirmación original cuando Mercado Pago mueve la orden a `paid`, porque la confirmación de pago ya cumple ese aviso.
- El reembolso disponible en Backoffice es total: sólo se habilita cuando existe un pago Mercado Pago aprobado, usa `POST /v1/payments/{id}/refunds` con monto total y `X-Idempotency-Key` igual al UUID de la orden. Mercado Pago permite este reembolso hasta 180 días después de la aprobación y exige saldo disponible.

### Jerarquía tipográfica de fichas rápidas 2026-07-28

- Las fichas rápidas de planes y platos no usan negrita como recurso de jerarquía. Encabezados auxiliares, tags, nombres de platos incluidos y acciones usan peso medio (`500`); el contraste editorial se construye con escala, color vino, mayúsculas y espaciado.
- Los títulos principales pueden mantenerse en peso regular o medio para conservar presencia sin el tono pesado de una interfaz genérica.
