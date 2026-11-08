import { getSupabaseClient } from './supabase.js';

export const LOCAL_GALLERY_ID = 'main';
export const LOCAL_GALLERY_EVENT = 'fullness:local-gallery-saved';
export const DEFAULT_LOCAL_PHOTOS = [
  ['exterior', 'Exterior y terraza'],
  ['interior', 'Interior del local'],
  ['meson', 'Mesón de cafetería'],
  ['terraza', 'Terraza Fullness Lab'],
  ['experiencia', 'Experiencia en el local'],
  ['preparaciones', 'Preparaciones Fullness Lab'],
].map(([id, label]) => ({ id, label, url: `/images/landing-local/${id}.jpeg`, storagePath: '' }));

export function validLocalPhotoUrl(value) {
  return typeof value === 'string' && (/^\/images\/landing-local\/[a-z0-9-]+\.jpeg$/.test(value) ||
    /^\/api\/media\?key=images(?:%2F|\/)landing-local(?:%2F|\/)[A-Za-z0-9%/_.-]+$/.test(value));
}

export function validateLocalPhotos(photos) {
  if (!Array.isArray(photos) || photos.length > 12) throw new Error('Puedes guardar hasta 12 fotografías.');
  const ids = new Set();
  return photos.map(photo => {
    if (!photo || !/^[a-zA-Z0-9-]{1,64}$/.test(photo.id) || ids.has(photo.id)) throw new Error('Revisa las fotografías antes de guardar.');
    ids.add(photo.id);
    const label = String(photo.label || '').trim();
    if (!label || label.length > 120) throw new Error('Cada foto necesita una descripción breve, de hasta 120 caracteres.');
    if (!validLocalPhotoUrl(photo.url)) throw new Error('Vuelve a cargar la fotografía antes de guardar.');
    return { id: photo.id, label, url: photo.url, storagePath: String(photo.storagePath || '') };
  });
}

export function createLocalGalleryRepository(getClient = getSupabaseClient) {
  return {
    async load() {
      const client = await getClient();
      if (!client) throw new Error('No pudimos conectar. Inténtalo nuevamente.');
      const { data, error } = await client.from('landing_local_gallery').select('id,photos,revision').eq('id', LOCAL_GALLERY_ID).single();
      if (error || !data) throw new Error('No pudimos cargar las fotos guardadas. Inténtalo nuevamente.');
      return { ...data, photos: validateLocalPhotos(data.photos) };
    },
    async save(photos, revision) {
      const clean = validateLocalPhotos(photos);
      if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Carga primero la versión guardada.');
      const client = await getClient();
      if (!client) throw new Error('No pudimos conectar. Tu borrador sigue aquí.');
      const { data, error } = await client.from('landing_local_gallery').update({ photos: clean })
        .eq('id', LOCAL_GALLERY_ID).eq('revision', revision).select('id,photos,revision').maybeSingle();
      if (error) throw new Error('No pudimos guardar. Revisa tu sesión y vuelve a intentarlo; tu borrador sigue aquí.');
      if (!data) {
        const conflict = new Error('Hay una versión más reciente o tu sesión cambió. Revisa las fotos guardadas antes de continuar. Tu borrador sigue aquí.');
        conflict.code = 'CONFLICT';
        throw conflict;
      }
      return { ...data, photos: validateLocalPhotos(data.photos) };
    },
  };
}

export const localGalleryRepository = createLocalGalleryRepository();
