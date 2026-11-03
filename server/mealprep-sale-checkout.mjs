import {randomUUID} from 'node:crypto';
import {SALE_AUTHORITY,resolveSaleCart,saleDigest,saleError,uuid} from './mealprep-sale-capacity.mjs';
const gatewayUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&['www.mercadopago.cl','www.mercadopago.com','sandbox.mercadopago.cl','sandbox.mercadopago.com'].includes(u.hostname)?u.href:null;}catch{return null;}};
function paymentItems(rows){const combined=new Map();for(const row of rows){const key=row.product_id+':'+row.unit_price_clp;const item=combined.get(key)||{id:row.product_id,title:row.product_name,currency_id:'CLP',quantity:0,unit_price:Number(row.unit_price_clp)};item.quantity+=row.quantity;combined.set(key,item);}return[...combined.values()];}
export async function createSaleCheckout({cart,fulfillment,expectedAmount,checkoutKey,supabase,mode,profile,deliveryQuote,now=new Date(),quoteOnly=false,services}){
 const customer={...services.customerSnapshot(fulfillment,{checkoutMode:mode}),comuna:deliveryQuote.commune,deliveryQuote:services.deliverySnapshot(deliveryQuote),operationalAuthority:'fullness',stockAuthority:SALE_AUTHORITY};
 const fingerprint=saleDigest({cart,customer,expectedAmount:expectedAmount??null,mode});
 const transition=async(a,action,document={})=>{const r=await supabase.rpc('transition_mealprep_sale_checkout',{p_key:a.checkout_key,p_action:action,p_revision:a.revision,p_document:document});if(r.error)throw saleError('Estamos comprobando esta compra. Inténtalo nuevamente sin cambiar el carrito.',409);return r.data;};
 async function result(a){
  const o=await supabase.from('orders').select('id,total_clp,subtotal_clp,delivery_fee_clp,currency').eq('id',a.order_id).maybeSingle();if(o.error||!o.data)throw saleError('No pudimos consultar esta compra. Inténtalo nuevamente.',503);
  if(a.state==='paid')throw Object.assign(saleError('Esta compra ya está pagada. Revisa la confirmación de tu pedido.'),{code:'CHECKOUT_ALREADY_PAID'});
  if(a.state==='cancelled'||a.preference_result?.expiration_date_to&&Date.parse(a.preference_result.expiration_date_to)<=Date.now())throw Object.assign(saleError('Este enlace de compra venció. Revisa el carrito para iniciar otra compra.'),{code:'CHECKOUT_EXPIRED'});
  if(a.state!=='ready'||!gatewayUrl(a.preference_result?.init_point))throw saleError('Estamos comprobando el enlace de pago. Inténtalo nuevamente sin cambiar el carrito.',503);
  return{orderId:a.order_id,preferenceId:a.preference_id,initPoint:a.preference_result.init_point,amount:Number(o.data.total_clp),subtotal:Number(o.data.subtotal_clp),deliveryFee:Number(o.data.delivery_fee_clp),currency:'CLP',testMode:mode==='test'};
 }
 async function verifyPreference(pref,a,order){
  if(!pref||String(pref.external_reference)!==a.order_id||!pref.id||!gatewayUrl(pref.init_point)||!Array.isArray(pref.items))throw saleError('No pudimos comprobar el enlace de pago. Inténtalo nuevamente.',503);
  const total=pref.items.reduce((sum,i)=>sum+Number(i.unit_price)*Number(i.quantity),0)+Number(pref.shipments?.cost||0);
  if(!Number.isSafeInteger(total)||total!==Number(order.total_clp)||pref.items.some(i=>i.currency_id!=='CLP')||profile.merchantId&&String(pref.collector_id)!==String(profile.merchantId))throw saleError('El enlace de pago no coincide con la compra. Contacta a Fullness Lab.',503);
  const rows=await supabase.from('order_items').select('product_id,product_name,quantity,unit_price_clp').eq('order_id',a.order_id);if(rows.error)throw saleError('No pudimos comprobar los platos de la compra.',503);
  const signature=items=>JSON.stringify(items.map(i=>({id:String(i.id),quantity:Number(i.quantity),unitPrice:Number(i.unit_price)})).sort((x,y)=>x.id.localeCompare(y.id)||x.unitPrice-y.unitPrice));
  if(signature(paymentItems(rows.data))!==signature(pref.items))throw saleError('El enlace de pago no coincide con los platos elegidos. Inténtalo nuevamente.',503);
  return pref;
 }
 async function recover(a){
  if(a.state==='ready'||a.state==='paid'||a.state==='cancelled')return result(a);
  if(a.state==='prepared')return start(a);
  // Never repeat an uncertain preference POST. Search by its durable order ID.
  const search=await services.gateway(`/checkout/preferences/search?external_reference=${encodeURIComponent(a.order_id)}`,{profile});
  const matches=(search.elements||search.results||[]).filter(p=>String(p.external_reference)===a.order_id);
  if(matches.length!==1)throw saleError('Estamos comprobando el enlace de pago. Inténtalo nuevamente sin cambiar el carrito.',503);
  const pref=await services.gateway(`/checkout/preferences/${encodeURIComponent(matches[0].id)}`,{profile});
  const o=await supabase.from('orders').select('total_clp').eq('id',a.order_id).maybeSingle();if(o.error||!o.data)throw saleError('No pudimos consultar la compra.',503);
  await verifyPreference(pref,a,o.data);a=await transition(a,'preference',pref);return result(a);
 }
 async function start(a){
  // CAS claim precedes the only preference POST, including after a page reload.
  a=await transition(a,'claim');
  const [o,items]=await Promise.all([supabase.from('orders').select('*').eq('id',a.order_id).maybeSingle(),supabase.from('order_items').select('*').eq('order_id',a.order_id)]);
  if(o.error||items.error||!o.data){await transition(a,'uncertain').catch(()=>{});throw saleError('No pudimos consultar esta compra. Inténtalo nuevamente.',503);}
  const site=services.siteUrl(),expiresAt=new Date(new Date(now).getTime()+30*60000).toISOString();
  const preference={expires:true,expiration_date_from:new Date(now).toISOString(),expiration_date_to:expiresAt,
   items:paymentItems(items.data),
   ...(Number(o.data.delivery_fee_clp)>0?{shipments:{cost:Number(o.data.delivery_fee_clp),mode:'not_specified'}}:{}),
   payer:{name:customer.name,...(customer.email?{email:customer.email}:{}),phone:{number:customer.phone}},external_reference:a.order_id,
   metadata:{order_id:a.order_id,checkout_mode:mode},statement_descriptor:'FULLNESS LAB',
   back_urls:{success:`${site}/tienda?checkout_status=success&order_id=${a.order_id}`,pending:`${site}/tienda?checkout_status=pending&order_id=${a.order_id}`,failure:`${site}/tienda?checkout_status=failure&order_id=${a.order_id}`},
   ...(site.startsWith('https:')?{auto_return:'approved',...(profile.webhookSecret?{notification_url:`${site}/api/mercadopago/${mode==='test'?'test-webhook':'webhook'}`}:{})}:{})};
  try{const pref=await services.gateway('/checkout/preferences',{method:'POST',body:preference,idempotencyKey:a.order_id,profile});await verifyPreference(pref,a,o.data);a=await transition(a,'preference',pref);return result(a);}
  catch(e){await transition(a,'uncertain').catch(()=>{});throw saleError('No pudimos comprobar el enlace de pago. Inténtalo nuevamente sin cambiar el carrito.',503);}
 }
 if(!quoteOnly&&!uuid(checkoutKey))throw saleError('Actualiza la página y vuelve a revisar tu carrito.');
 if(uuid(checkoutKey)){
  const prior=await supabase.from('mealprep_sale_checkouts').select('*').eq('checkout_key',checkoutKey).maybeSingle();if(prior.error)throw saleError('No pudimos consultar esta compra.',503);
  if(prior.data){
   if(prior.data.fingerprint!==fingerprint)throw saleError('La compra cambió. Revisa tu carrito antes de continuar.');
   if(quoteOnly){
    if(prior.data.state==='paid')throw Object.assign(saleError('Esta compra ya está pagada. Revisa la confirmación de tu pedido.'),{code:'CHECKOUT_ALREADY_PAID'});
    if(prior.data.state==='cancelled')throw Object.assign(saleError('La compra venció. Vuelve a revisar el carrito.'),{code:'CHECKOUT_EXPIRED'});
    const o=await supabase.from('orders').select('total_clp,subtotal_clp,delivery_fee_clp').eq('id',prior.data.order_id).maybeSingle();if(o.error||!o.data)throw saleError('No pudimos consultar la compra.',503);
    return{amount:Number(o.data.total_clp),subtotal:Number(o.data.subtotal_clp),deliveryFee:Number(o.data.delivery_fee_clp),currency:'CLP',paymentReady:true,resume:true};
   }
   return recover(prior.data);
  }
 }
 const resolved=await resolveSaleCart(cart,{supabase,now});
 const subtotal=resolved.lines.reduce((sum,l)=>sum+l.total,0),total=subtotal+deliveryQuote.feeClp;
 if(!Number.isSafeInteger(total)||total<=0||expectedAmount!==undefined&&expectedAmount!==total)throw saleError('El total cambió. Revisa tu carrito antes de pagar.');
 if(quoteOnly)return{amount:total,subtotal,deliveryFee:deliveryQuote.feeClp,currency:'CLP',deliveryVerified:true,paymentReady:true,plans:resolved.groups};
 if(mode==='test'&&resolved.groups.length)throw saleError('Las pruebas de pago no reservan las unidades de la tienda.');
 const order={id:randomUUID(),checkout_mode:mode,subtotal_clp:subtotal,discount_clp:0,delivery_fee_clp:deliveryQuote.feeClp,total_clp:total,currency:'CLP',note:fulfillment.instructions||null,customer_snapshot:customer};
 const lines=resolved.lines.map(({product,quantity,total})=>({product_id:product.id,quantity,unit_price_clp:Number(product.price_clp),total_clp:total,product_name:product.name,product_snapshot:{...Object.fromEntries(Object.entries(services.productSnapshot(product,now)).filter(([key])=>!key.startsWith('core360'))),pricingAuthority:'fullness',priceBasis:'gross',taxBps:1900,stockAuthority:SALE_AUTHORITY},ingredients:product.ingredients||[],nutrition_description:product.nutrition_description||null}));
 const prepared=await supabase.rpc('prepare_mealprep_sale_checkout',{p_key:checkoutKey,p_fingerprint:fingerprint,p_order:order,p_lines:lines});
 if(prepared.error)throw saleError(prepared.error.code==='40001'?'Un plato o su disponibilidad cambió. Revisa tu carrito.':'No pudimos guardar la compra. Inténtalo nuevamente.',prepared.error.code==='40001'?409:503);
 return recover(prepared.data);
}
