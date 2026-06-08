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
  nutrition_facts,
  display_order,
  is_active
)
values
  (
    'salmon-lentejas-hojas',
    'Salmón, lentejas y hojas verdes',
    'Omega 3 + legumbres',
    'Salmón dorado, lentejas especiadas y hojas frescas con brillo de oliva.',
    '/images/menu-samples/lentejas-hojas.jpeg',
    8990,
    array['salmon', 'lentejas', 'hojas verdes', 'aceite de oliva'],
    'Proteina de calidad, omega 3, fibra vegetal y grasas saludables.',
    '{"protein_g": 34, "carbs_g": 38, "fat_g": 18, "fiber_g": 9}'::jsonb,
    10,
    true
  ),
  (
    'pollo-camote-hojas',
    'Pollo especiado, camote y hojas verdes',
    'Antiinflamatorio',
    'Pollo con especias cálidas, puré de camote y hojas verdes frescas.',
    '/images/menu-samples/pollo-camote-hojas.jpeg',
    7990,
    array['pollo', 'camote', 'curcuma', 'hojas verdes', 'oliva'],
    'Plato alto en proteína con carbohidrato complejo y especias funcionales.',
    '{"protein_g": 38, "carbs_g": 34, "fat_g": 16, "fiber_g": 7}'::jsonb,
    20,
    true
  ),
  (
    'salmon-arroz-palta',
    'Salmón glaseado, arroz verde y palta',
    'Grasas saludables',
    'Salmón glaseado con arroz verde, palta, mango y hierbas frescas.',
    '/images/menu-samples/salmon-arroz-avocado.jpeg',
    8990,
    array['salmon', 'arroz verde', 'palta', 'mango', 'cilantro'],
    'Proteina, grasas saludables y carbohidratos de energia estable.',
    '{"protein_g": 34, "carbs_g": 44, "fat_g": 20, "fiber_g": 8}'::jsonb,
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
    nutrition_facts = excluded.nutrition_facts,
    display_order = excluded.display_order,
    is_active = excluded.is_active,
    updated_at = now();
