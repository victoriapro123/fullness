begin;
create unique index mealprep_one_product_per_recipe on public.menu_items(library_meal_id)
 where product_type='mealprep' and library_meal_id is not null;
create table public.mealprep_commercial_link_audit(
 id uuid primary key default gen_random_uuid(),actor_id uuid not null references public.profiles(id),
 menu_item_id uuid not null references public.menu_items(id),before_value jsonb,after_value jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table public.mealprep_commercial_link_audit enable row level security;
revoke all on public.mealprep_commercial_link_audit from public,anon,authenticated;
grant select,insert on public.mealprep_commercial_link_audit to service_role;

-- Canonical facts are resolved by the owner-only server endpoint; this RPC is
-- service-only and does not grant the browser authority over price or stock.
create function public.link_plan_mealprep(p_document jsonb,p_expected_version text,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare recipe public.meal_library_items; product public.menu_items; mapping public.core360_product_mappings;
 prior jsonb; product_id uuid; result jsonb;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_admin) then raise exception 'Sin permisos' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('mealprep-link:'||(p_document->>'libraryMealId'),0));
 select * into recipe from public.meal_library_items where id=(p_document->>'libraryMealId')::uuid and is_active for share;
 if recipe.id is null then raise exception 'La receta ya no está activa'; end if;
 if coalesce(p_document->>'coreItemId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  or coalesce(p_document->>'grossMinor','') !~ '^[1-9][0-9]*$' or (p_document->>'grossMinor')::numeric>1000000
  or coalesce(p_document->>'taxBps','') !~ '^[0-9]+$' or (p_document->>'taxBps')::integer>10000
  or coalesce(p_document->>'commercialVersion','')='' or coalesce(p_document->>'unit','')='' or coalesce(p_document->>'sku','')=''
 then raise exception 'Core360 debe confirmar identidad, precio, impuesto y unidad'; end if;
 select * into product from public.menu_items where library_meal_id=recipe.id and product_type='mealprep' for update;
 if product.id is not null then select * into mapping from public.core360_product_mappings where source_menu_item_id=product.id for update; end if;
 if coalesce(mapping.updated_at::text,'')<>coalesce(nullif(p_expected_version,''),'') then
  -- Compare instants, not PostgREST's ISO representation of the same timestamp.
  if mapping.updated_at is null or nullif(p_expected_version,'') is null or mapping.updated_at<>p_expected_version::timestamptz
   then raise exception 'El vínculo cambió. Consulta su versión antes de guardar' using errcode='40001'; end if;
 end if;
 if product.id is not null and mapping.core_item_id is distinct from p_document->>'coreItemId'
  and exists(select 1 from public.order_items where order_items.product_id=product.id)
 then raise exception 'No se cambia la identidad de un producto con pedidos históricos'; end if;
 prior:=jsonb_build_object('product',to_jsonb(product),'mapping',to_jsonb(mapping));
 product_id:=coalesce(product.id,gen_random_uuid());
 insert into public.menu_items(id,slug,sku,name,description,photo_url,price_clp,currency,product_type,plan_frequency,library_meal_id,is_active)
 values(product_id,coalesce(product.slug,'mealprep-'||product_id::text),coalesce(product.sku,'MP-'||product_id::text),recipe.name,coalesce(recipe.description,''),recipe.photo_url,
  (p_document->>'grossMinor')::numeric,'CLP','mealprep',null,recipe.id,true)
 on conflict(id) do update set name=excluded.name,description=excluded.description,photo_url=excluded.photo_url,price_clp=excluded.price_clp,is_active=true,updated_at=clock_timestamp();
 insert into public.core360_product_mappings(source_menu_item_id,core_item_id,core_sku,quantity_milli_per_unit,uom_code,commercial_version,gross_unit_price_minor,tax_bps,is_active,created_by,updated_by)
 values(product_id,p_document->>'coreItemId',p_document->>'sku',1000,p_document->>'unit',p_document->>'commercialVersion',(p_document->>'grossMinor')::numeric,(p_document->>'taxBps')::integer,true,p_actor,p_actor)
 on conflict(source_menu_item_id) do update set core_item_id=excluded.core_item_id,core_sku=excluded.core_sku,uom_code=excluded.uom_code,commercial_version=excluded.commercial_version,
  gross_unit_price_minor=excluded.gross_unit_price_minor,tax_bps=excluded.tax_bps,is_active=true,updated_by=p_actor,updated_at=clock_timestamp();
 select jsonb_build_object('product',to_jsonb(m),'mapping',to_jsonb(mp)) into result from public.menu_items m join public.core360_product_mappings mp on mp.source_menu_item_id=m.id where m.id=product_id;
 insert into public.mealprep_commercial_link_audit(actor_id,menu_item_id,before_value,after_value) values(p_actor,product_id,prior,result);
 return result;
end $$;
revoke all on function public.link_plan_mealprep(jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.link_plan_mealprep(jsonb,text,uuid) to service_role;
notify pgrst,'reload schema';
commit;
