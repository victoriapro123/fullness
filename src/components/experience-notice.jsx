import {useEffect,useRef} from 'react';
import './experience-notice.css';
import botanicalArtwork from '../assets/notice/fullness-growth-botanical-v1.webp';

// Temporary override: disable this flag to restore the saved welcome lightbox.
export const TEMP_EXPERIENCE_NOTICE_ENABLED=true;
const dismissedKey='fullness_experience_notice_20261103_v2';
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
  <div className="experience-notice-layout"><div className="experience-notice-art" aria-hidden="true"><img src={botanicalArtwork} alt="" width="720" height="1080"/><span>NUTRIR DESDE LA RAÍZ</span></div><div className="experience-notice-copy">
  <p className="experience-notice-eyebrow">CRECEMOS CONTIGO</p>
  <div className="experience-notice-rule" aria-hidden="true"><span>◇</span></div>
  <h2 id="experience-notice-title"><span>ESTAMOS MEJORANDO</span><span className="experience-notice-accent">TU EXPERIENCIA.</span></h2>
  <div id="experience-notice-body"><p>Estamos preparando una experiencia más personalizada para ti. Mientras realizamos estas mejoras, podrías encontrar alguna dificultad al navegar o comprar.</p><p>Si necesitas ayuda, conversemos por WhatsApp. Estamos aquí para acompañarte.</p></div>
  <div className="experience-notice-actions"><a href={EXPERIENCE_HELP_URL} target="_blank" rel="noreferrer">HABLAR POR WHATSAPP <span aria-hidden="true">↗</span></a><button type="button" onClick={close}>CONTINUAR EN EL SITIO</button></div>
  <p className="experience-notice-thanks">Gracias por tu paciencia y por ser parte de Fullness.</p>
  </div></div>
 </dialog>;
}
