export function validMealprepPhotoUrl(value) {
 if(!value)return true;
 if(typeof value!=='string'||value.length>4096)return false;
 try{const url=new URL(value,'https://www.fullnesslab.com');
 const local=value.startsWith('/api/media?')&&!value.includes('#');
 return (local||value.startsWith('https://'))&&url.protocol==='https:'&&!url.username&&!url.password;
 }catch{return false;}
}
