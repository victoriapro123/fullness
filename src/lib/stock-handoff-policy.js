const pairs=new Map([['qa',['http://127.0.0.1:3120','http://127.0.0.1:3151/stock-handoff']],['production',['https://www.fullnesslab.com','https://core.prof3sional.com/stock-handoff']]]);
export function stockClientPolicy(config,origin,{binding=false}={}){
 const pair=pairs.get(config?.environment);
 if(!pair||config.enabled!==true||origin!==pair[0]||config.sourceOrigin!==pair[0]||config.corePage!==pair[1]||binding&&config.bindingEnabled!==true||!Array.isArray(config.consumers)||config.consumers.some(c=>!['fullness.mealprep-list.stock.v1','fullness.mealprep-detail.stock.v1'].includes(c)))throw Object.assign(Error('El guardado de stock todavía no está habilitado en este entorno.'),{preparationNotStarted:true});
 return config;
}
