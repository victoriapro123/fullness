# Tienda en construcción — hotfix Main

Carlos autorizó en Infra mostrar «En construcción» sólo en ecommerce, bloquear compras y reactivar el resto del sitio (mensajes humanos 01a19f21-07c9-7163-9212-eec64c968b79 y 01a19f21-d17a-77f1-8f51-57b9724fea62). Main publica; Infra conserva pausa/despausa Vercel.

Checkout aislado de main productivo c2093e7d549b0c67e25c441270738597e52b474a. Sin WIP de inventario/autonomía, SQL, nuevos datos, credenciales o funciones de pagos anteriores.

Una bandera compartida bloquea la tienda y fichas/carrito/checkout públicos, oculta el formulario de compra, bloquea agregar al carrito y rechaza cotización/nueva preferencia con 503 SHOP_UNDER_CONSTRUCTION antes de leer el cuerpo o llamar a servicios. La función de creación también comprueba la bandera, para cubrir llamadas alternativas. Se conserva el carrito almacenado y los retornos, consulta, conciliación y webhooks de pagos existentes; cabecera, pie, inicio, carta, comunidad, contenido y backoffice mantienen sus rutas.

No desactivar la bandera ni reabrir compras como efecto de integrar otro WIP. Reapertura requiere cierre aceptado y autorización humana vigente. Destino: victoriapro123/fullness main → Vercel fullness Production → www.fullnesslab.com. Una publicación Git, sin Preview ni segundo deploy CLI. Recibo/evidencia Main en R:/Entregables-Codex/Fullness-Tienda-En-Construccion-20261103.
