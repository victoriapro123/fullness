# Planes: indicaciones amables y familiares separados

Solicitud de Carlos, 03/11/2026: reducir restricciones visibles, mostrar condiciones a demanda, avisar al intentar una tercera porción o una segunda duplicación y separar los platos familiares de los planes.

Implementación propia en el checkout Fullness existente `Core360 SaaS/.local/fullness-autonomy-release-main-20261102/app`, sobre el último release b698498. No es trabajo de Core360. No se creó rama/chat; se preservó el WIP de la carpeta canónica fullness. No hay autorización nueva de push en esta petición: cambio local preparado.

- Condiciones plegadas inicialmente; introducción breve y avance positivo de seis platos.
- Primera duplicación libre; intentos inválidos abren dialog nativo accesible. Cerrar por botón o Escape conserva selección y devuelve foco. El fondo no descarta platos.
- Mismas reglas comerciales y validación final: 6 / 4×6, máximo dos por plato y una duplicación por semana. Sin cambios SQL, inventario, precios, integraciones o cobros.
- Navegación entre dos secciones; familiares con margen, línea y diamantes, título Platos familiares y compra individual explícita. Misma paleta.
- Controles de 44px, foco visible, resumen no flotante en móvil, una columna a 360px o menos, imágenes proporcionadas. Texto del carrito simplificado.

Verificaciones: test-plan-guidance.mjs (12 aserciones); Vite build; diff --check. QA local Chromium con estilos reales, carta obtenida sólo por GET del API público y medios públicos; familiares son ejemplos locales, no evidencia de cambios de catálogo. Probados avisos tercera porción / segunda duplicación, cierre por botón / Escape, selección conservada, seis platos aceptados en carrito con desglose. Revisión de anchos 320/390/768/1440; corregido overflow de controles a 320px. No hubo pedido ni pago real. No certifica Safari físico ni producción.

Capturas: `R:/Entregables-Codex/Fullness-UX-Planes-20261103`. Guías web y React aplicadas a foco, semántica, dialog, contraste y tamaño de controles. Fuente revisada: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md . ContextIA local transitorio; importación central Cerebro pendiente.
