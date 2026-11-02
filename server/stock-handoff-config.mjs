import{denied}from'./stock-handoff-crypto.mjs';
const pairs={qa:{source:'http://127.0.0.1:3120',core:'http://127.0.0.1:3151'},production:{source:'https://www.fullnesslab.com',core:'https://core.prof3sional.com'}};
export function validateStockConfig(config){
 const pair=pairs[config?.environment];
 if(!pair||config.productionEnabled!==(config.environment==='production')||config.sourceIssuer!==pair.source||config.coreIssuer!==pair.core||config.corePage!==pair.core+'/stock-handoff'||config.sourceMetadataEndpoint!==pair.source+'/api/backoffice/mealprep-stock-handoff')denied('Entorno de inventario no habilitado.',503);
 for(const[key,max]of Object.entries({maxIntentAge:600,maxMetadataAge:60,maxResultAge:300}))if(!Number.isSafeInteger(config[key])||config[key]<1||config[key]>max)denied('Vigencia de inventario no configurada.',503);
 if(config.environment==='production'){
  if(!config.signingKeys||!config.peerKeys)denied('No hay llaves de producción registradas.',503);
  for(const entry of [...Object.values(config.signingKeys),...Object.values(config.peerKeys)])if(entry.environment!=='production'||typeof entry.kid!=='string'||/(^|[-_.])qa($|[-_.])/i.test(entry.kid))denied('No se permiten llaves QA en producción.',503);
 }
 return config;
}
export function publicStockConfig(config){validateStockConfig(config);return{enabled:true,environment:config.environment,sourceOrigin:config.sourceIssuer,corePage:config.corePage,consumers:[...config.consumers],bindingEnabled:config.bindingEnabled===true};}
