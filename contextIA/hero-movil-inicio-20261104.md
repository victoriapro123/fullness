# Hero móvil e Inicio — 2026-11-04

Petición de Carlos: quitar el plato del hero en móvil y agregar Inicio al menú principal.

En el checkout existente Fullness `fullness-autonomy-release-main-20261102/app`, sin crear ramas: se consolida la ocultación del escenario del plato al final de las reglas móviles (hasta860px), conservando imagen y animación en escritorio. Inicio es el primer enlace de la definición compartida de navegación, usa la navegación existente a `#programa` y cierra el menú móvil al volver desde tienda.

Validación local: Vite build PASS (avisos preexistentes de medios runtime/bundle); Playwright confirma plato oculto390/860px y visible861/1440px. Inicio horizontal probado1920px; móvil390px retorna desde tienda al inicio y cierra menú. El menú horizontal se compacta por la regla ancho/alto existente a1440×900; no se cambió ese comportamiento. APIs/medios locales sin configuración devuelven500; no se certifica checkout ni producción con esta prueba de navegación. Sin SQL ni cambios de contenido.

WIP excluido: fotos-mealpreps-hover-20261104.md, supabase/.temp/cli-latest, runtime y .playwright-cli. Commit sólo de estos cambios terminados; sin push ni despliegue, no solicitados en este turno. Cerebro central pendiente según transición local.
