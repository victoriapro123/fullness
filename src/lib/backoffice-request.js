import {getSupabaseClient} from './supabase.js';
export async function backofficeRequest(path,method='GET',body) {
  const client=await getSupabaseClient();
  if(!client)throw Error('Falta configurar la conexión del backoffice.');
  const {data,error}=await client.auth.getSession();
  if(error||!data.session?.access_token)throw Error('Inicia sesión para administrar la carta.');
  const response=await fetch(path,{method,cache:'no-store',headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const payload=await response.json();
  if(!response.ok)throw Object.assign(Error(payload.error||'No pudimos completar la operación.'),{statusCode:response.status,...(payload.preparationNotStarted===true?{preparationNotStarted:true}:{})});
  return payload.data;
}
