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
    'trucha-betarraga-quinoa',
    'Trucha, betarraga y quinoa',
    'Omega 3 + antioxidantes',
    'Pescado del sur, raíces dulces, hojas verdes y granos integrales sin gluten.',
    '/api/media?key=assets%2Ffullness-food-crop.jpeg',
    8990,
    array['trucha', 'betarraga', 'quinoa', 'hojas verdes'],
    'Proteina de calidad, omega 3, fibra y antioxidantes naturales en un plato completo.',
    '{"protein_g": 34, "carbs_g": 42, "fat_g": 18, "fiber_g": 8}'::jsonb,
    10,
    true
  ),
  (
    'pollo-curcuma-vegetales',
    'Pollo, cúrcuma y vegetales',
    'Antiinflamatorio',
    'Proteína limpia con jengibre, pimienta y grasas saludables para una nutrición completa.',
    '/api/media?key=assets%2Ffullness-food-crop.jpeg',
    7990,
    array['pollo', 'curcuma', 'jengibre', 'pimienta', 'vegetales'],
    'Plato alto en proteína con especias asociadas a una alimentación antiinflamatoria.',
    '{"protein_g": 38, "carbs_g": 30, "fat_g": 16, "fiber_g": 7}'::jsonb,
    20,
    true
  ),
  (
    'legumbres-granos-oliva',
    'Legumbres, arroz integral y oliva',
    'Proteína vegetal completa',
    'Legumbres y granos integrales combinados para equilibrar energía, fibra y saciedad.',
    '/api/media?key=assets%2Ffullness-food-crop.jpeg',
    6990,
    array['legumbres', 'arroz integral', 'aceite de oliva', 'semillas'],
    'Combinación vegetal con fibra, carbohidratos complejos y grasas saludables.',
    '{"protein_g": 24, "carbs_g": 54, "fat_g": 14, "fiber_g": 12}'::jsonb,
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
