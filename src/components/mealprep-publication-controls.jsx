import {useEffect,useRef} from 'react';
import {MIX_CATEGORIES} from '../lib/mix-commerce.js';
import './mealprep-publication-controls.css';

export function MealprepPublicationControls({state,form,dirty,onChange,priceRef,busy}) {
  return <section className="backoffice-editor-section mealprep-publication" aria-labelledby="mealprep-publication-title">
    <div className={`mealprep-live-status ${state.published?'is-published':''}`} role="status">
      <span className="eyebrow">ESTADO ACTUAL EN LA TIENDA</span>
      <strong>{state.liveLabel}</strong>
      {dirty&&<p>Estás editando un borrador. La tienda cambiará cuando pulses «{state.saveLabel}».</p>}
    </div>
    <h4 id="mealprep-publication-title">PRECIO Y DISPONIBILIDAD</h4>
    <label htmlFor="mealprep-sale-category">Categoría en la tienda</label>
    <select id="mealprep-sale-category" name="saleCategory" value={form.saleCategory||''} onChange={onChange} disabled={busy} aria-describedby="mealprep-category-help">
      <option value="">Sin definir</option>
      {MIX_CATEGORIES.slice(1).map(category=><option key={category} value={category}>{category}</option>)}
    </select>
    <small id="mealprep-category-help">Ayuda a encontrar este plato en los filtros. No cambia su precio ni lo publica.</small>
    <label htmlFor="mealprep-sale-price">Precio por mealprep (IVA incluido)</label>
    <input ref={priceRef} id="mealprep-sale-price" name="salePriceClp" type="number" min="1" max="1000000" step="1" inputMode="numeric" autoComplete="off" value={form.salePriceClp} onChange={onChange} disabled={busy} aria-invalid={Boolean(state.priceError)} aria-describedby="mealprep-price-help mealprep-price-error" placeholder="Ej.: 9800…"/>
    <small id="mealprep-price-help">Ingresa el valor de una porción en pesos, sin puntos ni decimales.</small>
    <p id="mealprep-price-error" className="mealprep-field-error" role="status">{state.priceError}</p>
    <label className={`mealprep-offer-choice ${!state.priceValid?'is-unavailable':''}`}>
      <input name="availableForPlans" aria-label="Ofrecerlo en Arma tu mix" type="checkbox" checked={state.willPublish} disabled={!state.priceValid||busy} onChange={onChange} aria-describedby="mealprep-availability-help"/>
      <span><strong>Ofrecerlo en Arma tu mix</strong><small>{state.priceValid?'Se aplicará al guardar los cambios.':'Primero ingresa un precio válido para habilitar esta opción.'}</small></span>
    </label>
    <p id="mealprep-availability-help" className="mealprep-next-step" aria-live="polite">{state.nextStep}</p>
  </section>;
}

export function MealprepLeaveDialog({open,saveLabel,onSave,onLeave,onKeepEditing}) {
  const dialog=useRef(null);
  useEffect(()=>{if(open&&!dialog.current.open)dialog.current.showModal();if(!open&&dialog.current.open)dialog.current.close();},[open]);
  return <dialog ref={dialog} className="mealprep-leave-dialog" aria-labelledby="mealprep-leave-title" aria-describedby="mealprep-leave-description" onCancel={e=>{e.preventDefault();onKeepEditing();}}>
    <p className="eyebrow">ANTES DE VOLVER</p><h3 id="mealprep-leave-title">TIENES CAMBIOS SIN PUBLICAR</h3>
    <p id="mealprep-leave-description">Tu borrador está protegido, pero estos cambios todavía no aparecen en la tienda.</p>
    <div className="mealprep-leave-actions"><button className="primary-button" type="button" onClick={()=>{dialog.current.close();onSave();}}>{saveLabel}</button><button className="google-button" type="button" onClick={onKeepEditing} autoFocus>Seguir editando</button><button className="mealprep-leave-secondary" type="button" onClick={onLeave}>Volver sin aplicar cambios</button></div>
  </dialog>;
}
