import {saleError,uuid} from './mealprep-sale-capacity.mjs';
export function normalizeMixItem(item){
 if(!uuid(item?.libraryMealId)||!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>1000)throw saleError('Revisa el plato y la cantidad elegida.',422);
 return {kind:'mealprep',libraryMealId:item.libraryMealId,quantity:item.quantity};
}
export async function verifiedRewardsUser(supabase,request){
 const header=request?.headers?.authorization||'';
 if(!header)return null;
 if(!/^Bearer \S+$/.test(header))throw saleError('Vuelve a iniciar sesión para consultar tus beneficios.',401);
 const {data,error}=await supabase.auth.getUser(header.slice(7));
 if(error||!data?.user?.id||!data.user.email_confirmed_at)throw saleError('Verifica tu correo e inicia sesión para usar tus beneficios.',401);
 return data.user.id;
}
export async function quoteMixRewards({supabase,userId,units,eligibleSubtotal,checkoutKey}){
 const r=await supabase.rpc('quote_fullness_mix_rewards',{p_user:userId||null,p_units:units,p_subtotal:eligibleSubtotal,p_key:uuid(checkoutKey)?checkoutKey:null});
 if(r.error)throw saleError('No pudimos confirmar tus beneficios. Conservamos tu selección; intenta nuevamente.',503);
 if(!r.data||![0,10,35].includes(r.data.rate)||!Number.isSafeInteger(Number(r.data.discount))||Number(r.data.discount)<0||Number(r.data.discount)>eligibleSubtotal)throw saleError('No pudimos comprobar el beneficio de tu compra.',503);
 r.data.discount=Number(r.data.discount);
 return r.data;
}
// CLP uses integer prices. Split a quantity when rounding requires two unit prices.
export function mixPaymentItems(rows,discount=0){
 const eligible=rows.filter(r=>r.product_snapshot?.purchaseModel==='mix_v1'&&r.product_snapshot?.productType==='mealprep');
 const basis=eligible.reduce((s,r)=>s+r.unit_price_clp*r.quantity,0);
 if(!Number.isSafeInteger(discount)||discount<0||discount>basis)throw saleError('No pudimos comprobar el descuento.',503);
 const allocations=new Map();let assigned=0;
 const fractions=eligible.map((r,index)=>{const exact=discount*r.unit_price_clp*r.quantity/(basis||1),amount=Math.floor(exact);allocations.set(r,amount);assigned+=amount;return{r,index,remainder:exact-amount};}).sort((a,b)=>b.remainder-a.remainder||a.index-b.index);
 for(let n=0;n<discount-assigned;n++)allocations.set(fractions[n].r,allocations.get(fractions[n].r)+1);
 const result=[];
 for(const row of rows){const total=row.unit_price_clp*row.quantity-(allocations.get(row)||0),price=Math.floor(total/row.quantity),extra=total%row.quantity;
  for(const [quantity,unit_price] of [[row.quantity-extra,price],[extra,price+1]])if(quantity)result.push({id:row.product_id,title:row.product_name,currency_id:'CLP',quantity,unit_price});
 }
 const combined=new Map();for(const i of result){const key=i.id+':'+i.unit_price;const found=combined.get(key);if(found)found.quantity+=i.quantity;else combined.set(key,{...i});}return [...combined.values()];
}
