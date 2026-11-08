# Landing de Cecilia y galería administrable — 8 de noviembre de 2026

## Autorización y destino

Carlos autorizó directamente en el chat Maqueta el 8 de noviembre: usar las seis fotos entregadas, implementar landing y backoffice en Sitio Fullness, ejecutar SQL necesario y **no publicar**. Se verificó el mensaje humano con `read_thread`, turno `01a1bbd2-4c8a-7cf2-ae23-a4c170e41691`. La detención de compra TEST del 4 de noviembre sigue vigente y no forma parte de este lote.

- Responsable de implementación: Sitio Fullness. Maqueta prepara la referencia y aplicó la migración autorizada.
- Repositorio: `victoriapro123/fullness`.
- Checkout existente: `C:/Users/Usuario/Documents/Desarrollos/Core360 SaaS/.local/fullness-autonomy-release-main-20261102/app`, HEAD separado; aunque su carpeta padre diga Core360, es el checkout Fullness. No se crearon ramas/chats.
- Sin push, deploy, Preview ni nueva ejecución CI. Commit propio local al cerrar; su recibo queda en el entregable, sin reconstruir historial.

## Implementación

- `src/main.jsx`: textos y orden aprobados, cuatro atributos, enlaces, menú y pie. La introducción animada y el aviso temporal no se muestran en el landing, conforme a la referencia. Se conserva el acceso real de miembros; la bolsa del landing lleva a la tienda, sin cambiar la apertura de carrito de otras rutas.
- `src/landing-cecilia.css`: ajustes copiados de la maqueta y limitados a `.route-landing`; fuentes, fotografías y recursos previos preservados. Plato del hero oculto hasta 860 px; seis CTA salvia/grafito, de 48 px.
- `src/components/landing-local.jsx` y CSS: sección del local y editor real dentro de **Contenido web → Landing → Nuestro local**. Cargar, reemplazar, quitar, reordenar, editar descripción, previsualizar, descartar y guardar. Formatos JPG/PNG/WebP/AVIF, hasta 3 MB por foto y 12 fotografías; límite acotado para la carga JSON/base64 existente. No se recortan ni se borran archivos anteriores.
- `src/lib/landing-local.js`: repositorio Supabase real, validación de datos y guardado por revisión optimista. Los borradores del dispositivo están versionados y separados por administrador. Un error no elimina el borrador; las ediciones concurrentes exigen revisar la versión actual. Sin imágenes guardadas, se conserva el texto del local y no se publican placeholders.
- `public/images/landing-local/`: seis originales; hashes coincidentes con el manifiesto entregado. `.gitignore` permite incluir exclusivamente esta carpeta de fotos.
- `scripts/supabase-fullness.ps1` y `supabase/cli-fullness.yaml`: perfil Fullness separado, preparado por Maqueta; no contienen credenciales. Su autenticación queda fuera de Git.

## Base de datos aplicada, aplicación aún no publicada

Migración `20261108155006_landing_local_gallery.sql` aplicada por Maqueta en Fullness `allyjctrrtvibwchjouu`, main/PRODUCTION, y registrada en historial. SHA256 del archivo `0e07fcfdc178e2d966f7be14fc62629a4c52a5d0466cff9e143e04aa3177c564`; MD5 del SQL normalizado LF `99329ecd5e2ce2ecafc442324f2ee2e6`.

Tabla dedicada `landing_local_gallery`: lectura pública sólo de id/fotos/revisión; UPDATE de fotos sólo para administradores por RLS. La revisión y el actor se fijan en trigger, no por el cliente. No hay cambios a tienda, lightbox, comunidad, catálogo, usuarios ni pedidos. Las seis fotos de archivos locales estarán disponibles en el dominio cuando se autorice publicar el código y los assets.

Recibo de la aplicación y del CLI: `R:/Entregables-Codex/Fullness-Landing-Cecilia-20261107/RECIBO-SQL-Y-CLI-20261108.md`. La lectura real desde el navegador devolvió HTTP 200 y seis fotos. No se repitieron escrituras productivas para QA.

