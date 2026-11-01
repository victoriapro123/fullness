import {randomUUID} from 'node:crypto';
import {CUSTOM_PLAN_SIZES,UUID_PATTERN,normalizePlanSelection,planError} from '../src/lib/custom-plans.js';
import {santiagoDate} from '../src/lib/product-availability.js';
import {readCore360Catalog,readCore360Stock,readCore360PlanFacts,readCore360PlanProfiles,isCore360CommerceOrderSyncEnabled,planStockObservation} from './core360-commerce-adapter.mjs';
import {selectCorePlanProfile,assertCorePlanReservation} from './core360-plan-contract.mjs';
import {availabilityStatus} from '../src/lib/local-menu.js';

export function normalizeCustomPlan(row) {
 if(!UUID_PATTERN.test(String(row.letterId||''))||!Number.isSafeInteger(row.revision)||row.revision<1
   ||!CUSTOM_PLAN_SIZES.includes(row.size)
   ||!Number.isSafeInteger(row.quantity)||row.quantity<1||row.quantity>20)throw planError('Revisa el formato y la versión de tu plan.');
 const selection=normalizePlanSelection(row.selection,{size:row.size});
 if(selection.reduce((n,r)=>n+r.quantity,0)!==row.size)throw planError(`Completa exactamente ${row.size} mealpreps.`);
 for(let week=1;week<=(row.size===24?4:1);week++)if(selection.filter(r=>r.week===week).reduce((n,r)=>n+r.quantity,0)!==6)throw planError(`Completa exactamente 6 mealpreps en la semana ${week}.`);
 return {kind:'custom_plan',letterId:row.letterId,revision:row.revision,size:row.size,quantity:row.quantity,selection};
}
export async function readStockLetter({supabase,now=new Date(),admin=false,env=process.env,fetchImpl=fetch}={}) {
 let query=supabase.from('stock_letters').select('*').order('updated_at',{ascending:false});
 if(!admin)query=query.eq('state','active').lte('starts_on',santiagoDate(now)).gt('ends_on',santiagoDate(now));
 const {data:letters,error}=await query;
 // A deployment before this additive migration remains safely on its old model.
 if(error?.code==='PGRST205')return {enabled:false,letters:[],letter:null,items:[]};
 if(error)throw planError('No pudimos consultar la carta.',503);
 const {data:settings,error:settingsError}=await supabase.from('custom_plan_settings').select('enabled').eq('id',true).single();
 if(settingsError)throw planError('No pudimos consultar la modalidad de compra.',503);
 const letter=(admin?letters?.find(l=>l.state!=='closed'):letters?.[0])||letters?.[0]||null;
 if(!letter)return {enabled:settings.enabled,letters:letters||[],letter:null,items:[]};
 const {data:entries,error:entryError}=await supabase.from('stock_letter_items').select('*').eq('letter_id',letter.id).order('position');
 if(entryError)throw planError('No pudimos consultar los platos.',503);
 const ids=(entries||[]).map(x=>x.menu_item_id).filter(Boolean);
 let menus=[],prices=[],stocks=[],availability=[],recipes=[],liveFacts=false;
 if(ids.length){
  const results=await Promise.all([
   supabase.from('menu_items').select('*').in('id',ids),
   supabase.from('core360_catalog_projection').select('*').in('source_menu_item_id',ids),
   supabase.from('core360_stock_projection').select('*').in('source_menu_item_id',ids),
   supabase.from('mealprep_availability').select('*'),
   supabase.from('meal_library_items').select('id,description,photo_url,ingredients,allergens').eq('is_active',true)
  ]);
  if(results.some(r=>r.error))throw planError('No pudimos consultar precio y stock Core360.',503);
  [menus,prices,stocks,availability,recipes]=results.map(r=>r.data||[]);
  if(env.FULLNESS_CUSTOM_PLANS_ENABLED==='true'){
   const mappings=await supabase.from('core360_product_mappings').select('*').in('source_menu_item_id',ids).eq('is_active',true);
   if(mappings.error)throw planError('No pudimos consultar las identidades canónicas.',503);
   try{({prices,stocks}=await readCore360PlanFacts({env,fetchImpl,mappings:mappings.data||[]}));liveFacts=true;}
   catch(error){if(!admin)throw error;prices=[];stocks=[];}
  }
 }
 const items=(entries||[]).map(entry=>{
  const menu=menus.find(m=>m.id===entry.menu_item_id),price=prices.find(m=>m.source_menu_item_id===entry.menu_item_id),stock=stocks.find(m=>m.source_menu_item_id===entry.menu_item_id);
  const fresh=liveFacts||(stock?.observed_at&&now-new Date(stock.observed_at)>=0&&now-new Date(stock.observed_at)<=120000);
  const recipe=recipes.find(r=>r.id===menu?.library_meal_id);
  const ready=Boolean(recipe)&&menu?.is_active===true&&price?.core_item_available===true&&price?.price_available===true&&price?.uom_compatible===true&&price?.factor_compatible===true&&price?.currency==='CLP';
  const available=ready&&fresh&&stock?.stock_known===true&&stock?.inventory_managed===true&&stock?.core_item_id===price?.core_item_id;
  const declared=availability.find(a=>a.library_meal_id===menu?.library_meal_id);
  const editorial=availabilityStatus(declared?{state:declared.state,startsOn:declared.starts_on,endsOn:declared.ends_on}:null,now);
  return {id:entry.id,title:entry.title,menuItemId:entry.menu_item_id,libraryMealId:entry.library_meal_id,
   photoUrl:recipe?.photo_url||menu?.photo_url||'',description:recipe?.description||menu?.description||'',ingredients:recipe?.ingredients||[],allergens:recipe?.allergens||[],priceClp:ready?Number(price.gross_minor):null,
   availableUnits:editorial.available?(available?Math.floor(Number(stock.available_milli)/Number(price.quantity_milli_per_unit)):null):0,
   availabilityLabel:recipe?editorial.label:'Preparación no disponible',availableForPlans:Boolean(recipe)&&editorial.available,
   observedAt:stock?.observed_at||null,commercialReady:ready===true};
 });
 let choices;
 if(admin){const options=await supabase.from('menu_items').select('id,name,product_type,library_meal_id').in('product_type',['mealprep','family']).order('name');if(options.error)throw planError('No pudimos consultar los vínculos de platos.',503);choices=options.data||[];}
 let contractReady=false;
 if(env.FULLNESS_CUSTOM_PLANS_ENABLED==='true'&&isCore360CommerceOrderSyncEnabled(env))try{const profiles=await readCore360PlanProfiles({env,fetchImpl});selectCorePlanProfile(profiles.rows,6);selectCorePlanProfile(profiles.rows,24);contractReady=profiles.contractVersion==='commerce-plans/1';}catch{}
 return {enabled:settings.enabled,letters:admin?letters:undefined,letter,items,choices,
  ...(admin?{readiness:customPlanReadiness({letter,items,contractReady})}:{})};
}

