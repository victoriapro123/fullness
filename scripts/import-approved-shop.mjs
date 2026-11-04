// Import only the two approved local references. Never execute their demo scripts.
import fs from 'node:fs';
import crypto from 'node:crypto';
const base='R:/Entregables-Codex/Fullness-Tienda-Propuesta-Cecilia-20261104/';
const files=['Fullness-Lab-Propuesta-Tienda.html','Fullness-Lab-Tienda-Movil.html'];
const expected=['03e01ada7c28cbff514732606ef7d0d6ed3e84d948f1247fde125d365698db8f','70fd69d0bae7dc66c91a0dc3e9c5c785e43710b18ee09173a2a57019e6babccc'];
function assets(s){return s.replace(/<img\b[^>]*>/g,tag=>tag.replace(/src="data:image[^\"]+"/,()=>{
 const path=tag.includes('shop-hero-botanical')?'/src/assets/coliflor-hero-planes.png':tag.includes('Comunidad Fullness')?'/api/media?key=images%2Fcommunity%2Fcomunidad-landing-cecilia.jpeg':tag.includes('alt="Mealprep Fullness"')?'/src/assets/ecommerce/fullness-hero-box-curated-cutout-v1.png':'/api/media?key=assets%2Fbrand%2Ffullness-lab-horizontal-contrast-2026.png';return `src="${path}"`;
}));}
const result=files.map((name,i)=>{
 const bytes=fs.readFileSync(base+name),sha=crypto.createHash('sha256').update(bytes).digest('hex');if(sha!==expected[i])throw Error('Approved reference changed: '+name);
 const s=bytes.toString('utf8'),styles=[...s.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[1].replace(/\n\s*\n/g,'\n'));
 const heroStart=s.indexOf('<section class="shop-hero-showcase"'),heroEnd=s.indexOf('</figure>',heroStart)+9;
 const hero=assets(s.slice(heroStart,heroEnd)+'</section>');
 const contentStart=s.indexOf('<section class="wrap section">',heroEnd),contentEnd=s.indexOf('</main>',contentStart);
 const footerStart=s.indexOf('<footer class="footer"'),footerEnd=s.indexOf('</footer>',footerStart)+9;
 const headerStart=s.indexOf('<header class="header"'),headerEnd=s.indexOf('</header>',headerStart)+9;
 const scope=css=>css.replace(/:root\b/g,':host').replace(/(?<![\w.#-])html(?=[\s{.,:#])/g,':host').replace(/(?<![\w.#-])body(?=[\s{.,:#])/g,'.approved-page');
 return {source:name,sha,css:scope(styles[0]),heroCss:i===0?styles[1]:'',hero,header:assets(s.slice(headerStart,headerEnd)).replace(/ onclick="[^"]*"/g,''),sections:assets(s.slice(contentStart,contentEnd)).replace('<p>En esta propuesta, el carrito permite probar el 10%. El historial de compras semanales se incorporará al implementar el programa.</p>',''),footer:assets(s.slice(footerStart,footerEnd)).replace('<span>PROPUESTA VISUAL PARA APROBACIÓN · SIN COMPRAS REALES</span>',''),mobile:i===1};
});
const json=JSON.stringify(result,null,2);
process.stdout.write('*** Begin Patch\n*** Add File: C:/Users/Usuario/Documents/Desarrollos/Core360 SaaS/.local/fullness-autonomy-release-main-20261102/app/src/components/approved-shop-reference.json\n'+json.split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch');
