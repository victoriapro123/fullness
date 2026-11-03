import assert from 'node:assert/strict';
import {validMealprepPhotoUrl} from '../server/mealprep-photo-url.mjs';
import {getDeliveryQuote,DELIVERY_COORDINATION_MESSAGE} from '../src/lib/delivery-rates.js';
for(const value of ['', '/api/media?key=images%2Fmeal-preps%2Fphoto.png','https://www.fullnesslab.com/api/media?key=photo','https://images.example.test/photo.jpg'])assert.equal(validMealprepPhotoUrl(value),true,value);
for(const value of ['//evil.test/a','/other','javascript:alert(1)','http://example.test/a','https://user:password@example.test/a',{},42])assert.equal(validMealprepPhotoUrl(value),false,String(value));
for(const [comuna,fee] of [['Lo Barnechea',3990],['Las Condes',5990],['Vitacura',5990]]){const q=getDeliveryQuote({mode:'delivery',comuna});assert.equal(q.feeClp,fee);assert(!q.message.includes('no incluye'));}
const other=getDeliveryQuote({mode:'delivery',comuna:'Providencia'});assert.equal(other.message,DELIVERY_COORDINATION_MESSAGE);assert.equal(other.feeClp,null);assert.equal(other.canPayOnline,false);
assert.equal(getDeliveryQuote({mode:'pickup'}).feeClp,0);
console.log('PASS: fotos cargadas/enlaces seguros, tres tarifas y despacho coordinado no gratuito.');
