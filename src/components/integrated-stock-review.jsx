import {useEffect,useRef,useState} from 'react';
import {stockQuantity} from '../lib/mealprep-stock.js';

export function IntegratedStockReview({review,onDecision}){
 const dialog=useRef(null),decision=useRef(false),[decided,setDecided]=useState(false);
 useEffect(()=>{const el=dialog.current;el.showModal();return()=>el.close();},[]);
 const now=Date.now(),expiresAt=Date.parse(review.expiresAt);
 const [expired,setExpired]=useState(!Number.isFinite(expiresAt)||expiresAt<=now);
 useEffect(()=>{if(!Number.isFinite(expiresAt))return;const timer=setTimeout(()=>setExpired(true),Math.max(0,Math.min(expiresAt-Date.now(),2147483647)));return()=>clearTimeout(timer);},[expiresAt]);
 function decide(value){if(decision.current)return;decision.current=true;setDecided(true);onDecision(value);}
 return <dialog ref={dialog} className="mealprep-stock-link-dialog" aria-labelledby="integrated-stock-review-title" onCancel={e=>e.preventDefault()}>
  <header><h3 id="integrated-stock-review-title">CONFIRMAR STOCK FÍSICO</h3><button type="button" disabled={decided} onClick={()=>decide(false)} aria-label="Volver al borrador sin guardar">Volver ×</button></header>
  <p>Revisa el conteo antes de guardarlo. No se agregan unidades: se establece el total físico de este saldo.</p>
  <dl className="mealprep-stock-quantities"><div><dt>Total anterior</dt><dd>{stockQuantity(review.previousPhysicalMilli)}</dd></div><div><dt>Reservadas</dt><dd>{stockQuantity(review.reservedMilli)}</dd></div><div><dt>Total contado</dt><dd>{stockQuantity(review.countedQuantityMilli)}</dd></div><div><dt>Diferencia</dt><dd>{stockQuantity(review.deltaMilli)}</dd></div></dl>
  <p>Las reservas, lotes y vencimientos no se modifican. El disponible se consultará de nuevo después de guardar.</p>
  {expired&&<p role="alert">La revisión venció. Vuelve al borrador y solicita una revisión nueva; no se guardó otro conteo.</p>}
  {decided&&<p role="status">Verificando el resultado. Conservamos el intento para evitar duplicaciones.</p>}
  <div className="mealprep-stock-actions"><button type="button" disabled={decided||expired} onClick={()=>decide(true)}>CONFIRMAR Y GUARDAR STOCK</button><button type="button" disabled={decided} onClick={()=>decide(false)}>VOLVER AL BORRADOR</button></div>
 </dialog>;
}
