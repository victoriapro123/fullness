# Publicación autorizada del landing — 8 de noviembre de 2026

Carlos autorizó «Publica» en Sitio Fullness, después de la implementación y la galería de diapositivas solicitada en Maqueta. El lote actual terminado es 73a8515, con build y QA válidos reutilizados. Un push consolidado HEAD:main, sin mezclar WIP y sin crear ramas.

Vercel creó dpl_9gfNR13CJPngj5g1yYxXafEpw844, Git/main/Production/READY, SHA 73a8515c3877146429c57bb07a0c83712b85965f, dominio www.fullnesslab.com. La comprobación pública posterior encontró 404 para las seis fotos: `.vercelignore` excluía toda la carpeta public/images. El build local sí las incluía, lo que no acreditaba el empaquetado remoto.

Corrección focal: mantener excluidas las demás imágenes y permitir únicamente `public/images/landing-local/**`. Sin cambiar app, SQL ni fotografías; se conservan los seis originales. Se hace un push correctivo por este fallo observado, no un redeploy duplicado del mismo código. La compilación previa sigue válida; el empaquetado remoto y la lectura pública se deben verificar con el nuevo SHA.

Proyecto fullness/prj_XfS4mI7Anz7900kfL7wzGt0R4mNF, equipo team_M5NCG0lMGjLJRkSI5ZPHZ5s4. GitHub no registra check-runs ni Actions para el primer SHA; no se declara CI independiente aprobada. La compra TEST continúa detenida. No se modifican credenciales, pagos, stock ni Core360.

Recibo final, SHA correctivo y capturas: `R:/Entregables-Codex/Fullness-Landing-Cecilia-20261107/Publicacion-20261108/LEEME.md`.
