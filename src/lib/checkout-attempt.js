// Only an opaque key and digest are stored; no address, email or card data.
export async function checkoutAttemptKey(payload,{storage=globalThis.sessionStorage,cryptoImpl=globalThis.crypto}={}){
 const bytes=new TextEncoder().encode(JSON.stringify(payload));
 const digest=[...new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
 let keys={};try{keys=JSON.parse(storage.getItem('fullness_checkout_attempt_keys')||'{}');}catch{}
 if(typeof keys[digest]==='string'&&/^[a-f0-9-]{36}$/.test(keys[digest]))return keys[digest];
 const key=cryptoImpl.randomUUID();keys={...keys,[digest]:key};try{storage.setItem('fullness_checkout_attempt_keys',JSON.stringify(keys));}catch{}
 return key;
}
export function forgetCheckoutAttemptKey(key,{storage=globalThis.sessionStorage}={}){
 try{const keys=JSON.parse(storage.getItem('fullness_checkout_attempt_keys')||'{}');storage.setItem('fullness_checkout_attempt_keys',JSON.stringify(Object.fromEntries(Object.entries(keys).filter(([,value])=>value!==key))));}catch{}
}
