import {randomUUID,createHash} from 'node:crypto';
import {normalizeCustomPlan} from './custom-plans.mjs';
import {getProductAvailability} from '../src/lib/product-availability.js';
import {normalizeMixItem} from './mix-commerce.mjs';
export const SALE_AUTHORITY='fullness_sale_capacity_v1';
export const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(s);
export const saleError=(message,statusCode=409)=>Object.assign(Error(message),{statusCode});
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const saleDigest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
export async function saleAuthorityEnabled(supabase){const r=await supabase.from('custom_plan_settings').select('enabled,stock_authority').eq('id',true).maybeSingle();if(r.error){if(['42703','PGRST204'].includes(r.error.code))return false;throw saleError('No pudimos consultar la tienda. Inténtalo nuevamente.',503);}return r.data?.stock_authority===SALE_AUTHORITY;}
export async function readSaleOffers({supabase,admin=false}){
 const [m,l]=await Promise.all([supabase.from('menu_items').select('*').eq('product_type','mealprep').order('display_order'),supabase.from('meal_library_items').select('*').order('name')]);if(m.error||l.error)throw saleError('No pudimos cargar los mealpreps. Inténtalo nuevamente.',503);
 return (l.data||[]).map(recipe=>{const menu=m.data.find(m=>m.id===recipe.sale_menu_item_id&&m.library_meal_id===recipe.id);const price=Number(recipe.sale_price_clp);return{menuItemId:menu?.id||null,libraryMealId:recipe.id,saleCategory:recipe.sale_category||null,name:recipe.name,description:recipe.description||'',photoUrl:recipe.photo_url||'',secondaryPhotoUrl:recipe.secondary_photo_url||'',priceClp:Number.isSafeInteger(price)&&price>0?price:null,ingredients:recipe.ingredients||[],ingredientsText:(recipe.ingredients||[]).join(', '),allergens:recipe.allergens||[],nutritionDescription:recipe.nutrition_description||'',nutritionFacts:recipe.nutrition_facts||{},nutritionHighlights:recipe.nutrition_highlights||[],benefitTags:recipe.benefit_tags||[],rethermalizationInstructions:recipe.rethermalization_instructions||'',availabilityMode:'active_only',published:recipe.is_active===true&&recipe.available_for_plans===true&&Boolean(menu?.is_active)&&price>0&&Number(menu?.price_clp)===price,revision:recipe.updated_at||'',...(admin?{slug:menu?.slug||''}:{} )};});
}
export async function readSaleLetter({supabase,admin=false,now=new Date()}){
 const [l,s,offers]=await Promise.all([supabase.from('stock_letters').select('*').eq('state','active').order('updated_at',{ascending:false}).limit(1),supabase.from('custom_plan_settings').select('enabled').eq('id',true).maybeSingle(),readSaleOffers({supabase,admin})]);
 if(l.error||s.error)throw saleError('No pudimos cargar la carta. Inténtalo nuevamente.',503);
 const letter=l.data[0]||null;
 const e=letter?await supabase.from('stock_letter_items').select('*').eq('letter_id',letter.id).order('position'):{data:[],error:null};if(e.error)throw saleError('No pudimos cargar los platos. Inténtalo nuevamente.',503);
 const items=offers.filter(o=>admin||o.published).map(o=>{const entry=e.data.find(e=>e.menu_item_id===o.menuItemId);return{...o,id:entry?.id||o.libraryMealId,title:o.name,availableForPlans:o.published,availabilityLabel:o.published?'Disponible':'No disponible',commercialReady:o.priceClp>0,stockAuthority:SALE_AUTHORITY};});
 return{enabled:s.data?.enabled===true,stockAuthority:SALE_AUTHORITY,letter,items,...(admin?{offers,letters:l.data,choices:offers.map(o=>({id:o.menuItemId,name:o.name,product_type:'mealprep',library_meal_id:o.libraryMealId}))}:{})};
}
export async function resolveSaleCart(cart,{supabase,now=new Date()}){
 const current=await readSaleLetter({supabase,now});if(!current.enabled&&cart.some(c=>c.kind==='custom_plan'))throw saleError('La tienda está actualizando su carta. Inténtalo en unos minutos.');
 const all=await supabase.from('menu_items').select('*').eq('is_active',true);if(all.error)throw saleError('No pudimos revisar tu carrito.',503);
 const lines=[],groups=[];
 for(const raw of cart){
  if(raw.kind==='mealprep'){
   const choice=normalizeMixItem(raw),entry=current.items.find(i=>i.libraryMealId===choice.libraryMealId);
   const menu=all.data.find(p=>p.id===entry?.menuItemId&&p.product_type==='mealprep');
   if(!current.enabled||!entry?.availableForPlans||!menu)throw saleError('Un mealprep ya no está disponible. Revisa tu selección.');
   const price=Number(menu.price_clp);if(!Number.isSafeInteger(price)||price<=0||price!==entry.priceClp)throw saleError('El precio de un plato cambió. Revisa tu selección.');
   lines.push({product:{...menu,name:entry.title,description:entry.description,photo_url:entry.photoUrl,secondary_photo_url:entry.secondaryPhotoUrl,ingredients:entry.ingredients,allergens:entry.allergens,nutrition_facts:entry.nutritionFacts,nutrition_description:entry.nutritionDescription},quantity:choice.quantity,total:price*choice.quantity});continue;
  }
  if(raw.kind!=='custom_plan'){
   const product=all.data.find(p=>p.slug===raw.slug&&p.product_type==='family');if(!product||!Number.isSafeInteger(raw.quantity)||raw.quantity<1||raw.quantity>20||Number(product.price_clp)<=0||!getProductAvailability(product,now).available)throw saleError('Un producto cambió. Revisa el carrito.');
   lines.push({product,quantity:raw.quantity,total:Number(product.price_clp)*raw.quantity});continue;
  }
  const plan=normalizeCustomPlan(raw);if(!current.letter||plan.letterId!==current.letter.id||plan.revision!==current.letter.revision)throw saleError('La carta cambió. Revisa tu selección antes de pagar.');
  const g={id:randomUUID(),letterId:plan.letterId,revision:plan.revision,title:current.letter.title,size:plan.size,quantity:plan.quantity,unitTotal:0,items:[],stockAuthority:SALE_AUTHORITY};
  for(const choice of plan.selection){const entry=current.items.find(i=>i.id===choice.itemId),menu=all.data.find(p=>p.id===entry?.menuItemId&&p.product_type==='mealprep');if(!entry?.availableForPlans||!menu)throw saleError('Un mealprep ya no está disponible. Revisa tu selección.');const price=Number(menu.price_clp);if(!Number.isSafeInteger(price)||price<=0)throw saleError('El precio de un plato cambió. Revisa tu selección.');
   const quantity=choice.quantity*plan.quantity;
   g.unitTotal+=price*choice.quantity;g.items.push({itemId:entry.id,menuItemId:menu.id,week:choice.week??1,name:entry.title,quantity:choice.quantity,unitPrice:price});
   lines.push({product:{...menu,name:entry.title,description:entry.description,photo_url:entry.photoUrl,nutrition_facts:entry.nutritionFacts,nutrition_description:entry.nutritionDescription,allergens:entry.allergens,custom_plan:g,ingredients:entry.ingredients},quantity,total:price*quantity});
  }groups.push(g);
 }
 return{lines,groups,stockAuthority:SALE_AUTHORITY};
}
