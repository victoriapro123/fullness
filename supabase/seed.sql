update public.menu_items
set is_active = false,
    updated_at = now()
where slug in (
  'trucha-betarraga-quinoa',
  'pollo-curcuma-vegetales',
  'legumbres-granos-oliva'
)
and photo_url = '/api/media?key=assets%2Ffullness-food-crop.jpeg';

insert into public.menu_items (
  slug,
  name,
  tag,
  description,
  photo_url,
  price_clp,
  ingredients,
  nutrition_description,
  nutrition_highlights,
  nutrition_detail,
  nutrition_facts,
  recipe_summary,
  recipe_steps,
  display_order,
  is_active
)
values
  (
    'salmon-lentejas-hojas',
    'Salmón, lentejas y hojas verdes',
    'Omega-3 + legumbres',
    'Salmón dorado, lentejas especiadas y hojas frescas con brillo de oliva.',
    '/api/media?key=images%2Fmenu-samples%2Flentejas-hojas.jpeg',
    8990,
    array['salmon', 'lentejas', 'hojas verdes', 'aceite de oliva'],
    'Proteína de calidad, omega-3, fibra vegetal y grasas saludables.',
    array['Omega-3 natural', 'Fibra vegetal', 'Proteína de calidad', 'Energía estable'],
    'Menú pensado para combinar grasas saludables, proteína de alta calidad y fibra de legumbres en una preparación saciante y equilibrada.',
    '{"protein_g": 34, "carbs_g": 38, "fat_g": 18, "fiber_g": 9}'::jsonb,
    'Salmón dorado al punto, lentejas especiadas y hojas verdes frescas terminadas con aceite de oliva.',
    array['Dorar el salmón con calor controlado.', 'Calentar las lentejas especiadas hasta que queden cremosas.', 'Terminar con hojas verdes frescas y oliva al servir.'],
    10,
    true
  ),
  (
    'pollo-camote-hojas',
    'Pollo especiado, camote y hojas verdes',
    'Antinflamatorio',
    'Pollo con especias cálidas, puré de camote y hojas verdes frescas.',
    '/api/media?key=images%2Fmenu-samples%2Fpollo-camote-hojas.jpeg',
    7990,
    array['pollo', 'camote', 'cúrcuma', 'hojas verdes', 'oliva'],
    'Plato alto en proteína con carbohidrato complejo y especias funcionales.',
    array['Alto en proteína', 'Carbohidrato complejo', 'Especias antinflamatorias', 'Saciedad prolongada'],
    'Preparación equilibrada para sostener energía durante el día, con especias cálidas y vegetales que aportan color, fibra y sabor.',
    '{"protein_g": 38, "carbs_g": 34, "fat_g": 16, "fiber_g": 7}'::jsonb,
    'Pollo especiado con cúrcuma, puré rústico de camote y hojas verdes frescas.',
    array['Sellar el pollo con especias cálidas.', 'Acompañar con puré de camote de textura suave.', 'Agregar hojas verdes al final para mantener frescura.'],
    20,
    true
  ),
  (
    'salmon-arroz-palta',
    'Salmón glaseado, arroz verde y palta',
    'Grasas saludables',
    'Salmón glaseado con arroz verde, palta, mango y hierbas frescas.',
    '/api/media?key=images%2Fmenu-samples%2Fsalmon-arroz-avocado.jpeg',
    8990,
    array['salmón', 'arroz verde', 'palta', 'mango', 'cilantro'],
    'Proteína, grasas saludables y carbohidratos de energía estable.',
    array['Grasas saludables', 'Proteína completa', 'Carbohidrato de energía estable', 'Hierbas frescas'],
    'Menú diseñado para entregar energía amable y textura fresca, combinando salmón, palta y arroz verde con notas herbales.',
    '{"protein_g": 34, "carbs_g": 44, "fat_g": 20, "fiber_g": 8}'::jsonb,
    'Salmón glaseado, arroz verde, palta, mango y hierbas frescas con terminación brillante.',
    array['Glasear el salmón hasta lograr una superficie intensa.', 'Servir con arroz verde tibio.', 'Terminar con palta, mango y hierbas frescas.'],
    30,
    true
  )
on conflict (slug) do update
set name = excluded.name,
    tag = excluded.tag,
    description = excluded.description,
    photo_url = excluded.photo_url,
    price_clp = excluded.price_clp,
    ingredients = excluded.ingredients,
    nutrition_description = excluded.nutrition_description,
    nutrition_highlights = excluded.nutrition_highlights,
    nutrition_detail = excluded.nutrition_detail,
    nutrition_facts = excluded.nutrition_facts,
    recipe_summary = excluded.recipe_summary,
    recipe_steps = excluded.recipe_steps,
    display_order = excluded.display_order,
    is_active = excluded.is_active,
    updated_at = now();
