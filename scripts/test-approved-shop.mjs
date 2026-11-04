import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const refs=JSON.parse(await readFile('src/components/approved-shop-reference.json','utf8'));
assert.equal(refs.length,2);
const hashes=['03e01ada7c28cbff514732606ef7d0d6ed3e84d948f1247fde125d365698db8f','70fd69d0bae7dc66c91a0dc3e9c5c785e43710b18ee09173a2a57019e6babccc'];
for(const [i,ref] of refs.entries()){
 assert.equal(ref.sha,hashes[i]);assert.equal(ref.mobile,i===1);
 assert.match(ref.hero,/<h1[^>]*>COMIDA REAL\.<br><span>A TU MANERA\.<\/span><\/h1>/);
 assert.match(ref.hero,/lucide-list-checks/);assert.match(ref.hero,/lucide-sliders-horizontal/);assert.match(ref.hero,/lucide-package-check/);
 assert.match(ref.css,/\.dialog-body\s*\{padding:28px/);
 assert.match(ref.css,/\.dialog-body\s*\{padding:20px/);
 assert.doesNotMatch(ref.css,/\.dialog-\.approved-page/);
 assert.doesNotMatch(JSON.stringify(ref),/data:image|<script|onclick=|SIN COMPRAS REALES|Demostración para aprobación/);
 const markers=['NUESTRAS PREPARACIONES','id="mix"','id="familiares"','id="rewards"','id="como-funciona"','class="community"'];
 const positions=markers.map(m=>ref.sections.indexOf(m));assert.ok(positions.every(n=>n>=0));assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
 assert.match(ref.footer,/contaminación cruzada con gluten/);assert.match(ref.footer,/cecilia@fullnesslab.com/);
}
const shop=await readFile('src/components/approved-shop.jsx','utf8'),main=await readFile('src/main.jsx','utf8');
assert.match(shop,/setSurface\(\{shadow,mobile\}\)/,'Responsive remount must renew portal containers');
assert.match(shop,/id==='category-trigger'/,'The original mobile filter must be wired');
assert.doesNotMatch(shop,/<button[^>]*className="filter-trigger"/,'Do not duplicate the reference filter');
assert.match(shop,/publicAllergens\(detail.allergens\)/);assert.match(shop,/color-scheme:light/);
assert.match(main,/headers=await checkoutHeaders\(\)/);assert.match(main,/stockLetter.items\?\.find\(p=>p.libraryMealId===item.libraryMealId\)/);
console.log('PASS approved desktop/mobile references, exact hero/icons/section order, dialog CSS preservation, responsive portal renewal, original filter, safe product display and checkout integration.');
