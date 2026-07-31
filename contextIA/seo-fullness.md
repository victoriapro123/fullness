# SEO técnico y comercial de Fullness Lab

## Decisiones implementadas

- El mercado inicial es Chile, con foco comercial en Santiago y despacho verificable en la Región Metropolitana.
- El SEO se incorpora como una capa aislada sobre la SPA React/Vite existente; no se migran framework, checkout, autenticación, pagos ni backoffice.
- Las rutas públicas indexables son `/`, `/tienda`, `/comunidad`, `/quienes-somos`, `/preguntas-frecuentes` y `/producto/:slug`.
- Los productos indexables deben estar activos en el catálogo público. Productos inexistentes, estados transaccionales y flujos de autenticación reciben `noindex`.
- La información estructurada debe coincidir con contenido visible. No se agregan reseñas, calificaciones ni promesas médicas no verificadas.
- El sitemap se genera dinámicamente con rutas públicas y slugs activos de Supabase; si el catálogo no está disponible, conserva las rutas editoriales estables.
- GA4 es opcional mediante `VITE_GA_MEASUREMENT_ID` y solo registra eventos comerciales sin datos personales.
- La sede física confirmada para SEO local es Av. La Dehesa 1844, local 204, Lo Barnechea, Santiago, Chile.
- Vercel mantiene `fullnesslab.com` como redirección permanente 308 hacia `www.fullnesslab.com`; por ello el dominio canónico de SEO, Open Graph, robots y sitemap queda en `https://www.fullnesslab.com`.
- En Vercel Production se agregó `SITE_URL=https://www.fullnesslab.com`. El cambio requiere un nuevo deployment para entrar en vigor.
- Search Console tiene creada la propiedad de dominio `fullnesslab.com`, pendiente de verificación DNS. El registro TXT se debe agregar en el proveedor DNS del dominio; no se guarda el token de verificación en el repositorio.

## Criterio de seguridad

Cada cambio SEO debe pasar build, QA de rutas directas, validación de metadatos/JSON-LD y pruebas del flujo de carrito y checkout antes de publicarse.
