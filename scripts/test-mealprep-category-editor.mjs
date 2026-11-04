import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mapMealLibraryItem,normalizeMealprepSaleCategory} from '../src/lib/menu-items.js';
import {mealprepFormChange} from '../src/lib/mealprep-publication.js';
import {MIX_CATEGORIES} from '../src/lib/mix-commerce.js';
for(const category of MIX_CATEGORIES.slice(1)){
 assert.equal(normalizeMealprepSaleCategory(category),category);
 assert.equal(mapMealLibraryItem({id:'fixture',sale_category:category}).saleCategory,category);
}
for(const value of [null,'','Todos','Desconocido',{}])assert.equal(normalizeMealprepSaleCategory(value),null);
assert.equal(mapMealLibraryItem({id:'legacy'}).saleCategory,'');
const original={salePriceClp:'',availableForPlans:false,nutritionFacts:{protein_g:20},ingredients:['Pollo']};
const changed=mealprepFormChange(original,{name:'saleCategory',type:'select-one',value:'Pollo'});
assert.equal(changed.salePriceClp,'');assert.equal(changed.availableForPlans,false);assert.deepEqual(changed.nutritionFacts,original.nutritionFacts);assert.deepEqual(changed.ingredients,original.ingredients);
const controls=await readFile('src/components/mealprep-publication-controls.jsx','utf8'),library=await readFile('src/lib/menu-items.js','utf8');
assert.match(controls,/name="saleCategory"/);assert.match(controls,/form.saleCategory\|\|''/);assert.match(controls,/No cambia su precio ni lo publica/);
assert.match(library,/input.saleCategory !== undefined \|\| input.sale_category !== undefined/);
console.log('PASS: categorías explícitas editables, lectura de fichas antiguas, campo omitido preservado y cambio de categoría sin modificar precio, publicación ni nutrición.');
