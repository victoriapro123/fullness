begin;

update public.benefit_definitions
set
  icon_url = '/api/media?key=assets%2Fbenefits%2F' || slug || '.png',
  icon_storage_path = 'assets/benefits/' || slug || '.png',
  updated_at = now()
where slug in (
  'antiinflamatorio',
  'energetico',
  'digestivo',
  'antioxidante',
  'alto-en-proteina',
  'alto-en-fibra',
  'omega-3',
  'equilibrio',
  'detox',
  'inmunidad',
  'salud-cardiovascular',
  'saciedad'
);

commit;
