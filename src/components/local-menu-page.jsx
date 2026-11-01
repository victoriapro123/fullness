import {useEffect,useRef,useState} from 'react';
import {MENU_SECTIONS,moneyClp} from '../lib/local-menu.js';
import './local-menu.css';

export function LocalMenuContent({data}) {
  const {items=[],mealpreps=[]}=data||{};
  return <>
    <nav className="local-menu-nav" aria-label="Secciones de la carta">{MENU_SECTIONS.map(([id,title])=><a href={`#carta-${id}`} key={id}>{title}</a>)}</nav>
    <div className="local-menu-sections" id="carta-contenido">
      {MENU_SECTIONS.map(([id,title])=>{
        const rows=id==='lunch'?items.filter(r=>r.lunchSlot).sort((a,b)=>a.lunchSlot-b.lunchSlot):id==='mealpreps'?mealpreps:items.filter(r=>r.section===id);
        return <section className="local-menu-section" id={`carta-${id}`} key={id} aria-labelledby={`carta-title-${id}`}>
          <div className="local-menu-section-heading"><p className="eyebrow">{id==='lunch'?'SELECCIÓN DEL LOCAL':id==='mealpreps'?'PARA TU SEMANA':'PREPARADO CON CUIDADO'}</p><h2 id={`carta-title-${id}`}>{title}</h2><span className="local-menu-rule" aria-hidden="true"/></div>
          {id==='lunch'&&rows.length>0&&<div className="local-menu-lunch"><strong>{moneyClp(data.lunchPrice)}</strong><p>{data.lunchDescription}</p><small>El precio corresponde al menú completo, no a cada plato para llevar.</small></div>}
          {id==='individuales'&&rows.length>0&&<p className="local-menu-note">Preparaciones para llevar del local. Sus precios no corresponden al menú completo Fullness Lunch.</p>}
          {id==='mealpreps'&&<p className="local-menu-note">Los mealpreps normales se eligen dentro de un plan; no se compran individualmente. Los familiares se venden aparte. La disponibilidad y el precio online se verifican en la tienda.</p>}
          {rows.length?<div className="local-menu-products">{rows.map(row=><article className="local-menu-product" key={row.id}>
            <div>{id==='lunch'&&<span className="local-menu-position">OPCIÓN {row.lunchSlot}</span>}<h3>{row.name}</h3>{row.description&&<p>{row.description}</p>}</div>
            {id!=='lunch'&&id!=='mealpreps'&&<strong className="local-menu-price">{moneyClp(row.price)}</strong>}
          </article>)}</div>:<p className="local-menu-empty">No hay productos con disponibilidad confirmada en esta sección. Consulta al equipo del local.</p>}
          {id==='mealpreps'&&<a className="local-menu-button" href="/tienda">VER PLANES Y FAMILIARES <span aria-hidden="true">↗</span></a>}
        </section>;
      })}
    </div>
  </>;
}
export function LocalMenuPage({loadMenu=fetchLocalMenu}) {
  const pageRef=useRef(null);
  const [data,setData]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const header=document.querySelector('.site-header'),page=pageRef.current;
    if(!header||!page)return;
    const measure=()=>page.style.setProperty('--carta-header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);
    measure();const observer=new ResizeObserver(measure);observer.observe(header);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{const controller=new AbortController();let alive=true,sequence=0;const refresh=()=>{const current=++sequence;loadMenu(controller.signal).then(d=>{if(alive&&current===sequence){setData(d);setError('');}}).catch(e=>{if(alive&&current===sequence&&e.name!=='AbortError')setError(e.message);});};const visible=()=>{if(document.visibilityState==='visible')refresh();};setError('');refresh();const timer=window.setInterval(visible,45000);document.addEventListener('visibilitychange',visible);return()=>{alive=false;controller.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[loadMenu,retry]);
  return <article className="local-menu-page" ref={pageRef}>
    <a className="local-menu-skip" href="#carta-contenido">Saltar a la carta</a>
    <header className="local-menu-hero"><p className="eyebrow">FULLNESS LAB · LA DEHESA</p><h1>NUESTRA <span>CARTA.</span></h1><p>Comida real. Ingredientes honestos. Cocina consciente.</p><div className="local-menu-hero-meta"><span>Av. La Dehesa 1844, local 204</span><span>Precios en pesos chilenos, IVA incluido</span></div></header>
    {error?<div className="local-menu-feedback" role="alert"><p>{error}</p><button type="button" className="local-menu-button" onClick={()=>setRetry(n=>n+1)}>VOLVER A INTENTAR</button></div>:!data?<p className="local-menu-feedback" role="status">Cargando la carta…</p>:<>
      {!data.published&&<p className="local-menu-feedback">Estamos actualizando la carta. Consulta al equipo del local por los productos disponibles hoy.</p>}
      <LocalMenuContent data={data}/>
    </>}
    <aside className="local-menu-help"><h2>¿TIENES ALGUNA DUDA?</h2><p>Antes de pedir, consulta al equipo por ingredientes, alérgenos y disponibilidad. Las preparaciones están sujetas a disponibilidad.</p><a href="/preguntas-frecuentes">Cómo funciona Fullness Lab</a></aside>
  </article>;
}
async function fetchLocalMenu(signal) {const response=await fetch('/api/commerce/local-menu',{cache:'no-store',signal});const payload=await response.json();if(!response.ok)throw Error(payload.error||'No pudimos cargar la carta.');return payload.data;}
