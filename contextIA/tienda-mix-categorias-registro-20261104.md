# Categorías de la biblioteca y alta de miembros — 2026-11-04

Alcance auxiliar del traspaso de la maqueta de /tienda. Código local Fullness; no cambia los datos reales ni publica por sí mismo.

## Categorías

- `meal_library_items.sale_category` es el dato explícito, opcional, con las cinco categorías del instructivo: Pollo, Pavo, Vacuno, Pescados y Vegetarianos. La migración aditiva corresponde al lote general de tienda.
- `mapMealLibraryItem` lo devuelve como `saleCategory`. El payload lo conserva cuando un consumidor antiguo omite el campo; un valor vacío explícito lo deja sin definir.
- Cecilia selecciona la categoría en el bloque Precio y disponibilidad. No modifica precios, disponibilidad, imágenes, ingredientes ni nutrición. No se asignan precios automáticamente.
- El formulario principal debe incluir `saleCategory: item.saleCategory || ''` al abrir una ficha. El catálogo público debe recibir este mismo campo para filtrar por la categoría guardada.
- Los textos del bloque de publicación usan «Arma tu mix» y conservan la separación entre borrador y estado guardado.

## Registro

`MemberRegistration` complementa, sin reemplazar, el acceso existente por contraseña. Solicita nombre, correo, teléfono y contraseña; esta última se usa exclusivamente para crear la cuenta. Valida teléfonos internacionales, no sólo Chile. El helper `registerMember` entrega a `auth.signUp` los datos descriptivos `full_name` y `phone`; el trigger existente de alta de usuarios los copia a `profiles`.

La cuenta requiere confirmación de correo. Un alta sin sesión muestra «REVISA TU CORREO» y no se presenta como acceso verificado. El servidor sigue siendo responsable de verificar la identidad y los beneficios. Los datos editables del usuario nunca conceden roles ni autorizaciones.

Interfaz del componente: `MemberRegistration({supabase?, onRegistered, onLogin})`. Si se omite el cliente, usa el cliente público configurado de la app. `onRegistered` recibe la respuesta `data` de Supabase; si `session` es nula, la ventana debe permanecer abierta para mostrar la confirmación enviada. `onLogin` vuelve al formulario existente. No se enviaron correos reales durante QA.

Validación: PASS `test-member-registration.mjs`, `test-mealprep-category-editor.mjs`, `test-mealprep-publication.mjs` y `test-mealprep-library-access.mjs`; `git diff --check` de archivos propios sin errores de whitespace. Pruebas de registro usan cliente sintético sin red. La compilación y QA visual del lote completo corresponden al integrador. Sin cambios en main.jsx, servidor, SQL productivo, Git remoto o Core360.

## Comprobación auxiliar de confirmación y reglas del mix

`checkoutPaymentMessage` usa la modalidad únicamente si el pago aprobado devuelve `purchaseModel: mix_v1` y `fulfillmentMode: pickup|delivery`. En ese caso muestra la confirmación específica del instructivo: coordinar retiro o informar el valor del despacho para aprobación. La confirmación de correo sólo se afirma cuando `customerConfirmationSent === true`; pagos pendientes, TEST y respuestas antiguas conservan sus reglas. El integrador debe entregar esos dos campos desde el snapshot persistido del servidor, no desde parámetros de retorno del navegador.

El helper visual `mixTotals` acepta elegibilidad semanal ya confirmada por el servidor incluso cuando el pedido actual es de una sola unidad (puede completar seis con cinco unidades anteriores pagadas esa semana). No decide ni otorga esa elegibilidad. El servidor sigue siendo la autoridad. Los familiares no reciben descuento; si coincide el umbral de24 con el beneficio semanal, sólo se usa35%.

`publicAllergens` suprime sólo dos notas internas exactas conocidas de la ficha original, tolerando espacios repetidos. No suprime frases que sólo empiecen parecido ni edita la biblioteca. Las demás advertencias, incluidos gluten y trazas, se conservan.

PASS: `test-checkout-result-message.mjs` y `test-mix-ui-rules.mjs` (categoría explícita/fallback, pares de foto sin mutación, totales1/6/23/24/mixto, descuento35% no acumulado y unidad que completa seis, advertencias, retiro y despacho separado). Sin solicitudes reales a Mercado Pago, correo o base productiva.
