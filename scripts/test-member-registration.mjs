import assert from 'node:assert/strict';
import {normalizeMemberRegistration,registerMember} from '../src/lib/member-registration.js';
const input={name:'  María  Pérez ',email:' MARIA@EXAMPLE.INVALID ',phone:'+56 9 1234 5678',password:'Synthetic-password-123'};
assert.deepEqual(normalizeMemberRegistration(input),{...input,name:'María Pérez',email:'maria@example.invalid'});
for(const [field,value] of [['name',' '],['email','incorrect'],['phone','123'],['phone','+56 9 letras'],['password','short']]){
  assert.throws(()=>normalizeMemberRegistration({...input,[field]:value}),e=>e.field===field);
}
for(const phone of ['+1 (212) 555-0198','+44 20 7946 0958'])assert.equal(normalizeMemberRegistration({...input,phone}).phone,phone);
let payload,requests=0;
const client={auth:{async signUp(value){requests++;payload=value;return{data:{user:{id:'fixture'},session:null},error:null};}}};
assert.equal((await registerMember(client,input,{redirectTo:'https://www.fullnesslab.com/tienda'})).user.id,'fixture');
assert.deepEqual(payload.options,{data:{full_name:'María Pérez',phone:input.phone},emailRedirectTo:'https://www.fullnesslab.com/tienda'});
assert.equal(payload.email,'maria@example.invalid');assert.equal(requests,1);
await assert.rejects(registerMember(client,{...input,phone:''}),/teléfono/);assert.equal(requests,1);
await assert.rejects(registerMember(client,input,{redirectTo:'javascript:alert(1)'}));assert.equal(requests,1);
await assert.rejects(registerMember({auth:{signUp:async()=>({error:{status:429}})}},input),/Espera/);
console.log('PASS: registro exige nombre/correo/teléfono/contraseña, conserva teléfonos internacionales, persiste full_name y phone, sin autorizaciones desde metadata ni llamadas reales.');
