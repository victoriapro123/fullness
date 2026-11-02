import{useEffect,useRef,useState}from'react';import{createStockBindingClient}from'../lib/stock-binding-client.js';import'./stock-binding-dialog.css';
export function StockBindingDialog({request,publicConfig,onClose,onChanged,draftKey}){
 const dialog=useRef(null),policy=useRef(publicConfig),client=useRef(null);policy.current=publicConfig;if(!client.current)client.current=createStockBindingClient({request,getConfig:()=>policy.current});
 const[key,setKey]=useState(()=>{try{return sessionStorage.getItem(draftKey)||crypto.randomUUID();}catch{return crypto.randomUUID();}}),[review,setReview]=useState(null),[status,setStatus]=useState(null),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const element=dialog.current;element.showModal();client.current.inspect().then(setStatus).catch(e=>setError(e.message));return()=>element.close();},[]);
 function connect(){try{sessionStorage.setItem(draftKey,key);}catch{}setError('');setBusy(true);setConsent(false);client.current.connect({requestKey:key,consumerId:'fullness.mealprep-list.stock.v1'}).then(setReview).catch(e=>setError(e.message)).finally(()=>setBusy(false));}
 async function accept(){if(!consent||!review)return;setBusy(true);setError('');try{const next=await client.current.accept({signedResult:review.signedResult,confirmed:true});setStatus(next);setReview(null);setConsent(false);setKey(crypto.randomUUID());try{sessionStorage.removeItem(draftKey);}catch{}onChanged?.();}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function revoke(){if(!status?.bindingId||!window.confirm('¿Desconectar tu cuenta Core360? Los conteos pendientes no se cancelan automáticamente.'))return;setBusy(true);try{const next=await client.current.revoke(status);setStatus(next);setReview(null);setKey(crypto.randomUUID());try{sessionStorage.removeItem(draftKey);}catch{}onChanged?.();}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function discard(){setBusy(true);setError('');try{const result=await client.current.cancel({requestKey:key});if(result.resetAllowed!==true)throw Error('Primero debemos comprobar el resultado de este intento.');setKey(crypto.randomUUID());setReview(null);setConsent(false);try{sessionStorage.removeItem(draftKey);}catch{}setStatus(await client.current.inspect());}catch(e){setError(e.message);}finally{setBusy(false);}}
 const source=review?.sourceIdentity||status?.sourceIdentity,core=review?.coreIdentity||status?.coreIdentity;
 return <dialog ref={dialog} className="stock-binding-dialog" aria-labelledby="stock-binding-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
  <header><h3 id="stock-binding-title">CONECTAR MI CUENTA CORE360</h3><button type="button" disabled={busy} onClick={onClose}>Cerrar ×</button></header>
  <p>Usa tu propio usuario en ambas aplicaciones. La conexión no concede permisos ni modifica existencias.</p>
  {source&&<p>Cuenta Fullness: <strong>{source.name}</strong><br/>{source.email}</p>}
  {core&&<p>Cuenta Core360: <strong>{core.name}</strong><br/>{core.email}</p>}
  {review?.companyId&&<div><p>Empresa Core360: <strong>{review.companyLabel}</strong></p><details><summary>Identificador de empresa</summary>{review.companyId}</details></div>}
  {status?.status==='active'&&<p role="status">Cuenta conectada. Core comprobará tus permisos vigentes al guardar cada conteo.</p>}
  {status?.status==='revocation_pending'&&<p role="status">Desconexión pendiente: primero deben resolverse los conteos en vuelo.</p>}
  {error&&<p role="alert">{error}</p>}
  {review?<>
   <label className="stock-binding-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>Confirmo que ambas cuentas mostradas son mías y autorizo asociarlas para gestionar inventario.</label>
   <button type="button" disabled={!consent||busy} onClick={accept}>{busy?'Comprobando…':'Confirmar conexión en Fullness'}</button>
   <button type="button" disabled={busy} onClick={connect}>Volver a revisar en Core360</button>
   {review.countEligibility?.canWriteCount===false&&<p>Podrás conectar tus cuentas con permiso de lectura, pero no guardar conteos mientras Core360 no autorice la operación.</p>}
  </>:<button type="button" disabled={busy||status?.status==='revocation_pending'} onClick={connect}>{busy?'Esperando Core360…':status?.status==='active'?'Revisar mis cuentas':'Abrir Core360 con mi usuario'}</button>}
  {status?.status==='active'&&<button type="button" disabled={busy} onClick={revoke}>Desconectar cuentas</button>}
  <button type="button" disabled={busy} onClick={discard}>Descartar intento y comenzar de nuevo</button>
  <p>Si Core pide iniciar sesión, hazlo allí con tu usuario y vuelve a este mismo intento. No pegues contraseñas ni tokens en Fullness.</p>
 </dialog>;
}
