export const MIX_CATEGORIES=Object.freeze(['Todos','Pollo','Pavo','Vacuno','Pescados','Vegetarianos']);
export const CATEGORY_PRICES=Object.freeze({Pollo:9800,Pavo:9600,Vacuno:10780,Pescados:10690,Vegetarianos:8900});
// Explicit library categories win; names are only a presentation fallback for legacy records.
export function mixCategory(item){
 if(CATEGORY_PRICES[item.saleCategory||item.category])return item.saleCategory||item.category;
 const name=String(item.title||item.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/pollo|chicken/.test(name))return 'Pollo';if(/pavo/.test(name))return 'Pavo';
 if(/salmon|merluza|pescado/.test(name))return 'Pescados';if(/carne|vacuno|mechada/.test(name))return 'Vacuno';
 return 'Vegetarianos';
}
export function mixPhotos(item){const primary=item.photoUrl||(typeof item.image==='string'?item.image:''),secondary=item.secondaryPhotoUrl||(typeof item.secondaryImage==='string'?item.secondaryImage:'');return [secondary||primary||'',primary||secondary||''].filter((v,i,a)=>v&&a.indexOf(v)===i);}
const INTERNAL_ALLERGEN_NOTES=new Set([
 '(Esta declaración mantiene la coherencia con el resto de la línea Fullness Lab',
 'considerando que los productos se elaboran en la misma cocina.)'
]);
export function publicAllergens(value){return (Array.isArray(value)?value:[]).filter(text=>!INTERNAL_ALLERGEN_NOTES.has(String(text).trim().replace(/\s+/g,' ')));}
export function mixRequest(item){return item.kind==='mealprep'?{kind:'mealprep',libraryMealId:item.libraryMealId,quantity:item.qty}:{slug:item.slug,quantity:item.qty};}
export function mixTotals(items,weeklyEligible=false){
 const subtotal=items.reduce((n,i)=>n+Number(i.price)*i.qty,0);
 const individual=items.filter(i=>i.kind==='mealprep');
 const units=individual.reduce((n,i)=>n+i.qty,0),eligibleSubtotal=individual.reduce((n,i)=>n+i.price*i.qty,0);
 // weeklyEligible is a server-confirmed result that includes earlier paid units.
 const rate=weeklyEligible&&units>0?35:units>=24?10:0;
 const discount=Math.round(eligibleSubtotal*rate/100);
 return {subtotal,units,eligibleSubtotal,rate,discount,total:subtotal-discount};
}
export const MIX_DELIVERY_NOTICE='IMPORTANTE: El valor de tu compra no incluye despacho. Puedes retirar sin costo en nuestra tienda o solicitar envío a domicilio, cuyo valor se cotiza por separado según distancia y volumen del pedido.';
export function mixDeliveryQuote({mode,comuna}={}){
 if(mode==='pickup')return {status:'pickup',commune:'',feeClp:0,canPayOnline:true,message:'Retiro en tienda sin costo, previa coordinación.'};
 const commune=String(comuna||'').trim();
 return {status:'separate',commune,feeClp:0,canPayOnline:mode==='delivery'&&commune.length>=2,message:'El despacho se cotiza y paga por separado, previa aprobación. El pago en la web incluye sólo los productos.'};
}
