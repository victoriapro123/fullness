import {MENU_SECTIONS, EMPTY_LOCAL_MENU, availabilityStatus, validateAvailability} from '../src/lib/local-menu.js';
import {UUID_PATTERN} from '../src/lib/custom-plans.js';

const fail=(message,statusCode=422)=>Object.assign(Error(message),{statusCode});
export function normalizeLocalMenu(input) {
  if(!input||!Array.isArray(input.items)||input.items.length>100)throw fail('La carta admite hasta 100 productos.');
  if(!Number.isSafeInteger(input.lunchPrice)||input.lunchPrice<1||input.lunchPrice>1000000)throw fail('Revisa el precio de Fullness Lunch.');
  const text=(value,max)=>{if(typeof value!=='string'||value.length>max)throw fail('Revisa los textos de la carta.');return value.trim();};
  const ids=new Set(),slots=new Set(),lunchMeals=new Set();
  const items=input.items.map(r=>{
    if(!r||!/^[-a-zA-Z0-9_]{1,80}$/.test(r.id||'')||ids.has(r.id))throw fail('Cada producto necesita un identificador único.');ids.add(r.id);
    if(!MENU_SECTIONS.some(([id])=>id===r.section)||['lunch','mealpreps'].includes(r.section))throw fail('Selecciona una sección de productos válida.');
    const name=text(r.name,240);if(name.length<3)throw fail('Indica el nombre del producto.');
    if(!Number.isSafeInteger(r.price)||r.price<1||r.price>1000000)throw fail(`Revisa el precio de ${name}.`);
    const libraryMealId=r.libraryMealId||'';if(libraryMealId&&!UUID_PATTERN.test(libraryMealId))throw fail('El vínculo a la receta no es válido.');
    const lunchSlot=r.lunchSlot??null;
    if(lunchSlot!==null&&(!Number.isInteger(lunchSlot)||lunchSlot<1||lunchSlot>5||slots.has(lunchSlot)||!libraryMealId||r.section!=='individuales'))throw fail('Lunch admite cinco posiciones distintas, vinculadas a recetas reales.');
    if(lunchSlot!==null){if(lunchMeals.has(libraryMealId))throw fail('Lunch requiere cinco recetas distintas.');slots.add(lunchSlot);lunchMeals.add(libraryMealId);}
    const availability={state:r.state,startsOn:r.startsOn||'',endsOn:r.endsOn||''};validateAvailability(availability);
    return {id:r.id,section:r.section,name,description:text(r.description||'',2000),price:r.price,libraryMealId,lunchSlot,...availability};
  });
  return {lunchPrice:input.lunchPrice,lunchDescription:text(input.lunchDescription||'',1000),items};
}
export function availabilityRow(r) {return {libraryMealId:r.library_meal_id,state:r.state,startsOn:r.starts_on||'',endsOn:r.ends_on||'',revision:r.revision};}
export async function readLocalMenu({supabase,admin=false,now=new Date()}={}) {
  const [{data:settings,error},{data:availability,error:avError},{data:library,error:libError}]=await Promise.all([
    supabase.from('local_menu_settings').select('*').eq('id',true).single(),
    supabase.from('mealprep_availability').select('*'),
    supabase.from('meal_library_items').select('id,name,description,photo_url,is_active').eq('is_active',true).order('name')
  ]);
  if(error||avError||libError)throw fail('No pudimos cargar la carta actual. Vuelve a intentar o consulta en el local.',503);
  const availabilityItems=(availability||[]).map(availabilityRow);
  if(admin){
    const {data:versions,error:versionError}=await supabase.from('local_menu_versions').select('revision,action,snapshot,created_at').order('revision',{ascending:false}).limit(12);
    if(versionError)throw fail('No pudimos cargar el historial de la carta.',503);
    return {revision:settings.revision,document:settings.document||EMPTY_LOCAL_MENU,publishedAt:settings.published_at,library,availability:availabilityItems,versions:versions||[]};
  }
  const document=settings.published_document;
  if(!document)return {published:false,items:[],mealpreps:[],sections:MENU_SECTIONS};
  const currentAvailability=id=>availabilityStatus(availabilityItems.find(r=>r.libraryMealId===id),now);
  const items=(document.items||[]).filter(r=>availabilityStatus(r,now).available&&(!r.libraryMealId||(library.some(m=>m.id===r.libraryMealId)&&currentAvailability(r.libraryMealId).available)));
  // Only deliberately published library links are exposed; no recipe = stock inference.
  const mealpreps=library.filter(m=>document.items.some(r=>r.libraryMealId===m.id&&availabilityStatus(r,now).available)&&currentAvailability(m.id).available).map(m=>({id:m.id,name:m.name,description:m.description,photoUrl:m.photo_url}));
  return {published:true,lunchPrice:document.lunchPrice,lunchDescription:document.lunchDescription,items,mealpreps,publishedAt:settings.published_at,sections:MENU_SECTIONS};
}