## Validación proporcional

1. Build Vite final PASS, Node 24.22.1. Advertencias preexistentes de tamaño de bundle y recursos media resueltos en runtime; no se cambiaron dependencias ni configuración de publicación.
2. `scripts/test-landing-local.mjs`: PASS sobre PostgreSQL aislado (PGlite), aplicando la migración exacta. Lectura pública, denegación anónimo/miembro, guardado/recarga/retiro/restauración, revisión obsoleta, URL insegura, duplicados, permisos de columnas, actor y ausencia de cambios a otros ámbitos.
3. Editor React → cliente Supabase real → adaptador HTTP local → PostgreSQL/RLS aislado: PASS guardar/recargar, borrador recuperado, descartar, ordenar, reemplazar, quitar, error de guardado, concurrencia y miembro sin permisos. La carga de archivo del recorrido visual usa adaptador simulado, no R2 productivo.
4. `scripts/test-landing-upload.mjs`: PASS handler real `/api/upload-media`, con Auth/R2 simulados y red externa interceptada. Anónimo 401, miembro 403, administrador aceptado, bytes originales, URL compatible y clave nueva al reemplazar.
5. Landing real con lectura remota: PASS 320/360/390/768/860/861/1440 px, sin desbordamiento, seis fotos, CTA y destinos correctos, galería móvil, menú y diálogo de cuenta. Cotejo contra HTML de referencia en 390/1440: misma altura y tipografía de los bloques medidos, incluida Comunidad.
6. Editor 320/390/1440: sin desbordamiento e inputs legibles. Enlaces Nosotros/Comunidad operativos sin heredar CSS del landing; anclas de ayuda `envios/cambios/calidad` presentes. No certifica vigencia legal/comercial de esas políticas.
7. Prueba final con Node 24: lectura de galería y endpoints públicos stock-letter/catalog-projection HTTP 200. El Node 20 global falló inicialmente por WebSocket nativo requerido por el cliente Supabase instalado; se corrigió el runtime de QA, sin modificar credenciales ni la aplicación por ese motivo.
8. Supabase Security Advisors remoto: cero hallazgos para los objetos `landing_local`. Detecta errores fuera del lote: `email_subscribers` y `email_deliveries` con RLS deshabilitado, además de advertencias de otros objetos existentes. No se corrigieron ni se auditó contenido de esas tablas; requieren revisión separada. No se declara seguridad global aprobada.

Comandos reproducibles (Node 22+):

```powershell
node scripts/test-landing-upload.mjs
node scripts/test-landing-local.mjs --pglite-module '<ruta al dist/index.js de @electric-sql/pglite>'
node node_modules/vite/bin/vite.js build
```

## Límites y evidencia

- Evidencia en `R:/Entregables-Codex/Fullness-Landing-Cecilia-20261107/Implementacion-QA-20261108/`.
- Capturas del landing: app local con lectura real. Capturas del editor: entorno aislado, datos sintéticos; no son una sesión administradora productiva.
- No se probó subida real a R2 con la sesión de Cecilia, ni Safari en un iPhone físico. La integración y los permisos se verificaron con las fronteras descritas, sin afirmar E2E productivo.
- No se tocaron pagos, cuentas TEST, órdenes, stock, Core360 ni correo. No se publica este lote sin nueva autorización.
- WIP excluido: `contextIA/fotos-mealpreps-hover-20261104.md`, `supabase/.temp/*`, `.playwright-cli/` y `runtime/` (incluidos los arneses locales). No se incorporan secretos ni sesiones al commit.
- Consulta y registro Cerebro central no operativos según su contrato local; se conserva este contexto transitorio, importación central pendiente. La guía React motivó aislamiento del borrador por cuenta, versión de almacenamiento y manejo explícito de sus fallos.
