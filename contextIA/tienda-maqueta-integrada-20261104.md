# Tienda integrada desde la maqueta — 04/11/2026

## Autoridad y alcance

Carlos pidió aplicar el HTML del chat Maqueta01a1a66e-d8ce-7a02-9419-b577b21561d1 sin reinterpretar lo acordado, conectar frontend/backend y después autorizó multiagente. Se leyó el chat y se pidió expresamente su handoff; entregó `R:/Entregables-Codex/Fullness-Tienda-Propuesta-Cecilia-20261104/HANDOFF-TIENDA-FULLNESS.md`. Destino confirmado: **/tienda**, no el inicio. El hero y las secciones de /#programa y la historia de /quienes-somos se conservan; el plato móvil ya estaba oculto/publicado en el lote anterior.

Referencias definitivas: Fullness-Lab-Propuesta-Tienda.html (SHA25603e01ada7c28cbff514732606ef7d0d6ed3e84d948f1247fde125d365698db8f) y Fullness-Lab-Tienda-Movil.html (70fd69d0bae7dc66c91a0dc3e9c5c785e43710b18ee09173a2a57019e6babccc). Importación reproducible con scripts/import-approved-shop.mjs; el build utiliza el JSON versionado, no requiere unidadR. Sólo CSS/DOM editorial y marca, sin scripts, catálogo congelado, aviso demo ni pago simulado de la maqueta. Productos dinámicos y texto se renderizan con React, no como HTML interpolado. Shadow DOM aísla el CSS aprobado de estilos históricos del landing. El importador protege nombres con guion (dialog-body); pruebas cubren la regresión.

## Regla comercial vigente

- Compra individual desde1, cantidades libres y repetidas. Se elimina la obligación de planes6/24 y duplicación. El límite técnico1000porproducto no es un mínimo comercial.
- Mismos ingredientes, nutrición, alérgenos, regeneración y fotos de la biblioteca original. Dos vistas de presentación montado/envasado sin invertir ni editar fotos reales. Sólo se excluyen de presentación dos notas internas exactas de alérgenos; advertencias sanitarias conservadas y biblioteca intacta.
- Categoría editable en la biblioteca, sin cambiar automáticamente precio ni activar fichas. Precio y disponibilidad continúan en el mismo editor, con protección borrador/publicación y sin stock numérico. No se inventan precios para las17fichas que Carlos mantuvo sin precio/no disponibles.
-10%desde24individuales sobre subtotal elegible; familiares excluidos y combinables en el mismo carrito.
- Corrección humana posterior al handoff: **6platos acumulados por semana entre varios pedidos**, no una sola compra. En cuatro semanas distintas del mismo mes, el pedido que completa seis unidades en la cuarta recibe35% sobre sus individuales, sin retroactividad. ZonaChile/lunes–domingo. Sólo pagadas/noanuladas, cuenta verificada, no se acumula con10; canje protegido por bloqueo/registro duradero. Los mensajes hablan de semanas, no de número de pedidos.
- Alta de cuenta con nombre/correo/teléfono y contraseña, confirmación de correo. Identidad de beneficios validada en servidor con JWT, no con el correo escrito en despacho. Guest puede comprar normalmente y recibir volumen, sin historial semanal atribuido por email.
- Retiro sin cargo; despacho con dirección/comuna/teléfono, cotizado y pagado por separado. La web cobra sólo productos; confirmación y correo diferenciados. Las tarifas y pedidos históricos no cambian en reintentos.

## UI y ciclos

Orden, textos, caja, botánica, tipografía, colores e iconos copiados de las referencias. Corte de experiencia móvil860px, coherente con convención actual. Menú de tienda exactamente5destinos; acceso a backoffice sigue desde cuenta de administrador. Dock móvil Tienda/Carta/Mi selección, filtro original en panel inferior, galería táctil, foco/Escape y cierres explícitos sin perder cantidades. WhatsApp permanece en contacto/footer, no sobre precios o controles de tienda. Cambiar de modalidad renueva contenedores de portal y conserva carrito. Márgenes reales20px/28px en carrito móvil/escritorio. UI de error ofrece reintento y conserva selección; datos publicados refrescan precio/disponibilidad de los platos elegidos. Los planes antiguos no se mezclan silenciosamente con el nuevo mix.

Carrito validado nuevamente por servidor y SQL. Quote sin escrituras; preference idempotente, precio bruto guardado y descuento separado, Mercado Pago recibe neto exacto en CLP. Respuestas perdidas recuperables sin doble POST. Nuevo flujo no requiere carta fechada ni Core360; historial de planes y reservas anteriores preservado. Ver tienda-mix-backend-20261104.md y tienda-mix-categorias-registro-20261104.md.

## Evidencia local

- Build Vite PASS, avisos preexistentes de bundle/mediosruntime. git diff --check PASS.
- PASS test-approved-shop, test-mix-commerce (PGlite), test-mix-ui-rules, test-member-registration, test-mealprep-category-editor, test-mealprep-publication, test-mealprep-library-access, test-checkout-result-message, verify-order-email-flow y verify-seo. Regresión test-library-plan-source PASS del mismo lote backend; no repetida por rutina.
- Comparación de geometría contra HTML a1440×900 y390×844: header/hero/H1/caja/primera fila coinciden.390/860/861/1440sin overflow;8tarjetas,1filtro, botones44px y dock64px. Selección persistente al cambiar modalidad, filtros/galería/foco/Escape aprobados. X oscura; sin imgsrcvacío. Capturas en R:/Entregables-Codex/Fullness-Tienda-Propuesta-Cecilia-20261104/QA-App-Final-*.png.
- Prueba conectada navegador3127→HTTP3130→código servidor real→PGlite local→gateway sintético→redirección interceptada.1plato9800,6platos58800,24platos235200−23520=211680, mixto demo pavo9600+familiar32900=42500. Cuatro órdenes y cuatro preferencias exclusivamente locales; importes UI/DB/proveedor idénticos, sin shipments ni cobro de despacho. Dirección/comuna/teléfono sólo ficticios, sin correo/pago real. Captura QA-Conectado-Carrito-24.png. No equivale a Mercado Pago Live ni a producción.

## Publicación pendiente

Se solicita aplicar código, no se recibió publicación nueva en este turno. Migración aditiva20261104172613_fullness_mix_rewards.sql preparada/probada, **no aplicada a producción**. No hubo push, despliegue, cambios productivos de biblioteca/precios/visibilidad ni coordinación con Core360. No se añadieron fotos de local no entregadas. Registro con proveedor Auth real y pago Live no realizados; registro se probó con cliente simulado y flujo confirmado por código/trigger existente.

Antes de publicar: respaldo del esquema/datos afectados; aplicar SQL compatible con el código anterior; un push consolidado originHEAD:main; verificar Production, SHA exacto, Ready y dominio. No publicar frontend nuevo sin su migración. Checkout de trabajo Fullness existente: Core360 SaaS/.local/fullness-autonomy-release-main-20261102/app, detachedHEAD, sin nuevas ramas/chats. WIP excluido: fotos-mealpreps-hover-20261104.md, supabase/.temp/cli-latest, runtime y .playwright-cli. Cerebro central no operativo, ContextIA transitorio actualizado.
