import {useEffect,useState} from 'react';
import {CUSTOM_PLAN_SIZES,customPlanRequest,selectedPlanTotal} from '../lib/custom-plans.js';
import './custom-plans.css';
const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
export function CustomPlanBuilder({data,onAdd}){
 const {letter,items=[]}=data;
 const draftKey=letter?`fullness_plan_draft_${letter.id}_${letter.revision}`:'';
 const [selection,setSelection]=useState([]),[size,setSize]=useState(letter?.plan_sizes?.[0]||6),[notice,setNotice]=useState(''),[activeWeek,setActiveWeek]=useState(1);
 useEffect(()=>{
  try{const draft=JSON.parse(localStorage.getItem(draftKey)||'null');setSelection(Array.isArray(draft?.selection)?draft.selection.map(r=>({...r,week:r.week??1})):[]);const wanted=draft?.size||letter?.plan_sizes?.[0];setSize(CUSTOM_PLAN_SIZES.includes(wanted)?wanted:6);setActiveWeek(1);}catch{setSelection([]);setSize(6);}
 },[draftKey]);
 const count=selection.reduce((sum,row)=>sum+row.quantity,0);
 const total=selectedPlanTotal(items,selection);
 const weeks=Array.from({length:size===24?4:1},(_,i)=>i+1);
 const inWeek=selection.filter(r=>(r.week??1)===activeWeek);
 const weekCount=inWeek.reduce((n,r)=>n+r.quantity,0);
 const duplicated=inWeek.some(r=>r.quantity===2);
 const invalid=!CUSTOM_PLAN_SIZES.includes(size)||selection.some(row=>{const item=items.find(i=>i.id===row.itemId);const total=selection.filter(r=>r.itemId===row.itemId).reduce((n,r)=>n+r.quantity,0);return !item||item.availableUnits===null||row.quantity>2||total>item.availableUnits||!item.priceClp;})||weeks.some(w=>selection.filter(r=>(r.week??1)===w&&r.quantity===2).length>1);
 const complete=weeks.every(w=>selection.filter(r=>(r.week??1)===w).reduce((n,r)=>n+r.quantity,0)===6);
 function update(next,nextSize=size){setSelection(next);setSize(nextSize);setNotice('');try{const draft=JSON.stringify({selection:next,size:nextSize});localStorage.setItem(draftKey,draft);localStorage.setItem(`${draftKey}_${nextSize}`,draft);}catch{setNotice('Tu selección sigue aquí, pero el navegador no permitió respaldarla.');}}
 function chooseFormat(nextSize){try{localStorage.setItem(`${draftKey}_${size}`,JSON.stringify({selection,size}));const saved=JSON.parse(localStorage.getItem(`${draftKey}_${nextSize}`)||'null');update(saved?.selection||selection.filter(r=>(r.week??1)===1),nextSize);}catch{update(selection.filter(r=>(r.week??1)===1),nextSize);}setActiveWeek(1);}
 function change(item,delta){const found=inWeek.find(row=>row.itemId===item.id),quantity=(found?.quantity||0)+delta;
  const total=selection.filter(r=>r.itemId===item.id).reduce((n,r)=>n+r.quantity,0);
  if(quantity<0||delta>0&&(weekCount>=6||quantity>2||total+1>(item.availableUnits??0)||(quantity===2&&duplicated)))return;
  update([...selection.filter(row=>row.itemId!==item.id||(row.week??1)!==activeWeek),...(quantity?[{itemId:item.id,week:activeWeek,quantity}]:[])]);
 }
 function add(){if(invalid||!complete||count!==size||!total)return;
  const id=crypto.randomUUID();const plan={id,slug:`plan-${id}`,name:`Tu plan de ${size} mealpreps`,productType:'plan',price:total,qty:1,kind:'custom_plan',letterId:letter.id,revision:letter.revision,size,selection,
   selectedMeals:selection.map(row=>({...items.find(i=>i.id===row.itemId),...row}))};
  // Validate the serialized boundary before accepting a browser draft.
  customPlanRequest(plan);onAdd(plan);setNotice('Plan agregado. Puedes desplegar sus platos en el carrito.');
 }
 if(!letter)return <section className="custom-plans" id="custom-plan-builder"><p className="eyebrow">ELIGE TUS PLATOS</p><h2>ARMA TU PLAN</h2><p>Semanal: 6 mealpreps. Mensual: cuatro semanas de 6. El precio es la suma de los platos elegidos.</p><p className="products-empty" role="status">{data.loading?'Consultando la carta y su disponibilidad…':data.error||'Estamos actualizando la carta. En cuanto Fullness Lab confirme los platos y sus existencias, podrás elegir aquí. No hay mealpreps confirmados para comprar ahora.'}</p></section>;
 return <section className="custom-plans" id="custom-plan-builder" aria-labelledby="custom-plan-title">
  <header><p className="eyebrow">ELIGE TUS PLATOS</p><h2 id="custom-plan-title">ARMA TU PLAN</h2><p>{letter.title}. Carta del {letter.starts_on} al {letter.ends_on} (fecha de cierre).</p><p>Semanal: 6 mealpreps. Mensual: 4 semanas de 6. En cada semana sólo puedes duplicar un plato; los demás deben ser distintos. No se venden individualmente; los familiares se compran aparte. El precio es la suma de tu selección.</p></header>
  {data.error&&<p role="alert">{data.error} Tu borrador está protegido; antes de pagar se comprobará nuevamente.</p>}
  <label className="custom-plan-format">Formato del plan<select value={size} onChange={e=>chooseFormat(Number(e.target.value))}>{CUSTOM_PLAN_SIZES.map(n=><option key={n} value={n}>{n===6?'Semanal':'Mensual'} · {n} mealpreps</option>)}</select></label>
  <div className="custom-plan-weeks" role="group" aria-label="Semanas del plan">{weeks.map(w=><button type="button" key={w} aria-pressed={activeWeek===w} onClick={()=>setActiveWeek(w)}>Semana {w} · {selection.filter(r=>(r.week??1)===w).reduce((n,r)=>n+r.quantity,0)}/6</button>)}</div>
  <p>Semana {activeWeek}: {weekCount} de 6 · {duplicated?'Ya elegiste el único plato que puedes duplicar.':'Puedes elegir un plato dos veces; el resto, una sola vez.'}</p>
  <div className="custom-plan-grid">{items.map(item=>{const qty=inWeek.find(row=>row.itemId===item.id)?.quantity||0;const total=selection.filter(r=>r.itemId===item.id).reduce((n,r)=>n+r.quantity,0);return <article className="custom-plan-card" key={item.id}>
   {item.photoUrl&&<img src={item.photoUrl} alt={item.title} loading="lazy"/>}<div><h3>{item.title}</h3><p>{item.priceClp?money(item.priceClp):'Precio por confirmar'}</p>
   <small>{item.availableForPlans===false?item.availabilityLabel:item.availableUnits===null?'Stock por verificar':item.availableUnits>0?`${item.availableUnits} disponibles`:'Agotado'}</small>
   <details><summary>Ver el plato</summary><strong>{item.title}</strong>{item.description&&<p>{item.description}</p>}{item.ingredients?.length>0&&<p>Ingredientes: {item.ingredients.join(', ')}.</p>}{item.allergens?.length>0?<p>Alérgenos: {item.allergens.join(', ')}.</p>:<p>Consulta al equipo por ingredientes y alérgenos antes de comprar.</p>}</details>
   <div className="custom-plan-quantity"><button type="button" disabled={!qty} aria-label={`Quitar ${item.title}`} onClick={()=>change(item,-1)}>−</button><output aria-label={`Cantidad de ${item.title}`}>{qty}</output><button type="button" disabled={!item.priceClp||item.availableUnits===null||qty>=2||total>=item.availableUnits||weekCount>=6||(qty===1&&duplicated)} aria-label={`Asignar ${item.title} al plan`} onClick={()=>change(item,1)}>+</button></div></div>
  </article>})}</div>
  <aside className="custom-plan-summary" aria-live="polite"><div><strong>{count} de {size} mealpreps</strong><p>{money(total)} · Suma de tu selección</p><small>Stock y precios se validan nuevamente antes de pagar.</small></div>{size===24&&activeWeek<4&&!complete?<button className="shop-solid-button" type="button" disabled={weekCount!==6||invalid} onClick={()=>{setActiveWeek(w=>w+1);document.getElementById('custom-plan-builder')?.scrollIntoView({behavior:'smooth',block:'start'});}}>SIGUIENTE SEMANA</button>:<button className="shop-solid-button" type="button" disabled={count!==size||!complete||invalid||!total} onClick={add}>AGREGAR MI PLAN</button>}</aside>
  {invalid&&count>0&&<p role="status">Revisa tu selección: una sola duplicación por semana, nunca 3 del mismo plato y sólo mealpreps con stock confirmado. Tu borrador no se ha descartado.</p>}
  {notice&&<p role="status">{notice}</p>}
 </section>;
}
export function CustomPlanBreakdown({item}){
 return <details className="custom-plan-breakdown"><summary>Ver tus {item.size} mealpreps</summary>{Array.from({length:item.size===24?4:1},(_,i)=>i+1).map(week=><section key={week}><h4>SEMANA {week}</h4><ul>{(item.selectedMeals||[]).filter(m=>(m.week??1)===week).map(meal=><li key={`${week}-${meal.itemId}`}><span>{meal.quantity} × {meal.title}</span><strong>{money(meal.priceClp*meal.quantity)}</strong></li>)}</ul></section>)}<p>Total por plan: {money(item.price)}. {item.qty>1?`${item.qty} planes idénticos.`:''}</p><small>Selección congelada en tu pedido; no se reemplaza al cambiar la carta.</small></details>;
}
