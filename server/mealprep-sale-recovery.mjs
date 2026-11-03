import {saleError} from './mealprep-sale-capacity.mjs';
// Expiration alone is not proof of no payment. Read the preference and payment
// observations before releasing a held portion; uncertainty leaves it held.
export async function reconcileSaleCheckout({attempt,supabase,gateway,syncPayment,profile,now=new Date()}){
 if(attempt.reservation_state!=='held')return{status:'unchanged'};
 let preference=null,evidence;
 if(attempt.state==='prepared'&&new Date(now)-new Date(attempt.created_at)>10*60000){
  evidence={kind:'never_claimed',checkedAt:new Date(now).toISOString()};
 }else{
  let preferenceId=attempt.preference_id;
  if(!preferenceId){const found=await gateway(`/checkout/preferences/search?external_reference=${encodeURIComponent(attempt.order_id)}`,{profile});const rows=(found.elements||found.results||[]).filter(p=>String(p.external_reference)===attempt.order_id);if(rows.length!==1)return{status:'pending'};preferenceId=rows[0].id;}
  preference=await gateway(`/checkout/preferences/${encodeURIComponent(preferenceId)}`,{profile});
  if(String(preference.external_reference)!==attempt.order_id||preference.expires!==true||!preference.expiration_date_to||!(Date.parse(preference.expiration_date_to)<=new Date(now).getTime()))return{status:'pending'};
  const found=await gateway(`/v1/payments/search?external_reference=${encodeURIComponent(attempt.order_id)}&limit=100`,{profile}),payments=found.results;
  if(!Array.isArray(payments)||!Number.isSafeInteger(found.paging?.total)||found.paging.total!==payments.length||payments.some(p=>String(p.external_reference)!==attempt.order_id))return{status:'pending'};
  for(const payment of payments)await syncPayment(String(payment.id),attempt.order_id);
  if(payments.some(p=>p.status==='approved'))return{status:'paid'};
  if(payments.some(p=>!['rejected','cancelled'].includes(p.status)))return{status:'pending'};
  evidence={kind:'expired_preference_and_payment_search',preferenceId:String(preference.id),expiredAt:preference.expiration_date_to,checkedAt:new Date(now).toISOString(),payments:payments.map(p=>({id:String(p.id),status:p.status})),total:found.paging.total};
 }
 const latest=await supabase.from('mealprep_sale_checkouts').select('*').eq('checkout_key',attempt.checkout_key).maybeSingle();if(latest.error||!latest.data)throw saleError('No pudimos revisar la compra.',503);
 if(latest.data.reservation_state!=='held')return{status:'unchanged'};
 if(evidence.kind==='never_claimed'&&latest.data.state!=='prepared')return{status:'pending'};
 const r=await supabase.rpc('transition_mealprep_sale_checkout',{p_key:attempt.checkout_key,p_action:'release',p_revision:latest.data.revision,p_document:{verifiedNoPayment:true,preferenceExpired:true,evidence}});
 if(r.error)return{status:'pending'};return{status:'released'};
}
export async function recoverSaleCheckouts({supabase,gateway,syncPayment,profile,now=new Date(),limit=10}){
 const r=await supabase.from('mealprep_sale_checkouts').select('*').eq('reservation_state','held').lt('created_at',new Date(new Date(now)-30*60000).toISOString()).order('updated_at').limit(limit);
 if(r.error)throw Error('Recovery lookup failed');let released=0,pending=0,paid=0;
 for(const attempt of r.data){try{const result=await reconcileSaleCheckout({attempt,supabase,gateway,syncPayment,profile,now});if(result.status==='released')released++;else if(result.status==='paid')paid++;else pending++;}catch{pending++;}finally{await supabase.from('mealprep_sale_checkouts').update({updated_at:new Date(now).toISOString()}).eq('checkout_key',attempt.checkout_key).eq('reservation_state','held');}}
 return{checked:r.data.length,released,paid,pending};
}
