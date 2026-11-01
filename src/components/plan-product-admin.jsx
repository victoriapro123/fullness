import {useEffect,useState} from 'react';
import {backofficeRequest} from '../lib/backoffice-request.js';

export function PlanProductAdmin({draftKey,onChanged}){
 const [data,setData]=useState(null),[form,setForm]=useState({libraryMealId:'',coreItemId:'',expectedVersion:''}),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 const load=()=>backofficeRequest('/api/backoffice/plan-products').then(setData);
 useEffect(()=>{let alive=true;backofficeRequest('/api/backoffice/plan-products').then(d=>{if(!alive)return;setData(d);try{const draft=JSON.parse(localStorage.getItem(draftKey)||'null');if(draft)setForm(draft);}catch{}}).catch(e=>alive&&setMessage(e.message));return()=>{alive=false;};},[draftKey]);
 function change(patch){const next={...form,...patch};setForm(next);setConfirm(false);try{localStorage.setItem(draftKey,JSON.stringify(next));}catch{setMessage('El borrador se conserva sólo mientras esta pantalla esté abierta.');}}
 function chooseMeal(id){const product=data.products.find(p=>p.library_meal_id===id),mapping=data.mappings.find(m=>m.source_menu_item_id===product?.id);change({libraryMealId:id,coreItemId:mapping?.core_item_id||'',expectedVersion:mapping?.updated_at||''});}
 async function save(){setBusy(true);try{const saved=await backofficeRequest('/api/backoffice/plan-products','PUT',form);localStorage.removeItem(draftKey);setConfirm(false);setMessage(saved.message);await load();setForm({libraryMealId:'',coreItemId:'',expectedVersion:''});await onChanged?.();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 const currentProduct=data?.products.find(p=>p.library_meal_id===form.libraryMealId),currentMapping=data?.mappings.find(m=>m.source_menu_item_id===currentProduct?.id);
 return <details className="letter-confirm"><summary>VINCULAR PREPARACIONES A PRODUCTOS DE CORE360</summary><p>Elige explícitamente una receta y su porción vendible. El precio, IVA y unidad vienen de Core360; aquí no se crean stock físico ni recetas de producción. Los familiares no se usan como porciones.</p>
  {data?<fieldset disabled={busy}><legend>Vínculo comercial</legend><label>Preparación<select value={form.libraryMealId} onChange={e=>chooseMeal(e.target.value)}><option value="">Seleccionar preparación</option>{data.library.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
   <label>Porción disponible para planes en Core360<select value={form.coreItemId} onChange={e=>change({coreItemId:e.target.value})}><option value="">Seleccionar producto Core360</option>{data.choices.map(p=><option key={p.coreItemId} value={p.coreItemId}>{p.name} · {p.sku} · ${p.grossMinor.toLocaleString('es-CL')}</option>)}</select></label>
   {!data.choices.length&&<p>No hay porciones elegibles. En Core360 configura el terminado como “Sólo en planes”, su precio por unidad y sus existencias. Después actualiza esta lista.</p>}
   {form.libraryMealId&&(currentMapping?.updated_at||'')!==form.expectedVersion&&<div className="letter-confirm"><p>Hay otra revisión de este vínculo. Conservamos tu borrador; no se sobrescribe automáticamente.</p><button type="button" onClick={()=>chooseMeal(form.libraryMealId)}>DESCARTAR BORRADOR Y CARGAR VÍNCULO ACTUAL</button></div>}
   <div className="letter-actions"><button type="button" disabled={!form.libraryMealId||!form.coreItemId} onClick={()=>setConfirm(true)}>REVISAR VÍNCULO</button><button type="button" onClick={()=>load().catch(e=>setMessage(e.message))}>ACTUALIZAR LISTA</button><a href="https://core.prof3sional.com/" target="_blank" rel="noreferrer">ABRIR CORE360 ↗</a></div>
   {confirm&&<div className="letter-confirm"><p>Guardarás el vínculo y el precio canónico consultado; no se publicará una carta ni se declarará stock por esta acción.</p><div className="letter-actions"><button className="primary-button" type="button" onClick={save}>CONFIRMAR VÍNCULO</button><button type="button" onClick={()=>setConfirm(false)}>VOLVER</button></div></div>}
  </fieldset>:<p>Cargando productos canónicos…</p>}<p role="status">{message}</p>
 </details>;
}
