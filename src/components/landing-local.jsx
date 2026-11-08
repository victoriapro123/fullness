import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Maximize2, X, UploadCloud, Trash2, Save } from 'lucide-react';
import { LOCAL_GALLERY_EVENT, localGalleryRepository, validateLocalPhotos } from '../lib/landing-local.js';
import { uploadMenuPhoto } from '../lib/menu-items.js';
import './landing-local-editor.css';
import './landing-local-gallery.css';

export function LocalGallery({ photos }) {
  const track = useRef(null);
  const thumbnails = useRef(null);
  const dialog = useRef(null);
  const activeId = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState([]);
  const visible = useMemo(() => photos.filter(photo => !failed.includes(photo.url)), [photos, failed]);
  const slide = Math.max(0, visible.findIndex(photo => photo.id === selectedId));
  const current = visible[slide];
  const counter = `${String(slide + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`;

  function select(index) {
    const photo = visible[index];
    if (!photo) return;
    activeId.current = photo.id;
    setSelectedId(photo.id);
    const strip = thumbnails.current;
    const thumb = strip?.children[index];
    if (thumb) {
      // Only move the thumbnail strip, never the surrounding landing page.
      if (thumb.offsetLeft < strip.scrollLeft) strip.scrollLeft = thumb.offsetLeft;
      else if (thumb.offsetLeft + thumb.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = thumb.offsetLeft + thumb.offsetWidth - strip.clientWidth;
      if (thumb.offsetTop < strip.scrollTop) strip.scrollTop = thumb.offsetTop;
      else if (thumb.offsetTop + thumb.offsetHeight > strip.scrollTop + strip.clientHeight) strip.scrollTop = thumb.offsetTop + thumb.offsetHeight - strip.clientHeight;
    }
  }
  function go(index) {
    if (!visible.length) return;
    const next = (index + visible.length) % visible.length;
    select(next);
    track.current?.scrollTo({ left: next * track.current.clientWidth, behavior: expanded || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  function onKeyDown(event) {
    const target = { ArrowLeft: slide - 1, ArrowRight: slide + 1, Home: 0, End: visible.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    go(target);
  }
  useEffect(() => {
    if (!visible.length) setExpanded(false);
    const index = Math.max(0, visible.findIndex(photo => photo.id === activeId.current));
    activeId.current = visible[index]?.id ?? null;
    setSelectedId(activeId.current);
    const element = track.current;
    if (!element) return;
    const align = () => element.scrollTo({ left: Math.max(0, visible.findIndex(photo => photo.id === activeId.current)) * element.clientWidth, behavior: 'auto' });
    align();
    const observer = new ResizeObserver(align);
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);
  useEffect(() => {
    if (!expanded || !visible.length) return;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      track.current?.querySelector('.local-photo-open[tabindex="0"]')?.focus({ preventScroll: true });
    };
  }, [expanded, visible.length]);

  if (!visible.length) return null;
  return <div className={`local-gallery-wrap${visible.length === 1 ? ' has-single-photo' : ''}`} role="region" aria-label="Galería del local" aria-roledescription="carrusel" onKeyDown={onKeyDown}>
    <div className="local-gallery-stage">
      <div className="local-gallery" aria-label="Fotografías del local" tabIndex={0} ref={track}
        onScroll={() => { const element = track.current; if (element?.clientWidth) select(Math.round(element.scrollLeft / element.clientWidth)); }}>
        {visible.map((photo, index) => <figure key={photo.id} className="local-photo" role="group" aria-roledescription="diapositiva" aria-label={`${index + 1} de ${visible.length}`} aria-hidden={slide !== index} inert={slide !== index}>
          <button className="local-photo-open" type="button" tabIndex={slide === index ? 0 : -1} aria-label={`Ampliar fotografía: ${photo.label}`} onClick={() => setExpanded(true)}>
            <img src={photo.url} alt={photo.label} loading={index === 0 ? 'eager' : 'lazy'} draggable={false} onError={() => setFailed(old => old.includes(photo.url) ? old : [...old, photo.url])} />
            <span className="local-photo-expand" aria-hidden="true"><Maximize2 size={18} /></span>
          </button>
        </figure>)}
      </div>
    </div>
    <div className="gallery-thumbnails" ref={thumbnails} aria-label="Elegir fotografía" hidden={visible.length < 2}>
      {visible.map((photo, index) => <button key={photo.id} className="gallery-thumbnail" type="button" aria-label={`Ver fotografía ${index + 1}: ${photo.label}`} aria-pressed={slide === index} onClick={() => go(index)}>
        <img src={photo.url} alt="" loading="lazy" draggable={false} /><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      </button>)}
    </div>
    <div className="gallery-controls">
      <div className="gallery-caption" aria-live="polite" aria-atomic="true"><span className="gallery-counter">{counter}</span><p>{current.label}</p></div>
      <div className="gallery-arrows" aria-label="Navegación de fotografías" hidden={visible.length < 2}>
        <button type="button" aria-label="Fotografía anterior" onClick={() => go(slide - 1)}><ArrowLeft size={20} aria-hidden="true" /></button>
        <button type="button" aria-label="Fotografía siguiente" onClick={() => go(slide + 1)}><ArrowRight size={20} aria-hidden="true" /></button>
      </div>
    </div>
    {expanded && <dialog className="local-gallery-lightbox" ref={dialog} aria-label="Fotografías del local ampliadas" onCancel={() => setExpanded(false)} onClose={() => setExpanded(false)} onClick={event => { if (event.target === event.currentTarget) setExpanded(false); }}>
      <div className="local-lightbox-shell">
        <header><span>FULLNESS LAB <span aria-hidden="true">·</span> NUESTRO LOCAL</span><button type="button" autoFocus aria-label="Cerrar fotografía ampliada" onClick={() => setExpanded(false)}><X size={22} /></button></header>
        <img className="local-lightbox-image" src={current.url} alt={current.label} />
        <div className="local-lightbox-footer"><div className="gallery-caption" aria-live="polite" aria-atomic="true"><span className="gallery-counter">{counter}</span><p>{current.label}</p></div><div className="gallery-arrows" hidden={visible.length < 2}><button type="button" aria-label="Fotografía anterior ampliada" onClick={() => go(slide - 1)}><ArrowLeft size={20} /></button><button type="button" aria-label="Fotografía siguiente ampliada" onClick={() => go(slide + 1)}><ArrowRight size={20} /></button></div></div>
      </div>
    </dialog>}
  </div>;
}

export function LandingLocalSection({ repository = localGalleryRepository }) {
  const [photos, setPhotos] = useState([]);
  useEffect(() => {
    let active = true;
    const refresh = () => repository.load().then(data => { if (active) setPhotos(data.photos); }).catch(() => {});
    refresh();
    window.addEventListener(LOCAL_GALLERY_EVENT, refresh);
    return () => { active = false; window.removeEventListener(LOCAL_GALLERY_EVENT, refresh); };
  }, [repository]);
  return <section className={`local-feature${photos.length ? '' : ' has-no-local-photos'}`} id="nuestro-local" aria-labelledby="local-title">
    <div className="local-copy">
      <p className="eyebrow">TE ESPERAMOS EN LA DEHESA</p>
      <h2 id="local-title">VEN A CONOCERNOS.</h2>
      <span className="section-rule" aria-hidden="true" />
      <p>Fullness Lab también tiene un espacio para ti.</p>
      <p>Descubre nuestras preparaciones, disfruta un café o haz una pausa en nuestra terraza.</p>
      <address>Av. La Dehesa 1844, Local 204.</address>
      <a className="editorial-cta" href="https://www.google.com/maps/search/?api=1&query=Fullness%20Lab%20Av.%20La%20Dehesa%201844%20Local%20204%20Lo%20Barnechea" target="_blank" rel="noopener noreferrer">CÓMO LLEGAR <ArrowUpRight size={17} aria-hidden="true" /></a>
    </div>
    <LocalGallery photos={photos} />
  </section>;
}

export function LandingLocalEditor({ ownerId, repository = localGalleryRepository, upload = uploadMenuPhoto }) {
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [latest, setLatest] = useState(null);
  const draftKey = `fullness:landing-local-draft:v1:${ownerId}`;
  const dirty = draft && (!saved || JSON.stringify(draft.photos) !== JSON.stringify(saved.photos) || draft.revision !== saved.revision);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!ownerId) return;
    setSaved(null); setDraft(null); setLatest(null); setError(''); setMessage('');
    let active = true;
    repository.load().then(data => {
      if (!active) return;
      setSaved(data); setDraft(data);
      try {
        const recovered = JSON.parse(localStorage.getItem(draftKey));
        if (recovered && Number.isSafeInteger(recovered.revision)) {
          setDraft({ ...recovered, photos: validateLocalPhotos(recovered.photos) });
          setMessage('Recuperamos tus cambios sin guardar.');
        }
      } catch { /* Invalid local drafts never replace saved data. */ }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [ownerId, repository, draftKey]);
  useEffect(() => {
    if (!dirty) return;
    try { localStorage.setItem(draftKey, JSON.stringify(draft)); }
    catch { setError('No pudimos respaldar este borrador en el dispositivo. No cierres la ventana antes de guardar.'); }
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft, dirty, draftKey]);
  function change(photos) { setDraft(old => ({ ...old, photos })); setMessage('Cambios sin guardar.'); setError(''); setLatest(null); }
  async function chooseFile(event, id) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || busy) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setError('Elige una foto JPG, PNG, WebP o AVIF de hasta 3 MB.'); return;
    }
    setBusy(true); setError('');
    try {
      const result = await upload(file, 'images/landing-local');
      if (result.error || !result.data?.photoUrl) throw new Error('No pudimos cargar la foto. Inténtalo nuevamente.');
      const photo = { id: id || crypto.randomUUID(), label: id ? draft.photos.find(p => p.id === id).label : file.name.replace(/\.[^.]+$/, '').slice(0, 120), url: result.data.photoUrl, storagePath: result.data.photoStoragePath };
      const next = { ...draft, photos: id ? draft.photos.map(p => p.id === id ? photo : p) : [...draft.photos, photo] };
      // Keep successful uploads recoverable even if the administrator changed tabs during the upload.
      let draftBackedUp = true;
      try { localStorage.setItem(draftKey, JSON.stringify(next)); } catch { draftBackedUp = false; }
      if (mounted.current) {
        setDraft(next); setMessage('Foto cargada. Guarda los cambios para mostrarla en la página.');
        if (!draftBackedUp) setError('No pudimos respaldar este borrador en el dispositivo. No cierres la ventana antes de guardar.');
      }
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function save(event) {
    event.preventDefault(); if (!dirty || busy) return;
    setBusy(true); setError('');
    try {
      const result = await repository.save(draft.photos, draft.revision);
      try { localStorage.removeItem(draftKey); } catch { /* Saved server data remains authoritative. */ }
      window.dispatchEvent(new Event(LOCAL_GALLERY_EVENT));
      if (mounted.current) { setSaved(result); setDraft(result); setLatest(null); setMessage('Fotos guardadas. La página ya usa esta selección.'); }
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function reviewSaved() {
    setBusy(true);
    try { setLatest(await repository.load()); setError(''); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  function discard() {
    if (!window.confirm('¿Descartar tus cambios y volver a las fotos guardadas?')) return;
    const data = latest || saved;
    setDraft(data); setSaved(data); setLatest(null); setMessage('Cambios descartados.'); setError('');
    try { localStorage.removeItem(draftKey); } catch { /* The current saved selection is still restored. */ }
  }
  if (!ownerId) return null;
  return <form className="landing-local-editor" onSubmit={save} aria-label="Fotos de nuestro local">
    <p>La primera foto abre la galería de diapositivas. Las siguientes se muestran en el orden que elijas. Puedes cambiar el orden sin volver a subirlas.</p>
    {message && <p role="status">{message}</p>}
    {error && <div className="local-editor-error" role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={reviewSaved}>Revisar fotos guardadas</button></div>}
    {latest && <aside className="local-editor-conflict"><h4>Fotos guardadas actualmente</h4><div className="local-editor-comparison">{latest.photos.map(p => <img key={p.id} src={p.url} alt={p.label} />)}</div><p>Tu borrador se conserva. Elige qué versión usar antes de guardar.</p><button type="button" onClick={discard}>Usar fotos guardadas</button><button type="button" onClick={() => { if (!window.confirm('¿Guardar después tu selección en lugar de esta versión?')) return; setSaved(latest); setDraft(old => old ? { ...old, revision: latest.revision } : latest); setLatest(null); setMessage('Revisa tu selección y pulsa Guardar fotos.'); }}>Conservar mi selección</button></aside>}
    {!draft && !error && <p role="status">Cargando fotografías…</p>}
    {draft && <>
      <ol className="local-editor-list">
        {draft.photos.map((photo, index) => <li key={photo.id}>
          <img src={photo.url} alt={photo.label} />
          <div className="local-editor-fields"><strong>{index === 0 ? 'Foto principal' : `Foto ${index + 1}`}</strong>
            <label>Descripción de la foto<input maxLength={120} value={photo.label} disabled={busy} onChange={event => change(draft.photos.map(p => p.id === photo.id ? { ...p, label: event.target.value } : p))} /></label>
            <div className="local-editor-buttons">
              <label className="local-photo-upload"><UploadCloud size={18} /> Reemplazar foto<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={event => chooseFile(event, photo.id)} /></label>
              <button type="button" disabled={busy || index === 0} aria-label={`Subir ${photo.label}`} onClick={() => { const photos = [...draft.photos]; [photos[index - 1], photos[index]] = [photos[index], photos[index - 1]]; change(photos); }}><ArrowUp size={18} /> Subir</button>
              <button type="button" disabled={busy || index === draft.photos.length - 1} aria-label={`Bajar ${photo.label}`} onClick={() => { const photos = [...draft.photos]; [photos[index + 1], photos[index]] = [photos[index], photos[index + 1]]; change(photos); }}><ArrowDown size={18} /> Bajar</button>
              <button type="button" disabled={busy} aria-label={`Quitar ${photo.label}`} onClick={() => change(draft.photos.filter(p => p.id !== photo.id))}><Trash2 size={18} /> Quitar</button>
            </div>
          </div>
        </li>)}
      </ol>
      {!draft.photos.length && <p>La galería está vacía. El texto y la dirección se seguirán mostrando.</p>}
      <label className="local-photo-upload"><UploadCloud size={18} /> Agregar foto<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy || draft.photos.length >= 12} onChange={event => chooseFile(event)} /></label>
      <p className="local-editor-hint">JPG, PNG, WebP o AVIF. Hasta 3 MB por foto. Las fotos no se recortan.</p>
      <details className="local-editor-preview"><summary>Vista previa de la galería</summary><div className="route-landing"><LocalGallery photos={draft.photos} /></div></details>
      <div className="local-editor-actions"><button type="button" disabled={busy || !dirty} onClick={discard}>Descartar cambios</button><button className="primary-button" type="submit" disabled={busy || !dirty}><Save size={18} />{busy ? 'Guardando…' : 'Guardar fotos'}</button></div>
    </>}
  </form>;
}
