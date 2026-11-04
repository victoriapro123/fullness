import {useRef,useState} from 'react';
import {getSupabaseClient} from '../lib/supabase.js';
import {registerMember} from '../lib/member-registration.js';

export function MemberRegistration({supabase,onRegistered,onLogin}) {
  const formRef=useRef(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false);
  async function submit(event) {
    event.preventDefault();
    if(busy)return;
    const form=event.currentTarget,data=new FormData(form);
    setBusy(true);setError('');
    try {
      const client=supabase||await getSupabaseClient();
      const result=await registerMember(client,Object.fromEntries(data),{redirectTo:`${window.location.origin}/tienda`});
      form.elements.password.value='';
      setSuccess(true);
      onRegistered?.(result);
    }catch(e){
      setError(e.message||'No pudimos crear tu cuenta. Inténtalo nuevamente.');
      if(e.field)form.elements.namedItem(e.field)?.focus();
    }finally{setBusy(false);}
  }
  if(success)return <section className="account-panel embedded" role="status">
    <p className="eyebrow">CUENTA FULLNESS</p><h2 id="account-title">REVISA TU CORREO</h2>
    <p>Te enviamos un enlace para confirmar tu cuenta. Ábrelo para empezar a disfrutar tus beneficios.</p>
    <button className="account-link-button" type="button" onClick={onLogin}>Volver al acceso</button>
  </section>;
  return <form ref={formRef} className="account-panel embedded" onSubmit={submit} aria-busy={busy}>
    <p className="eyebrow">CUENTA FULLNESS</p><h2 id="account-title">CREA TU CUENTA</h2>
    <p>Guarda tus datos y lleva el avance de Fullness Rewards.</p>
    <label>Nombre<input required name="name" minLength={2} maxLength={120} autoComplete="name" disabled={busy}/></label>
    <label>Correo electrónico<input required name="email" type="email" maxLength={254} autoComplete="email" disabled={busy}/></label>
    <label>Teléfono<input required name="phone" type="tel" maxLength={30} autoComplete="tel" placeholder="+56 9 1234 5678" disabled={busy}/></label>
    <label>Contraseña<input required name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" aria-describedby="member-password-help" disabled={busy}/></label>
    <small id="member-password-help">Usa al menos 8 caracteres.</small>
    {error&&<p className="form-note" role="alert">{error}</p>}
    <button className="primary-button full" type="submit" disabled={busy}>{busy?'Creando tu cuenta…':'Crear cuenta'}</button>
    <button className="account-link-button" type="button" onClick={onLogin} disabled={busy}>Ya tengo una cuenta</button>
  </form>;
}
