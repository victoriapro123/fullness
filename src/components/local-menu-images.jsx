import {useRef, useState} from 'react';
import {CARTA_IMAGE_FOLDER,CARTA_IMAGE_LIMIT,CARTA_IMAGE_MAX_BYTES,CARTA_IMAGE_TYPES,moveCartaImage} from '../lib/local-menu-images.js';
import {uploadMenuPhoto} from '../lib/menu-items.js';

export function CartaImageGallery({images}) {
  return <div className="carta-image-gallery">
    {images.map(image => <section className="carta-image-sheet" key={image.id}>
      <h2>{image.title}</h2>
      <a href={image.url} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar ${image.title} en una pestaña nueva`}>
        <img src={image.url} alt={image.alt} loading="lazy" decoding="async"/>
      </a>
      <a className="carta-image-zoom" href={image.url} target="_blank" rel="noopener noreferrer">Ampliar imagen ↗</a>
      {image.transcript && <details className="carta-image-transcription">
        <summary>Ver {image.title} en texto</summary>
        {image.transcript.split(/\r?\n/).filter(Boolean).map((line,index) => <p key={index}>{line}</p>)}
      </details>}
    </section>)}
  </div>;
}

export function CartaImageEditor({images, disabled, onChange, onUploading, upload=uploadMenuPhoto}) {
  const [message,setMessage] = useState('');
  const [mobile,setMobile] = useState(false);
  const [preview,setPreview] = useState(false);
  const uploading = useRef(false);

  async function choose(event, id) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || disabled || uploading.current) return;
    if (!CARTA_IMAGE_TYPES.includes(file.type) || !file.size || file.size>CARTA_IMAGE_MAX_BYTES) {
      setMessage('Elige una imagen JPG, PNG, WebP o AVIF de hasta 3 MB.'); return;
    }
    if (!id && images.length >= CARTA_IMAGE_LIMIT) return;
    uploading.current = true;
    onUploading(true);
    setMessage('Subiendo imagen…');
    try {
      const result = await upload(file,CARTA_IMAGE_FOLDER);
      if (!result.data?.photoUrl || result.error) throw Error(result.error?.message || 'No pudimos subir la imagen.');
      if (id) {
        onChange(images.map(image => image.id === id ? {...image,url:result.data.photoUrl,transcript:''} : image));
      } else {
        const title = file.name.replace(/\.[^.]+$/,'').trim().slice(0,120) || 'Nueva lámina';
        onChange([...images,{id:crypto.randomUUID(),title,alt:`Carta de Fullness Lab: ${title}`,url:result.data.photoUrl,transcript:''}]);
      }
      setMessage(id ? 'Imagen cambiada en el borrador. Revisa el texto alternativo y actualiza la transcripción.' : 'Imagen añadida al borrador. La carta pública no cambió.');
    } catch (error) { setMessage(error.message); }
    finally { uploading.current=false; onUploading(false); }
  }

  const update = (id,patch) => onChange(images.map(image => image.id === id ? {...image,...patch} : image));
  return <section className="local-menu-edit-card carta-image-editor" aria-label="Láminas de la carta">
    <h3>LÁMINAS DE LA CARTA</h3>
    <p>Sube una imagen por sección. Guardar un borrador no cambia la carta pública ni el QR.</p>
    <fieldset disabled={disabled}>
      <legend>Imágenes de la carta</legend>
      {images.map((image,index) => <details key={image.id} className="local-menu-edit-card">
        <summary>{index+1}. {image.title || 'Lámina sin título'}</summary>
        <img className="carta-image-thumbnail" src={image.url} alt={image.alt}/>
        <label>Título de la sección<input maxLength={120} value={image.title} onChange={e=>update(image.id,{title:e.target.value})}/></label>
        <label>Texto alternativo<input maxLength={240} value={image.alt} onChange={e=>update(image.id,{alt:e.target.value})}/></label>
        <label>Carta en texto (opcional)<textarea rows={5} maxLength={2500} value={image.transcript} onChange={e=>update(image.id,{transcript:e.target.value})}/></label>
        <label>Reemplazar imagen<input type="file" accept={CARTA_IMAGE_TYPES.join(',')} onChange={event=>choose(event,image.id)}/></label>
        <div className="local-menu-actions">
          <button type="button" disabled={index===0} onClick={()=>onChange(moveCartaImage(images,index,-1))}>Subir posición</button>
          <button type="button" disabled={index===images.length-1} onClick={()=>onChange(moveCartaImage(images,index,1))}>Bajar posición</button>
          <button type="button" onClick={()=>onChange(images.filter(other=>other.id!==image.id))}>Quitar del borrador</button>
        </div>
      </details>)}
      {images.length < CARTA_IMAGE_LIMIT && <label>Añadir imagen (hasta 3 MB)<input type="file" accept={CARTA_IMAGE_TYPES.join(',')} onChange={event=>choose(event)}/></label>}
    </fieldset>
    <p role="status">{message}</p>
    <div className="local-menu-actions">
      <button type="button" aria-expanded={preview} onClick={()=>setPreview(!preview)}>{preview?'Cerrar vista previa':'Vista previa de la carta'}</button>
    </div>
    {preview && <div className="carta-preview">
      <div className="local-menu-actions" aria-label="Ancho de vista previa">
        <button type="button" aria-pressed={!mobile} onClick={()=>setMobile(false)}>Escritorio</button>
        <button type="button" aria-pressed={mobile} onClick={()=>setMobile(true)}>Móvil</button>
      </div>
      <div className={mobile?'carta-preview-mobile':undefined}>
        {images.length ? <CartaImageGallery images={images}/> : <p>Agrega una imagen para ver la carta.</p>}
      </div>
    </div>}
  </section>;
}