export function customPlanReadiness({letter,items=[],contractReady=false}) {
 const linked=items.filter(i=>i.menuItemId).length;
 const priced=items.filter(i=>i.commercialReady).length;
 const stocked=items.filter(i=>i.availableForPlans&&Number.isSafeInteger(i.availableUnits)&&i.availableUnits>0).length;
 const blockers=[];
 if(!letter||letter.state!=='active')blockers.push('La carta todavía no está activa.');
 if(!items.length||linked!==items.length)blockers.push('Faltan productos individuales vinculados por identidad comercial, no familiares.');
 if(priced!==items.length||!items.length)blockers.push('Faltan precios canónicos válidos en Core360.');
 if(stocked<5)blockers.push('Se necesitan al menos cinco preparaciones disponibles y stock suficiente para completar seis.');
 else if(items.reduce((n,i)=>n+(i.availableForPlans&&Number.isSafeInteger(i.availableUnits)?Math.min(1,i.availableUnits):0),0)<6&&!items.some(i=>i.availableForPlans&&i.availableUnits>=2))blockers.push('No alcanza el stock confirmado para seis unidades con una sola duplicación.');
 if(!contractReady)blockers.push('Core360 aún no confirmó los perfiles y el contrato de reserva de planes.');
 return {linked,priced,stocked,total:items.length,paymentReady:blockers.length===0,blockers};
}

