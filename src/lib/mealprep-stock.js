export function stockQuantity(value){
 if(value===null||value===undefined||! /^-?\d+$/.test(String(value)))return 'Por verificar';
 const milli=BigInt(value);if(milli>BigInt(Number.MAX_SAFE_INTEGER)||milli< -BigInt(Number.MAX_SAFE_INTEGER))return 'Por verificar';
 return new Intl.NumberFormat('es-CL',{maximumFractionDigits:3}).format(Number(milli)/1000);
}
export function physicalCountMilli(value){
 if(!/^\d{1,7}$/.test(String(value))||Number(value)>1000000)throw Error('Indica entre 0 y 1.000.000 de unidades completas.');
 return (BigInt(value)*1000n).toString();
}
