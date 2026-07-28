# Fullness Lab - Documentacion de produccion

Esta carpeta contiene manuales, onepages y evidencias de QA para operar el sitio productivo de Fullness Lab.

## Material vigente

- `onepage-sistema-platos-beneficios.pdf`: explica a Cecilia la relacion entre Biblioteca, planes, productos familiares, beneficios y tags.
- `guia-crear-mealprep.pdf`: guia operativa para crear meal preps.
- `manual-cecilia-backoffice-mercadopago.md`: operacion de backoffice y pasarela.
- `qa-catalogo-2026-07-28/`: evidencias visuales de escritorio, movil y modulo de Parametros.
- `qa/manual-compra/`: recorrido de compra documentado.

## Estado

- La tienda publica vive en `/tienda`.
- Supabase es la fuente del catalogo, Biblioteca, parametros y permisos.
- R2 almacena imagenes de productos, hero e iconos.
- Cecilia (`cecilia.prueba@fullnesslab.com`) tiene acceso administrativo completo.
- Los precios visibles y usados en checkout provienen de `menu_items.price_clp`; no existe catalogo demo como reemplazo.
- Nutricion, tags y beneficios pertenecen a los platos. Los planes los heredan de la Biblioteca.

Antes de una publicacion que toque catalogo se ejecutan:

```bash
npm run qa:parameters
npm run qa:nutrition-scope
npm run qa:catalog
npm run build
```