export async function resolveCustomPlans(cart,{supabase,env,fetchImpl=fetch,now=new Date(),readCatalog=readCore360Catalog,readStock=readCore360Stock}={}) {
 const current=await readStockLetter({supabase,now,env,fetchImpl});
 if(!current.enabled||!current.letter)throw planError('La nueva carta aún no está habilitada.',409);
 if(cart.some(row=>row.kind!=='custom_plan'))throw planError('La selección del plan no es válida.',409);
 const ids=current.items.map(i=>i.menuItemId).filter(Boolean);
 const [{data:menus,error},{data:mappings,error:mappingError}]=await Promise.all([
  supabase.from('menu_items').select('*').in('id',ids).eq('is_active',true),
  supabase.from('core360_product_mappings').select('*').in('source_menu_item_id',ids).eq('is_active',true)
 ]);
 if(error||mappingError)throw planError('No pudimos validar la identidad de los mealpreps.',503);
 const facts=new Map();const needed=new Map();const groups=[];const lines=[];
 for(const plan of cart){
  if(plan.letterId!==current.letter.id||plan.revision!==current.letter.revision||!current.letter.plan_sizes.includes(plan.size))throw planError('La carta o el formato cambiaron. Revisa tu plan.',409);
  const group={id:randomUUID(),letterId:plan.letterId,revision:plan.revision,title:current.letter.title,size:plan.size,quantity:plan.quantity,unitTotal:0,items:[]};
  const perCoreMeal=new Map();
  for(const choice of plan.selection){
   const entry=current.items.find(i=>i.id===choice.itemId),menu=menus.find(m=>m.id===entry?.menuItemId),mapping=mappings.find(m=>m.source_menu_item_id===menu?.id);
   if(!entry||!menu||!mapping||menu.product_type!=='mealprep')throw planError('Un plato ya no pertenece a la carta. Los familiares se compran aparte.',409);
   if(!entry.availableForPlans)throw planError(`${entry.title}: ${entry.availabilityLabel}. Revisa tu selección.`,409);
   let product=facts.get(menu.id);
   if(!product){
    const catalog=await readCatalog({env,fetchImpl,query:{q:mapping.core_sku,limit:100,quantityMilli:String(mapping.quantity_milli_per_unit),issuedOn:santiagoDate(now)}});
    const stock=await readStock({env,fetchImpl,query:{itemId:mapping.core_item_id,limit:100,issuedOn:santiagoDate(now)}});
    const c=catalog.rows?.find(r=>r.id===mapping.core_item_id),s=planStockObservation(c,stock.rows||[],mapping.core_item_id);
    const price=Number(c?.lineGrossMinor),available=s.available_milli;
    if(!catalog.enabled||!stock.enabled||!c||!s||c.sale_enabled===false||c.saleEnabled===false||c.is_active===false||c.isActive===false||c.active===false||c.price_available===false||c.priceAvailable===false
     ||['archived','disabled','inactive','retired'].includes(String(c.status||'').toLowerCase())||s.stock_known!==true
     ||c.currency!=='CLP'||c.unit!==mapping.uom_code||Number(mapping.quantity_milli_per_unit)!==1000||Number(c.quantityMilli??c.quantity_milli)!==Number(mapping.quantity_milli_per_unit)
     ||!c.commercialVersion||!Number.isSafeInteger(price)||price<=0||!/^\d+$/.test(String(available??''))
     ||s.inventory_enabled===false||s.inventoryManaged===false)throw planError(`${entry.title}: Core360 no confirmó precio o stock.`,409);
    product={...menu,description:entry.description,photo_url:entry.photoUrl,ingredients:entry.ingredients,allergens:entry.allergens,price_clp:price,core360_item_id:c.id,core360_sku:c.sku,core360_commercial_version:c.commercialVersion,
      core360_uom_code:c.unit,core360_quantity_milli_per_unit:Number(mapping.quantity_milli_per_unit),core360_tax_bps:(c.taxBps??c.tax_bps)==null?NaN:Number(c.taxBps??c.tax_bps),stockAvailableMilli:BigInt(available)};
    if(!Number.isSafeInteger(product.core360_tax_bps)||product.core360_tax_bps<0)throw planError('Impuesto canónico no disponible.',409);
    facts.set(menu.id,product);
   }
   const quantity=choice.quantity*plan.quantity;
   const week=choice.week??1,key=`${week}:${product.core360_item_id}`;
   perCoreMeal.set(key,(perCoreMeal.get(key)||0)+choice.quantity);
   if(perCoreMeal.get(key)>2)throw planError('Máximo 2 unidades del mismo mealprep en una semana, aunque aparezca con otro identificador.');
   if([...perCoreMeal].filter(([k,n])=>k.startsWith(`${week}:`)&&n===2).length>1)throw planError('Sólo un plato puede estar duplicado en cada semana.');
   needed.set(product.core360_item_id,(needed.get(product.core360_item_id)||0n)+BigInt(quantity)*BigInt(product.core360_quantity_milli_per_unit));
   group.unitTotal+=product.price_clp*choice.quantity;
   group.items.push({itemId:entry.id,menuItemId:menu.id,coreItemId:product.core360_item_id,week,name:menu.name,quantity:choice.quantity,unitPrice:product.price_clp});
   lines.push({product:{...product,custom_plan:group},quantity,total:product.price_clp*quantity});
  }
  groups.push(group);
 }
 for(const p of facts.values())if(needed.get(p.core360_item_id)>p.stockAvailableMilli)throw planError(`${p.name}: no hay stock suficiente para todos tus planes.`,409);
 return {lines,groups};
}

// Reading stock or flipping a flag is insufficient: require the canonical hold.
export function assertCustomPlanPaymentReady({reservation,externalOrderId,checkout}={}){return assertCorePlanReservation(reservation,externalOrderId,new Date(),checkout);}
