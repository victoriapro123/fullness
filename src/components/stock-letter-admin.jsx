import {useEffect,useState} from 'react';
import {getSupabaseClient} from '../lib/supabase.js';
import {CUSTOM_PLAN_SIZES} from '../lib/custom-plans.js';
import './custom-plans.css';
import {PlanProductAdmin} from './plan-product-admin.jsx';
async function request(method,body){
 const client=await getSupabaseClient();const {data}=await client.auth.getSession();
 if(!data.session?.access_token)throw Error('Inicia sesión para gestionar la carta.');
 const r=await fetch('/api/backoffice/stock-letter',{method,cache:'no-store',headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const payload=await r.json();if(!r.ok)throw Error(payload.error||'No pudimos guardar la carta.');return payload.data;
}
const fromData=d=>d.letter?{id:d.letter.id,title:d.letter.title,startsOn:d.letter.starts_on,endsOn:d.letter.ends_on,state:d.letter.state,planSizes:[...CUSTOM_PLAN_SIZES],familyInPlans:false,revision:d.letter.revision,items:d.items.map((i,index)=>({title:i.title,position:index+1,menuItemId:i.menuItemId||'',libraryMealId:i.libraryMealId||''}))}:null;
export function StockLetterAdmin({draftKey,requestImpl=request,onChanged}){
 const [data,setData]=useState({letters:[],choices:[]}),[form,setForm]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[dirty,setDirty]=useState(false),[sizesText,setSizesText]=useState('');
 useEffect(()=>{let alive=true;requestImpl('GET').then(d=>{if(!alive)return;setData(d);let draft;try{draft=JSON.parse(localStorage.getItem(draftKey)||'null');}catch{}const initial=draft||fromData(d);setForm(initial);setSizesText(initial?.planSizes?.join(', ')||'');setDirty(Boolean(draft));}).catch(e=>alive&&setMessage(e.message));return()=>{alive=false;};},[draftKey,requestImpl]);
 function change(patch){const next={...form,...patch};if(patch.items)next.items=patch.items.map((r,index)=>({...r,position:index+1}));setForm(next);setDirty(true);setConfirm(false);try{localStorage.setItem(draftKey,JSON.stringify(next));}catch{setMessage('No se pudo respaldar el borrador en este navegador.');}}
 async function save(){setBusy(true);try{const {revision,...document}=form;document.planSizes=[...CUSTOM_PLAN_SIZES];document.familyInPlans=false;await requestImpl('PUT',{document,revision});localStorage.removeItem(draftKey);setDirty(false);setConfirm(false);const d=await requestImpl('GET');setData(d);const saved=fromData(d);setForm(saved);setSizesText(saved?.planSizes?.join(', ')||'');setMessage('Carta guardada en servidor. La habilitación de venta requiere el cierre de stock Core360.');await onChanged?.();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 async function refresh(){setBusy(true);try{const d=await requestImpl('GET');setData(d);setConfirm(false);setMessage('Servidor consultado. Tu borrador y su revisión se conservan; no se sobrescriben cambios de otra sesión.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 if(!form)return <section><h2>CARTA DE MEALPREPS</h2><p role="status">{message||'Cargando la carta…'}</p></section>;
 const closed=data.letters.some(l=>l.id===form.id&&l.state==='closed');
 return <section className="custom-plan-admin"><p className="eyebrow">CARTA Y DISPONIBILIDAD</p><h2>CARTA DE MEALPREPS</h2><p>Una carta por período, sin repetir ciclos automáticamente. El stock y los precios pertenecen a Core360. Los planes antiguos y sus pedidos no se modifican.</p><p>{dirty?'Borrador protegido en este dispositivo; aún no guardado en servidor.':'Datos guardados en servidor.'}</p>
  {data.readiness&&<aside className="letter-confirm" aria-labelledby="plan-readiness-title"><h3 id="plan-readiness-title">PREPARACIÓN PARA LA VENTA</h3><p>{data.readiness.linked} de {data.readiness.total} vinculados · {data.readiness.priced} con precio canónico · {data.readiness.stocked} con disponibilidad y stock confirmado.</p><ul>{data.readiness.blockers.map(reason=><li key={reason}>{reason}</li>)}</ul><p>Guardar una carta no activa cobros ni confirma existencias. Las recetas se confirman en el módulo Disponibilidad; las unidades físicas y las reservas se gestionan en Core360.</p></aside>}
  <PlanProductAdmin draftKey={`${draftKey}_product_link`} onChanged={refresh}/>
  {data.letter?.id===form.id&&data.letter.revision!==form.revision&&<aside className="letter-confirm"><p>Hay una revisión más reciente. El borrador no se sobrescribirá.</p><button type="button" disabled={busy} onClick={()=>{setForm(fromData(data));setDirty(false);setConfirm(false);localStorage.removeItem(draftKey);}}>DESCARTAR BORRADOR Y CARGAR SERVIDOR</button></aside>}
  <fieldset disabled={busy||closed}><legend>Período y formatos</legend>
   <label>Nombre de la carta<input value={form.title} maxLength={160} onChange={e=>change({title:e.target.value})}/></label>
   <label>Disponible desde<input type="date" value={form.startsOn} onChange={e=>change({startsOn:e.target.value})}/></label>
   <label>Cierre (a las 00:00 de esta fecha)<input type="date" value={form.endsOn} onChange={e=>change({endsOn:e.target.value})}/></label>
   <p>Formatos: semanal de 6 y mensual de 4 semanas de 6 mealpreps. Por semana sólo un plato puede estar duplicado; todos los demás deben ser distintos. Nunca 3 unidades del mismo plato en una semana. Los familiares se venden aparte.</p>
   <label>Estado<select value={form.state} onChange={e=>change({state:e.target.value})}><option value="draft">Borrador</option><option value="active">Activa (reemplaza y cierra la anterior)</option><option value="closed">Cerrar y conservar historial</option></select></label>
  </fieldset>
  <fieldset disabled={busy||closed}><legend>Platos de esta carta</legend>{form.items.map((item,index)=><div key={index} className="letter-row">
   <label>Plato {index+1}<input value={item.title} maxLength={240} onChange={e=>change({items:form.items.map((r,i)=>i===index?{...r,title:e.target.value}:r)})}/></label>
   <label>Producto final vinculado a Core360<select value={item.menuItemId} onChange={e=>{const choice=data.choices?.find(c=>c.id===e.target.value);change({items:form.items.map((r,i)=>i===index?{...r,menuItemId:choice?.id||'',libraryMealId:choice?.library_meal_id||''}:r)});}}><option value="">Pendiente de vincular</option>{(data.choices||[]).filter(c=>c.product_type==='mealprep').map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
   <button type="button" disabled={form.items.length<=1} onClick={()=>change({items:form.items.filter((_,i)=>i!==index)})}>QUITAR DE ESTA CARTA</button>
  </div>)}<button type="button" onClick={()=>change({items:[...form.items,{title:'Nuevo plato',position:form.items.length+1,menuItemId:'',libraryMealId:''}]})}>Agregar plato</button></fieldset>
  <div className="letter-actions"><button type="button" disabled={busy} onClick={refresh}>Actualizar revisión sin perder borrador</button><button type="button" disabled={busy} onClick={()=>change({...form,id:undefined,revision:0,state:'draft',title:`Nueva carta — ${form.title}`})}>Crear siguiente carta desde ésta</button><button className="primary-button" type="button" disabled={busy||closed} onClick={()=>setConfirm(true)}>Revisar y guardar</button></div>
  {confirm&&<div className="letter-confirm"><p>Guardarás «{form.title}» como {form.state}, con {form.items.length} platos. Activar cierra la carta anterior para nuevas compras, sin cambiar pedidos existentes. No activa cobros ni inventa stock.</p><div className="letter-actions"><button type="button" disabled={busy} className="primary-button" onClick={save}>Confirmar guardado</button><button type="button" disabled={busy} onClick={()=>setConfirm(false)}>Volver a editar</button></div></div>}
  <p role="status">{message}</p><details><summary>Historial de cartas</summary><ul>{data.letters.map(l=><li key={l.id}>{l.title} · {l.state} · {l.starts_on} / {l.ends_on} · revisión {l.revision}</li>)}</ul></details>
 </section>;
}
