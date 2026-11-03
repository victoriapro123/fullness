import {useEffect,useRef,useState} from 'react';
export function IntegratedStockLinkDialog({recipeId,request,draftKey,onChanged,onClose}){
 const dialog=useRef(null),busyRef=useRef(false);
 const [targets,setTargets]=useState([]),[draft,setDraft]=useState(()=>{try{return JSON.parse(localStorage.getItem(draftKey)||'{}');}catch{return {};}}),[review,setReview]=useState(null),[busy,setBusy]=useState(true),[message,setMessage]=useState('Consultando artículos físicos…');
 function save(patch){setDraft(previous=>{const next={...previous,...patch};try{localStorage.setItem(draftKey,JSON.stringify(next));}catch{}return next;});}
 const call=body=>request('/api/backoffice/mealprep-stock-links','POST',body);
 useEffect(()=>{dialog.current.showModal();let active=true;(async()=>{try{const p=await call({action:'pending',recipeId});if(!active)return;if(p.pending){save({...p.pending.request_payload,requestKey:p.pending.request_key,pending:true});setMessage('Conservamos una configuración pendiente. Consulta el resultado o solicita su cancelación.');}const catalog=await call({action:'catalog'});if(active){setTargets(catalog.targets);if(!p.pending)setMessage('Elige el artículo físico y su ubicación. No cambia el stock, los precios ni la visibilidad de la receta.');}}catch(e){if(active)setMessage(e.message);}finally{if(active)setBusy(false);}})();return()=>{active=false;dialog.current?.close();};},[]);
 async function act(action){if(busyRef.current)return;busyRef.current=true;setBusy(true);try{
  const requestKey=draft.requestKey||crypto.randomUUID();save({requestKey,pending:true});
  const result=await call({action,recipeId,requestKey,...(action==='prepare'?{coreItemId:draft.coreItemId,locationId:draft.locationId,unit:draft.unit,equivalenceConfirmed:draft.equivalenceConfirmed===true}:{})});
  if(result.status==='review'){setReview(result);setMessage('Revisa la selección y confirma la equivalencia antes de guardar.');}
  else if(result.status==='linked'){save({requestKey:null,pending:false});setReview(null);setMessage('Vínculo confirmado. Ya puedes indicar el total físico y revisarlo antes de guardarlo.');await onChanged();}
  else if(result.status==='cancelled'){save({requestKey:null,pending:false});setReview(null);setMessage('Cancelación confirmada; la selección sigue en borrador.');}
  else{setReview(null);setMessage('Resultado pendiente. Consulta de nuevo sin crear otra configuración.');}
 }catch(e){setMessage(e.message||'No recibimos un resultado. Conservamos la selección y su clave.');}finally{busyRef.current=false;setBusy(false);}}
 const selected=targets.find(t=>t.coreItemId===draft.coreItemId&&t.locationId===draft.locationId&&t.unit===draft.unit);
 return <dialog ref={dialog} className="mealprep-stock-link-dialog" aria-labelledby="direct-stock-link-title" onCancel={e=>e.preventDefault()}>
  <header><h3 id="direct-stock-link-title">VINCULAR PORCIÓN DE INVENTARIO</h3><button type="button" onClick={onClose} disabled={busy}>Cerrar ×</button></header>
  <p>Selecciona la porción individual correspondiente a esta receta. No selecciones un familiar ni una caja completa. No se asociarán artículos automáticamente.</p>
  <fieldset disabled={busy||draft.pending}><legend>Artículo y ubicación</legend><label>Porción física en Core360<select value={selected?`${selected.coreItemId}:${selected.locationId}`:''} onChange={e=>{const t=targets.find(t=>`${t.coreItemId}:${t.locationId}`===e.target.value);if(t)save({coreItemId:t.coreItemId,locationId:t.locationId,unit:t.unit,equivalenceConfirmed:false});}}><option value="">Seleccionar artículo y ubicación</option>{targets.map(t=><option key={`${t.coreItemId}:${t.locationId}:${t.balanceId}`} value={`${t.coreItemId}:${t.locationId}`} disabled={!t.selectable}>{t.sku} · {t.name} · {t.warehouseCode||'Sin ubicación'}{!t.selectable?` — No seleccionable (${t.reasonCode||'saldo por verificar'})`:''}</option>)}</select></label>
   <label><input type="checkbox" checked={draft.equivalenceConfirmed===true} onChange={e=>save({equivalenceConfirmed:e.target.checked})}/> Confirmo que 1 unidad de este artículo equivale a 1 porción individual preparada de esta receta.</label>
  </fieldset>
  {review&&<section aria-label="Revisión del vínculo"><h4>REVISAR ASOCIACIÓN</h4><p>{selected?.name||draft.coreItemId} · {selected?.warehouseCode||draft.locationId}</p><p>1 unidad = 1 porción individual. No registra ningún conteo de stock.</p></section>}
  <p role="status">{message}</p>
  <div className="mealprep-stock-actions">
   {!review&&<button type="button" disabled={busy||!selected?.selectable||!draft.equivalenceConfirmed} onClick={()=>act('prepare')}>Revisar vínculo</button>}
   {review&&<button type="button" disabled={busy||Date.parse(review.expiresAt)<=Date.now()} onClick={()=>act('confirm')}>Confirmar vínculo</button>}
   {draft.requestKey&&<><button type="button" disabled={busy} onClick={()=>act('inspect')}>Consultar resultado</button><button type="button" disabled={busy} onClick={()=>act('cancel')}>Cancelar configuración</button></>}
  </div>
  <p>Puedes cerrar esta ventana sin perder la selección. Si hay una operación pendiente, debes consultarla o cancelarla antes de cambiar el artículo.</p>
 </dialog>;
}
