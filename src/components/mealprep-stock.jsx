import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {backofficeRequest} from '../lib/backoffice-request.js';
import {stockQuantity,physicalCountMilli} from '../lib/mealprep-stock.js';
import {createStockHandoffClient} from '../lib/stock-handoff-client.js';
import {StockBindingDialog} from './stock-binding-dialog.jsx';
import {createIntegratedStockCountClient,createStockIntegrationAdapter} from '../lib/integrated-stock-count.js';
import {IntegratedStockReview} from './integrated-stock-review.jsx';
import {IntegratedStockLinkDialog} from './integrated-stock-link-dialog.jsx';
import {PlanProductAdmin} from './plan-product-admin.jsx';
import './mealprep-stock.css';

const StockContext=createContext(null);
const request=(...args)=>backofficeRequest(...args);
export function MealprepStockProvider({children,requestImpl=request,onConfigure,onCount,onRecover,draftKey,integrationAdapter}){
 const policy=useRef(null),handoff=useRef(null);if(!handoff.current&&typeof window!=='undefined')handoff.current=createStockHandoffClient({request:requestImpl,getConfig:()=>policy.current});
 const [review,setReview]=useState(null);
 const integrated=useRef(null),operationBusy=useRef(false);
 if(!integrated.current)integrated.current=createIntegratedStockCountClient({adapter:integrationAdapter||createStockIntegrationAdapter({request:requestImpl}),review:details=>new Promise(resolve=>setReview({details,resolve}))});
 const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 policy.current=data?.handoffConfig||null;
 const integratedMode=data?.writeMode==='integration';
 const count=onCount||(integratedMode?integrated.current.count:handoff.current?.count);
 const readSequence=useRef(0);
 const [linkRecipeId,setLinkRecipeId]=useState(null);
 const [bindingOpen,setBindingOpen]=useState(false);
 const [drafts,setDrafts]=useState(()=>{try{return draftKey?JSON.parse(localStorage.getItem(draftKey)||'{}'):{};}catch{return {};}}),[messages,setMessages]=useState({}),[saving,setSaving]=useState(null);
 useEffect(()=>{if(!data?.pendingCounts?.length)return;setDrafts(previous=>{const next={...previous};for(const pending of data.pendingCounts){const current=next[pending.recipeId];if(current?.requestKey&&current.requestKey!==pending.requestKey)continue;next[pending.recipeId]={...current,quantity:pending.quantity,reason:pending.reason,balanceId:pending.balanceId,consumerId:pending.consumerId,requestKey:pending.requestKey,operationMode:pending.operationMode,pending:true};}try{if(draftKey)localStorage.setItem(draftKey,JSON.stringify(next));}catch{}return next;});for(const pending of data.pendingCounts)if(pending.receiptId)setMessages(previous=>({...previous,[pending.recipeId]:`Registrado; actualización pendiente. Recibo ${pending.receiptId}. No repitas el conteo.`}));},[data?.pendingCounts,draftKey]);
 function updateDraft(recipeId,patch){setDrafts(previous=>{const next={...previous,[recipeId]:{...previous?.[recipeId],...patch}};try{if(draftKey)localStorage.setItem(draftKey,JSON.stringify(next));}catch{}return next;});}
 async function refresh(){const sequence=++readSequence.current;setLoading(true);try{const next=await requestImpl('/api/backoffice/mealprep-stock?client=integration-v1');if(sequence===readSequence.current){setData(next);setError('');}}catch{if(sequence===readSequence.current)setError('No pudimos actualizar el stock. No se asume cero ni se modifica tu receta.');}finally{if(sequence===readSequence.current)setLoading(false);}}
 useEffect(()=>{const sequence=++readSequence.current;requestImpl('/api/backoffice/mealprep-stock?client=integration-v1').then(next=>{if(sequence===readSequence.current){setData(next);setError('');}}).catch(()=>{if(sequence===readSequence.current)setError('No pudimos consultar el stock. Vuelve a intentarlo.');}).finally(()=>{if(sequence===readSequence.current)setLoading(false);});return()=>{readSequence.current++;};},[requestImpl]);
 async function submitCount(recipeId,requestedConsumer='fullness.mealprep-list.stock.v1'){
  const row=data?.rows.find(r=>r.recipeId===recipeId),draft=drafts?.[recipeId];
  if(operationBusy.current||!count||!data?.writeAvailable||!row?.editable)return;
  operationBusy.current=true;
  setSaving(recipeId);let sent=false;
  try{
   const physicalMilli=physicalCountMilli(draft?.quantity),reason=String(draft?.reason||'').trim();if(reason.length<5)throw Error('Indica el motivo del conteo (mínimo 5 caracteres).');
   const balance=row.balances.find(b=>b.id===draft?.balanceId)||(row.balances.length===1?row.balances[0]:null);if(!balance)throw Error('Selecciona la ubicación y el saldo que estás contando.');
   if(integratedMode&&draft?.requestKey&&draft.operationMode!=='integration')throw Error('Conservamos un intento anterior. Consulta su resultado antes de iniciar otro conteo.');
   const requestKey=draft?.requestKey||crypto.randomUUID(),consumerId=draft?.consumerId||requestedConsumer;updateDraft(recipeId,{requestKey,balanceId:balance.id,consumerId,operationMode:integratedMode?'integration':'legacy',...(integratedMode?{pending:true}:{})});
   sent=true;const result=await count({recipeId,coreItemId:row.coreItemId,physicalMilli,reason,requestKey,mappingVersion:row.mappingVersion,balance,consumerId});
   if(result?.status==='cancelled'&&result.cancellationVerified===true){updateDraft(recipeId,{pending:false,requestKey:null,operationMode:null});setMessages(m=>({...m,[recipeId]:'Volviste al borrador. El conteo no se guardó y tu cantidad se conserva.'}));return;}
   if(result?.status==='registered'&&result.receiptId){updateDraft(recipeId,{pending:true});setMessages(m=>({...m,[recipeId]:`Registrado; actualización pendiente. Recibo ${result.receiptId}. Consulta el resultado sin repetir el conteo.`}));return;}
   if(result?.status!=='committed'||!result.receiptId){updateDraft(recipeId,{pending:true});setMessages(m=>({...m,[recipeId]:'Confirmación pendiente. Conservamos el borrador y su clave; consulta el estado antes de cambiar el conteo.'}));return;}
   setDrafts(previous=>{const next={...previous};delete next[recipeId];try{if(draftKey)localStorage.setItem(draftKey,JSON.stringify(next));}catch{}return next;});setMessages(m=>({...m,[recipeId]:`Stock confirmado en Core360. Recibo ${result.receiptId}.`}));await refresh();
  }catch(e){const uncertain=sent&&e.preparationNotStarted!==true;if(uncertain)updateDraft(recipeId,{pending:true});else if(integratedMode)updateDraft(recipeId,{pending:false});setMessages(m=>({...m,[recipeId]:uncertain?'No recibimos un resultado definitivo. Conservamos la clave; consulta el estado antes de repetir.':e.message||'Revisa el conteo.'}));}finally{setReview(null);operationBusy.current=false;setSaving(null);}
 }
 async function recoverCount(recipeId,action){
  const draft=drafts?.[recipeId],recover=onRecover||(draft?.operationMode==='integration'?integrated.current.recover:handoff.current?.recover);if(!recover||!draft?.requestKey)return;setSaving(recipeId);
  try{const result=await recover({recipeId,requestKey:draft.requestKey,action});
   if(result?.status==='committed'&&result.receiptId){setDrafts(previous=>{const next={...previous};delete next[recipeId];try{if(draftKey)localStorage.setItem(draftKey,JSON.stringify(next));}catch{}return next;});setMessages(m=>({...m,[recipeId]:`Stock confirmado en Core360. Recibo ${result.receiptId}.`}));await refresh();}
   else if(result?.status==='registered'&&result.receiptId)setMessages(m=>({...m,[recipeId]:`Registrado; actualización pendiente. Recibo ${result.receiptId}. No repitas el conteo.`}));
   else if(result?.status==='cancelled'&&result.cancellationVerified===true){updateDraft(recipeId,{pending:false,requestKey:null,operationMode:null});setMessages(m=>({...m,[recipeId]:'Cancelación confirmada. Tu cantidad sigue como borrador, sin una nueva operación.'}));}
   else setMessages(m=>({...m,[recipeId]:'El intento sigue pendiente. No se ha confirmado su cancelación ni se creó otro conteo.'}));
  }catch{setMessages(m=>({...m,[recipeId]:'No pudimos verificar el resultado. El intento y tu borrador se conservan.'}));}finally{setSaving(null);}
 }
 return <StockContext.Provider value={{data,error,loading,refresh,onConfigure:onConfigure||setLinkRecipeId,drafts,updateDraft,submitCount,recoverCount,canRecover:true,messages,saving}}>
  {data?.bindingSupport&&!integratedMode&&<div className="mealprep-stock"><p>Usuario de inventario: {data.binding?.coreIdentity?.email||'Cuenta Core360 no conectada'}</p><button type="button" onClick={()=>setBindingOpen(true)}>Conectar o revisar mi cuenta Core360</button></div>}
  {children}
  {review&&<IntegratedStockReview review={review.details} onDecision={value=>review.resolve(value)}/>}
  {bindingOpen&&<StockBindingDialog request={requestImpl} publicConfig={data?.handoffConfig} draftKey={`${draftKey||'stock_memory'}_binding_v1`} onChanged={refresh} onClose={()=>setBindingOpen(false)}/>}
  {linkRecipeId&&(integratedMode?<IntegratedStockLinkDialog recipeId={linkRecipeId} request={requestImpl} draftKey={`${draftKey||'stock_memory'}_direct_link_${linkRecipeId}`} onChanged={refresh} onClose={()=>setLinkRecipeId(null)}/>:<StockLinkDialog recipeId={linkRecipeId} draftKey={`${draftKey||'stock_memory'}_link_${linkRecipeId}`} onChanged={refresh} onClose={()=>setLinkRecipeId(null)}/>)}
 </StockContext.Provider>;
}
function StockLinkDialog({recipeId,draftKey,onChanged,onClose}){
 const dialog=useRef(null);
 useEffect(()=>{const element=dialog.current;element.showModal();return()=>element.close();},[]);
 return <dialog ref={dialog} className="mealprep-stock-link-dialog" aria-labelledby="stock-link-title" onCancel={e=>{e.preventDefault();onClose();}}><header><h3 id="stock-link-title">VINCULAR INVENTARIO DEL MEALPREP</h3><button type="button" onClick={onClose} aria-label="Cerrar configuración de vínculo">Cerrar ×</button></header><p>Conservamos la preparación existente. Selecciona su porción exacta, no un familiar ni un plan completo. Tus cambios de la ficha siguen protegidos.</p><PlanProductAdmin initialRecipeId={recipeId} draftKey={draftKey} onChanged={onChanged}/></dialog>;
}
export function MealprepStockStatus({recipeId,compact=false}){
 const context=useContext(StockContext),[expanded,setExpanded]=useState(!compact);
 if(!context)return null;
 const {data,error,loading,refresh,onConfigure,drafts,updateDraft,submitCount:submitFromContext,recoverCount,canRecover,messages,saving}=context,row=data?.rows.find(r=>r.recipeId===recipeId),draft=drafts?.[recipeId]||{};
 const submitCount=id=>submitFromContext(id,compact?'fullness.mealprep-list.stock.v1':'fullness.mealprep-detail.stock.v1');
 const known=!error&&row?.state==='known';
 return <section className={`mealprep-stock ${compact?'is-compact':''}`} aria-label="Inventario del mealprep" onKeyDown={e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();e.stopPropagation();}}}>
  <div className="mealprep-stock-heading"><strong>Stock</strong><span className={known&&row.availableMilli!==null&&BigInt(row.availableMilli)>0n?'is-in-stock':'is-stock-muted'}>{loading?'Consultando…':error?'No actualizado':known&&row.availableMilli!==null?`${stockQuantity(row.availableMilli)} disponibles`:known?`${stockQuantity(row.physicalMilli)} físicas`:row?.state==='unlinked'?'Sin vínculo':'Por verificar'}</span></div>
  {known&&<dl className="mealprep-stock-quantities"><div><dt>Físico</dt><dd>{stockQuantity(row.physicalMilli)}</dd></div><div><dt>Reservado</dt><dd>{stockQuantity(row.reservedMilli)}</dd></div><div><dt>Disponible</dt><dd>{stockQuantity(row.availableMilli)}</dd></div></dl>}
  <div className="mealprep-stock-actions"><button type="button" onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}>{expanded?'Cerrar detalle':'Gestionar stock'}</button><button type="button" onClick={refresh} disabled={loading}>Actualizar</button></div>
  {expanded&&<div className="mealprep-stock-detail"><p role={error?'alert':undefined}>{error||row?.message||(known?'Stock consultado en Core360.':'Guarda y vincula el mealprep para consultar sus existencias.')}</p>{known&&<p>El físico cuenta todas las unidades. El disponible descuenta reservas y excluye saldos no comercializables. Cambiar “Activo” no cambia estas cantidades.</p>}{row?.state==='unlinked'&&onConfigure&&<button type="button" onClick={()=>onConfigure(recipeId)}>Configurar vínculo de esta preparación</button>}
   {recipeId&&<fieldset disabled={saving!==null||draft.pending===true}><legend>Indicar stock físico</legend>{row?.balances?.length>0&&<label>Ubicación y saldo a contar<select value={draft.balanceId||(row.balances.length===1?row.balances[0].id:'')} onChange={e=>updateDraft(recipeId,{balanceId:e.target.value})}><option value="">Seleccionar saldo</option>{row.balances.map(b=><option key={b.id} value={b.id}>{b.warehouseCode||'Ubicación Core360'}{b.batchCode?` · Lote ${b.batchCode}`:''}{b.serialNumber?` · Serie ${b.serialNumber}`:''}{b.expiresOn?` · Vence ${b.expiresOn}`:''}</option>)}</select></label>}<label>Unidades listas en este saldo<input type="number" min="0" max="1000000" step="1" inputMode="numeric" value={draft.quantity??''} onChange={e=>updateDraft(recipeId,{quantity:e.target.value})}/></label><label>Motivo del conteo<input type="text" maxLength={240} value={draft.reason||''} placeholder="Ej.: Conteo de bolsas listas" onChange={e=>updateDraft(recipeId,{reason:e.target.value})}/></label><p className="mealprep-stock-draft">{draft.pending?'Resultado pendiente: el borrador está bloqueado para evitar duplicar el conteo.':draft.quantity!==undefined?'Borrador de conteo; todavía no cambia el inventario.':'Ingresa el total físico de ese saldo, no las unidades que deseas agregar. Lote, serie y vencimiento no cambian por este conteo.'}</p><button type="button" disabled={!known||!!error||!data?.writeAvailable||!row?.editable||draft.quantity===undefined||draft.quantity===''} onClick={()=>submitCount(recipeId)}>{saving===recipeId?'Esperando confirmación…':'Revisar y guardar stock'}</button></fieldset>}
   {draft.pending&&<div className="mealprep-stock-actions"><button type="button" disabled={!canRecover||saving!==null} onClick={()=>recoverCount(recipeId,'inspect')}>Consultar resultado</button><button type="button" disabled={!canRecover||saving!==null} onClick={()=>recoverCount(recipeId,'cancel')}>Solicitar cancelación</button><p>Una cancelación solicitada no significa que el conteo ya esté cancelado.</p></div>}
   {data?.writeAvailable!==true&&<p>{data?.writeMessage||'La edición de cantidades necesita autorización canónica de inventario.'}</p>}{messages?.[recipeId]&&<p role="status">{messages[recipeId]}</p>}{row?.balances?.length>0&&<ul>{row.balances.map(b=><li key={b.id}>{b.warehouseCode||'Ubicación Core360'}{b.batchCode?` · Lote ${b.batchCode}`:''}{b.expiresOn?` · Vence ${b.expiresOn}`:''}: {stockQuantity(b.physicalMilli)} físicas, {stockQuantity(b.reservedMilli)} reservadas.</li>)}</ul>}</div>}
 </section>;
}
