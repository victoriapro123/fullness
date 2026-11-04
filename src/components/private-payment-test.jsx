import {useEffect,useRef,useState} from 'react';
import {getSupabaseClient} from '../lib/supabase.js';
import {mixRequest,mixTotals} from '../lib/mix-commerce.js';
import './private-payment-test.css';

const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
async function adminHeaders(){
 const client=await getSupabaseClient();if(!client)throw Error('No se pudo conectar la cuenta. Vuelve a iniciar sesión.');
 const {data,error}=await client.auth.getSession();
 if(error||!data.session?.access_token)throw Error('Vuelve a iniciar sesión como administrador.');
 const headers={Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'};
 return headers;
}
async function adminRequest(method,body){
 const headers=await adminHeaders();
 const response=await fetch('/api/mercadopago/test-session',{method,headers,cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});
 const result=await response.json();if(!response.ok)throw Error(result.error?.message||'No pudimos habilitar la prueba.');
 return {data:result.data,headers};
}
export function PrivatePaymentTest({items=[],families=[],request=adminRequest,getHeaders=adminHeaders}){
 const [open,setOpen]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [quantities,setQuantities]=useState({}),[form,setForm]=useState({name:'Comprador de prueba',email:'',phone:'+56911111111',mode:'pickup',address:'',comuna:'',instructions:'Compra TEST sin despacho'});
 const [attemptStarted,setAttemptStarted]=useState(false),attempt=useRef(null),busyRef=useRef(false);
 const products=[...items.filter(i=>i.availableForPlans&&i.priceClp>0).map(i=>({...i,name:i.title,price:i.priceClp,kind:'mealprep'})),...families.map(i=>({...i,kind:'family'}))];
 const cart=products.filter(i=>quantities[i.id]>0).map(i=>({...i,qty:quantities[i.id]}));
 const totals=mixTotals(cart);
 // Authorizations and selections never enter the public cart or localStorage.
 useEffect(()=>()=>{attempt.current=null;},[]);
 async function verify(){if(busyRef.current)return;busyRef.current=true;setBusy(true);setReady(false);setMessage('Verificando conexión de prueba…');try{await request('GET');setReady(true);setMessage('Conexión TEST verificada. No se utilizarán credenciales reales.');}catch(e){setMessage(e.message);}finally{busyRef.current=false;setBusy(false);}}
 async function submit(event){
  event.preventDefault();if(busyRef.current||!ready||!cart.length)return;
  busyRef.current=true;setBusy(true);setAttemptStarted(true);setMessage('Preparando el pago de prueba…');
  try{
   if(!attempt.current){const session=await request('POST',{});attempt.current={key:crypto.randomUUID(),token:session.data.testSessionToken,expires:session.data.expiresAt};}
   const a=attempt.current;
   if(Date.parse(a.expires)<=Date.now())throw Error('La sesión TEST venció. Cierra y vuelve a abrir esta herramienta para iniciar otra prueba.');
   const headers=await getHeaders();
   const response=await fetch('/api/mercadopago/preferences',{method:'POST',headers,body:JSON.stringify({cart:cart.map(mixRequest),fulfillment:form,checkoutKey:a.key,expectedAmount:totals.total,testSessionToken:a.token})});
   const payload=await response.json();if(!response.ok)throw Error(payload.error?.message||'No pudimos preparar el pago de prueba. Puedes reintentar sin duplicarlo.');
   if(payload.data?.testMode!==true||!payload.data.initPoint)throw Error('El servidor no confirmó el modo TEST. No abriremos el pago.');
   // A separate key allows the test return to be traced without replacing a customer's order.
   try{sessionStorage.setItem('fullness_private_test_order',JSON.stringify({orderId:payload.data.orderId,amount:payload.data.amount,createdAt:new Date().toISOString()}));}catch{/* Storage is not required to open an already verified TEST preference. */}
   window.location.assign(payload.data.initPoint);
  }catch(e){setMessage(e.message);setBusy(false);}finally{busyRef.current=false;}
 }
 function change(e){setForm(f=>({...f,[e.target.name]:e.target.value}));}
 return <section className="private-payment-test" aria-labelledby="private-payment-test-title">
  <h4 id="private-payment-test-title">Prueba de pago privada</h4>
  <p>Herramienta exclusiva de administración. No aparece en el carrito de clientes.</p>
  {!open?<button type="button" onClick={()=>setOpen(true)}>Preparar compra TEST</button>:<>
   <p className="private-test-notice"><strong>Sin dinero real.</strong> Usa un comprador de prueba distinto del vendedor y una tarjeta de prueba de Mercado Pago, en un navegador sin sesión personal. Esta compra no genera correos, despacho ni beneficios.</p>
   <button type="button" disabled={busy||attemptStarted} onClick={verify}>{busy?'Comprobando…':'Verificar conexión TEST'}</button>
   <p role="status" aria-live="polite">{message}</p>
   {ready&&<form onSubmit={submit}>
    <fieldset disabled={busy||attemptStarted}><legend>Selecciona productos para la prueba</legend>
     <div className="private-test-products">{products.map(p=><label key={p.id}><span>{p.name}<small>{p.kind==='family'?'Familiar':'Individual'} · {money(p.price)}</small></span><input aria-label={`Cantidad de prueba de ${p.name}`} type="number" min="0" max="1000" step="1" value={quantities[p.id]||0} onChange={e=>setQuantities(q=>({...q,[p.id]:Math.max(0,Math.min(1000,Math.trunc(Number(e.target.value)||0)))}))}/></label>)}</div>
     <div className="private-test-fields"><label>Nombre de prueba<input required name="name" value={form.name} onChange={change}/></label><label>Correo del comprador de prueba<input required type="email" name="email" value={form.email} onChange={change} autoComplete="off"/></label><label>Teléfono de prueba<input required name="phone" value={form.phone} onChange={change}/></label><label>Entrega<select name="mode" value={form.mode} onChange={change}><option value="pickup">Retiro de prueba</option><option value="delivery">Despacho de prueba — no se enviará</option></select></label>{form.mode==='delivery'&&<><label>Dirección ficticia<input required name="address" value={form.address} onChange={change}/></label><label>Comuna<input required name="comuna" value={form.comuna} onChange={change}/></label></>}</div>
    </fieldset>
    <p>Subtotal: {money(totals.subtotal)} · Descuento: {money(totals.discount)} · <strong>Total TEST: {money(totals.total)}</strong></p>
    {attemptStarted&&<p>La selección está protegida. Reintentar recupera este mismo intento, sin crear otra compra.</p>}
    <button type="submit" disabled={busy||!cart.length}>{busy?'Preparando…':attemptStarted?'Reintentar el mismo pago TEST':'Abrir Mercado Pago TEST'}</button>
   </form>}
   {!busy&&<button type="button" onClick={()=>{if(attemptStarted&&!window.confirm('Este intento puede tener un enlace de pago pendiente. ¿Salir de la herramienta sin realizar el pago?'))return;setOpen(false);setReady(false);setAttemptStarted(false);setMessage('');attempt.current=null;}}>Cerrar herramienta</button>}
  </>}
 </section>;
}
