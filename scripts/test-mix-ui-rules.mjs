import assert from 'node:assert/strict';
import {MIX_CATEGORIES,CATEGORY_PRICES,mixCategory,mixPhotos,mixTotals,mixRequest,mixDeliveryQuote,publicAllergens} from '../src/lib/mix-commerce.js';

assert.deepEqual(MIX_CATEGORIES,['Todos','Pollo','Pavo','Vacuno','Pescados','Vegetarianos']);
assert.deepEqual(CATEGORY_PRICES,{Pollo:9800,Pavo:9600,Vacuno:10780,Pescados:10690,Vegetarianos:8900});
assert.equal(mixCategory({saleCategory:'Vegetarianos',name:'Pollo a la King'}),'Vegetarianos','Explicit editable category overrides legacy name fallback');
assert.equal(mixCategory({category:'Pavo',title:'Salmón'}),'Pavo');
for(const [name,category] of [['Apple Golden Chicken','Pollo'],['Hamburguesas de pavo','Pavo'],['Salmón al jengibre','Pescados'],['Merluza austral','Pescados'],['Estofado de carne','Vacuno'],['Mechada con choclo','Vacuno'],['Croquetas de garbanzo','Vegetarianos']])assert.equal(mixCategory({name}),category);

const original=Object.freeze({photoUrl:'/original-bag.png',secondaryPhotoUrl:'/original-plated.png',nutritionFacts:Object.freeze({protein_g:20})});
assert.deepEqual(mixPhotos(original),['/original-plated.png','/original-bag.png']);
assert.equal(original.photoUrl,'/original-bag.png');assert.equal(original.secondaryPhotoUrl,'/original-plated.png');
assert.deepEqual(mixPhotos({photoUrl:'/one.png'}),['/one.png']);
assert.deepEqual(mixPhotos({secondaryPhotoUrl:'/one.png'}),['/one.png']);
assert.deepEqual(mixPhotos({photoUrl:'/one.png',secondaryPhotoUrl:'/one.png'}),['/one.png']);
assert.deepEqual(mixPhotos({}),[]);
assert.deepEqual(mixPhotos({image:'/bag.webp',secondaryImage:'/plated.webp'}),['/plated.webp','/bag.webp']);

const meal=qty=>({kind:'mealprep',price:9800,qty}),family={kind:'family',price:18800,qty:1};
for(const qty of [1,6,23]){
 const total=mixTotals([meal(qty)]);
 assert.equal(total.units,qty);assert.equal(total.subtotal,qty*9800);assert.equal(total.rate,0);assert.equal(total.discount,0);assert.equal(total.total,qty*9800);
}
assert.equal(mixTotals([meal(23),family]).rate,0,'A family cannot supply the 24th eligible unit');
assert.deepEqual(mixTotals([meal(24)]),{subtotal:235200,units:24,eligibleSubtotal:235200,rate:10,discount:23520,total:211680});
assert.deepEqual(mixTotals([meal(24),family]),{subtotal:254000,units:24,eligibleSubtotal:235200,rate:10,discount:23520,total:230480});
assert.equal(mixTotals([family]).discount,0);
const weekly=mixTotals([meal(24),family],true);
assert.equal(weekly.rate,35);assert.equal(weekly.discount,82320);assert.equal(weekly.total,171680,'35% wins over 10%, never stacked; family remains full price');
assert.equal(mixTotals([meal(6)],true).discount,20580);
assert.deepEqual(mixTotals([meal(1)],true),{subtotal:9800,units:1,eligibleSubtotal:9800,rate:35,discount:3430,total:6370},'One current unit can complete six after five already paid this week, only when server confirms eligibility');
assert.equal(mixTotals([family],true).discount,0,'Server eligibility never discounts a family-only purchase');

const allergens=['Pescado (salmón)','Puede contener trazas de leche.','Sésamo','(Esta declaración mantiene la coherencia con el resto de la línea Fullness Lab','considerando que los productos se elaboran en la misma cocina.)'];
assert.deepEqual(publicAllergens(allergens),allergens.slice(0,3));
assert.equal(allergens.length,5,'Public filtering must never edit original library content');
assert.deepEqual(publicAllergens(null),[]);
assert.deepEqual(publicAllergens(['Contiene frutos secos.','Elaborado en una cocina que manipula gluten.']),['Contiene frutos secos.','Elaborado en una cocina que manipula gluten.']);
const similarWarnings=[
 'Esta declaración mantiene la coherencia con el resto de la línea Fullness Lab: contiene pescado.',
 '(Esta declaración mantiene la coherencia con el resto de la línea Fullness Lab: contiene sésamo.)',
 'considerando que los productos se elaboran en la misma cocina.) Puede contener gluten.'
];
assert.deepEqual(publicAllergens(similarWarnings),similarWarnings,'Only the two exact internal notes are suppressed, never other warnings with similar wording');
assert.deepEqual(publicAllergens(['  (Esta declaración  mantiene la coherencia con el resto de la línea Fullness Lab  ','considerando que los productos se elaboran en la misma cocina.)']),[],'Whitespace-only variations of the same two internal notes are suppressed');

assert.deepEqual(mixRequest({kind:'mealprep',libraryMealId:'library-id',qty:1,price:1}),{kind:'mealprep',libraryMealId:'library-id',quantity:1});
assert.deepEqual(mixRequest({kind:'family',slug:'family-real',qty:2}),{slug:'family-real',quantity:2});
for(const comuna of ['Lo Barnechea','Las Condes','Vitacura','Ñuñoa']){
 const quote=mixDeliveryQuote({mode:'delivery',comuna});
 assert.equal(quote.feeClp,0);assert.equal(quote.status,'separate');assert.equal(quote.canPayOnline,true);assert.match(quote.message,/por separado/);
}
assert.equal(mixDeliveryQuote({mode:'pickup'}).feeClp,0);
assert.equal(mixDeliveryQuote({mode:'delivery',comuna:''}).canPayOnline,false);
console.log('PASS mix UI: explicit categories, original photo pair preserved, 1/6/23/24 and mixed totals, nonstacking best discount, internal allergen notes suppressed without editing originals, separate shipping.');
