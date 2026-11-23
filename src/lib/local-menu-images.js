export const CARTA_IMAGE_LIMIT = 12;
export const CARTA_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const CARTA_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const CARTA_IMAGE_FOLDER = "images/carta-local";

export const INITIAL_CARTA_IMAGES = [
  {
    id: "fullness-lunch",
    title: "Fullness Lunch",
    alt: "Fullness Lunch: cinco opciones de fondo y menú completo por $13.500.",
    url: "/images/carta-local/fullness-lunch.jpg",
    transcript: [
      "Menú completo: $13.500. Incluye ensalada de entrada, jugo prensado en frío o agua mineral, y espresso o cortado pequeño.",
      "01 · Apple Curry Golden Chicken. Pollo en curry suave de manzana y especias, con puré de zanahoria asada.",
      "02 · Merluza austral sous vide. Lomo de merluza con Quinoa Crispy Salad: espárragos, habas, arvejas, pepino, palta y dressing de tahine.",
      "03 · Pollo arvejado. Pechuga de pollo en salsa cremosa de arvejas, con puré de coliflor asada.",
      "04 · Estofado de carne. Choclillo de carne de cocción lenta, con papas nativas.",
      "05 · Falafel de betarraga. Croquetas de betarraga rellenas de queso de cabra, con peperonata de pimentones asados, tomate y albahaca."
    ].join("\n")
  },
  {
    id: "bowls",
    title: "Bowls",
    alt: "Carta de Bowls: tres opciones, con precios y descripción de cada plato.",
    url: "/images/carta-local/bowls.jpg",
    transcript: [
      "01 · Tabulé de quinoa y lentejas — $6.490. Quinoa, lentejas, menta, cilantro, tomate y dos huevos duros.",
      "02 · Ensalada de manzana, queso de cabra y pollo — $11.900. Hojas verdes, rúcula, pollo a la plancha, queso de cabra, manzana deshidratada, nueces acarameladas, semillas de maravilla tostadas y dressing balsámico.",
      "03 · Salmon & Chickpea Bowl — $10.900. Garbanzos, tomate, cilantro, cebollín, palta y 100 g de salmón sous-vide."
    ].join("\n")
  }
];

const initialUrls = new Set(INITIAL_CARTA_IMAGES.map(image => image.url));

export function normalizeCartaImages(images) {
  const fail = message => { throw Object.assign(new Error(message), {statusCode: 422}); };
  const field = (value, limit) => typeof value === "string" && value.length <= limit ? value.trim() : null;
  if (!Array.isArray(images) || images.length > CARTA_IMAGE_LIMIT) fail("La carta admite hasta 12 imágenes.");
  const ids = new Set();
  return images.map(image => {
    const id = field(image?.id, 80);
    const title = field(image?.title, 120);
    const alt = field(image?.alt, 240);
    const transcript = field(image?.transcript ?? "", 2500);
    const url = field(image?.url, 300);
    if (!id || !/^[a-z0-9-]+$/.test(id) || ids.has(id)) fail("Cada lámina debe tener un identificador distinto.");
    if (!title || !alt || transcript === null) fail("Revisa el título, el texto alternativo y la transcripción de la lámina.");
    if (!url || (!initialUrls.has(url) && !/^\/api\/media\?key=images%2Fcarta-local%2F\d{4}-\d{2}%2F[0-9a-f-]+\.(jpg|jpeg|png|webp|avif)$/i.test(url))) {
      fail("Sube la imagen desde el editor de la carta.");
    }
    ids.add(id);
    return {id, title, alt, url, transcript};
  });
}

export function moveCartaImage(images, index, delta) {
  const nextIndex = index + delta;
  if (index < 0 || index >= images.length || nextIndex < 0 || nextIndex >= images.length) return images;
  const next = [...images];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}
