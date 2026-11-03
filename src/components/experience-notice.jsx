import {useEffect,useRef} from 'react';
import './experience-notice.css';

// Temporary override: disable this flag to restore the saved welcome lightbox.
export const TEMP_EXPERIENCE_NOTICE_ENABLED=true;
const dismissedKey='fullness_experience_notice_20261103_v1';
export const EXPERIENCE_HELP_URL='https://wa.me/56996588199?text='+encodeURIComponent('Hola Fullness Lab, necesito ayuda para navegar o comprar en la página.');

export function ExperienceNotice({eligible}){
 const dialog=useRef(null);
 const dismissed=useRef(false);
 function close(){dialog.current?.close();}
 function remember(){dismissed.current=true;try{sessionStorage.setItem(dismissedKey,'1');}catch{}}
 useEffect(()=>{
  let seen=dismissed.current;try{seen=seen||sessionStorage.getItem(dismissedKey)==='1';}catch{}
  if(eligible&&!seen&&!dialog.current.open)dialog.current.showModal();
  if(!eligible&&dialog.current.open)dialog.current.close();
 },[eligible]);
 return <dialog ref={dialog} className="experience-notice" aria-labelledby="experience-notice-title" aria-describedby="experience-notice-body" onClose={remember}>
  <button type="button" className="experience-notice-close" aria-label="Cerrar aviso" onClick={close} autoFocus>×</button>
  <p className="experience-notice-eyebrow">PENSADO PARA TI</p>
  <h2 id="experience-notice-title">ESTAMOS MEJORANDO TU EXPERIENCIA.</h2>
  <div id="experience-notice-body"><p>Estamos realizando mejoras para ofrecerte una experiencia más personalizada. Durante estos cambios, podrías encontrar algunas dificultades al navegar o comprar.</p><p>Si necesitas ayuda, escríbenos por WhatsApp. Estaremos encantados de acompañarte.</p></div>
  <div className="experience-notice-actions"><a href={EXPERIENCE_HELP_URL} target="_blank" rel="noreferrer">HABLAR POR WHATSAPP <span aria-hidden="true">↗</span></a><button type="button" onClick={close}>CONTINUAR EN EL SITIO</button></div>
  <p className="experience-notice-thanks">Gracias por tu paciencia. Seguimos mejorando para ti.</p>
 </dialog>;
}
