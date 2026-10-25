import assert from "node:assert/strict";
import {quoteCheckout} from "../server/mercadopago-checkout.mjs";
for (const slug of ["posta negra-zanahoria-vegetales", "pollo-curry.manzana-verde.guiso", "p-2"]) {
  let queried="";
  const quote=await quoteCheckout({cart:[{slug,quantity:1}],fulfillment:{mode:"pickup"},dependencies:{env:{},
    mercadoPagoRequest:async()=>{throw Error("No se llama a Mercado Pago al cotizar");},
    supabase:{from(table){assert.equal(table,"menu_items");return{select:()=>({in:(_key,slugs)=>{queried=slugs[0];return{eq:async()=>({data:[{id:"00000000-0000-4000-8000-000000000001",slug,name:"Familiar QA",product_type:"family",is_active:true,price_clp:18800}],error:null})};}})};}}
  }});
  assert.equal(queried,slug,"El identificador se consulta literalmente, sin cambiar el catálogo");assert.equal(quote.amount,18800);
}
for(const slug of ["../p","p/2","p..2","p  2","P-2","p_2","p?x=1","p\n2","p".repeat(161)]){
  await assert.rejects(quoteCheckout({cart:[{slug,quantity:1}],fulfillment:{mode:"pickup"},dependencies:{env:{},mercadoPagoRequest:async()=>{throw Error("Sin proveedor");},supabase:{from(){throw Error("No debe consultar identificador inválido");}}}}),e=>e.statusCode===422);
}
console.log("Identificadores QA OK: puntos/espacios publicados aceptados literalmente, rutas/controles/partes vacías rechazados. Sin escrituras ni tráfico externo.");
