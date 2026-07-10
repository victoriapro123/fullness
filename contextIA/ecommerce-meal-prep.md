# E-commerce Meal Prep

- La tienda e-commerce vive en su página propia: `/tienda`.
- El desarrollo local de este proyecto debe servirse en el puerto `3101`.
- La tienda debe sentirse como un e-commerce editorial premium de meal preps, inspirado en un layout con hero grande, caja/meal kit protagonista, bloque de suscripción, planes semanales/mensuales, pasos de compra y packs familiares.
- El hero, la imagen principal de tienda y el cuadro de suscripción deben ser autogestionables desde backoffice.
- Los planes y packs familiares se gestionan como `menu_items`, con imágenes principal y hover en R2, precio, descripción, información nutricional, tags de beneficios y platos incluidos cuando corresponde.
- En el e-commerce hay dos niveles de detalle: click en el plan abre el lightbox del plan completo; click en un meal prep incluido abre el detalle del plato.
- El hover de plan, producto familiar o plato incluido debe mostrar la segunda foto cuando exista.
- El checkout debe pedir despacho con dirección/comuna o retiro en local.
- La migración `20260709001000_ecommerce_shop_settings.sql` quedó aplicada y la fila `main` de `ecommerce_shop_settings` responde desde Supabase.
- No usar un vector plano para el hero del e-commerce: se ve poco realista y no calza con la estética del sitio.
- Para el hero del e-commerce, usar fotografia de producto realista, con etiqueta circular `FULLNESS LAB` como la de los pouches de la seccion meal prep del landing, fondo transparente para vivir sobre el hero oscuro y sombra natural aplicada por CSS.
- El hero activo del e-commerce esta en R2: `images/ecommerce/fullness-hero-box-dark-cutout-15bfb5ebf321.png`.
- La tienda debe mantener persistencia tipografica con el landing usando `Avenir Next`; el tratamiento visual puede adaptarse al prototipo e-commerce, pero sin cambiar la familia tipografica del sitio.
- Direccion visual aprobada para la tienda: hero y suscripcion en negro premium, crema para planes/packs, CTAs burdeos, iconografia cobre/dorada, y una banda de comunidad oscura antes del footer. No cambiar la familia tipografica del sitio.
- En las cards de planes semanales/mensuales se debe mostrar una caja abierta Fullness con bolsitas adentro, no fotos de platos. Los platos quedan para el detalle de meal preps incluidos y para la seccion/packs familiares.
- Assets de plan card en R2: principal `images/ecommerce/fullness-plan-box-card-87fca2f2a7cf.png`; hover `images/ecommerce/fullness-plan-box-card-hover-70f16092b298.png`.
- Las caracteristicas incluidas dentro de las cards de planes deben mostrarse como iconos/beneficios concordantes con la marca, no como fotos de platos. Las fotos de platos se reservan para packs familiares y detalles de meal preps.
- Regla reforzada 2026-07-10: no dejar elementos funcionales montados/solapados en ningun breakpoint. En lightboxes y popups hay que validar tambien viewports cuadrados o de poca altura, como 600x600; si falta espacio, compactar la reticula o esconder elementos secundarios antes que montar iconos, textos o botones.
