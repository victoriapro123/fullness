import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Cloud,
  CloudOff,
  CookingPot,
  Database,
  Download,
  Eye,
  EyeOff,
  FileDown,
  FileText,
  Filter,
  FolderOpen,
  HardDrive,
  Heart,
  History,
  Home,
  ImagePlus,
  KeyRound,
  Leaf,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Minus,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  Store,
  Tags,
  Timer,
  Trash2,
  Truck,
  UploadCloud,
  Users,
  Utensils,
  X
} from "lucide-react";
import {
  deleteBenefitDefinition,
  deleteMenuItem,
  deleteMealLibraryItem,
  deleteTagDefinition,
  getShopSettings,
  listCatalogParameters,
  listAdminCustomerSubscriptions,
  listActiveMenuItems,
  listAdminMenuItems,
  listMealLibraryItems,
  saveBenefitDefinition,
  saveMealLibraryItem,
  saveMenuItem,
  saveShopSettings,
  saveTagDefinition,
  uploadMenuPhoto
} from "./lib/menu-items.js";
import {
  deleteBackofficeDraft,
  listBackofficeDrafts,
  saveBackofficeDraft
} from "./lib/backoffice-drafts.js";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabase.js";
import {
  BenefitAssignmentEditor,
  BenefitDetailLightbox,
  BenefitIconList,
  CatalogParametersAdmin,
  TagSelector
} from "./components/benefit-system.jsx";
import mealPrepBandSrc from "./assets/fullness-mealprep-band-label-fullness.png";
import heroPlateCutoutSrc from "./assets/fullness-hero-plate-cutout.png";
import storyPlateCutoutSrc from "./assets/fullness-story-plate-vegetable-cutout.png";
import philosophySceneBgSrc from "./assets/fullness-beet-roots-continuum.jpg";
import landingHeroLeafSrc from "./assets/landing-illustrations/hoja-hero-izquierda.png";
import landingHeroCelerySrc from "./assets/landing-illustrations/apio-hero-derecho.png";
import landingGingerSrc from "./assets/landing-illustrations/jengibre.png";
import landingCarrotSrc from "./assets/landing-illustrations/zanahoria.png";
import landingMealPrepCelerySrc from "./assets/landing-illustrations/apio-meal-prep.png";
import landingMealPrepBeansSrc from "./assets/landing-illustrations/porotos-meal-prep.png";
import shopPlansCauliflowerIllustrationSrc from "./assets/coliflor-hero-planes.png";
import shopHeroBoxDarkCutoutSrc from "./assets/ecommerce/fullness-hero-box-dark-cutout-v2.png";
import consciousFoodIconSrc from "./assets/ilustraciones-fondo/linea-gris-transparente/iconos/sello_hojas_natural_v1.png";
import functionalNutritionIconSrc from "./assets/ilustraciones-fondo/linea-gris-transparente/iconos/brazo_fuerte_nutrientes_v1.png";
import fullnessExperienceIconSrc from "./assets/ilustraciones-fondo/linea-gris-transparente/iconos/sello_hoja_v1.png";
import fullnessCommunityIconSrc from "./assets/ilustraciones-fondo/linea-gris-transparente/iconos/brote_raices_v1.png";
import ceciliaStoryHeroSrc from "./assets/cecilia-salas-fullness-hero-v2.png";
import aboutHeroBotanicalSrc from "./assets/about/nosotros-hero-ilustracion-alpha.png";
import aboutBeetSrc from "./assets/about/betarraga-nosotros-alpha.png";
import aboutCookingSrc from "./assets/about/cecilia-cooking-final.jpeg";
import "./styles.css";
import "./landing.css";
import "./landing-meal-prep.css";
import "./commerce.css";
import "./community.css";
import "./account-backoffice.css";
import "./benefit-system.css";
import "./overlays.css";
import "./about-nosotros.css";
import "./faq.css";

gsap.registerPlugin(ScrollTrigger);

const mediaSrc = (key) => `/api/media?key=${encodeURIComponent(key)}`;
const logoHeaderFooterSrc = mediaSrc("assets/brand/fullness-lab-horizontal-contrast-2026.png");
const logoVerticalSrc = mediaSrc("assets/brand/fullness-lab-vertical-marfil-2026.png");
const silhouetteRootOneSrc = mediaSrc("assets/fullness-silhouette-root-1.png");
const silhouetteRootThreeSrc = mediaSrc("assets/fullness-silhouette-root-3.png");
const silhouetteBotanicalSrc = mediaSrc("assets/fullness-silhouette-botanical.png");
const communitySceneSrc = mediaSrc("images/community/comunidad-landing-cecilia.jpeg");
const shopPlanBoxCardSrc = mediaSrc("images/ecommerce/fullness-plan-box-card-87fca2f2a7cf.png");
const shopPlanBoxCardHoverSrc = mediaSrc("images/ecommerce/fullness-plan-box-card-hover-70f16092b298.png");
const placeholderProductImage = mediaSrc("assets/fullness-food-crop.jpeg");
const sampleProductImages = [
  mediaSrc("images/menu-samples/lentejas-hojas.jpeg"),
  mediaSrc("images/menu-samples/pollo-camote-hojas.jpeg"),
  mediaSrc("images/menu-samples/salmon-arroz-avocado.jpeg")
];
const communityGalleryImages = [
  mediaSrc("images/community/comunidad-1.jpeg"),
  mediaSrc("images/community/comunidad-2.jpeg"),
  mediaSrc("images/community/comunidad-3.jpeg"),
  mediaSrc("images/community/comunidad-4.jpeg")
];
const shopPath = "/tienda";
const faqPath = "/preguntas-frecuentes";
const aboutPath = "/quienes-somos";
const opaqueMealPrepHeroAssetToken = "cbe5de9a-232f-4269-9515-13e31e0b9198";

function downloadBlob(file, disposition, fallbackName) {
  const objectUrl = window.URL.createObjectURL(file);
  const link = document.createElement("a");
  const fileName = disposition?.match(/filename\*=(?:UTF-8'')?([^;]+)/i)?.[1]
    ? decodeURIComponent(disposition.match(/filename\*=(?:UTF-8'')?([^;]+)/i)[1].replace(/^"|"$/g, ""))
    : disposition?.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName;

  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
}

function r2AssetKind(key) {
  const extension = String(key || "").split(".").pop().toLowerCase();

  if (["avif", "gif", "jpeg", "jpg", "png", "svg", "webp"].includes(extension)) return "image";
  if (["mov", "mp4", "webm"].includes(extension)) return "video";
  if (["mp3", "ogg", "wav"].includes(extension)) return "audio";
  if (extension === "pdf") return "pdf";
  return "file";
}

function canPreviewR2Asset(key) {
  return r2AssetKind(key) !== "file";
}

function formatR2Bytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / (1024 ** index);

  return `${amount >= 10 || index === 0 ? Math.round(amount) : amount.toFixed(1)} ${units[index]}`;
}

function formatR2Date(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Santiago"
  }).format(date);
}

const faqGroups = [
  {
    id: "preguntas",
    eyebrow: "Preguntas frecuentes",
    title: "Información práctica para comprar y disfrutar Fullness.",
    navLabel: "Preguntas",
    items: [
      {
        question: "¿Qué es Fullness Lab?",
        answer: [
          "Fullness Lab es una propuesta de alimentación consciente que combina cocina antinflamatoria, ingredientes de calidad y una mirada integral al bienestar. Creemos que nutrirse va mucho más allá de alimentarse."
        ]
      },
      {
        question: "¿Cómo vienen envasados los productos?",
        answer: [
          "Nuestras preparaciones se entregan en bolsas selladas al vacío, libres de BPA y aptas para uso alimentario, diseñadas para preservar la calidad de cada ingrediente.",
          "Este formato ayuda a mantener la frescura, sabor y valor nutricional de los alimentos, facilitando además su conservación y consumo durante la semana."
        ]
      },
      {
        question: "¿Los productos vienen listos para consumir?",
        answer: [
          "Sí. Todos nuestros productos están cocinados y sólo requieren regeneración siguiendo las instrucciones indicadas en su etiqueta."
        ]
      },
      {
        question: "¿Cómo debo conservar los productos?",
        answer: [
          "Los productos deben mantenerse refrigerados o congelados según la indicación de cada etiqueta. Recomendamos respetar siempre la cadena de frío para asegurar su calidad y seguridad."
        ]
      },
      {
        question: "¿Cuánto duran los productos?",
        answer: [
          ["Refrigerados: entre 5 y 7 días según el producto.", "Congelados: hasta 3 meses manteniendo la cadena de frío."],
          "Cada producto incluye su fecha de elaboración y vencimiento."
        ]
      },
      {
        question: "¿Puedo congelar los productos?",
        answer: [
          "Sí. Nuestros productos están diseñados para conservarse adecuadamente congelados sin afectar significativamente su calidad."
        ]
      },
      {
        question: "¿Cómo se recalientan?",
        answer: [
          "Cada producto incluye instrucciones específicas. Generalmente recomendamos horno, sartén o baño maría para obtener los mejores resultados de sabor y textura."
        ]
      },
      {
        question: "¿Los productos son libres de gluten?",
        answer: [
          "En Fullness Lab no utilizamos ingredientes con gluten en nuestras preparaciones. Sin embargo, algunos ingredientes naturales utilizados en nuestras recetas, como ciertas legumbres, semillas o granos, pueden incluir la advertencia “puede contener trazas de gluten” emitida por sus fabricantes.",
          "Por esta razón, aunque nuestras preparaciones son elaboradas sin gluten como ingrediente, no podemos garantizar la ausencia absoluta de trazas de gluten y nuestros productos no están recomendados para personas con enfermedad celíaca.",
          "Si tienes dudas sobre algún producto específico, estaremos encantados de orientarte antes de tu compra."
        ]
      },
      {
        question: "¿Los productos son aptos para personas con alergias alimentarias?",
        answer: [
          "Algunos productos pueden contener o haber sido elaborados con ingredientes como frutos secos, huevos, lácteos, pescado o mariscos. Recomendamos revisar la información de cada producto y consultarnos ante cualquier duda."
        ]
      },
      {
        question: "¿Puedo modificar ingredientes o solicitar adaptaciones?",
        answer: [
          "Dependiendo del producto y disponibilidad, algunas adaptaciones pueden ser posibles. Te recomendamos contactarnos antes de realizar tu compra."
        ]
      },
      {
        question: "¿Realizan pedidos especiales?",
        answer: [
          "Sí. Desarrollamos propuestas para eventos, empresas, talleres, experiencias gastronómicas y requerimientos especiales."
        ]
      },
      {
        question: "¿Puedo regalar productos o experiencias Fullness Lab?",
        answer: [
          "Sí. Contamos con alternativas de regalo y experiencias especialmente diseñadas para compartir bienestar y alimentación consciente."
        ]
      },
      {
        question: "¿Cómo puedo contactarlos?",
        answer: [
          "Puedes escribirnos a través de nuestro formulario de contacto, correo electrónico o WhatsApp. Estaremos encantados de ayudarte."
        ]
      }
    ]
  },
  {
    id: "envios",
    eyebrow: "Políticas de envío",
    title: "Despacho cuidado, cadena de frío y tiempos claros.",
    navLabel: "Envíos",
    items: [
      {
        question: "Cobertura de despacho",
        answer: ["Actualmente realizamos despachos dentro de la Región Metropolitana en comunas seleccionadas."]
      },
      {
        question: "Días de entrega",
        answer: ["Los despachos se realizan de lunes a viernes."]
      },
      {
        question: "Horarios de entrega",
        answer: ["Las entregas se efectúan entre las 9:00 y las 20:00 horas."]
      },
      {
        question: "Costo de despacho",
        answer: ["El valor del despacho se calcula automáticamente según la dirección de entrega y se informa antes de finalizar la compra."]
      },
      {
        question: "Recepción del pedido",
        answer: ["Es responsabilidad del cliente asegurarse de que exista una persona disponible para recibir el pedido dentro del horario informado."]
      },
      {
        question: "Cadena de frío",
        answer: ["Todos nuestros productos son transportados manteniendo las condiciones adecuadas de refrigeración o congelación."]
      },
      {
        question: "Ausencia en el domicilio",
        answer: [
          "Si no hay nadie para recibir el pedido:",
          ["El transportista intentará contactar al cliente.", "Si la entrega no puede realizarse, podrá coordinarse un nuevo despacho con costo adicional."]
        ]
      },
      {
        question: "Modificaciones de dirección",
        answer: ["Los cambios de dirección deben solicitarse con al menos 24 horas hábiles de anticipación a la fecha de entrega."]
      },
      {
        question: "Retrasos por fuerza mayor",
        answer: ["En situaciones excepcionales como cortes de ruta, condiciones climáticas extremas o contingencias externas, los tiempos de entrega podrían verse afectados."]
      }
    ]
  },
  {
    id: "cambios",
    eyebrow: "Cambios y devoluciones",
    title: "Criterios simples para productos perecibles.",
    navLabel: "Cambios",
    items: [
      {
        question: "Productos alimenticios",
        answer: ["Por tratarse de productos perecibles, no realizamos devoluciones una vez entregado el pedido."]
      },
      {
        question: "Productos dañados o con problemas de calidad",
        answer: [
          "Si recibes un producto dañado o en mal estado, debes contactarnos dentro de las primeras 24 horas posteriores a la recepción, adjuntando fotografías del producto y su empaque.",
          "Evaluaremos cada caso y, si corresponde, realizaremos:",
          ["Reposición del producto.", "Nota de crédito.", "Devolución del dinero."]
        ]
      },
      {
        question: "Contacto por pedidos o despachos",
        answer: ["Para cualquier consulta relacionada con pedidos o despachos: contacto@fullnesslab.com · WhatsApp: +56 9 9658 8199."]
      }
    ]
  },
  {
    id: "meal-prep",
    eyebrow: "Meal Prep semanal",
    title: "Cómo realizar tu pedido semanal.",
    navLabel: "Meal Prep",
    items: [
      {
        question: "¿Cómo funciona el Meal Prep Semanal?",
        answer: ["Cada semana preparamos una selección de platos elaborados con ingredientes naturales, técnicas de cocina saludables y porciones pensadas para facilitar tu alimentación durante la semana."]
      },
      {
        question: "¿Qué incluye?",
        answer: [
          "Cada box contiene:",
          ["5 platos individuales.", "Proteínas y acompañamientos envasados por separado.", "Productos sellados al vacío.", "Instrucciones de conservación y regeneración."]
        ]
      },
      {
        question: "¿Cuándo debo realizar mi pedido?",
        answer: ["Los pedidos se reciben hasta las 23:59 hrs del día miércoles de cada semana."]
      },
      {
        question: "¿Cuándo se entregan?",
        answer: ["Las entregas se realizan los días lunes y martes de la semana siguiente, según la zona de despacho."]
      },
      {
        question: "¿Puedo elegir los platos?",
        answer: [
          "Dependiendo del programa contratado, podrás:",
          ["Elegir entre las opciones disponibles de la semana.", "Recibir el menú diseñado por nuestro equipo."]
        ]
      },
      {
        question: "¿Puedo modificar ingredientes?",
        answer: ["Algunos ingredientes pueden ajustarse según disponibilidad y restricciones alimentarias previamente informadas."]
      },
      {
        question: "¿Los platos llegan congelados o refrigerados?",
        answer: ["Dependiendo de la preparación, los productos pueden entregarse refrigerados o congelados para asegurar la mejor calidad y conservación."]
      },
      {
        question: "¿Cómo debo conservarlos?",
        answer: [
          ["Refrigerados: mantener entre 0°C y 4°C.", "Congelados: mantener a -18°C o menos."]
        ]
      },
      {
        question: "¿Qué pasa si olvido consumir un producto?",
        answer: ["Recomendamos congelar inmediatamente aquellos productos que no consumirás dentro de los días indicados en la etiqueta."]
      }
    ]
  },
  {
    id: "calidad",
    eyebrow: "Compromiso de calidad",
    title: "Pequeñas producciones, ingredientes reales y sabor cuidado.",
    navLabel: "Calidad",
    items: [
      {
        question: "Nuestro compromiso",
        answer: [
          "En Fullness Lab elaboramos nuestros productos en pequeñas producciones para asegurar frescura, sabor y calidad nutricional.",
          "No utilizamos colorantes artificiales ni potenciadores de sabor industriales, privilegiando ingredientes reales y técnicas culinarias que respetan el alimento.",
          "Nutrir desde la raíz."
        ]
      }
    ]
  }
];

const aboutStoryParagraphs = [
  "Soy Cecilia Salas, chef, emprendedora y creadora de Fullness Lab.",
  "Mi camino en la gastronomía comenzó hace más de quince años, impartiendo clases de cocina para pequeños grupos en mi propia casa. Lo que nació como una instancia para compartir conocimientos y experiencias fue creciendo hasta convertirse en una empresa dedicada a la producción gastronómica y eventos, desarrollando proyectos para clientes particulares y para importantes marcas nacionales e internacionales.",
  "Durante años tuve el privilegio de participar en lanzamientos, experiencias de marca, celebraciones y eventos de gran escala. Fue una etapa de mucho aprendizaje, crecimiento y desarrollo profesional. Sin embargo, con el tiempo comenzó a surgir una pregunta que no lograba ignorar: ¿cuál era el verdadero propósito detrás de lo que hacía?",
  "Aunque disfrutaba profundamente la cocina, sentía que gran parte de la industria gastronómica y de eventos se había vuelto cada vez más rápida, comercial y repetitiva. Existía abundancia de estímulos, imágenes y experiencias efímeras, pero pocas veces un impacto real y duradero en la vida de las personas.",
  "Paralelamente, algo me acompañaba desde mis inicios en la cocina. Siempre tuve una visión profundamente romántica de los alimentos. Me fascinaba buscar ingredientes de calidad, comprender su origen y trabajarlos de una manera que potenciara al máximo su sabor y valor nutricional, interviniéndolos lo menos posible. Sin saberlo, ya estaba buscando una forma más consciente de cocinar.",
  "Fue mi propio proceso de búsqueda personal y sanación el que finalmente dio sentido a esa intuición. Comencé a profundizar en la relación entre alimentación, emociones, bienestar y propósito, descubriendo que la forma en que nos nutrimos tiene un impacto mucho más profundo de lo que solemos imaginar.",
  "Ese camino me llevó a ampliar mi formación y actualmente me encuentro cursando un Diplomado en Nutrición Emocional, integrando herramientas que complementan mi experiencia gastronómica y enriquecen la visión que hoy sustenta este proyecto.",
  "Así nació Fullness Lab.",
  "Fullness Lab surge de la necesidad de volver a lo esencial. De recuperar una forma de alimentarnos más consciente, más humana y más conectada con nuestro bienestar integral. Es el encuentro entre la gastronomía, la nutrición funcional, el desarrollo personal y la convicción de que la comida puede ser una poderosa herramienta de transformación.",
  "Creemos que alimentarse es mucho más que comer.",
  "Creemos en ingredientes reales, en procesos respetuosos, en el placer de una buena mesa y en la profunda conexión entre cuerpo, mente y emociones.",
  "Porque cuando aprendemos a nutrirnos desde la raíz, descubrimos que el bienestar no es algo que se busca afuera, sino algo que se construye desde dentro.",
  "Como es adentro, es afuera"
];

function getProductImage(product) {
  return product?.image || product?.photoUrl || placeholderProductImage;
}

function getProductSecondaryImage(product) {
  const secondaryImage = product?.secondaryImage || product?.secondaryPhotoUrl || "";
  if (secondaryImage) return secondaryImage;

  return getProductImage(product);
}

function getMealImage(meal) {
  return meal?.photoUrl || meal?.image || placeholderProductImage;
}

function getMealSecondaryImage(meal) {
  return meal?.secondaryPhotoUrl || meal?.secondaryImage || getMealImage(meal);
}

function getProductSlug(product) {
  return product?.slug || product?.id || "";
}

function getProductPath(product) {
  const slug = getProductSlug(product);
  return slug ? `/producto/${encodeURIComponent(slug)}` : shopPath;
}

function getProductSlugFromPath() {
  if (typeof window === "undefined") return "";

  const match = window.location.pathname.match(/^\/producto\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function normalizeAuthFlowType(type) {
  const cleanType = String(type || "").trim().toLowerCase();

  if (["invite", "invitation"].includes(cleanType)) return "invite";
  if (["recovery", "reset", "password_recovery", "password-recovery"].includes(cleanType)) return "recovery";
  if (["signup", "confirm", "confirmation", "email"].includes(cleanType)) return "signup";

  return cleanType;
}

function readAuthRedirectState() {
  if (typeof window === "undefined") {
    return { type: "", hasAuthParams: false, error: "" };
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  const type = normalizeAuthFlowType(
    hashParams.get("type") ||
      searchParams.get("type") ||
      hashParams.get("auth") ||
      searchParams.get("auth")
  );
  const hasAuthParams = Boolean(
    type ||
      hashParams.get("access_token") ||
      hashParams.get("refresh_token") ||
      searchParams.get("code") ||
      searchParams.get("token") ||
      searchParams.get("token_hash") ||
      hashParams.get("error") ||
      searchParams.get("error")
  );
  const error =
    hashParams.get("error_description") ||
    searchParams.get("error_description") ||
    hashParams.get("error") ||
    searchParams.get("error") ||
    "";

  return { type, hasAuthParams, error };
}

function getStoredAuthFlowType() {
  if (typeof window === "undefined") return "";

  try {
    const stored = JSON.parse(window.localStorage.getItem("fullness_pending_auth_flow") || "null");
    if (!stored?.type || !stored?.createdAt) return "";

    const age = Date.now() - Number(stored.createdAt);
    if (!Number.isFinite(age) || age > 1000 * 60 * 60) {
      window.localStorage.removeItem("fullness_pending_auth_flow");
      return "";
    }

    return normalizeAuthFlowType(stored.type);
  } catch {
    return "";
  }
}

function setStoredAuthFlowType(type) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      "fullness_pending_auth_flow",
      JSON.stringify({ type: normalizeAuthFlowType(type), createdAt: Date.now() })
    );
  } catch {
    // Local auth hints are best-effort.
  }
}

function clearStoredAuthFlowType() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem("fullness_pending_auth_flow");
  } catch {
    // Local auth hints are best-effort.
  }
}

function cleanAuthRedirectUrl() {
  if (typeof window === "undefined") return;

  window.history.replaceState(null, "", window.location.pathname || "/");
}

const demoProducts = [
  {
    id: "plan-semanal-antinflamatorio",
    slug: "plan-semanal-antinflamatorio",
    name: "Plan semanal antinflamatorio",
    productType: "plan",
    planFrequency: "weekly",
    tag: "5 meal preps / 1 semana",
    price: 44900,
    description: "Cinco preparaciones listas para calentar, pensadas para sostener energía, saciedad y una rutina más liviana durante la semana.",
    image: shopPlanBoxCardSrc,
    secondaryImage: shopPlanBoxCardHoverSrc,
    benefitTags: ["Antioxidante", "Energético", "Digestivo"],
    ingredients: ["proteínas magras", "raíces", "legumbres", "hojas verdes", "aceite de oliva"],
    recipeSummary: "Batch cooking Fullness con proteínas, vegetales y granos listos para calentar.",
    recipeSteps: ["Recibir refrigerado.", "Mantener entre 0 y 5 °C.", "Calentar y terminar con toppings frescos."],
    servingLabel: "5 porciones individuales",
    purchaseLabel: "Agregar plan semanal",
    includedItems: [
      {
        id: "pollo-camote-curcuma",
        name: "Pollo, camote y cúrcuma",
        tag: "Energético",
        description: "Pollo especiado, puré rústico de camote y hojas verdes.",
        photoUrl: sampleProductImages[1],
        secondaryPhotoUrl: sampleProductImages[0],
        benefitTags: ["Energético", "Antinflamatorio"],
        ingredients: ["pollo", "camote", "cúrcuma", "hojas verdes"],
        nutritionDescription: "Proteína magra con carbohidrato complejo y especias cálidas.",
        nutritionHighlights: ["Alto en proteína", "Carbohidrato complejo", "Saciedad prolongada"],
        nutritionFacts: { protein_g: 38, carbs_g: 34, fat_g: 16, fiber_g: 7 },
        allergens: []
      },
      {
        id: "lentejas-hojas-oliva",
        name: "Lentejas, hojas y oliva",
        tag: "Digestivo",
        description: "Lentejas cremosas, hojas verdes y aceite de oliva.",
        photoUrl: sampleProductImages[0],
        secondaryPhotoUrl: sampleProductImages[2],
        benefitTags: ["Digestivo", "Fibra"],
        ingredients: ["lentejas", "hojas verdes", "aceite de oliva", "hierbas"],
        nutritionDescription: "Fibra vegetal y energía amable para la tarde.",
        nutritionHighlights: ["Fibra vegetal", "Hierro vegetal", "Energía estable"],
        nutritionFacts: { protein_g: 24, carbs_g: 44, fat_g: 14, fiber_g: 12 },
        allergens: []
      },
      {
        id: "salmon-arroz-verde",
        name: "Salmón y arroz verde",
        tag: "Omega 3",
        description: "Salmón glaseado, arroz verde, palta y hierbas frescas.",
        photoUrl: sampleProductImages[2],
        secondaryPhotoUrl: sampleProductImages[1],
        benefitTags: ["Antioxidante", "Omega 3"],
        ingredients: ["salmón", "arroz verde", "palta", "cilantro"],
        nutritionDescription: "Grasas saludables, proteína completa y carbohidrato de energía estable.",
        nutritionHighlights: ["Omega 3 natural", "Proteína completa", "Grasas saludables"],
        nutritionFacts: { protein_g: 34, carbs_g: 44, fat_g: 20, fiber_g: 8 },
        allergens: ["Pescado"]
      }
    ]
  },
  {
    id: "plan-mensual-fullness",
    slug: "plan-mensual-fullness",
    name: "Plan mensual Fullness",
    productType: "plan",
    planFrequency: "monthly",
    tag: "20 meal preps / 4 semanas",
    price: 169000,
    description: "Plan mensual con entregas semanales y rotación de platos para sostener una alimentación funcional sin repetir decisiones cada día.",
    image: shopPlanBoxCardSrc,
    secondaryImage: shopPlanBoxCardHoverSrc,
    benefitTags: ["Balance", "Detox", "Energético"],
    ingredients: ["pescados", "pollo", "legumbres", "granos integrales", "vegetales de estación"],
    recipeSummary: "Cuatro semanas de batch cooking Fullness con platos refrigerados y porcionados.",
    recipeSteps: ["Recibir una entrega semanal.", "Refrigerar cada porción.", "Calentar según el plato y servir."],
    servingLabel: "20 porciones individuales",
    purchaseLabel: "Agregar plan mensual",
    includedItems: [
      {
        id: "salmon-lentejas-verdes",
        name: "Salmón, lentejas y verdes",
        tag: "Omega 3",
        description: "Salmón dorado, lentejas especiadas y hojas frescas.",
        photoUrl: sampleProductImages[0],
        secondaryPhotoUrl: sampleProductImages[2],
        benefitTags: ["Omega 3", "Fibra"],
        ingredients: ["salmón", "lentejas", "hojas verdes", "aceite de oliva"],
        nutritionDescription: "Proteína de calidad, omega 3 y fibra vegetal.",
        nutritionHighlights: ["Omega 3 natural", "Fibra vegetal", "Proteína de calidad"],
        nutritionFacts: { protein_g: 34, carbs_g: 38, fat_g: 18, fiber_g: 9 },
        allergens: ["Pescado"]
      },
      {
        id: "pollo-raices",
        name: "Pollo y raíces dulces",
        tag: "Antinflamatorio",
        description: "Pollo especiado, raíces asadas y hojas verdes.",
        photoUrl: sampleProductImages[1],
        secondaryPhotoUrl: sampleProductImages[0],
        benefitTags: ["Antinflamatorio", "Energético"],
        ingredients: ["pollo", "betarraga", "camote", "hojas verdes"],
        nutritionDescription: "Proteína magra y vegetales de alta densidad nutricional.",
        nutritionHighlights: ["Alto en proteína", "Antioxidantes", "Energía estable"],
        nutritionFacts: { protein_g: 36, carbs_g: 36, fat_g: 15, fiber_g: 8 },
        allergens: []
      },
      {
        id: "bowl-verde-quinoa",
        name: "Bowl verde de quinoa",
        tag: "Detox",
        description: "Quinoa, hojas verdes, palta y vegetales de estación.",
        photoUrl: sampleProductImages[2],
        secondaryPhotoUrl: sampleProductImages[1],
        benefitTags: ["Detox", "Antioxidante"],
        ingredients: ["quinoa", "palta", "hojas verdes", "vegetales"],
        nutritionDescription: "Fibra, grasas saludables y energía vegetal.",
        nutritionHighlights: ["Fibra vegetal", "Grasas saludables", "Micronutrientes"],
        nutritionFacts: { protein_g: 22, carbs_g: 48, fat_g: 18, fiber_g: 11 },
        allergens: []
      }
    ]
  },
  {
    id: "familiar-salmon-arroz-verde",
    slug: "familiar-salmon-arroz-verde",
    name: "Salmón familiar y arroz verde",
    productType: "family",
    tag: "Formato familiar",
    price: 32900,
    description: "Fuente familiar de salmón glaseado, arroz verde, palta y hierbas frescas para compartir en casa.",
    image: sampleProductImages[2],
    secondaryImage: sampleProductImages[1],
    benefitTags: ["Omega 3", "Antioxidante"],
    ingredients: ["salmón", "arroz verde", "palta", "hierbas frescas"],
    recipeSummary: "Salmón glaseado, arroz verde, palta y hierbas frescas.",
    recipeSteps: ["Calentar la base.", "Agregar palta y hierbas al servir.", "Compartir al centro de la mesa."],
    servingLabel: "3 a 4 personas",
    purchaseLabel: "Agregar familiar"
  },
  {
    id: "familiar-pollo-camote-curcuma",
    slug: "familiar-pollo-camote-curcuma",
    name: "Pollo familiar, camote y cúrcuma",
    productType: "family",
    tag: "Formato familiar",
    price: 28900,
    description: "Pollo especiado con cúrcuma, camote rústico y hojas verdes en formato familiar.",
    image: sampleProductImages[1],
    secondaryImage: sampleProductImages[0],
    benefitTags: ["Energético", "Antinflamatorio"],
    ingredients: ["pollo", "camote", "cúrcuma", "hojas verdes", "aceite de oliva"],
    recipeSummary: "Pollo especiado, camote rústico y hojas verdes frescas.",
    recipeSteps: ["Calentar el pollo y camote.", "Terminar con hojas verdes.", "Servir en fuente familiar."],
    servingLabel: "3 a 4 personas",
    purchaseLabel: "Agregar familiar"
  }
];

const localDevelopmentCatalog = import.meta.env.DEV && !isSupabaseConfigured ? demoProducts : [];

const introScrollVideoSrc = mediaSrc("assets/scroll-intro/fullness-intro-sequence.mp4");
const introScrollPosterSrc = mediaSrc("assets/scroll-intro/fullness-intro-poster.jpg");
const introScrollFinalFrameSrc = mediaSrc("assets/scroll-intro/fullness-intro-final.jpg");
const introScrollVideoDuration = 15.04;
const introMobileQuery = "(max-width: 860px)";
const isMobileIntroViewport = () =>
  typeof window !== "undefined" && window.matchMedia(introMobileQuery).matches;
const whatsappBaseUrl = "https://wa.me/56996588199";
const createWhatsappUrl = (message) => `${whatsappBaseUrl}?text=${encodeURIComponent(message)}`;
const whatsappUrl = createWhatsappUrl("Hola Fullness Lab, quiero hacer un pedido.");
const mealPrepWhatsappUrl = createWhatsappUrl("Hola Fullness Lab, quiero conocer el servicio de Meal Prep.");
const familyOptionsWhatsappUrl = createWhatsappUrl("Hola Fullness Lab, quiero conocer las opciones familiares.");
const workshopsWhatsappUrl = createWhatsappUrl("Hola Fullness Lab, quiero información sobre los talleres.");
const instagramUrl = "https://www.instagram.com/fullnesslab";
const subscriptionPopupStorageKey = "fullness_subscription_popup_settings";
const subscriptionPopupSubscribersStorageKey = "fullness_subscription_popup_subscribers";
const menuFormDraftStorageKey = "fullness_menu_form_drafts_v2";
const legacyMenuFormDraftStorageKey = "fullness_menu_form_draft_v1";
const menuFormDraftScope = "meal-prep";
const adminAccessModeStorageKey = "fullness_carlos_access_mode";
const adminPersonaEmail = "carlos@prof3sional.com";
const checkoutCartStorageKey = "fullness_checkout_cart";
const checkoutTestMode = import.meta.env.VITE_CHECKOUT_TEST_MODE === "true";
const subscriptionLightboxHighlights = [
  { label: "Alimentación consciente", image: consciousFoodIconSrc },
  { label: "Nutrición funcional", image: functionalNutritionIconSrc },
  { label: "Experiencias Fullness", image: fullnessExperienceIconSrc },
  { label: "Comunidad", image: fullnessCommunityIconSrc }
];

function createDefaultSubscriptionPopupSettings() {
  return {
    enabled: true,
    eyebrow: "Experiencia Fullness",
    title: "Nutre tu cuerpo. Reconecta con tu esencia.",
    body: "Suscríbete a Fullness Lab y recibe novedades, planes y experiencias pensadas para nutrirte desde la raíz.",
    ctaLabel: "Quiero ser parte",
    secondaryCtaLabel: "Conocer la experiencia",
    successCtaLabel: "Descubre nuestros planes",
    backgroundUrl: communitySceneSrc,
    backgroundStoragePath: ""
  };
}

function normalizeSubscriptionPopupSettings(settings) {
  const defaults = createDefaultSubscriptionPopupSettings();
  const merged = settings && typeof settings === "object" ? settings : {};

  return {
    ...defaults,
    ...merged,
    enabled: merged.enabled === undefined ? defaults.enabled : Boolean(merged.enabled),
    eyebrow: String(merged.eyebrow ?? defaults.eyebrow),
    title: String(merged.title ?? defaults.title),
    body: String(merged.body ?? defaults.body),
    ctaLabel: String(merged.ctaLabel ?? defaults.ctaLabel),
    secondaryCtaLabel: String(merged.secondaryCtaLabel ?? defaults.secondaryCtaLabel),
    successCtaLabel: String(merged.successCtaLabel ?? defaults.successCtaLabel),
    backgroundUrl: String(merged.backgroundUrl ?? defaults.backgroundUrl),
    backgroundStoragePath: String(merged.backgroundStoragePath ?? "")
  };
}

function loadStoredSubscriptionPopupSettings() {
  if (typeof window === "undefined") return createDefaultSubscriptionPopupSettings();

  try {
    const stored = window.localStorage.getItem(subscriptionPopupStorageKey);
    return normalizeSubscriptionPopupSettings(stored ? JSON.parse(stored) : null);
  } catch {
    return createDefaultSubscriptionPopupSettings();
  }
}

function InstagramGlyph({ size = 16 }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.9" cy="7.1" r="1.1" fill="currentColor" />
    </svg>
  );
}

function SubscriptionLightbox({
  settings,
  mode,
  message,
  isSubmitting,
  onClose,
  onOpenForm,
  onSubmit,
  onPlans
}) {
  const isFormMode = mode === "form";
  const isSuccessMode = mode === "success";

  return (
    <div
      className="subscription-lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-lightbox-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`subscription-lightbox subscription-lightbox-mode-${mode}`}
        style={{ "--subscription-lightbox-bg": `url("${settings.backgroundUrl}")` }}
      >
        <button className="subscription-lightbox-close" type="button" onClick={onClose} aria-label="Cerrar suscripción">
          <X size={24} />
        </button>

        {!isFormMode && !isSuccessMode && (
          <div className="subscription-lightbox-content">
            <img className="subscription-lightbox-logo" src={logoHeaderFooterSrc} alt="Fullness Lab" />
            <p className="eyebrow">{settings.eyebrow}</p>
            <h2 id="subscription-lightbox-title">{settings.title}</h2>
            <p>{settings.body}</p>
            <div className="subscription-lightbox-benefits" aria-label="Beneficios de la experiencia Fullness">
              {subscriptionLightboxHighlights.map(({ label, image }) => (
                <span key={label}>
                  <img src={image} alt="" aria-hidden="true" loading="lazy" />
                  {label}
                </span>
              ))}
            </div>
            <div className="subscription-lightbox-actions">
              <button className="subscription-lightbox-primary" type="button" onClick={onOpenForm}>
                {settings.ctaLabel}
                <ArrowUpRight size={18} aria-hidden="true" />
              </button>
              {settings.secondaryCtaLabel && (
                <button className="subscription-lightbox-secondary" type="button" onClick={onPlans}>
                  {settings.secondaryCtaLabel}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}

        {isFormMode && (
          <form className="subscription-lightbox-form" onSubmit={onSubmit}>
            <p className="eyebrow">Suscripción Fullness</p>
            <h2 id="subscription-lightbox-title">Déjanos tus datos</h2>
            <label>
              Nombre
              <input required name="subscriberName" autoComplete="name" placeholder="Tu nombre…" />
            </label>
            <label>
              Teléfono
              <input required name="subscriberPhone" autoComplete="tel" placeholder="+56 9…" />
            </label>
            <label>
              Mail
              <input required name="subscriberEmail" type="email" autoComplete="email" placeholder="nombre@dominio.cl…" />
            </label>
            {message && <p className="subscription-lightbox-message" role="status">{message}</p>}
            <button className="subscription-lightbox-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Inscribiendo..." : "Suscribirme"}
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </form>
        )}

        {isSuccessMode && (
          <div className="subscription-lightbox-success">
            <p className="eyebrow">Ya eres parte</p>
            <h2 id="subscription-lightbox-title">Gracias por suscribirte a Fullness Lab.</h2>
            <button className="subscription-lightbox-primary subscription-lightbox-plans" type="button" onClick={onPlans}>
              {settings.successCtaLabel}
              <ArrowUpRight size={20} aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
const introTechSignals = [
  {
    id: "anti",
    label: "Antinflamatorio"
  },
  {
    id: "nutrients",
    label: "Nutrientes"
  },
  {
    id: "origin",
    label: "Origen de calidad"
  },
  {
    id: "energy",
    label: "Energía real"
  }
];
const heroPrinciples = ["No seguimos modas", "Preparaciones honestas", "Bienestar integral"];
const heroBenefitFeatures = [
  {
    title: "Ingredientes honestos",
    text: "Seleccionamos alimentos frescos y funcionales.",
    icon: Leaf
  },
  {
    title: "Nutrición funcional",
    text: "Platos balanceados que nutren de verdad.",
    icon: CookingPot
  },
  {
    title: "Sin ultraprocesados",
    text: "Comida real, sin ingredientes que no reconoces.",
    icon: Sprout
  },
  {
    title: "Listo para disfrutar",
    text: "Recibe tu comida donde estés, sin complicaciones.",
    icon: PackageCheck
  }
];
const communityFeatures = [
  {
    title: "Clases de cocina",
    text: "Aprende recetas y técnicas para nutrirte mejor de forma simple y real.",
    icon: CookingPot
  },
  {
    title: "Nutrición funcional",
    text: "Charlas y contenidos prácticos para entender cómo los alimentos impactan tu energía y bienestar.",
    icon: Sprout
  },
  {
    title: "Talleres de bienestar",
    text: "Herramientas para gestionar el estrés, crear hábitos sostenibles y crecer desde adentro.",
    icon: Sparkles
  },
  {
    title: "Encuentros Fullness",
    text: "Experiencias presenciales para conectar, compartir y formar parte de una comunidad que te inspira.",
    icon: Heart
  }
];
const communityLandingFeatures = [
  {
    title: "Clases de cocina antinflamatoria",
    icon: CookingPot
  },
  {
    title: "Charlas de nutrición funcional",
    icon: Sprout
  },
  {
    title: "Talleres de bienestar",
    icon: Sparkles
  },
  {
    title: "Contenido exclusivo",
    icon: Lock
  },
  {
    title: "Encuentros y comunidad",
    icon: Heart
  }
];
const defaultCommunityActivities = [
  { date: "2026-07-08", description: "Clase de Cocina Antinflamatoria" },
  { date: "2026-07-17", description: "Taller de Batch Cooking" },
  { date: "2026-07-29", description: "Charla Nutrición Funcional" },
  { date: "2026-08-05", description: "Encuentro Fullness" },
  { date: "2026-08-19", description: "Taller de Bienestar" }
];

function WhatsAppIcon({ size = 24 }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M16.02 3.2c-7.03 0-12.75 5.63-12.75 12.56 0 2.22.59 4.38 1.71 6.29L3.2 28.8l6.94-1.76a12.92 12.92 0 0 0 5.88 1.43c7.03 0 12.75-5.63 12.75-12.56S23.05 3.2 16.02 3.2Zm0 22.95c-1.87 0-3.71-.5-5.31-1.45l-.38-.22-4.12 1.05 1.08-3.98-.25-.41a10.1 10.1 0 0 1-1.46-5.38c0-5.65 4.68-10.24 10.44-10.24s10.44 4.59 10.44 10.24-4.68 10.39-10.44 10.39Zm5.72-7.78c-.31-.15-1.84-.9-2.12-1-.29-.1-.5-.15-.71.15-.21.31-.81 1-.99 1.2-.18.21-.36.23-.67.08-.31-.15-1.31-.48-2.49-1.52-.92-.81-1.54-1.82-1.72-2.13-.18-.31-.02-.47.14-.62.14-.14.31-.36.47-.54.15-.18.21-.31.31-.51.1-.21.05-.39-.03-.54-.08-.15-.71-1.68-.97-2.3-.26-.6-.52-.51-.71-.52h-.6c-.21 0-.54.08-.83.39-.29.31-1.1 1.07-1.1 2.61s1.13 3.03 1.28 3.24c.15.21 2.23 3.36 5.4 4.71.76.33 1.35.52 1.81.67.76.24 1.45.2 1.99.12.61-.09 1.84-.74 2.1-1.46.26-.72.26-1.34.18-1.46-.08-.13-.29-.21-.6-.36Z"
      />
    </svg>
  );
}

function formatPrice(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

function createDefaultShopSettings() {
  return {
    id: "main",
    heroEyebrow: "Nutrir desde la raíz",
    heroTitle: "Alimentación consciente, organizada para toda la semana.",
    heroBody: "Platos diseñados por chef y nutricionista para que comer bien sea simple, práctico y delicioso.",
    heroImageUrl: shopHeroBoxDarkCutoutSrc,
    heroImageStoragePath: "",
    heroPrimaryLabel: "Ver planes semanales",
    heroSecondaryLabel: "Suscribirme",
    heroMetrics: [
      "5 proteínas independientes",
      "5 acompañamientos independientes",
      "Combina como quieras durante la semana"
    ],
    subscriptionEyebrow: "Suscripción Fullness",
    subscriptionTitle: "La forma más conveniente de alimentarte toda la semana.",
    subscriptionBody: "Recibe 4 semanas al mes con mejor valor que la compra semanal.",
    subscriptionCtaLabel: "Suscribirme ahora",
    subscriptionBenefits: [
      "4 semanas diferentes cada mes",
      "Menús renovados constantemente",
      "Mejor precio",
      "Prioridad de producción",
      "Cancela cuando quieras"
    ],
    subscriptionComparison: [
      { label: "Precio", subscription: "Mejor valor", weekly: "Precio normal" },
      { label: "Renovación", subscription: "Automática", weekly: "Manual" },
      { label: "Menús", subscription: "4 semanas", weekly: "1 semana" },
      { label: "Prioridad", subscription: "Sí", weekly: "No" },
      { label: "Flexibilidad", subscription: "Cancela cuando quieras", weekly: "Compra cuando quieras" }
    ]
  };
}

function mergeShopSettings(settings) {
  const defaults = createDefaultShopSettings();
  if (!settings) return defaults;

  return {
    ...defaults,
    ...settings,
    heroImageUrl: settings.heroImageUrl || defaults.heroImageUrl,
    heroMetrics: settings.heroMetrics?.length ? settings.heroMetrics : defaults.heroMetrics,
    subscriptionBenefits: settings.subscriptionBenefits?.length
      ? settings.subscriptionBenefits
      : defaults.subscriptionBenefits,
    subscriptionComparison: settings.subscriptionComparison?.length
      ? settings.subscriptionComparison
      : defaults.subscriptionComparison
  };
}

function renderShopHeroTitle(title) {
  const text = String(title || "");
  const match = text.match(/toda la semana\.?/i);
  if (!match) return text;

  const start = match.index || 0;
  const end = start + match[0].length;

  return (
    <>
      {text.slice(0, start)}
      <span>{text.slice(start, end)}</span>
      {text.slice(end)}
    </>
  );
}

function createShopSettingsForm(settings = createDefaultShopSettings()) {
  const merged = mergeShopSettings(settings);

  return {
    heroEyebrow: merged.heroEyebrow || "",
    heroTitle: merged.heroTitle || "",
    heroBody: merged.heroBody || "",
    heroImageUrl: merged.heroImageUrl || "",
    heroImageStoragePath: merged.heroImageStoragePath || "",
    heroPrimaryLabel: merged.heroPrimaryLabel || "",
    heroSecondaryLabel: merged.heroSecondaryLabel || "",
    heroMetrics: (merged.heroMetrics || []).join("\n"),
    subscriptionEyebrow: merged.subscriptionEyebrow || "",
    subscriptionTitle: merged.subscriptionTitle || "",
    subscriptionBody: merged.subscriptionBody || "",
    subscriptionCtaLabel: merged.subscriptionCtaLabel || "",
    subscriptionBenefits: (merged.subscriptionBenefits || []).join("\n"),
    subscriptionComparison: (merged.subscriptionComparison || [])
      .map((row) => [row.label, row.subscription, row.weekly].join(" | "))
      .join("\n")
  };
}

function parseShopComparisonRows(value) {
  return String(value || "")
    .split("\n")
    .map((line) => {
      const [label = "", subscription = "", weekly = ""] = line.split("|").map((part) => part.trim());
      if (!label && !subscription && !weekly) return null;
      return { label, subscription, weekly };
    })
    .filter(Boolean);
}

function parseShopSettingsForm(form) {
  return {
    ...form,
    heroMetrics: form.heroMetrics,
    subscriptionBenefits: form.subscriptionBenefits,
    subscriptionComparison: parseShopComparisonRows(form.subscriptionComparison)
  };
}

function loadStoredCommunityActivities() {
  if (typeof window === "undefined") return defaultCommunityActivities;

  try {
    const stored = window.localStorage.getItem("fullness_community_activities");
    const parsed = stored ? JSON.parse(stored) : null;
    if (!Array.isArray(parsed)) return defaultCommunityActivities;

    const clean = parsed
      .map((item) => ({
        date: String(item?.date || "").trim(),
        description: String(item?.description || "").trim()
      }))
      .filter((item) => item.date && item.description);

    return clean.length > 0 ? clean : defaultCommunityActivities;
  } catch {
    return defaultCommunityActivities;
  }
}

function formatCommunityActivityDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  const monthLabels = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

  if (!year || !month || !day) {
    return { day: "--", month: "" };
  }

  return {
    day: String(day).padStart(2, "0"),
    month: monthLabels[month - 1] || ""
  };
}

function formatSubscriptionDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function slugifyMenuName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

function createAutomaticSku(prefix = "FUL") {
  const token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : `${Date.now()}${Math.random().toString(36).slice(2, 8)}`.slice(-10);

  return `${prefix}-${token.toUpperCase()}`;
}

function createStableSku(prefix, value) {
  const token = String(value || "")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 10)
    .toUpperCase();

  return token ? `${prefix}-${token}` : createAutomaticSku(prefix);
}

function createIncludedMealForm(index = 0) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `meal-${Date.now()}-${index}`;

  return {
    id,
    sku: createAutomaticSku("PL"),
    editorMode: "express",
    libraryMealId: "",
    name: "",
    tag: "",
    description: "",
    photoUrl: "",
    photoStoragePath: "",
    secondaryPhotoUrl: "",
    secondaryPhotoStoragePath: "",
    benefitTags: "",
    benefitAssignments: [],
    tagIds: [],
    ingredients: "",
    nutritionDescription: "",
    nutritionHighlights: "",
    nutritionFacts: "{}",
    allergens: ""
  };
}

function includedMealToForm(item, index = 0) {
  return {
    id: item.id || `meal-${index + 1}`,
    sku: item.sku || createStableSku("PL", item.libraryMealId || item.id),
    editorMode: item.editorMode || "advanced",
    libraryMealId: item.libraryMealId || item.library_meal_id || "",
    name: item.name || "",
    tag: item.tag || "",
    description: item.description || "",
    photoUrl: item.photoUrl || item.image || "",
    photoStoragePath: item.photoStoragePath || "",
    secondaryPhotoUrl: item.secondaryPhotoUrl || item.secondaryImage || "",
    secondaryPhotoStoragePath: item.secondaryPhotoStoragePath || "",
    benefitTags: (item.benefitTags || item.benefit_tags || []).join("\n"),
    benefitAssignments: item.benefitAssignments || item.benefit_assignments || item.benefits || [],
    tagIds: item.tagIds || item.tag_ids || item.tags?.map((tag) => tag.id).filter(Boolean) || [],
    ingredients: (item.ingredients || []).join("\n"),
    nutritionDescription: item.nutritionDescription || item.nutrition_description || "",
    nutritionHighlights: (item.nutritionHighlights || item.nutrition_highlights || []).join("\n"),
    nutritionFacts: JSON.stringify(item.nutritionFacts || item.nutrition_facts || {}, null, 2),
    allergens: (item.allergens || []).join("\n")
  };
}

function mealLibraryItemToForm(item) {
  return {
    id: item.id || "",
    sku: item.sku || createStableSku("PL", item.id),
    name: item.name || "",
    tag: item.tag || "",
    description: item.description || "",
    photoUrl: item.photoUrl || "",
    photoStoragePath: item.photoStoragePath || "",
    secondaryPhotoUrl: item.secondaryPhotoUrl || "",
    secondaryPhotoStoragePath: item.secondaryPhotoStoragePath || "",
    benefitTags: (item.benefitTags || []).join("\n"),
    benefitAssignments: item.benefitAssignments || item.benefits || [],
    tagIds: item.tagIds || item.tags?.map((tag) => tag.id).filter(Boolean) || [],
    ingredients: (item.ingredients || []).join("\n"),
    nutritionDescription: item.nutritionDescription || "",
    nutritionHighlights: (item.nutritionHighlights || []).join("\n"),
    nutritionFacts: JSON.stringify(item.nutritionFacts || {}, null, 2),
    allergens: (item.allergens || []).join("\n"),
    isActive: Boolean(item.isActive)
  };
}

function createMealLibraryForm() {
  return {
    ...mealLibraryItemToForm({ isActive: true }),
    isActive: true
  };
}

function createMenuForm(displayOrder = 0) {
  return {
    id: "",
    name: "",
    slug: "",
    sku: createAutomaticSku("MP"),
    productType: "plan",
    planFrequency: "weekly",
    tag: "",
    description: "",
    photoUrl: "",
    photoStoragePath: "",
    secondaryPhotoUrl: "",
    secondaryPhotoStoragePath: "",
    priceClp: "",
    benefitTags: "",
    benefitAssignments: [],
    tagIds: [],
    libraryMealId: "",
    ingredients: "",
    nutritionDescription: "",
    nutritionHighlights: "",
    nutritionFacts: "{}",
    recipeSummary: "",
    recipeSteps: "",
    allergens: "",
    includedItems: [],
    servingLabel: "",
    purchaseLabel: "",
    displayOrder: String(displayOrder),
    isActive: true
  };
}

function createMenuFormDraftKey(menuItemId = "") {
  if (menuItemId) return `item:${menuItemId}`;

  const suffix =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `new:${suffix}`;
}

function normalizeMenuFormDraft(rawDraft) {
  if (!rawDraft?.form || typeof rawDraft.form !== "object") return null;

  const defaults = createMenuForm(Number(rawDraft.form.displayOrder) || 10);
  const form = {
    ...defaults,
    ...rawDraft.form,
    includedItems: Array.isArray(rawDraft.form.includedItems) ? rawDraft.form.includedItems : defaults.includedItems
  };
  const updatedAt = rawDraft.updatedAt || rawDraft.updated_at || rawDraft.savedAt || Date.now();

  return {
    id: rawDraft.id || "",
    draftKey: rawDraft.draftKey || rawDraft.draft_key || (form.id ? createMenuFormDraftKey(form.id) : `legacy:${updatedAt}`),
    title:
      rawDraft.title ||
      form.name?.trim() ||
      (form.productType === "family" ? "Plato familiar sin título" : "Meal prep sin título"),
    form,
    createdAt: rawDraft.createdAt || rawDraft.created_at || updatedAt,
    updatedAt
  };
}

function mergeMenuFormDrafts(...collections) {
  const merged = new Map();

  collections.flat().forEach((rawDraft) => {
    const draft = normalizeMenuFormDraft(rawDraft);
    if (!draft) return;

    const previous = merged.get(draft.draftKey);
    if (!previous || new Date(draft.updatedAt).getTime() >= new Date(previous.updatedAt).getTime()) {
      merged.set(draft.draftKey, draft);
    }
  });

  return [...merged.values()].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

function getStoredMenuFormDrafts() {
  if (typeof window === "undefined") return [];

  try {
    const stored = JSON.parse(window.localStorage.getItem(menuFormDraftStorageKey) || "[]");
    const currentDrafts = Array.isArray(stored) ? stored : [];
    const legacy = JSON.parse(window.localStorage.getItem(legacyMenuFormDraftStorageKey) || "null");

    return mergeMenuFormDrafts(currentDrafts, legacy?.form ? [legacy] : []);
  } catch {
    return [];
  }
}

function storeMenuFormDrafts(drafts) {
  if (typeof window === "undefined") return;

  try {
    if (drafts.length) {
      window.localStorage.setItem(menuFormDraftStorageKey, JSON.stringify(drafts));
    } else {
      window.localStorage.removeItem(menuFormDraftStorageKey);
    }
    window.localStorage.removeItem(legacyMenuFormDraftStorageKey);
  } catch {
    // The in-browser copy is best effort; the authenticated copy lives in Supabase.
  }
}

function isMeaningfulMenuFormDraft(form) {
  if (!form || typeof form !== "object") return false;

  return Boolean(
    form.name?.trim() ||
    form.slug?.trim() ||
    form.tag?.trim() ||
    form.description?.trim() ||
    form.priceClp?.trim() ||
    form.photoUrl?.trim() ||
    form.secondaryPhotoUrl?.trim() ||
    form.includedItems?.some((item) => item.name?.trim() || item.description?.trim() || item.photoUrl?.trim())
  );
}

function menuItemToForm(item) {
  return {
    id: item.id || "",
    name: item.name || "",
    slug: item.slug || "",
    sku: item.sku || createStableSku(item.productType === "plan" ? "MP" : "PF", item.id || item.slug),
    productType: item.productType || "family",
    planFrequency: item.planFrequency || "weekly",
    tag: item.tag || "",
    description: item.description || "",
    photoUrl: item.photoUrl || item.image || "",
    photoStoragePath: item.photoStoragePath || "",
    secondaryPhotoUrl: item.secondaryPhotoUrl || item.secondaryImage || "",
    secondaryPhotoStoragePath: item.secondaryPhotoStoragePath || "",
    priceClp: String(item.price || 0),
    benefitTags: (item.benefitTags || []).join("\n"),
    benefitAssignments: item.benefitAssignments || item.benefits || [],
    tagIds: item.tagIds || item.tags?.map((tag) => tag.id).filter(Boolean) || [],
    libraryMealId: item.libraryMealId || "",
    ingredients: (item.ingredients || []).join("\n"),
    nutritionDescription: item.nutritionDescription || "",
    nutritionHighlights: (item.nutritionHighlights || []).join("\n"),
    nutritionFacts: JSON.stringify(item.nutritionFacts || {}, null, 2),
    recipeSummary: item.recipeSummary || "",
    recipeSteps: (item.recipeSteps || []).join("\n"),
    allergens: (item.allergens || []).join("\n"),
    includedItems: (item.includedItems || []).map(includedMealToForm),
    servingLabel: item.servingLabel || "",
    purchaseLabel: item.purchaseLabel || "",
    displayOrder: String(item.displayOrder || 0),
    isActive: Boolean(item.isActive)
  };
}

function parseJsonObject(value) {
  const text = String(value || "").trim();
  if (!text) return {};

  const parsed = JSON.parse(text);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Los datos nutricionales deben ser un objeto JSON.");
  }

  return parsed;
}

const nutritionFactEditorFields = [
  { key: "calories", aliases: ["kcal"], label: "Calorías", unit: "kcal", step: "1" },
  { key: "protein_g", label: "Proteínas", unit: "g", step: "0.1" },
  { key: "carbs_g", label: "Carbohidratos", unit: "g", step: "0.1" },
  { key: "fat_g", label: "Grasas", unit: "g", step: "0.1" },
  { key: "fiber_g", label: "Fibra", unit: "g", step: "0.1" },
  { key: "sodium_mg", label: "Sodio", unit: "mg", step: "1" }
];

function readNutritionFactsForEditor(value) {
  try {
    return parseJsonObject(value);
  } catch {
    return {};
  }
}

function updateNutritionFactValue(value, field, nextValue) {
  const current = readNutritionFactsForEditor(value);
  const next = { ...current };
  const trimmedValue = String(nextValue || "").trim();

  if (!trimmedValue) {
    delete next[field.key];
    field.aliases?.forEach((alias) => delete next[alias]);
  } else {
    next[field.key] = Number(trimmedValue);
    field.aliases?.forEach((alias) => delete next[alias]);
  }

  return JSON.stringify(next, null, 2);
}

function NutritionFactsEditor({ value, onChange, idPrefix }) {
  const facts = readNutritionFactsForEditor(value);

  return (
    <fieldset className="backoffice-nutrition-editor">
      <legend>Información nutricional por porción</legend>
      <p>Completa sólo los valores que quieras mostrar en la ficha del plato.</p>
      <div className="backoffice-nutrition-grid">
        {nutritionFactEditorFields.map((field) => {
          const aliasValue = field.aliases?.map((alias) => facts[alias]).find((item) => item !== undefined);
          const fieldValue = facts[field.key] ?? aliasValue ?? "";

          return (
            <label key={field.key} htmlFor={`${idPrefix}-${field.key}`}>
              {field.label}
              <span className="backoffice-unit-input">
                <input
                  id={`${idPrefix}-${field.key}`}
                  name={`${idPrefix}-${field.key}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step={field.step}
                  value={fieldValue}
                  onChange={(event) => onChange(updateNutritionFactValue(value, field, event.target.value))}
                  autoComplete="off"
                  placeholder="0"
                />
                <small>{field.unit}</small>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function BackofficePhotoEditor({
  primaryUrl,
  secondaryUrl,
  onPrimaryFile,
  onSecondaryFile,
  onPrimaryUrlChange,
  onSecondaryUrlChange,
  disabled,
  uploading,
  idPrefix,
  showSecondary = true
}) {
  return (
    <div className="backoffice-photo-editor">
      <div className={`backoffice-photo-row backoffice-photo-row-double ${showSecondary ? "" : "is-single"}`}>
        <section className="backoffice-photo-block">
          <header>
            <strong>Foto principal</strong>
            <small>Es la primera imagen que verá el cliente.</small>
          </header>
          <div className="backoffice-photo-preview">
            {primaryUrl ? (
              <img src={primaryUrl} alt="" width="960" height="600" />
            ) : (
              <UploadCloud size={30} aria-hidden="true" />
            )}
          </div>
          <label className="upload-control">
            <UploadCloud size={18} aria-hidden="true" />
            {uploading ? "Subiendo foto…" : primaryUrl ? "Cambiar foto" : "Elegir foto"}
            <input
              name={`${idPrefix}-primary-photo`}
              type="file"
              accept="image/*"
              aria-label="Elegir foto principal"
              onChange={onPrimaryFile}
              disabled={disabled}
            />
          </label>
          {primaryUrl && <p className="backoffice-image-ready"><CheckCircle2 size={16} aria-hidden="true" />Foto lista</p>}
        </section>

        {showSecondary && (
          <section className="backoffice-photo-block">
            <header>
              <strong>Segunda foto</strong>
              <small>Aparece cuando el cliente pasa el cursor sobre la imagen.</small>
            </header>
            <div className="backoffice-photo-preview">
              {secondaryUrl ? (
                <img src={secondaryUrl} alt="" width="960" height="600" />
              ) : (
                <ImagePlus size={30} aria-hidden="true" />
              )}
            </div>
            <label className="upload-control">
              <ImagePlus size={18} aria-hidden="true" />
              {uploading ? "Subiendo foto…" : secondaryUrl ? "Cambiar foto" : "Elegir foto"}
              <input
                name={`${idPrefix}-secondary-photo`}
                type="file"
                accept="image/*"
                aria-label="Elegir segunda foto"
                onChange={onSecondaryFile}
                disabled={disabled}
              />
            </label>
            {secondaryUrl && <p className="backoffice-image-ready"><CheckCircle2 size={16} aria-hidden="true" />Foto lista</p>}
          </section>
        )}
      </div>

      <details className="backoffice-advanced-fields">
        <summary>Opciones avanzadas de imagen</summary>
        <p>Estos enlaces se completan automáticamente al subir las fotos.</p>
        <div className="backoffice-grid">
          <label>
            Enlace de la foto principal
            <input
              name={`${idPrefix}-primary-url`}
              type="url"
              value={primaryUrl}
              onChange={(event) => onPrimaryUrlChange(event.target.value)}
              autoComplete="off"
              placeholder="Enlace de la imagen…"
            />
          </label>
          {showSecondary && (
            <label>
              Enlace de la segunda foto
              <input
                name={`${idPrefix}-secondary-url`}
                type="url"
                value={secondaryUrl}
                onChange={(event) => onSecondaryUrlChange(event.target.value)}
                autoComplete="off"
                placeholder="Enlace de la imagen…"
              />
            </label>
          )}
        </div>
      </details>
    </div>
  );
}

function BackofficeSaveLightbox({ feedback, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!feedback || feedback.status === "saving") return undefined;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [feedback, onClose]);

  if (!feedback) return null;

  const isSaving = feedback.status === "saving";
  const isSuccess = feedback.status === "success";

  return (
    <div className="backoffice-result-overlay" role="dialog" aria-modal="true" aria-labelledby="backoffice-result-title">
      <section className={`backoffice-result-card is-${feedback.status}`} aria-live="polite">
        <div className="backoffice-result-icon" aria-hidden="true">
          {isSaving ? <RefreshCw size={32} /> : isSuccess ? <CheckCircle2 size={34} /> : <X size={34} />}
        </div>
        <p className="eyebrow">{isSaving ? "Guardando" : isSuccess ? "Todo listo" : "Revisa la información"}</p>
        <h3 id="backoffice-result-title">{feedback.title}</h3>
        <p>{feedback.message}</p>
        {!isSaving && (
          <button ref={closeButtonRef} className="primary-button" type="button" onClick={onClose}>
            {isSuccess ? "Volver al backoffice" : "Revisar formulario"}
          </button>
        )}
      </section>
    </div>
  );
}

function parseIncludedMealsFromForm(items, tagDefinitions = []) {
  return items
    .map((item, index) => {
      const hasContent =
        item.name.trim() ||
        item.description.trim() ||
        item.photoUrl.trim() ||
        item.secondaryPhotoUrl.trim();

      if (!hasContent) return null;

      let nutritionFacts = {};

      try {
        nutritionFacts = parseJsonObject(item.nutritionFacts);
      } catch (error) {
        throw new Error(`Plato ${index + 1}: ${error.message}`);
      }

      return {
        id: item.id || `meal-${index + 1}`,
        sku: item.sku || createStableSku("PL", item.libraryMealId || item.id),
        libraryMealId: item.libraryMealId || "",
        name: item.name,
        tag: item.tag,
        description: item.description,
        photoUrl: item.photoUrl,
        photoStoragePath: item.photoStoragePath,
        secondaryPhotoUrl: item.secondaryPhotoUrl,
        secondaryPhotoStoragePath: item.secondaryPhotoStoragePath,
        benefitTags: item.benefitTags,
        benefitAssignments: item.benefitAssignments,
        tagIds: item.tagIds,
        tags: tagDefinitions.filter((tag) => item.tagIds?.includes(tag.id)),
        ingredients: item.ingredients,
        nutritionDescription: item.nutritionDescription,
        nutritionHighlights: item.nutritionHighlights,
        nutritionFacts,
        allergens: item.allergens
      };
    })
    .filter(Boolean);
}

function getMenuFormPublicationIssues(form) {
  const issues = [];
  const effectiveSlug = form.slug.trim() || slugifyMenuName(form.name);
  const price = Number(form.priceClp);

  if (!form.name.trim()) issues.push("nombre");
  if (!effectiveSlug) issues.push("slug válido");
  if (form.priceClp === "" || !Number.isFinite(price) || price < 0) issues.push("precio");
  if (!form.description.trim()) issues.push("descripción");
  if (
    form.productType === "plan" &&
    !form.includedItems?.some((item) => item.name?.trim())
  ) {
    issues.push("al menos un plato");
  }

  return issues;
}

function getSupabaseErrorMessage(error, fallback = "No pudimos completar la acción.") {
  return error?.message || fallback;
}

function getMemberLabel(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Cuenta"
  );
}

function formatNutritionLabel(key) {
  const labels = {
    calories: "Calorías",
    kcal: "Energía",
    protein_g: "Proteína",
    carbs_g: "Carbohidratos",
    fat_g: "Grasas",
    fiber_g: "Fibra",
    sodium_mg: "Sodio"
  };

  return labels[key] || key.replace(/_/g, " ");
}

function formatNutritionValue(key, value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") {
    if (key.endsWith("_g")) return `${value} g`;
    if (key.endsWith("_mg")) return `${value} mg`;
    return String(value);
  }

  return String(value);
}

function getNutritionEntries(product) {
  const facts = product?.nutritionFacts || {};
  if (!facts || Array.isArray(facts) || typeof facts !== "object") return [];

  return Object.entries(facts)
    .map(([key, value]) => ({
      key,
      label: formatNutritionLabel(key),
      value: formatNutritionValue(key, value)
    }))
    .filter((entry) => entry.value);
}

function getProductType(product) {
  return product?.productType === "plan" ? "plan" : "family";
}

function getProductTypeLabel(product) {
  if (getProductType(product) === "plan") {
    return product.planFrequency === "monthly" ? "Plan mensual" : "Plan semanal";
  }

  return "Familiar";
}

function getBenefitTags(product) {
  if (product?.tags?.length) return product.tags.map((tag) => tag.name);
  if (product?.nutritionHighlights?.length) return product.nutritionHighlights;
  if (product?.benefitTags?.length) return product.benefitTags;
  if (product?.tag) return [product.tag];
  return [];
}

function getProductBenefits(product) {
  if (product?.benefits?.length) return product.benefits;
  if (product?.benefitAssignments?.length) return product.benefitAssignments;
  return [];
}

function createDefaultCheckoutForm() {
  return {
    mode: "delivery",
    name: checkoutTestMode ? "Carlos Rodriguez" : "",
    email: checkoutTestMode ? "carlos@prof3sional.com" : "",
    phone: checkoutTestMode ? "+56 9 1234 5678" : "",
    address: checkoutTestMode ? "Av. Providencia 1234" : "",
    comuna: checkoutTestMode ? "Providencia" : "",
    instructions: checkoutTestMode ? "Compra de prueba Fullness Lab" : ""
  };
}

function loadStoredCheckoutForm() {
  if (typeof window === "undefined") return createDefaultCheckoutForm();

  try {
    const stored = JSON.parse(window.localStorage.getItem("fullness_checkout_form") || "null");
    const storedValues = stored && typeof stored === "object"
      ? Object.fromEntries(
          Object.entries(stored).filter(([key, value]) => key === "mode" || !checkoutTestMode || String(value || "").trim())
        )
      : {};

    return {
      ...createDefaultCheckoutForm(),
      ...storedValues
    };
  } catch {
    return createDefaultCheckoutForm();
  }
}

function loadStoredCart() {
  if (typeof window === "undefined") return [];

  try {
    const stored = JSON.parse(window.localStorage.getItem(checkoutCartStorageKey) || "[]");
    if (!Array.isArray(stored)) return [];

    return stored
      .filter((item) => item?.id && item?.slug && Number(item?.qty) > 0)
      .map((item) => ({...item, qty: Math.max(1, Math.round(Number(item.qty)))}));
  } catch {
    return [];
  }
}

function readCheckoutReturnState() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const returnStatus = params.get("checkout_status") || params.get("status") || params.get("collection_status");
  const paymentId = params.get("payment_id") || params.get("collection_id") || "";
  const orderId = params.get("order_id") || params.get("external_reference") || "";

  if (!returnStatus && !paymentId && !orderId) return null;

  return {
    orderId,
    paymentId,
    status: returnStatus || "pending",
    syncing: Boolean(paymentId),
    message: paymentId
      ? "Estamos confirmando tu pago con Mercado Pago."
      : returnStatus === "failure"
        ? "No se realizo el cobro. Tu carrito sigue disponible."
        : "El pago quedo pendiente de confirmacion."
  };
}

function ProductNutritionFacts({ product }) {
  const entries = getNutritionEntries(product);
  if (entries.length === 0) return null;

  return (
    <div className="nutrition-facts-grid" aria-label="Datos nutricionales">
      {entries.map((entry) => (
        <span key={entry.key}>
          <small>{entry.label}</small>
          <strong>{entry.value}</strong>
        </span>
      ))}
    </div>
  );
}

function HoverImage({ alt, primary, secondary }) {
  return (
    <span className="hover-image-frame">
      <img className="hover-image-primary" src={primary} alt={alt} />
      <img className="hover-image-secondary" src={secondary || primary} alt="" aria-hidden="true" />
    </span>
  );
}

const shopMetricIcons = [Leaf, CookingPot, Heart];
const shopProcessSteps = [
  { icon: Leaf, title: "Elige tu objetivo", text: "Define energía, equilibrio o recuperación." },
  { icon: CookingPot, title: "Selecciona tus favoritos", text: "Planes completos o packs familiares." },
  { icon: PackageCheck, title: "Recibe tu box", text: "Cada plato llega listo y etiquetado." },
  { icon: Timer, title: "Calienta en minutos", text: "Regeneración simple para tu rutina." },
  { icon: Heart, title: "Disfruta tu semana", text: "Comida completa sin improvisar." }
];

function ShopPlanCard({ product, index, onAdd, onOpenBenefit, onOpenMeal, onOpenProduct }) {
  const includedItems = product.includedItems || [];
  const benefitTags = getBenefitTags(product);
  const primaryImage = getProductImage(product, index);
  const secondaryImage = getProductSecondaryImage(product, index);
  const isMonthly = product.planFrequency === "monthly";
  const purchaseLabel = product.purchaseLabel || (isMonthly ? "Comprar mensual" : "Comprar esta semana");

  return (
    <article className="shop-plan-card">
      <button className="shop-plan-media-button" type="button" onClick={() => onOpenProduct(product)}>
        <HoverImage primary={primaryImage} secondary={secondaryImage} alt={product.name} />
        <span>{isMonthly ? "Mensual" : "Semanal"}</span>
      </button>

      <div className="shop-plan-body">
        <button className="shop-plan-title-button" type="button" onClick={() => onOpenProduct(product)}>
          <span>{isMonthly ? "Plan mensual" : "Semana"}</span>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
        </button>

        {benefitTags.length > 0 && (
          <ul className="shop-benefit-tags" aria-label="Beneficios">
            {benefitTags.slice(0, 3).map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        )}

      </div>

      {includedItems.length > 0 && (
        <div className={`shop-plan-meals is-${Math.min(includedItems.length, 3)}`} aria-label={`Platos incluidos en ${product.name}`}>
          {includedItems.slice(0, 3).map((meal) => (
            <article className="shop-plan-meal-card" key={meal.id || meal.name}>
              <button
                className="shop-plan-meal-main"
                type="button"
                onClick={(event) => onOpenMeal(product, meal, event)}
              >
                <span className="shop-plan-meal-kicker">{meal.tag || "Plato Fullness"}</span>
                <strong>{meal.name}</strong>
                <p>{meal.description}</p>
              </button>
              <BenefitIconList
                benefits={getProductBenefits(meal)}
                contextTitle={meal.name}
                onOpenBenefit={onOpenBenefit}
                limit={2}
                compact
              />
            </article>
          ))}
        </div>
      )}

      <div className="shop-plan-footer">
        <small>{product.servingLabel || product.tag}</small>
        <strong>{formatPrice(product.price)}</strong>
        <div>
          <button className="shop-outline-button" type="button" onClick={() => onOpenProduct(product)}>
            Ver menú
          </button>
          <button className="shop-solid-button" type="button" onClick={() => onAdd(product)}>
            {purchaseLabel}
          </button>
        </div>
      </div>
    </article>
  );
}

function ShopFamilyCard({ product, index, onAdd, onOpenBenefit, onOpenProduct }) {
  const primaryImage = getProductImage(product, index);
  const secondaryImage = getProductSecondaryImage(product, index);
  const benefitTags = getBenefitTags(product);
  const benefits = getProductBenefits(product);

  return (
    <article className="shop-family-card">
      <button className="shop-family-media-button" type="button" onClick={() => onOpenProduct(product)}>
        <HoverImage primary={primaryImage} secondary={secondaryImage} alt={product.name} />
      </button>
      <div className="shop-family-copy">
        <button className="shop-family-detail-button" type="button" onClick={() => onOpenProduct(product)}>
          <span>{product.servingLabel || product.tag || "Para compartir"}</span>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
        </button>
        {benefitTags.length > 0 && (
          <ul className="shop-benefit-tags" aria-label="Beneficios">
            {benefitTags.slice(0, 3).map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        )}
        <BenefitIconList
          benefits={benefits}
          contextTitle={product.name}
          onOpenBenefit={onOpenBenefit}
          limit={3}
          compact
        />
      </div>
      <div className="shop-family-footer">
        <strong>{formatPrice(product.price)}</strong>
        <button className="shop-outline-button" type="button" onClick={() => onOpenProduct(product)}>
          Ver detalle
        </button>
        <button className="shop-solid-button" type="button" onClick={() => onAdd(product)}>
          Agregar al carrito
        </button>
      </div>
    </article>
  );
}

function MealPrepCatalog({ familyProducts, loading, onAdd, onOpenBenefit, onOpenMeal, onOpenProduct, plans, shopSettings }) {
  const settings = mergeShopSettings(shopSettings);
  const catalogPlans = plans;
  const monthlyPlan = catalogPlans.find((product) => product.planFrequency === "monthly");
  const subscriptionProduct = monthlyPlan || catalogPlans[0] || null;
  const heroFallbackProduct = catalogPlans[0] || familyProducts[0] || null;
  const configuredHeroImage = settings.heroImageUrl || "";
  const heroImage = configuredHeroImage.includes(opaqueMealPrepHeroAssetToken)
    ? shopHeroBoxDarkCutoutSrc
    : configuredHeroImage || getProductImage(heroFallbackProduct);
  const heroMetrics = settings.heroMetrics.slice(0, 3);
  const comparisonRows = settings.subscriptionComparison;
  const planHeading = catalogPlans.some((product) => product.planFrequency === "monthly")
    ? "Planes semanales y mensuales"
    : "Planes semanales";

  const scrollToBlock = (event, selector) => {
    event.preventDefault();
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="meal-prep-shop shop-commerce-page" id="oferta">
      <section className="shop-hero-showcase" aria-labelledby="shop-hero-title">
        <img className="shop-hero-botanical" src={shopPlansCauliflowerIllustrationSrc} alt="" aria-hidden="true" />
        <div className="shop-hero-copy">
          <p className="eyebrow">{settings.heroEyebrow}</p>
          <h1 id="shop-hero-title">{renderShopHeroTitle(settings.heroTitle)}</h1>
          <p>{settings.heroBody}</p>
          <div className="shop-hero-actions">
            <a className="shop-solid-link" href="#shop-plans" onClick={(event) => scrollToBlock(event, "#shop-plans")}>
              {settings.heroPrimaryLabel}
              <ArrowUpRight size={17} />
            </a>
            <a className="shop-outline-link" href="#shop-subscription" onClick={(event) => scrollToBlock(event, "#shop-subscription")}>
              {settings.heroSecondaryLabel}
              <ArrowUpRight size={17} />
            </a>
          </div>
          {heroMetrics.length > 0 && (
            <ul className="shop-hero-metrics" aria-label="Beneficios del formato">
              {heroMetrics.map((metric, index) => {
                const MetricIcon = shopMetricIcons[index % shopMetricIcons.length];

                return (
                  <li key={metric}>
                    <MetricIcon size={28} aria-hidden="true" />
                    <span>{metric}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <figure className="shop-hero-media">
          <img src={heroImage} alt="Meal prep Fullness" />
        </figure>
      </section>

      {loading ? (
        <p className="products-empty">Cargando meal preps…</p>
      ) : (
        <>
          <section className="shop-subscription-panel" id="shop-subscription" aria-labelledby="shop-subscription-title">
            <div className="shop-subscription-copy">
              <p className="eyebrow">{settings.subscriptionEyebrow}</p>
              <h2 id="shop-subscription-title">{settings.subscriptionTitle}</h2>
              <p>{settings.subscriptionBody}</p>
              <button
                className="shop-solid-button"
                type="button"
                onClick={() => subscriptionProduct && onAdd(subscriptionProduct)}
                disabled={!subscriptionProduct}
              >
                {settings.subscriptionCtaLabel}
                <ArrowUpRight size={17} />
              </button>
            </div>

            <ul className="shop-subscription-benefits">
              {settings.subscriptionBenefits.map((benefit) => (
                <li key={benefit}>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="shop-comparison-table" aria-label="Comparación de suscripción">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Precio</th>
                    <th scope="col">Suscripción</th>
                    <th scope="col">Compra semanal</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} data-label={row.label}>
                      <th scope="row">{row.label}</th>
                      <td data-label="Suscripción">{row.subscription}</td>
                      <td data-label="Compra semanal">{row.weekly}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                className="shop-solid-button"
                type="button"
                onClick={() => subscriptionProduct && onAdd(subscriptionProduct)}
                disabled={!subscriptionProduct}
              >
                Comprar plan semanal
                <ArrowUpRight size={17} />
              </button>
            </div>
          </section>

          <section className="shop-plans-section" id="shop-plans" aria-labelledby="shop-plans-title">
            <div className="shop-section-heading">
              <p className="eyebrow">Meal prep</p>
              <h2 id="shop-plans-title">{planHeading}</h2>
              <p>Cada semana un propósito distinto. Nosotros hacemos la selección por ti.</p>
            </div>
            {catalogPlans.length > 0 ? (
              <div className="shop-plan-grid">
                {catalogPlans.map((product, index) => (
                  <ShopPlanCard
                    key={product.id}
                    product={product}
                    index={index}
                    onAdd={onAdd}
                    onOpenBenefit={onOpenBenefit}
                    onOpenMeal={onOpenMeal}
                    onOpenProduct={onOpenProduct}
                  />
                ))}
              </div>
            ) : (
              <p className="products-empty">Aún no hay planes activos.</p>
            )}
          </section>

          <section className="shop-process-band" aria-labelledby="shop-process-title">
            <h2 id="shop-process-title">Cómo funciona</h2>
            <ol>
              {shopProcessSteps.map((step, index) => {
                const StepIcon = step.icon;

                return (
                  <li key={step.title}>
                    <span>{index + 1}</span>
                    <StepIcon size={28} aria-hidden="true" />
                    <strong>{step.title}</strong>
                    <small>{step.text}</small>
                  </li>
                );
              })}
            </ol>
            <div className="shop-process-features" aria-label="Sellos de servicio">
              {["Proteínas separadas", "Acompañamientos separados", "Ingredientes frescos", "Instrucciones de regeneración", "Tablas nutricionales", "Conservación segura"].map((item) => (
                <span key={item}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="shop-family-section" aria-labelledby="shop-family-title">
            <div className="shop-section-heading is-left">
              <p className="eyebrow">Packs familiares</p>
              <h2 id="shop-family-title">Para compartir en casa.</h2>
              <p>Proteínas y acompañamientos favoritos en porciones generosas para la familia.</p>
            </div>
            {familyProducts.length > 0 ? (
              <div className="shop-family-grid">
                {familyProducts.map((product, index) => (
                  <ShopFamilyCard
                    key={product.id}
                    product={product}
                    index={index + catalogPlans.length}
                    onAdd={onAdd}
                    onOpenBenefit={onOpenBenefit}
                    onOpenProduct={onOpenProduct}
                  />
                ))}
              </div>
            ) : (
              <p className="products-empty">Aún no hay opciones familiares activas.</p>
            )}
          </section>

          <section
            className="shop-community-band"
            style={{ "--shop-community-bg": `url("${communitySceneSrc}")` }}
            aria-labelledby="shop-community-title"
          >
            <div>
              <p className="eyebrow">Comunidad Fullness</p>
              <h2 id="shop-community-title">Un espacio donde la alimentación, el bienestar y el crecimiento personal se encuentran.</h2>
              <p>Encuentros, recetas y experiencias para acompañar tu rutina más allá del meal prep.</p>
            </div>
            <a href="/comunidad">
              Conoce la comunidad
              <ArrowUpRight size={17} />
            </a>
          </section>
        </>
      )}
    </section>
  );
}

function ProductQuickView({ product, image, onAdd, onClose, onOpenBenefit, onOpenDetail, onOpenMeal }) {
  const benefitTags = getBenefitTags(product);
  const benefits = getProductBenefits(product);
  const includedItems = product?.includedItems || [];
  const isFamilyDish = getProductType(product) === "family";

  return (
    <div className="overlay product-lightbox" role="dialog" aria-modal="true" aria-labelledby="product-lightbox-title">
      <section className="product-lightbox-panel">
        <button className="icon-button close" type="button" onClick={onClose} aria-label="Cerrar detalle rápido">
          <X size={22} />
        </button>
        <div className="product-lightbox-media">
          <img src={image} alt={`Plato ${product.name}`} />
        </div>
        <div className="product-lightbox-copy">
          <p className="eyebrow">{getProductTypeLabel(product)}</p>
          <h2 id="product-lightbox-title">{product.name}</h2>
          <p>{product.description}</p>
          <strong className="product-lightbox-price">{formatPrice(product.price)}</strong>

          {benefitTags.length > 0 && (
            <ul className="product-pill-list">
              {benefitTags.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}

          <BenefitIconList
            benefits={benefits}
            contextTitle={product.name}
            onOpenBenefit={onOpenBenefit}
            limit={4}
          />

          {isFamilyDish && (
            <div className="product-lightbox-block">
              <h3>Información nutricional</h3>
              {product.nutritionDescription && <p>{product.nutritionDescription}</p>}
              <ProductNutritionFacts product={product} />
            </div>
          )}

          <div className="product-lightbox-block">
            <h3>Receta resumida</h3>
            <p>{product.recipeSummary || product.description}</p>
          </div>

          {includedItems.length > 0 && (
            <div className="product-lightbox-block">
              <h3>Meal preps incluidos</h3>
              <div className="included-meals-grid">
                {includedItems.map((meal, mealIndex) => (
                  <button
                    key={meal.id || meal.name}
                    type="button"
                    onClick={(event) => onOpenMeal(product, meal, event)}
                  >
                    <HoverImage
                      primary={getMealImage(meal, mealIndex)}
                      secondary={getMealSecondaryImage(meal, mealIndex)}
                      alt={meal.name}
                    />
                    <span>{meal.tag}</span>
                    <strong>{meal.name}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="product-lightbox-actions">
            <button className="primary-button" type="button" onClick={() => onAdd(product)}>
              <Plus size={18} />
              {product.purchaseLabel || "Agregar al pedido"}
            </button>
            <a href={getProductPath(product)} onClick={(event) => onOpenDetail(product, event)}>
              Ver detalle
              <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function MealPrepQuickView({ meal, parentProduct, onAddParent, onClose, onOpenBenefit }) {
  const benefitTags = getBenefitTags(meal);
  const benefits = getProductBenefits(meal);

  return (
    <div className="overlay meal-lightbox" role="dialog" aria-modal="true" aria-labelledby="meal-lightbox-title">
      <section className="product-lightbox-panel meal-lightbox-panel">
        <button className="icon-button close" type="button" onClick={onClose} aria-label="Cerrar detalle del meal prep">
          <X size={22} />
        </button>
        <div className="product-lightbox-media">
          <img src={getMealImage(meal, 0)} alt={meal.name} />
        </div>
        <div className="product-lightbox-copy">
          <p className="eyebrow">{meal.tag || parentProduct?.name}</p>
          <h2 id="meal-lightbox-title">{meal.name}</h2>
          <p>{meal.description}</p>

          {benefitTags.length > 0 && (
            <ul className="product-pill-list">
              {benefitTags.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}

          <BenefitIconList
            benefits={benefits}
            contextTitle={meal.name}
            onOpenBenefit={onOpenBenefit}
            limit={4}
          />

          <div className="product-lightbox-block">
            <h3>Información nutricional</h3>
            {meal.nutritionDescription && <p>{meal.nutritionDescription}</p>}
            {meal.nutritionHighlights?.length > 0 && (
              <ul className="product-pill-list">
                {meal.nutritionHighlights.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
            <ProductNutritionFacts product={meal} />
          </div>

          {meal.ingredients?.length > 0 && (
            <div className="product-lightbox-block">
              <h3>Ingredientes</h3>
              <ul className="product-pill-list">
                {meal.ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}
              </ul>
            </div>
          )}

          {parentProduct && (
            <div className="product-lightbox-actions single-action">
              <button className="primary-button" type="button" onClick={() => onAddParent(parentProduct)}>
                <Plus size={18} />
                {parentProduct.purchaseLabel || "Agregar plan completo"}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProductDetailPage({ product, image, loading, onAdd, onBackToShop, onOpenBenefit, onOpenMeal }) {
  if (loading && !product) {
    return (
      <section className="product-detail-page product-detail-state">
        <Sprout size={34} />
        <h1>Cargando meal prep Fullness.</h1>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="product-detail-page product-detail-state">
        <Sprout size={34} />
        <h1>No encontramos este meal prep.</h1>
        <p>Puede haber cambiado de nombre o ya no estar activo.</p>
        <button className="primary-button" type="button" onClick={onBackToShop}>
          <ArrowLeft size={18} />
          Volver a la tienda
        </button>
      </section>
    );
  }

  const recipeSteps = product.recipeSteps?.length ? product.recipeSteps : [];
  const includedItems = product.includedItems || [];
  const benefits = getProductBenefits(product);
  const tags = getBenefitTags(product);
  const isFamilyDish = getProductType(product) === "family";

  return (
    <article className="product-detail-page">
      <button className="product-detail-back" type="button" onClick={onBackToShop}>
        <ArrowLeft size={18} />
        Volver a tienda
      </button>

      <section className="product-detail-hero">
        <div className="product-detail-media">
          <img src={image} alt={`Plato ${product.name}`} />
        </div>
        <div className="product-detail-copy">
          <p className="eyebrow">{product.tag}</p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          {tags.length > 0 && (
            <ul className="product-pill-list">
              {tags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
          )}
          <BenefitIconList
            benefits={benefits}
            contextTitle={product.name}
            onOpenBenefit={onOpenBenefit}
            limit={4}
          />
          <strong>{formatPrice(product.price)}</strong>
          <button className="primary-button" type="button" onClick={() => onAdd(product)}>
            <Plus size={18} />
            {product.purchaseLabel || "Agregar al pedido"}
          </button>
        </div>
      </section>

      <section className="product-detail-content" aria-label="Detalle del meal prep">
        <div className="product-detail-panel">
          <h2>Receta</h2>
          <p>{product.recipeSummary || product.description}</p>
          {recipeSteps.length > 0 && (
            <ol className="recipe-step-list">
              {recipeSteps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          )}
        </div>

        {isFamilyDish && (
          <div className="product-detail-panel">
            <h2>Información nutricional</h2>
            {product.nutritionDescription && <p>{product.nutritionDescription}</p>}
            <ProductNutritionFacts product={product} />
          </div>
        )}

        <div className="product-detail-panel">
          <h2>Ingredientes</h2>
          {product.ingredients?.length ? (
            <ul className="product-pill-list">
              {product.ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}
            </ul>
          ) : (
            <p>Ingredientes por confirmar.</p>
          )}
          {product.allergens?.length > 0 && (
            <p className="product-allergens">Alérgenos: {product.allergens.join(", ")}.</p>
          )}
        </div>

        {includedItems.length > 0 && (
          <div className="product-detail-panel product-detail-included">
            <h2>Meal preps</h2>
            <div className="included-meals-grid">
              {includedItems.map((meal, mealIndex) => (
                <button
                  key={meal.id || meal.name}
                  type="button"
                  onClick={(event) => onOpenMeal(product, meal, event)}
                >
                  <HoverImage
                    primary={getMealImage(meal, mealIndex)}
                    secondary={getMealSecondaryImage(meal, mealIndex)}
                    alt={meal.name}
                  />
                  <span>{meal.tag}</span>
                  <strong>{meal.name}</strong>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </article>
  );
}

function IntroScrollSequence() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const posterFrameRef = useRef(null);
  const finalFrameRef = useRef(null);
  const signalLayerRef = useRef(null);
  const logoButtonRef = useRef(null);
  const skipButtonRef = useRef(null);
  const progressRef = useRef(0);
  const playbackRef = useRef(null);
  const touchStartYRef = useRef(null);

  useEffect(() => {
    let animationFrame = 0;
    let autoStartTimeout = 0;
    let introIntentStarted = false;
    const playbackMs = 4000;
    const finalFrameHold = 0.16;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileIntroMedia = window.matchMedia(introMobileQuery);
    const scrollBehaviorSnapshot = {
      root: document.documentElement.style.scrollBehavior,
      body: document.body.style.scrollBehavior
    };

    const getMetrics = () => {
      if (!sectionRef.current) return;

      const sectionTop = sectionRef.current.offsetTop;
      const sectionHeight = Math.max(1, sectionRef.current.offsetHeight);
      const scrollDistance = Math.max(1, sectionHeight - window.innerHeight);
      const sectionEnd = sectionTop + sectionHeight;
      return { sectionTop, sectionHeight, scrollDistance, sectionEnd };
    };

    const clampProgress = (progress) => Math.min(1, Math.max(0, progress));
    const easeInOutCubic = (progress) =>
      progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const jumpToScroll = (top) => {
      window.scrollTo({ top, left: 0, behavior: "instant" });
    };

    const requestRenderFrame = () => {
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(renderFrame);
      }
    };

    const getVideoDuration = () => {
      const duration = videoRef.current?.duration;
      return Number.isFinite(duration) && duration > 0 ? duration : introScrollVideoDuration;
    };

    const setFinalFrameVisible = (visible) => {
      if (!finalFrameRef.current) return;

      finalFrameRef.current.style.opacity = visible ? "1" : "0";
    };

    const setPosterFrameVisible = (visible) => {
      if (!posterFrameRef.current) return;

      posterFrameRef.current.style.opacity = visible ? "1" : "0";
    };

    const setSignalsVisible = (visible) => {
      const signalLayer = signalLayerRef.current;
      if (!signalLayer) return;

      signalLayer.dataset.visible = visible ? "true" : "false";
      signalLayer.querySelectorAll("[data-signal]").forEach((signal) => {
        signal.classList.toggle("is-visible", visible);
      });
    };

    const resetSignals = () => {
      setSignalsVisible(false);
    };

    const setIntroConsumed = (consumed) => {
      document.documentElement.classList.toggle("intro-scroll-consumed", consumed);
      window.dispatchEvent(new CustomEvent("fullness:intro-state-change", { detail: { consumed } }));
    };

    const isIntroConsumed = () => document.documentElement.classList.contains("intro-scroll-consumed");

    const setScrollLock = (locked) => {
      document.documentElement.classList.toggle("intro-scroll-playing", locked);
      document.documentElement.style.scrollBehavior = locked ? "auto" : scrollBehaviorSnapshot.root;
      document.body.style.scrollBehavior = locked ? "auto" : scrollBehaviorSnapshot.body;
    };

    const markIntroIntent = () => {
      introIntentStarted = true;
      if (autoStartTimeout) {
        window.clearTimeout(autoStartTimeout);
        autoStartTimeout = 0;
      }
    };

    const syncHeaderVisibility = () => {
      if (isIntroConsumed()) {
        document.documentElement.classList.remove("intro-scroll-active");
        return;
      }

      const metrics = getMetrics();
      if (!metrics) {
        document.documentElement.classList.remove("intro-scroll-active");
        return;
      }

      const isInsideIntro =
        playbackRef.current ||
        (window.scrollY >= metrics.sectionTop - 2 &&
          window.scrollY < metrics.sectionEnd - 2);

      document.documentElement.classList.toggle("intro-scroll-active", Boolean(isInsideIntro));
    };

    const getProgressFromScroll = () => {
      if (isIntroConsumed()) return progressRef.current;

      const metrics = getMetrics();
      if (!metrics) return 0;

      return clampProgress((window.scrollY - metrics.sectionTop) / metrics.scrollDistance);
    };

    const isSequenceActive = () => {
      if (isIntroConsumed()) return false;

      const metrics = getMetrics();
      if (!metrics) return false;

      return window.scrollY >= metrics.sectionTop - 2 && window.scrollY <= metrics.sectionTop + metrics.scrollDistance + 2;
    };

    const setVideoProgress = (progress, scrubVideo = true) => {
      const nextProgress = clampProgress(progress);
      const video = videoRef.current;
      progressRef.current = nextProgress;

      setFinalFrameVisible(nextProgress >= 0.995);
      setPosterFrameVisible(nextProgress < 0.015);

      if (!video || video.readyState < 1 || !scrubVideo) return;

      const duration = getVideoDuration();
      const nextTime =
        nextProgress >= 0.995
          ? Math.max(0, duration - finalFrameHold)
          : Math.min(duration - finalFrameHold, Math.max(0, nextProgress * duration));

      if (Math.abs(video.currentTime - nextTime) > 0.02) {
        video.currentTime = nextTime;
      }

    };

    const syncMobileIntroMode = () => {
      const shouldSkipIntro = mobileIntroMedia.matches;
      document.documentElement.classList.toggle("intro-mobile-skip", shouldSkipIntro);

      if (!shouldSkipIntro) {
        syncHeaderVisibility();
        return;
      }

      playbackRef.current = null;
      setScrollLock(false);
      setIntroConsumed(true);
      resetSignals();
      setVideoProgress(1, false);
      setPosterFrameVisible(false);
      setFinalFrameVisible(false);

      if (!window.location.hash || window.location.hash === "#inicio" || window.location.hash === "#programa") {
        jumpToScroll(0);
      }

      syncHeaderVisibility();
    };

    const finishPlayback = () => {
      const playback = playbackRef.current;
      const metrics = getMetrics();
      const video = videoRef.current;
      if (!playback || !metrics) return;

      playbackRef.current = null;
      setScrollLock(false);
      setVideoProgress(playback.destination);
      resetSignals();

      if (video) {
        video.pause();
        video.playbackRate = 1;
        if (playback.destination >= 1 && video.readyState >= 1) {
          video.currentTime = Math.max(0, getVideoDuration() - finalFrameHold);
        }
      }

      if (playback.destination >= 1) {
        setIntroConsumed(true);
        jumpToScroll(0);
      } else {
        setIntroConsumed(false);
        jumpToScroll(metrics.sectionTop);
      }
      syncHeaderVisibility();
    };

    const startPlayback = (direction) => {
      if (mobileIntroMedia.matches) return false;
      if (!isSequenceActive()) return false;

      const start = clampProgress(progressRef.current || getProgressFromScroll());
      const destination = direction > 0 ? 1 : 0;
      const distance = Math.abs(destination - start);
      const metrics = getMetrics();
      const video = videoRef.current;

      if (!metrics) return false;

      if (distance < 0.012 || reducedMotion) {
        setVideoProgress(destination);
        setIntroConsumed(destination >= 1);
        jumpToScroll(destination >= 1 ? 0 : metrics.sectionTop);
        syncHeaderVisibility();
        return true;
      }

      const canUseNativePlayback = destination > start && video && video.readyState >= 1;
      const duration = getVideoDuration();
      const nativeStartTime = Math.min(duration - finalFrameHold, Math.max(0, start * duration));
      const nativeEndTime = Math.max(0, duration - finalFrameHold);
      const nativePlaybackRate = Math.max(
        0.25,
        Math.min(8, (nativeEndTime - nativeStartTime) / (playbackMs / 1000))
      );
      const playback = {
        start,
        destination,
        startedAt: performance.now(),
        duration: playbackMs,
        nativeVideo: Boolean(canUseNativePlayback),
        nativeEndTime,
        lockedScrollTop: Math.min(
          metrics.sectionTop + metrics.scrollDistance,
          Math.max(metrics.sectionTop, window.scrollY)
        )
      };

      playbackRef.current = playback;
      setScrollLock(true);
      setPosterFrameVisible(false);
      setFinalFrameVisible(false);
      setSignalsVisible(true);
      syncHeaderVisibility();
      requestRenderFrame();

      if (canUseNativePlayback) {
        video.pause();
        video.playbackRate = nativePlaybackRate;
        if (Math.abs(video.currentTime - nativeStartTime) > 0.04) {
          video.currentTime = nativeStartTime;
        }
        progressRef.current = start;
        video.play().catch(() => {
          if (playbackRef.current === playback) {
            playback.nativeVideo = false;
            video.pause();
            video.playbackRate = 1;
          }
        });
      }

      return true;
    };

    const skipIntro = () => {
      markIntroIntent();
      const video = videoRef.current;
      playbackRef.current = null;
      setScrollLock(false);
      setSignalsVisible(false);
      setVideoProgress(1, false);
      setPosterFrameVisible(false);
      setFinalFrameVisible(false);

      if (video) {
        video.pause();
        video.playbackRate = 1;
        if (video.readyState >= 1) {
          video.currentTime = Math.max(0, getVideoDuration() - finalFrameHold);
        }
      }

      setIntroConsumed(true);
      jumpToScroll(0);
      syncHeaderVisibility();
    };

    const handleWheel = (event) => {
      if (playbackRef.current) {
        event.preventDefault();
        return;
      }

      const direction = event.deltaY >= 0 ? 1 : -1;
      if (!isSequenceActive()) return;

      if (direction < 0) return;

      event.preventDefault();
      markIntroIntent();
      startPlayback(direction);
    };

    const handleTouchStart = (event) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event) => {
      if (playbackRef.current) {
        event.preventDefault();
        return;
      }

      if (touchStartYRef.current === null) return;

      const currentY = event.touches[0]?.clientY ?? touchStartYRef.current;
      const delta = touchStartYRef.current - currentY;
      if (Math.abs(delta) < 8) return;

      const direction = delta >= 0 ? 1 : -1;
      if (!isSequenceActive()) return;
      if (direction < 0) return;

      event.preventDefault();
      markIntroIntent();
      startPlayback(direction);
    };

    const handleKeyDown = (event) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }

      const downKeys = new Set(["ArrowDown", "PageDown", " ", "Spacebar", "End"]);
      const upKeys = new Set(["ArrowUp", "PageUp", "Home"]);
      const direction = downKeys.has(event.key) ? 1 : upKeys.has(event.key) ? -1 : 0;
      if (!direction) return;

      if (playbackRef.current) {
        event.preventDefault();
        return;
      }

      if (!isSequenceActive()) return;
      if (direction < 0) return;

      event.preventDefault();
      markIntroIntent();
      startPlayback(direction);
    };

    const handleScroll = () => {
      if (playbackRef.current) return;

      if (isSequenceActive()) {
        setVideoProgress(getProgressFromScroll());
      }

      syncHeaderVisibility();
    };

    const handleLoadedMetadata = () => {
      setVideoProgress(progressRef.current);
    };

    const handleIntroReset = () => {
      if (mobileIntroMedia.matches) {
        syncMobileIntroMode();
        return;
      }

      const video = videoRef.current;
      playbackRef.current = null;
      setScrollLock(false);
      setIntroConsumed(false);
      resetSignals();
      setVideoProgress(0);
      setPosterFrameVisible(true);
      setFinalFrameVisible(false);

      if (video) {
        video.pause();
        video.playbackRate = 1;
        if (video.readyState >= 1) {
          video.currentTime = 0;
        }
      }

      introIntentStarted = false;
      if (autoStartTimeout) {
        window.clearTimeout(autoStartTimeout);
      }
      autoStartTimeout = window.setTimeout(() => {
        if (!introIntentStarted && !isIntroConsumed() && isSequenceActive()) {
          markIntroIntent();
          startPlayback(1);
        }
      }, 2000);
      syncHeaderVisibility();
    };

    const handleStartClick = (event) => {
      event.preventDefault();
      markIntroIntent();
      startPlayback(1);
    };

    const handleSkipClick = (event) => {
      event.preventDefault();
      skipIntro();
    };

    const handleMobileIntroChange = () => {
      syncMobileIntroMode();
    };

    const renderFrame = () => {
      animationFrame = 0;
      const playback = playbackRef.current;

      if (playback) {
        const video = videoRef.current;
        const elapsed = performance.now() - playback.startedAt;
        const rawProgress = Math.min(1, elapsed / playback.duration);
        let shouldFinish = rawProgress >= 1;

        if (playback.nativeVideo && video && video.readyState >= 1) {
          const videoProgress = clampProgress(video.currentTime / getVideoDuration());
          progressRef.current = videoProgress;
          setFinalFrameVisible(videoProgress >= 0.995);
          if (video.currentTime >= playback.nativeEndTime - 0.035) {
            shouldFinish = true;
          }
        } else {
          const playbackProgress = playback.start + (playback.destination - playback.start) * easeInOutCubic(rawProgress);
          setVideoProgress(playbackProgress);
        }

        if (Math.abs(window.scrollY - playback.lockedScrollTop) > 1) {
          jumpToScroll(playback.lockedScrollTop);
        }

        if (shouldFinish) {
          finishPlayback();
          return;
        }

        requestRenderFrame();
      }
    };

    syncMobileIntroMode();
    if (!mobileIntroMedia.matches) {
      setVideoProgress(getProgressFromScroll());
      autoStartTimeout = window.setTimeout(() => {
        if (!introIntentStarted && !isIntroConsumed() && isSequenceActive()) {
          markIntroIntent();
          startPlayback(1);
        }
      }, 2000);
    }

    videoRef.current?.addEventListener("loadedmetadata", handleLoadedMetadata);
    if (mobileIntroMedia.addEventListener) {
      mobileIntroMedia.addEventListener("change", handleMobileIntroChange);
    } else {
      mobileIntroMedia.addListener(handleMobileIntroChange);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true, capture: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("resize", handleScroll);
    window.addEventListener("fullness:intro-reset", handleIntroReset);
    logoButtonRef.current?.addEventListener("click", handleStartClick);
    skipButtonRef.current?.addEventListener("click", handleSkipClick);

    return () => {
      if (autoStartTimeout) {
        window.clearTimeout(autoStartTimeout);
      }
      videoRef.current?.removeEventListener("loadedmetadata", handleLoadedMetadata);
      logoButtonRef.current?.removeEventListener("click", handleStartClick);
      skipButtonRef.current?.removeEventListener("click", handleSkipClick);
      if (mobileIntroMedia.removeEventListener) {
        mobileIntroMedia.removeEventListener("change", handleMobileIntroChange);
      } else {
        mobileIntroMedia.removeListener(handleMobileIntroChange);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleWheel, { capture: true });
      window.removeEventListener("touchstart", handleTouchStart, { capture: true });
      window.removeEventListener("touchmove", handleTouchMove, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("resize", handleScroll);
      window.removeEventListener("fullness:intro-reset", handleIntroReset);
      window.cancelAnimationFrame(animationFrame);
      setScrollLock(false);
      resetSignals();
      document.documentElement.classList.remove("intro-scroll-active", "intro-scroll-playing");
      if (!mobileIntroMedia.matches) {
        setIntroConsumed(false);
        document.documentElement.classList.remove("intro-scroll-consumed", "intro-mobile-skip");
      }
    };
  }, []);

  return (
    <section
      className="scroll-sequence scroll-sequence-intro"
      id="inicio"
      ref={sectionRef}
      style={{ "--scroll-sequence-final-bg": `url("${introScrollFinalFrameSrc}")` }}
      aria-label="Video introductorio Fullness Lab"
    >
      <div className="scroll-sequence-stage">
        <video
          ref={videoRef}
          className="scroll-sequence-frame"
          src={introScrollVideoSrc}
          poster={introScrollPosterSrc}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <img
          ref={posterFrameRef}
          className="scroll-sequence-frame scroll-sequence-poster-frame"
          src={introScrollPosterSrc}
          alt=""
          aria-hidden="true"
        />
        <img
          ref={finalFrameRef}
          className="scroll-sequence-frame scroll-sequence-final-frame"
          src={introScrollFinalFrameSrc}
          alt=""
          aria-hidden="true"
        />
        <button className="intro-start-logo" type="button" ref={logoButtonRef} aria-label="Iniciar animación Fullness Lab">
          <img src={logoVerticalSrc} alt="" aria-hidden="true" />
        </button>
        <button className="intro-skip-button" type="button" ref={skipButtonRef}>
          Saltar
        </button>
        <div className="scroll-sequence-signal-layer" ref={signalLayerRef} aria-hidden="true">
          {introTechSignals.map((signal) => (
            <div className={`intro-signal intro-signal-${signal.id}`} data-signal={signal.id} key={signal.id}>
              <span className="signal-title">{signal.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CommunityPage({
  activities,
  activitiesExpanded,
  memberMessage,
  onCommunityMemberSubmit,
  onToggleActivities
}) {
  const visibleActivities = activitiesExpanded ? activities : activities.slice(0, 3);

  return (
    <div className="community-page">
      <section
        className="community-page-hero"
        style={{ "--community-page-hero": `url("${communitySceneSrc}")` }}
      >
        <div className="community-page-hero-copy">
          <p className="eyebrow">Comunidad Fullness</p>
          <h1>Crecer en comunidad.</h1>
          <span className="community-page-rule" aria-hidden="true" />
          <p>
            Un espacio para aprender, compartir y construir bienestar a través de la alimentación consciente.
          </p>
          <a className="community-page-cta" href="#comunidad-inscripcion">
            Únete a la comunidad
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="community-page-features" aria-labelledby="community-features-title">
        <div className="community-section-title">
          <h2 id="community-features-title">¿Qué encontrarás?</h2>
          <span aria-hidden="true" />
        </div>
        <div className="community-feature-grid">
          {communityFeatures.map(({ title, text, icon: Icon }) => (
            <article key={title}>
              <Icon size={42} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="community-gallery" aria-label="Momentos Comunidad Fullness">
        {communityGalleryImages.map((image, index) => (
          <img src={image} alt={`Comunidad Fullness ${index + 1}`} key={image} />
        ))}
      </section>

      <section className="community-page-panel" id="comunidad-inscripcion">
        <div className="community-activities">
          <p className="eyebrow">Próximas actividades</p>
          <div className="community-activity-list">
            {visibleActivities.map((activity, index) => {
              const date = formatCommunityActivityDate(activity.date);

              return (
                <article className="community-activity" key={`${activity.date}-${activity.description}-${index}`}>
                  <time dateTime={activity.date}>
                    <strong>{date.day}</strong>
                    <span>{date.month}</span>
                  </time>
                  <p>{activity.description}</p>
                </article>
              );
            })}
          </div>
          {activities.length > 3 && (
            <button className="community-expand-button" type="button" onClick={onToggleActivities}>
              {activitiesExpanded ? "Ver menos actividades" : "Ver todas las actividades"}
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <form className="community-member-form" onSubmit={onCommunityMemberSubmit}>
          <p className="eyebrow">Membresía Fullness</p>
          <h2>Inscríbete como miembro.</h2>
          <ul>
            <li><CheckCircle2 size={18} /> Acceso a actividades exclusivas</li>
            <li><CheckCircle2 size={18} /> Contenido y recursos mensuales</li>
            <li><CheckCircle2 size={18} /> Beneficios especiales en Fullness Lab</li>
            <li><CheckCircle2 size={18} /> Prioridad en talleres y encuentros</li>
          </ul>
          <label>
            Nombre
            <input name="communityName" type="text" placeholder="Tu nombre" autoComplete="name" />
          </label>
          <label>
            Correo electrónico
            <input required name="communityEmail" type="email" placeholder="nombre@dominio.cl" autoComplete="email" />
          </label>
          <label className="community-consent">
            <input required name="communityConsent" type="checkbox" />
            <span>Acepto ser parte de la lista de distribución de Comunidad Fullness.</span>
          </label>
          {memberMessage && <p className="community-member-message" role="status">{memberMessage}</p>}
          <button className="primary-button" type="submit">
            Únete a la comunidad
            <ArrowUpRight size={17} aria-hidden="true" />
          </button>
        </form>
      </section>
    </div>
  );
}

const aboutPrinciples = [
  { icon: Leaf, label: "Desde ingredientes reales y locales" },
  { icon: CookingPot, label: "Preparaciones funcionales" },
  { icon: Heart, label: "Nutrición que te hace bien" },
  { icon: Users, label: "Comunidad que te acompaña" }
];

function AboutPage() {
  const story = [
    'Soy Cecilia Salas, chef, emprendedora y creadora de Fullness Lab.',
    'Mi camino en la gastronomía comenzó hace más de quince años, impartiendo clases de cocina para pequeños grupos en mi propia casa. Lo que nació como una instancia para compartir conocimientos y experiencias fue creciendo hasta convertirse en una empresa dedicada a la producción gastronómica y eventos, desarrollando proyectos para clientes particulares y para importantes marcas nacionales e internacionales.',
    'Durante años tuve el privilegio de participar en lanzamientos, experiencias de marca, celebraciones y eventos de gran escala. Fue una etapa de mucho aprendizaje, crecimiento y desarrollo profesional. Sin embargo, con el tiempo comenzó a surgir una pregunta que no lograba ignorar: ¿cuál era el verdadero propósito detrás de lo que hacía?',
    'Aunque disfrutaba profundamente la cocina, sentía que gran parte de la industria gastronómica y de eventos se había vuelto cada vez más rápida, comercial y repetitiva. Existía abundancia de estímulos, imágenes y experiencias efímeras, pero pocas veces un impacto real y duradero en la vida de las personas.',
    'Paralelamente, algo me acompañaba desde mis inicios en la cocina. Siempre tuve una visión profundamente romántica de los alimentos. Me fascinaba buscar ingredientes de calidad, comprender su origen y trabajarlos de una manera que potenciara al máximo su sabor y valor nutricional, interviniéndolos lo menos posible. Sin saberlo, ya estaba buscando una forma más consciente de cocinar.',
    'Fue mi propio proceso de búsqueda personal y sanación el que finalmente dio sentido a esa intuición. Comencé a profundizar en la relación entre alimentación, emociones, bienestar y propósito, descubriendo que la forma en que nos nutrimos tiene un impacto mucho más profundo de lo que solemos imaginar.',
    'Ese camino me llevó a ampliar mi formación y actualmente me encuentro cursando un Diplomado en Nutrición Emocional, integrando herramientas que complementan mi experiencia gastronómica y enriquecen la visión que hoy sustenta este proyecto.',
    'Así nació Fullness Lab.',
    'Fullness Lab surge de la necesidad de volver a lo esencial. De recuperar una forma de alimentarnos más consciente, más humana y más conectada con nuestro bienestar integral. Es el encuentro entre la gastronomía, la nutrición funcional, el desarrollo personal y la convicción de que la comida puede ser una poderosa herramienta de transformación.',
    'Creemos que alimentarse es mucho más que comer.',
    'Creemos en ingredientes reales, en procesos respetuosos, en el placer de una buena mesa y en la profunda conexión entre cuerpo, mente y emociones.',
    'Porque cuando aprendemos a nutrirnos desde la raíz, descubrimos que el bienestar no es algo que se busca afuera, sino algo que se construye desde dentro.',
    'Como es adentro, es afuera'
  ];

  return (
    <article className="about-v2" id="nosotros">
      <section className="about-v2__hero">
        <img className="about-v2__hero-photo" src={ceciliaStoryHeroSrc} alt="Cecilia Salas sosteniendo una preparación Fullness Lab" />
        <img className="about-v2__hero-botanical" src={aboutHeroBotanicalSrc} alt="" aria-hidden="true" />
        <div className="about-v2__hero-scrim" aria-hidden="true" />
        <div className="about-v2__hero-copy">
          <p className="about-v2__eyebrow">Nuestra historia</p>
          <h1>
            <span>Esto no comenzó</span>
            <span>con una marca.</span>
            <em>Comenzó con</em>
            <em>una pregunta.</em>
          </h1>
          <span className="about-v2__rule" aria-hidden="true"><i /></span>
          <p className="about-v2__hero-question">
            ¿Puede la forma en que nos alimentamos transformar también la manera en que nos sentimos?
          </p>
        </div>
      </section>

      <section className="about-v2__origin">
        <figure className="about-v2__origin-photo">
          <img src={aboutCookingSrc} alt="Cecilia cocinando durante una experiencia Fullness Lab" />
        </figure>
        <div className="about-v2__origin-copy">
          <p className="about-v2__eyebrow">El comienzo</p>
          <h2>Hace más de quince años comenzó mi camino en la gastronomía.</h2>
          <span className="about-v2__rule" aria-hidden="true"><i /></span>
          <p className="about-v2__origin-lead">{story[0]}</p>
          <p>{story[1]}</p>
        </div>
        <img className="about-v2__origin-beet" src={aboutBeetSrc} alt="" aria-hidden="true" />
      </section>

      <section className="about-v2__values" aria-label="Pilares de Fullness Lab">
        {[
          "Ingredientes reales y locales",
          "Preparaciones funcionales",
          "Nutrición que te hace bien",
          "Comunidad que te acompaña"
        ].map((label) => (
          <div className="about-v2__value" key={label}>
            <span aria-hidden="true">◇</span>
            <p>{label}</p>
          </div>
        ))}
      </section>

      <section className="about-v2__story">
        <header className="about-v2__story-heading">
          <p className="about-v2__eyebrow">El camino</p>
          <h2>Así nació <em>Fullness Lab.</em></h2>
          <span className="about-v2__rule" aria-hidden="true"><i /></span>
        </header>
        <div className="about-v2__story-copy">
          {story.slice(2).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </section>
    </article>
  );
}


function FaqAnswer({ blocks }) {
  return blocks.map((block, index) => {
    if (Array.isArray(block)) {
      return (
        <ul key={`list-${index}`}>
          {block.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }

    return <p key={`text-${index}`}>{block}</p>;
  });
}

function FaqPage({ onNavigateToShop }) {
  return (
    <article className="faq-page">
      <section className="faq-hero">
        <div className="faq-hero-copy">
          <p className="eyebrow">Ayuda Fullness Lab</p>
          <h1>Preguntas frecuentes <span>y políticas.</span></h1>
          <span className="section-rule" aria-hidden="true" />
          <p>
            Información esencial para comprar, conservar y disfrutar preparaciones Fullness con claridad,
            cuidado y confianza.
          </p>
          <nav className="faq-anchor-nav" aria-label="Secciones de preguntas frecuentes">
            {faqGroups.map((group) => (
              <a key={group.id} href={`#${group.id}`}>{group.navLabel}</a>
            ))}
          </nav>
        </div>
      </section>

      <div className="faq-groups">
        {faqGroups.map((group, groupIndex) => (
          <section className="faq-group" id={group.id} key={group.id}>
            <div className="faq-group-heading">
              <p className="eyebrow">{group.eyebrow}</p>
              <h2>{group.title}</h2>
              <span className="section-rule" aria-hidden="true" />
            </div>
            <div className="faq-items">
              {group.items.map((item, itemIndex) => (
                <details
                  className="faq-item"
                  key={item.question}
                  open={groupIndex === 0 && itemIndex < 2}
                >
                  <summary>{item.question}</summary>
                  <div className="faq-answer">
                    <FaqAnswer blocks={item.answer} />
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="faq-contact">
        <p className="eyebrow">¿Tienes dudas?</p>
        <h2>Te ayudamos a elegir la mejor alternativa para ti.</h2>
        <p>Escríbenos por WhatsApp o correo electrónico y resolvemos tus preguntas antes de comprar.</p>
        <div className="faq-contact-actions">
          <a href={whatsappUrl} target="_blank" rel="noreferrer">
            WhatsApp
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <a href="mailto:contacto@fullnesslab.com">
            contacto@fullnesslab.com
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <a href={shopPath} onClick={onNavigateToShop}>
            Ver planes
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
    </article>
  );
}

function App() {
  const appRef = useRef(null);
  const [cart, setCart] = useState(loadStoredCart);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [activeBackofficeModule, setActiveBackofficeModule] = useState("meal-preps");
  const [member, setMember] = useState(null);
  const [googleMessage, setGoogleMessage] = useState("");
  const [cartNotice, setCartNotice] = useState(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState("");
  const [headerHiddenForHero, setHeaderHiddenForHero] = useState(false);
  const [products, setProducts] = useState(localDevelopmentCatalog);
  const [productsLoading, setProductsLoading] = useState(isSupabaseConfigured);
  const [productPreviewSlug, setProductPreviewSlug] = useState("");
  const [mealPreview, setMealPreview] = useState(null);
  const [benefitPreview, setBenefitPreview] = useState(null);
  const [currentProductSlug, setCurrentProductSlug] = useState(() => getProductSlugFromPath());
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [checkoutForm, setCheckoutForm] = useState(loadStoredCheckoutForm);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(readCheckoutReturnState);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [initialAuthRedirect] = useState(() => readAuthRedirectState());
  const authRedirectHandledRef = useRef(false);
  const [passwordSetupOpen, setPasswordSetupOpen] = useState(false);
  const [passwordSetupMode, setPasswordSetupMode] = useState("recovery");
  const [passwordSetupSaving, setPasswordSetupSaving] = useState(false);
  const [passwordSetupMessage, setPasswordSetupMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [operationsExporting, setOperationsExporting] = useState("");
  const [operationsMessage, setOperationsMessage] = useState("");
  const [operationsError, setOperationsError] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySending, setRecoverySending] = useState(false);
  const [technicalTables, setTechnicalTables] = useState([]);
  const [technicalTablesLoading, setTechnicalTablesLoading] = useState(false);
  const [technicalExporting, setTechnicalExporting] = useState("");
  const [technicalMessage, setTechnicalMessage] = useState("");
  const [technicalError, setTechnicalError] = useState("");
  const [r2Prefix, setR2Prefix] = useState("");
  const [r2Objects, setR2Objects] = useState([]);
  const [r2Cursor, setR2Cursor] = useState("");
  const [r2Loading, setR2Loading] = useState(false);
  const [r2ObjectLoading, setR2ObjectLoading] = useState("");
  const [r2Preview, setR2Preview] = useState(null);
  const r2PreviewUrlRef = useRef("");
  const [dnsLookup, setDnsLookup] = useState(null);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [adminItems, setAdminItems] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [shopSettings, setShopSettings] = useState(createDefaultShopSettings);
  const [shopSettingsForm, setShopSettingsForm] = useState(() => createShopSettingsForm());
  const [shopSettingsSaving, setShopSettingsSaving] = useState(false);
  const [shopHeroUploading, setShopHeroUploading] = useState(false);
  const [shopSettingsMessage, setShopSettingsMessage] = useState("");
  const [shopSettingsError, setShopSettingsError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminError, setAdminError] = useState("");
  const [backofficeFeedback, setBackofficeFeedback] = useState(null);
  const [menuForm, setMenuForm] = useState(() => createMenuForm(10));
  const [mealPrepSearch, setMealPrepSearch] = useState("");
  const [mealPrepEditorOpen, setMealPrepEditorOpen] = useState(false);
  const [mealPrepEditorTab, setMealPrepEditorTab] = useState("general");
  const [includedMealEditorIndex, setIncludedMealEditorIndex] = useState(null);
  const [includedMealEditorTab, setIncludedMealEditorTab] = useState("details");
  const [familyProductSearch, setFamilyProductSearch] = useState("");
  const [familyProductEditorOpen, setFamilyProductEditorOpen] = useState(false);
  const [familyProductEditorTab, setFamilyProductEditorTab] = useState("general");
  const [menuFormHasUnsavedChanges, setMenuFormHasUnsavedChanges] = useState(false);
  const [menuFormDraftKey, setMenuFormDraftKey] = useState(() => createMenuFormDraftKey());
  const [menuFormDrafts, setMenuFormDrafts] = useState([]);
  const [menuFormDraftStatus, setMenuFormDraftStatus] = useState("idle");
  const menuFormDraftRestoredRef = useRef(false);
  const menuFormDraftSyncTimerRef = useRef(null);
  const menuFormDraftSyncVersionRef = useRef(0);
  const [mealLibrary, setMealLibrary] = useState([]);
  const [mealLibraryForm, setMealLibraryForm] = useState(createMealLibraryForm);
  const [mealLibraryLoading, setMealLibraryLoading] = useState(false);
  const [mealLibrarySaving, setMealLibrarySaving] = useState(false);
  const [mealLibraryPhotoUploading, setMealLibraryPhotoUploading] = useState(false);
  const [mealLibraryMessage, setMealLibraryMessage] = useState("");
  const [mealLibraryError, setMealLibraryError] = useState("");
  const [selectedLibraryMealId, setSelectedLibraryMealId] = useState("");
  const [includedMealSavingIndex, setIncludedMealSavingIndex] = useState(null);
  const [benefitDefinitions, setBenefitDefinitions] = useState([]);
  const [tagDefinitions, setTagDefinitions] = useState([]);
  const [catalogParametersLoading, setCatalogParametersLoading] = useState(false);
  const [catalogParametersSaving, setCatalogParametersSaving] = useState(false);
  const [catalogParametersMessage, setCatalogParametersMessage] = useState("");
  const [catalogParametersError, setCatalogParametersError] = useState("");
  const [subscriptionCustomers, setSubscriptionCustomers] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState({ frequency: "all", query: "", status: "active" });
  const [communityActivities, setCommunityActivities] = useState(loadStoredCommunityActivities);
  const [communityActivityForm, setCommunityActivityForm] = useState({ date: "", description: "" });
  const [activitiesExpanded, setActivitiesExpanded] = useState(false);
  const [communityMemberMessage, setCommunityMemberMessage] = useState("");
  const [subscriptionPopupSettings, setSubscriptionPopupSettings] = useState(loadStoredSubscriptionPopupSettings);
  const [subscriptionPopupForm, setSubscriptionPopupForm] = useState(loadStoredSubscriptionPopupSettings);
  const [subscriptionPopupOpen, setSubscriptionPopupOpen] = useState(false);
  const [subscriptionPopupMode, setSubscriptionPopupMode] = useState("intro");
  const [subscriptionPopupDismissed, setSubscriptionPopupDismissed] = useState(false);
  const [subscriptionPopupMessage, setSubscriptionPopupMessage] = useState("");
  const [subscriptionPopupSubmitting, setSubscriptionPopupSubmitting] = useState(false);
  const [subscriptionPopupUploading, setSubscriptionPopupUploading] = useState(false);
  const [subscriptionPopupAdminMessage, setSubscriptionPopupAdminMessage] = useState("");
  const [subscriptionPopupAdminError, setSubscriptionPopupAdminError] = useState("");
  const subscriptionPopupTimerRef = useRef(null);
  const subscriptionPopupOpenedRef = useRef(false);
  const [accessMode, setAccessMode] = useState(() => {
    if (typeof window === "undefined") return "admin";

    try {
      return window.localStorage.getItem(adminAccessModeStorageKey) === "user" ? "user" : "admin";
    } catch {
      return "admin";
    }
  });
  const normalizedAuthEmail = authUser?.email?.toLowerCase() || "";
  const canChooseAccessMode = isAdmin && normalizedAuthEmail === adminPersonaEmail;
  const activeIsAdmin = isAdmin && (!canChooseAccessMode || accessMode === "admin");
  const isBackofficeOperator = String(authUser?.app_metadata?.backoffice_role || "").toLowerCase() === "operator";
  const hasBackofficeAccess = activeIsAdmin || isBackofficeOperator;

  useLayoutEffect(() => {
    const sectionHashes = new Set(["#programa", "#plato", "#filosofia", "#proposito", "#calentar", "#comunidad", "#contacto"]);
    const productSlug = getProductSlugFromPath();

    if (productSlug) {
      document.documentElement.classList.add("intro-scroll-consumed");
      setHeaderHiddenForHero(false);
      return;
    }

    if (window.location.hash === "#oferta") {
      window.history.replaceState(null, "", shopPath);
      setCurrentPath(shopPath);
      document.documentElement.classList.add("intro-scroll-consumed");
      setHeaderHiddenForHero(false);
      return;
    }

    if (
      window.location.pathname === "/comunidad" ||
      window.location.pathname === shopPath ||
      window.location.pathname === faqPath ||
      window.location.pathname === aboutPath
    ) {
      document.documentElement.classList.add("intro-scroll-consumed");
      setHeaderHiddenForHero(false);
      return;
    }

    if (window.location.hash === "#filosofia") {
      window.history.replaceState(null, "", "#proposito");
    }

    if (isMobileIntroViewport()) {
      document.documentElement.classList.add("intro-scroll-consumed", "intro-mobile-skip");
      setHeaderHiddenForHero(false);
      return;
    }

    document.documentElement.classList.remove("intro-mobile-skip");

    if (sectionHashes.has(window.location.hash)) {
      document.documentElement.classList.add("intro-scroll-consumed");
      setHeaderHiddenForHero(false);
    }
  }, []);

  useEffect(() => {
    if (!canChooseAccessMode) return;

    try {
      window.localStorage.setItem(adminAccessModeStorageKey, accessMode);
    } catch {
      // Local access-mode preference is best-effort.
    }
  }, [accessMode, canChooseAccessMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem("fullness_checkout_form", JSON.stringify(checkoutForm));
    } catch {
      // Local checkout persistence is best-effort.
    }
  }, [checkoutForm]);

  useEffect(() => {
    try {
      window.localStorage.setItem(checkoutCartStorageKey, JSON.stringify(cart));
    } catch {
      // Local cart persistence is best-effort.
    }
  }, [cart]);

  useEffect(() => {
    const checkoutReturn = readCheckoutReturnState();
    if (!checkoutReturn?.paymentId) return undefined;

    const controller = new AbortController();
    const params = new URLSearchParams({
      payment_id: checkoutReturn.paymentId,
      order_id: checkoutReturn.orderId
    });

    async function confirmPayment() {
      try {
        const response = await fetch(`/api/mercadopago/payments?${params.toString()}`, {
          headers: {Accept: "application/json"},
          signal: controller.signal
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error?.message || "No pudimos confirmar el pago.");
        }

        const approved = payload.data?.status === "approved";
        setCheckoutResult({
          ...checkoutReturn,
          ...payload.data,
          syncing: false,
          message: approved
            ? "Recibimos tu pago y registramos los datos de entrega indicados."
            : "Mercado Pago dejo la operacion pendiente. Te avisaremos cuando cambie de estado."
        });

        if (approved) {
          setCart([]);
          window.localStorage.removeItem("fullness_pending_order");
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        setCheckoutResult({
          ...checkoutReturn,
          syncing: false,
          status: "pending",
          message: error.message || "No pudimos confirmar el pago todavia."
        });
      }
    }

    confirmPayment();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!subscriptionPopupSettings.enabled) return undefined;
    if (subscriptionPopupDismissed || subscriptionPopupOpenedRef.current) return undefined;
    if (currentPath !== "/" || currentProductSlug) return undefined;
    if (accountOpen || cartOpen || adminOpen || menuOpen || passwordSetupOpen) return undefined;

    const clearPopupTimer = () => {
      if (!subscriptionPopupTimerRef.current) return;
      window.clearTimeout(subscriptionPopupTimerRef.current);
      subscriptionPopupTimerRef.current = null;
    };

    const schedulePopup = () => {
      const hero = document.querySelector("#programa");
      if (!hero) return;

      const heroRect = hero.getBoundingClientRect();
      const userMovedPastHero = window.scrollY > 120 && heroRect.bottom <= window.innerHeight * 0.9;

      if (!userMovedPastHero || subscriptionPopupTimerRef.current || subscriptionPopupOpenedRef.current) return;

      subscriptionPopupTimerRef.current = window.setTimeout(() => {
        subscriptionPopupTimerRef.current = null;
        subscriptionPopupOpenedRef.current = true;
        setSubscriptionPopupMode("intro");
        setSubscriptionPopupMessage("");
        setSubscriptionPopupOpen(true);
      }, 2000);
    };

    window.addEventListener("scroll", schedulePopup, { passive: true });
    schedulePopup();

    return () => {
      window.removeEventListener("scroll", schedulePopup);
      clearPopupTimer();
    };
  }, [
    accountOpen,
    adminOpen,
    cartOpen,
    currentPath,
    currentProductSlug,
    menuOpen,
    passwordSetupOpen,
    subscriptionPopupDismissed,
    subscriptionPopupSettings.enabled
  ]);

  const navigateToSection = (href, { smooth = true, replace = false } = {}) => {
    const resolvedHref = href === "#filosofia" ? "#proposito" : href;
    if (resolvedHref === "#oferta") {
      openShopPage(null, { replace });
      return true;
    }

    const scrollToTarget = (target) => {
      const sectionTop = target.getBoundingClientRect().top + window.pageYOffset;
      const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;

      if (resolvedHref === "#programa") return 0;
      if (resolvedHref === "#plato") return Math.max(0, sectionTop - headerHeight);

      return Math.max(0, sectionTop - headerHeight - 14);
    };

    if (
      currentProductSlug ||
      window.location.pathname === "/comunidad" ||
      window.location.pathname === shopPath ||
      window.location.pathname === faqPath ||
      window.location.pathname === aboutPath
    ) {
      setCurrentProductSlug("");
      setProductPreviewSlug("");
      setMealPreview(null);
      setCurrentPath("/");
      document.documentElement.classList.add("intro-scroll-consumed");
      window.dispatchEvent(new CustomEvent("fullness:intro-state-change", { detail: { consumed: true } }));
      setHeaderHiddenForHero(false);

      const nextUrl = `/${resolvedHref}`;
      if (replace) {
        window.history.replaceState(null, "", nextUrl);
      } else {
        window.history.pushState(null, "", nextUrl);
      }

      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          const target = document.querySelector(resolvedHref);
          if (!target) return;
          window.scrollTo({ top: scrollToTarget(target), left: 0, behavior: smooth ? "smooth" : "instant" });
        }, 0);
      });

      return true;
    }

    const target = document.querySelector(resolvedHref);
    if (!target) return false;

    const getTargetTop = () => {
      return scrollToTarget(target);
    };

    document.documentElement.classList.add("intro-scroll-consumed");
    if (isMobileIntroViewport()) {
      document.documentElement.classList.add("intro-mobile-skip");
    }
    window.dispatchEvent(new CustomEvent("fullness:intro-state-change", { detail: { consumed: true } }));
    setHeaderHiddenForHero(false);

    if (window.location.hash !== resolvedHref) {
      if (replace) {
        window.history.replaceState(null, "", resolvedHref);
      } else {
        window.history.pushState(null, "", resolvedHref);
      }
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: getTargetTop(), left: 0, behavior: smooth ? "smooth" : "instant" });

      if (!smooth) {
        window.setTimeout(() => {
          window.scrollTo({ top: getTargetTop(), left: 0, behavior: "instant" });
        }, 80);
        window.setTimeout(() => {
          window.scrollTo({ top: getTargetTop(), left: 0, behavior: "instant" });
        }, 300);
      }
    });

    return true;
  };

  function openCommunityPage(event) {
    event?.preventDefault();
    setCurrentProductSlug("");
    setProductPreviewSlug("");
    setMealPreview(null);
    setMenuOpen(false);
    setCartOpen(false);
    setAccountOpen(false);
    document.documentElement.classList.add("intro-scroll-consumed");
    window.dispatchEvent(new CustomEvent("fullness:intro-state-change", { detail: { consumed: true } }));
    setHeaderHiddenForHero(false);

    if (window.location.pathname !== "/comunidad") {
      window.history.pushState(null, "", "/comunidad");
    }

    setCurrentPath("/comunidad");
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  function openAboutPage(event) {
    event?.preventDefault();
    setCurrentProductSlug("");
    setProductPreviewSlug("");
    setMealPreview(null);
    setMenuOpen(false);
    setCartOpen(false);
    setAccountOpen(false);
    document.documentElement.classList.add("intro-scroll-consumed");
    if (isMobileIntroViewport()) {
      document.documentElement.classList.add("intro-mobile-skip");
    }
    window.dispatchEvent(new CustomEvent("fullness:intro-state-change", { detail: { consumed: true } }));
    setHeaderHiddenForHero(false);

    if (window.location.pathname !== aboutPath) {
      window.history.pushState(null, "", aboutPath);
    }

    setCurrentPath(aboutPath);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  function openFaqPage(event, hash = "") {
    event?.preventDefault();
    setCurrentProductSlug("");
    setProductPreviewSlug("");
    setMealPreview(null);
    setMenuOpen(false);
    setCartOpen(false);
    setAccountOpen(false);
    document.documentElement.classList.add("intro-scroll-consumed");
    if (isMobileIntroViewport()) {
      document.documentElement.classList.add("intro-mobile-skip");
    }
    window.dispatchEvent(new CustomEvent("fullness:intro-state-change", { detail: { consumed: true } }));
    setHeaderHiddenForHero(false);

    const nextUrl = `${faqPath}${hash}`;
    if (window.location.pathname !== faqPath || window.location.hash !== hash) {
      window.history.pushState(null, "", nextUrl);
    }

    setCurrentPath(faqPath);
    window.requestAnimationFrame(() => {
      if (!hash) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        return;
      }

      const target = document.querySelector(hash);
      const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
      if (!target) return;

      window.scrollTo({
        top: Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 14),
        left: 0,
        behavior: "instant"
      });
    });
  }

  function openShopPage(event, { replace = false } = {}) {
    event?.preventDefault();
    setCurrentProductSlug("");
    setProductPreviewSlug("");
    setMealPreview(null);
    setMenuOpen(false);
    setCartOpen(false);
    setAccountOpen(false);
    document.documentElement.classList.add("intro-scroll-consumed");
    if (isMobileIntroViewport()) {
      document.documentElement.classList.add("intro-mobile-skip");
    }
    window.dispatchEvent(new CustomEvent("fullness:intro-state-change", { detail: { consumed: true } }));
    setHeaderHiddenForHero(false);

    if (window.location.pathname !== shopPath || window.location.hash) {
      if (replace) {
        window.history.replaceState(null, "", shopPath);
      } else {
        window.history.pushState(null, "", shopPath);
      }
    }

    setCurrentPath(shopPath);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  const memberButtonLabel = authUser
    ? getMemberLabel(authUser).split(/[ @]/)[0]
    : member
      ? member.name.split(" ")[0]
      : "Acceso miembros";

  function buildMenuFormDraft(form = menuForm, draftKey = menuFormDraftKey) {
    return normalizeMenuFormDraft({
      draftKey,
      title: form.name?.trim() || "Meal prep sin título",
      form,
      updatedAt: new Date().toISOString()
    });
  }

  function persistMenuFormDraftLocally(form = menuForm, draftKey = menuFormDraftKey) {
    if (!isMeaningfulMenuFormDraft(form)) return null;

    const draft = buildMenuFormDraft(form, draftKey);
    const nextDrafts = mergeMenuFormDrafts(
      getStoredMenuFormDrafts().filter((item) => item.draftKey !== draft.draftKey),
      [draft]
    );

    storeMenuFormDrafts(nextDrafts);
    setMenuFormDrafts(nextDrafts);
    return draft;
  }

  async function syncMenuFormDraft(draft, version) {
    if (!draft || !authUser?.id || !activeIsAdmin) {
      setMenuFormDraftStatus(draft ? "local" : "idle");
      return;
    }

    const result = await saveBackofficeDraft({
      ownerId: authUser.id,
      scope: menuFormDraftScope,
      draftKey: draft.draftKey,
      title: draft.title,
      form: draft.form
    });

    if (menuFormDraftSyncVersionRef.current !== version) return;

    if (result.error || !result.configured) {
      setMenuFormDraftStatus("local");
      return;
    }

    const nextDrafts = mergeMenuFormDrafts(
      getStoredMenuFormDrafts().filter((item) => item.draftKey !== result.data.draftKey),
      [result.data]
    );
    storeMenuFormDrafts(nextDrafts);
    setMenuFormDrafts(nextDrafts);
    setMenuFormDraftStatus("synced");
  }

  function protectCurrentMenuFormDraft() {
    if (!menuFormHasUnsavedChanges) return;

    const draft = persistMenuFormDraftLocally();
    if (!draft || !authUser?.id || !activeIsAdmin) return;

    const version = ++menuFormDraftSyncVersionRef.current;
    void syncMenuFormDraft(draft, version);
  }

  function clearMenuFormDraft(draftKey = menuFormDraftKey) {
    setMenuFormHasUnsavedChanges(false);
    menuFormDraftSyncVersionRef.current += 1;
    window.clearTimeout(menuFormDraftSyncTimerRef.current);

    const nextDrafts = getStoredMenuFormDrafts().filter((draft) => draft.draftKey !== draftKey);
    storeMenuFormDrafts(nextDrafts);
    setMenuFormDrafts(nextDrafts);
    setMenuFormDraftStatus("idle");

    if (activeIsAdmin) {
      void deleteBackofficeDraft({ draftKey, scope: menuFormDraftScope });
    }
  }

  function restoreMenuFormDraft(draft, { announce = true } = {}) {
    if (!draft) return;

    setMenuForm(draft.form);
    setMenuFormDraftKey(draft.draftKey);
    setMenuFormHasUnsavedChanges(true);
    setMenuFormDraftStatus("synced");
    setAdminError("");
    if (announce) setAdminMessage(`Borrador recuperado: ${draft.title}.`);
  }

  function discardCurrentMenuFormDraft() {
    if (!menuFormHasUnsavedChanges || !window.confirm("¿Descartar este borrador? Esta acción no se puede deshacer.")) return;

    const original = menuForm.id ? adminItems.find((item) => item.id === menuForm.id) : null;
    const discardedProductType = menuForm.productType;
    clearMenuFormDraft();
    if (original) {
      setMenuForm(menuItemToForm(original));
      setMenuFormDraftKey(createMenuFormDraftKey(original.id));
    } else if (discardedProductType === "family") {
      resetFamilyProductForm({ force: true });
    } else {
      resetMenuForm({ force: true });
    }
    setAdminMessage("Borrador descartado.");
    setAdminError("");
  }

  function markMenuFormChanged() {
    setMenuFormHasUnsavedChanges(true);
    setAdminError("");
    setAdminMessage("");
  }

  function selectMenuItemForEditing(item) {
    protectCurrentMenuFormDraft();
    setMenuForm(menuItemToForm(item));
    setMenuFormDraftKey(createMenuFormDraftKey(item.id));
    setMenuFormHasUnsavedChanges(false);
    setMenuFormDraftStatus("idle");
    setAdminError("");
    setAdminMessage("");
  }

  function openMealPrepForEditing(item) {
    selectMenuItemForEditing(item);
    setMealPrepEditorTab("general");
    setIncludedMealEditorIndex(null);
    setIncludedMealEditorTab("details");
    setMealPrepEditorOpen(true);
  }

  function startNewMealPrep() {
    resetMenuForm();
    setMealPrepEditorTab("general");
    setIncludedMealEditorIndex(null);
    setIncludedMealEditorTab("details");
    setMealPrepEditorOpen(true);
  }

  function closeMealPrepEditor() {
    protectCurrentMenuFormDraft();
    setIncludedMealEditorIndex(null);
    setIncludedMealEditorTab("details");
    setMealPrepEditorOpen(false);
  }

  function openIncludedMealEditor(index, tab = "details") {
    setIncludedMealEditorIndex(index);
    setIncludedMealEditorTab(tab);
  }

  function closeIncludedMealEditor() {
    setIncludedMealEditorIndex(null);
    setIncludedMealEditorTab("details");
  }

  function resetMenuForm({ force = false } = {}) {
    if (!force) protectCurrentMenuFormDraft();

    const nextOrder =
      adminItems.reduce((max, item) => Math.max(max, Number(item.displayOrder || 0)), 0) + 10;
    setMenuForm(createMenuForm(nextOrder));
    setMenuFormDraftKey(createMenuFormDraftKey());
    setMenuFormHasUnsavedChanges(false);
    setMenuFormDraftStatus("idle");
    setAdminError("");
    setAdminMessage("");
    return true;
  }

  function resetFamilyProductForm({ force = false } = {}) {
    if (!force) protectCurrentMenuFormDraft();

    const nextOrder =
      adminItems.reduce((max, item) => Math.max(max, Number(item.displayOrder || 0)), 0) + 10;
    const nextForm = createMenuForm(nextOrder);
    setMenuForm({
      ...nextForm,
      productType: "family",
      planFrequency: "",
      sku: createAutomaticSku("PF"),
      includedItems: []
    });
    setMenuFormDraftKey(createMenuFormDraftKey());
    setMenuFormHasUnsavedChanges(false);
    setMenuFormDraftStatus("idle");
    setAdminError("");
    setAdminMessage("");
    return true;
  }

  function openFamilyProductForEditing(item) {
    selectMenuItemForEditing(item);
    setFamilyProductEditorTab("general");
    setFamilyProductEditorOpen(true);
  }

  function startNewFamilyProduct() {
    resetFamilyProductForm();
    setFamilyProductEditorTab("general");
    setFamilyProductEditorOpen(true);
  }

  function closeFamilyProductEditor() {
    protectCurrentMenuFormDraft();
    setFamilyProductEditorOpen(false);
  }

  function openBackofficeModule(moduleId) {
    if (activeBackofficeModule !== moduleId) {
      protectCurrentMenuFormDraft();
    }
    setMealPrepEditorOpen(false);
    setIncludedMealEditorIndex(null);
    setFamilyProductEditorOpen(false);
    if (moduleId === "meal-preps" && menuForm.productType !== "plan") {
      resetMenuForm();
    }
    if (moduleId === "family-products" && menuForm.productType !== "family") {
      resetFamilyProductForm();
    }
    setActiveBackofficeModule(moduleId);
  }

  async function refreshPublicProducts() {
    const result = await listActiveMenuItems();
    if (result.error || !result.configured) return;

    setProducts(result.configured ? result.data : localDevelopmentCatalog);
  }

  async function refreshAdminItems({ silent = false } = {}) {
    if (!activeIsAdmin) return;

    if (!silent) {
      setAdminLoading(true);
      setAdminError("");
      setAdminMessage("");
    }

    const result = await listAdminMenuItems();

    if (result.error) {
      setAdminError(getSupabaseErrorMessage(result.error, "No pudimos cargar los meal preps."));
    } else {
      setAdminItems(result.data);
      if (!menuForm.id && result.data.length > 0) {
        const nextOrder =
          result.data.reduce((max, item) => Math.max(max, Number(item.displayOrder || 0)), 0) + 10;
        setMenuForm((current) => ({
          ...current,
          displayOrder: current.displayOrder || String(nextOrder)
        }));
      }
    }

    if (!silent) setAdminLoading(false);
  }

  async function refreshMealLibrary({ silent = false } = {}) {
    if (!activeIsAdmin) return;

    if (!silent) {
      setMealLibraryLoading(true);
      setMealLibraryError("");
    }

    const result = await listMealLibraryItems();
    if (result.error) {
      setMealLibraryError(getSupabaseErrorMessage(result.error, "No pudimos cargar la biblioteca de platos."));
    } else {
      setMealLibrary(result.data);
    }

    if (!silent) setMealLibraryLoading(false);
  }

  async function refreshCatalogParameters({ silent = false } = {}) {
    if (!silent) {
      setCatalogParametersLoading(true);
      setCatalogParametersError("");
    }

    const result = await listCatalogParameters({ includeInactive: activeIsAdmin });
    if (result.error && activeIsAdmin) {
      setCatalogParametersError(getSupabaseErrorMessage(result.error, "No pudimos cargar beneficios y tags."));
    }

    if (result.data) {
      setBenefitDefinitions(result.data.benefits || []);
      setTagDefinitions(result.data.tags || []);
    }

    if (!silent) setCatalogParametersLoading(false);
  }

  async function submitBenefitDefinition(form) {
    if (!activeIsAdmin) return null;

    setCatalogParametersSaving(true);
    setCatalogParametersError("");
    setCatalogParametersMessage("");
    const result = await saveBenefitDefinition(form);

    if (result.error || !result.configured) {
      setCatalogParametersError(getSupabaseErrorMessage(result.error, "No pudimos guardar el beneficio."));
      setCatalogParametersSaving(false);
      return null;
    }

    setCatalogParametersMessage(`Beneficio “${result.data.name}” guardado.`);
    await refreshCatalogParameters({ silent: true });
    await refreshPublicProducts();
    setCatalogParametersSaving(false);
    return result.data;
  }

  async function removeBenefitDefinition(item) {
    if (!window.confirm(`¿Eliminar el beneficio “${item.name}”? Los platos conservarán la copia publicada hasta que se editen.`)) return;

    setCatalogParametersSaving(true);
    setCatalogParametersError("");
    setCatalogParametersMessage("");
    const result = await deleteBenefitDefinition(item.id);

    if (result.error || !result.configured) {
      setCatalogParametersError(getSupabaseErrorMessage(result.error, "No pudimos eliminar el beneficio."));
    } else {
      setCatalogParametersMessage("Beneficio eliminado.");
      await refreshCatalogParameters({ silent: true });
    }

    setCatalogParametersSaving(false);
  }

  async function submitTagDefinition(form) {
    if (!activeIsAdmin) return null;

    setCatalogParametersSaving(true);
    setCatalogParametersError("");
    setCatalogParametersMessage("");
    const result = await saveTagDefinition(form);

    if (result.error || !result.configured) {
      setCatalogParametersError(getSupabaseErrorMessage(result.error, "No pudimos guardar el tag."));
      setCatalogParametersSaving(false);
      return null;
    }

    setCatalogParametersMessage(`Tag “${result.data.name}” guardado.`);
    await refreshCatalogParameters({ silent: true });
    await refreshPublicProducts();
    setCatalogParametersSaving(false);
    return result.data;
  }

  function findExistingCatalogDefinition(definitions, name) {
    const normalizedName = String(name || "").trim().toLocaleLowerCase("es");
    const normalizedSlug = slugifyMenuName(name);

    return definitions.find((definition) => (
      definition.slug === normalizedSlug
      || String(definition.name || "").trim().toLocaleLowerCase("es") === normalizedName
    ));
  }

  async function createQuickBenefitDefinition(form) {
    if (!activeIsAdmin) {
      return { data: null, error: "Necesitas una sesion de administracion para crear beneficios." };
    }

    const existing = findExistingCatalogDefinition(benefitDefinitions, form.name);
    if (existing) return { data: existing, error: "", existing: true };

    const result = await saveBenefitDefinition(form);
    if (result.error || !result.configured || !result.data) {
      return {
        data: null,
        error: getSupabaseErrorMessage(result.error, "No pudimos crear el beneficio.")
      };
    }

    await Promise.all([
      refreshCatalogParameters({ silent: true }),
      refreshPublicProducts()
    ]);

    return { data: result.data, error: "", existing: false };
  }

  async function createQuickTagDefinition(form) {
    if (!activeIsAdmin) {
      return { data: null, error: "Necesitas una sesion de administracion para crear tags." };
    }

    const existing = findExistingCatalogDefinition(tagDefinitions, form.name);
    if (existing) return { data: existing, error: "", existing: true };

    const result = await saveTagDefinition(form);
    if (result.error || !result.configured || !result.data) {
      return {
        data: null,
        error: getSupabaseErrorMessage(result.error, "No pudimos crear el tag.")
      };
    }

    await Promise.all([
      refreshCatalogParameters({ silent: true }),
      refreshPublicProducts()
    ]);

    return { data: result.data, error: "", existing: false };
  }

  async function removeTagDefinition(item) {
    if (!window.confirm(`¿Eliminar el tag “${item.name}”? Los platos conservarán la copia publicada hasta que se editen.`)) return;

    setCatalogParametersSaving(true);
    setCatalogParametersError("");
    setCatalogParametersMessage("");
    const result = await deleteTagDefinition(item.id);

    if (result.error || !result.configured) {
      setCatalogParametersError(getSupabaseErrorMessage(result.error, "No pudimos eliminar el tag."));
    } else {
      setCatalogParametersMessage("Tag eliminado.");
      await refreshCatalogParameters({ silent: true });
    }

    setCatalogParametersSaving(false);
  }

  async function uploadBenefitIcon(file) {
    setCatalogParametersError("");
    setCatalogParametersMessage("");
    const result = await uploadMenuPhoto(file, "images/benefits");

    if (result.error || !result.configured) {
      setCatalogParametersError(getSupabaseErrorMessage(result.error, "No pudimos subir el icono."));
      return null;
    }

    setCatalogParametersMessage("Icono cargado en R2.");
    return result.data;
  }

  async function refreshSubscriptionCustomers() {
    if (!activeIsAdmin) return;

    setSubscriptionsLoading(true);
    setSubscriptionsError("");
    const result = await listAdminCustomerSubscriptions();

    if (result.error) {
      setSubscriptionsError(getSupabaseErrorMessage(result.error, "No pudimos cargar las suscripciones."));
    } else {
      setSubscriptionCustomers(result.data);
    }

    setSubscriptionsLoading(false);
  }

  function updateMealLibraryForm(event) {
    const { checked, name, type, value } = event.target;
    setMealLibraryForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function resetMealLibraryForm() {
    setMealLibraryForm(createMealLibraryForm());
    setMealLibraryError("");
    setMealLibraryMessage("");
  }

  async function submitMealLibraryItem(event) {
    event.preventDefault();
    setMealLibrarySaving(true);
    setMealLibraryError("");
    setMealLibraryMessage("");
    setBackofficeFeedback({
      status: "saving",
      title: mealLibraryForm.id ? "Guardando cambios" : "Creando el plato",
      message: "Estamos guardando la ficha y sus imágenes."
    });

    let nutritionFacts = {};
    try {
      nutritionFacts = parseJsonObject(mealLibraryForm.nutritionFacts);
    } catch (error) {
      setMealLibrarySaving(false);
      setMealLibraryError(error.message);
      setBackofficeFeedback({
        status: "error",
        title: "No pudimos guardar el plato",
        message: "Revisa la información nutricional e inténtalo nuevamente."
      });
      return;
    }

    const result = await saveMealLibraryItem({
      ...mealLibraryForm,
      nutritionFacts,
      tags: tagDefinitions.filter((tag) => mealLibraryForm.tagIds?.includes(tag.id))
    });
    if (result.error || !result.configured) {
      const message = getSupabaseErrorMessage(result.error, "No pudimos guardar el plato.");
      setMealLibraryError(message);
      setBackofficeFeedback({
        status: "error",
        title: "No pudimos guardar el plato",
        message
      });
    } else {
      setMealLibraryForm(mealLibraryItemToForm(result.data));
      setMealLibraryMessage("Plato guardado en biblioteca.");
      await refreshMealLibrary({ silent: true });
      setBackofficeFeedback({
        status: "success",
        title: "Plato guardado",
        message: `“${result.data.name}” ya está disponible para reutilizarlo en otros planes.`
      });
    }

    setMealLibrarySaving(false);
  }

  async function removeMealLibraryItem(item) {
    if (!window.confirm(`¿Eliminar "${item.name}" de la biblioteca?`)) return;

    setMealLibrarySaving(true);
    setMealLibraryError("");
    setMealLibraryMessage("");
    const result = await deleteMealLibraryItem(item.id);

    if (result.error || !result.configured) {
      setMealLibraryError(getSupabaseErrorMessage(result.error, "No pudimos eliminar el plato."));
    } else {
      if (mealLibraryForm.id === item.id) resetMealLibraryForm();
      setMealLibraryMessage("Plato eliminado de biblioteca.");
      await refreshMealLibrary({ silent: true });
    }

    setMealLibrarySaving(false);
  }

  async function saveAllIncludedMealsToLibrary() {
    if (!activeIsAdmin) {
      setAdminError("Tu cuenta no tiene acceso de administración.");
      setBackofficeFeedback({
        status: "error",
        title: "No pudimos guardar los platos",
        message: "Esta cuenta no tiene permisos para administrar la biblioteca."
      });
      return;
    }

    const pendingIndexes = menuForm.includedItems
      .map((meal, index) => ({ meal, index }))
      .filter(({ meal }) => !meal.libraryMealId && [meal.name, meal.tag, meal.description, meal.photoUrl, meal.ingredients, meal.allergens].some((value) => String(value || "").trim()))
      .map(({ index }) => index);

    if (pendingIndexes.length === 0) {
      setAdminMessage("Todos los platos con contenido ya están guardados en Biblioteca.");
      setBackofficeFeedback({
        status: "success",
        title: "Los platos ya están guardados",
        message: "No hay platos nuevos pendientes de guardar para reutilizarlos."
      });
      return;
    }

    setIncludedMealSavingIndex(-1);
    setAdminError("");
    setAdminMessage("");
    setBackofficeFeedback({
      status: "saving",
      title: "Guardando los platos",
      message: "Estamos preparando cada ficha para que puedas reutilizarla en otros planes."
    });

    try {
      const nextItems = menuForm.includedItems.map((item) => ({ ...item }));
      const saved = [];

      for (const index of pendingIndexes) {
        const meal = nextItems[index];
        if (!meal.name.trim()) {
          throw new Error(`Plato ${index + 1}: agrega un nombre antes de guardarlo en la Biblioteca.`);
        }

        const nutritionFacts = parseJsonObject(meal.nutritionFacts);
        const result = await saveMealLibraryItem({
          name: meal.name,
          tag: meal.tag,
          description: meal.description,
          photoUrl: meal.photoUrl,
          photoStoragePath: meal.photoStoragePath,
          secondaryPhotoUrl: meal.secondaryPhotoUrl,
          secondaryPhotoStoragePath: meal.secondaryPhotoStoragePath,
          benefitTags: meal.benefitTags,
          benefitAssignments: meal.benefitAssignments,
          tagIds: meal.tagIds,
          tags: tagDefinitions.filter((tag) => meal.tagIds?.includes(tag.id)),
          ingredients: meal.ingredients,
          nutritionDescription: meal.nutritionDescription,
          nutritionHighlights: meal.nutritionHighlights,
          nutritionFacts,
          allergens: meal.allergens,
          isActive: true
        });

        if (result.error || !result.configured) {
          throw new Error(getSupabaseErrorMessage(result.error, `No pudimos guardar el plato ${index + 1} en la Biblioteca.`));
        }

        nextItems[index] = { ...meal, libraryMealId: result.data.id, sku: result.data.sku };
        saved.push(result.data);
      }

      markMenuFormChanged();
      setMenuForm((current) => ({ ...current, includedItems: nextItems }));
      setMealLibrary((current) => [...current.filter((item) => !saved.some((savedItem) => savedItem.id === item.id)), ...saved]
        .sort((left, right) => left.name.localeCompare(right.name, "es")));
      setAdminMessage(`${saved.length} plato${saved.length === 1 ? "" : "s"} guardado${saved.length === 1 ? "" : "s"} en Biblioteca.`);
      setBackofficeFeedback({
        status: "success",
        title: saved.length === 1 ? "Plato guardado" : "Platos guardados",
        message: `${saved.length} plato${saved.length === 1 ? "" : "s"} ya ${saved.length === 1 ? "está disponible" : "están disponibles"} para reutilizar.`
      });
    } catch (error) {
      const message = error.message || "No pudimos guardar los platos en Biblioteca.";
      setAdminError(message);
      setBackofficeFeedback({
        status: "error",
        title: "No pudimos guardar los platos",
        message
      });
    } finally {
      setIncludedMealSavingIndex(null);
    }
  }

  async function saveIncludedMealToLibrary(index) {
    if (!activeIsAdmin) {
      setAdminError("Tu cuenta no tiene acceso de administración.");
      setBackofficeFeedback({
        status: "error",
        title: "No pudimos guardar el plato",
        message: "Esta cuenta no tiene permisos para administrar la biblioteca."
      });
      return;
    }

    const meal = menuForm.includedItems[index];
    if (!meal?.name.trim()) {
      const message = `Agrega un nombre al plato ${index + 1} antes de guardarlo.`;
      setAdminError(message);
      setBackofficeFeedback({
        status: "error",
        title: "Falta el nombre del plato",
        message
      });
      return;
    }

    let nutritionFacts = {};
    try {
      nutritionFacts = parseJsonObject(meal.nutritionFacts);
    } catch (error) {
      setAdminError(`Plato ${index + 1}: ${error.message}`);
      setBackofficeFeedback({
        status: "error",
        title: "Revisa la información nutricional",
        message: `No pudimos guardar “${meal.name}”.`
      });
      return;
    }

    setIncludedMealSavingIndex(index);
    setAdminError("");
    setAdminMessage("");
    setBackofficeFeedback({
      status: "saving",
      title: "Guardando el plato",
      message: `Estamos preparando la ficha de “${meal.name}”.`
    });

    const result = await saveMealLibraryItem({
      name: meal.name,
      tag: meal.tag,
      description: meal.description,
      photoUrl: meal.photoUrl,
      photoStoragePath: meal.photoStoragePath,
      secondaryPhotoUrl: meal.secondaryPhotoUrl,
      secondaryPhotoStoragePath: meal.secondaryPhotoStoragePath,
      benefitTags: meal.benefitTags,
      benefitAssignments: meal.benefitAssignments,
      tagIds: meal.tagIds,
      tags: tagDefinitions.filter((tag) => meal.tagIds?.includes(tag.id)),
      ingredients: meal.ingredients,
      nutritionDescription: meal.nutritionDescription,
      nutritionHighlights: meal.nutritionHighlights,
      nutritionFacts,
      allergens: meal.allergens,
      isActive: true
    });

    if (result.error || !result.configured) {
      const message = getSupabaseErrorMessage(result.error, `No pudimos guardar el plato ${index + 1} en la biblioteca.`);
      setAdminError(message);
      setBackofficeFeedback({
        status: "error",
        title: "No pudimos guardar el plato",
        message
      });
    } else {
      markMenuFormChanged();
      setMenuForm((current) => ({
        ...current,
        includedItems: current.includedItems.map((item, itemIndex) =>
          itemIndex === index ? { ...item, libraryMealId: result.data.id, sku: result.data.sku } : item
        )
      }));
      setMealLibrary((current) => [...current.filter((item) => item.id !== result.data.id), result.data]
        .sort((left, right) => left.name.localeCompare(right.name, "es")));
      setAdminMessage(`“${result.data.name}” quedó guardado en Biblioteca de platos.`);
      setBackofficeFeedback({
        status: "success",
        title: "Plato guardado",
        message: `“${result.data.name}” ya está disponible para reutilizarlo en otros planes.`
      });
    }

    setIncludedMealSavingIndex(null);
  }

  async function handleMealLibraryPhotoChange(event, target = "primary") {
    const file = event.target.files?.[0];
    if (!file) return;

    setMealLibraryPhotoUploading(true);
    setMealLibraryError("");
    const result = await uploadMenuPhoto(file);

    if (result.error || !result.configured) {
      setMealLibraryError(getSupabaseErrorMessage(result.error, "No pudimos subir la foto."));
    } else {
      setMealLibraryForm((current) => target === "secondary"
        ? { ...current, secondaryPhotoUrl: result.data.photoUrl, secondaryPhotoStoragePath: result.data.photoStoragePath }
        : { ...current, photoUrl: result.data.photoUrl, photoStoragePath: result.data.photoStoragePath });
      setMealLibraryMessage("Foto cargada.");
    }

    setMealLibraryPhotoUploading(false);
    event.target.value = "";
  }

  function addSelectedLibraryMealToPlan() {
    const libraryItem = mealLibrary.find((item) => item.id === selectedLibraryMealId);
    if (!libraryItem) return;

    const hasEmptyDraft =
      menuForm.includedItems.length === 1 &&
      !menuForm.includedItems[0].name &&
      !menuForm.includedItems[0].description;
    const nextIndex = hasEmptyDraft ? 0 : menuForm.includedItems.length;
    markMenuFormChanged();
    setMenuForm((current) => {
      const draft = createIncludedMealForm(current.includedItems.length);
      const includedMeal = {
        ...draft,
        ...mealLibraryItemToForm(libraryItem),
        id: draft.id,
        libraryMealId: libraryItem.id,
        editorMode: "advanced"
      };
      return {
        ...current,
        includedItems: hasEmptyDraft ? [includedMeal] : [...current.includedItems, includedMeal]
      };
    });
    setSelectedLibraryMealId("");
    openIncludedMealEditor(nextIndex);
  }

  function loadSelectedLibraryMealIntoFamily() {
    const libraryItem = mealLibrary.find((item) => item.id === selectedLibraryMealId);
    if (!libraryItem) return;

    const dishForm = mealLibraryItemToForm(libraryItem);
    markMenuFormChanged();
    setMenuForm((current) => ({
      ...current,
      name: dishForm.name,
      slug: current.slug || slugifyMenuName(dishForm.name),
      description: dishForm.description,
      tag: dishForm.tag,
      photoUrl: dishForm.photoUrl,
      photoStoragePath: dishForm.photoStoragePath,
      secondaryPhotoUrl: dishForm.secondaryPhotoUrl,
      secondaryPhotoStoragePath: dishForm.secondaryPhotoStoragePath,
      libraryMealId: libraryItem.id,
      benefitAssignments: dishForm.benefitAssignments,
      tagIds: dishForm.tagIds,
      benefitTags: dishForm.benefitTags,
      ingredients: dishForm.ingredients,
      nutritionDescription: dishForm.nutritionDescription,
      nutritionHighlights: dishForm.nutritionHighlights,
      nutritionFacts: dishForm.nutritionFacts,
      allergens: dishForm.allergens
    }));
    setSelectedLibraryMealId("");
    setAdminMessage(`Plato “${libraryItem.name}” cargado como producto familiar.`);
  }

  async function getBackofficeAccessToken() {
    if (!isSupabaseConfigured) throw new Error("El backoffice no está disponible en este entorno.");

    const supabase = await getSupabaseClient();
    const {data, error} = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    if (error || !token) {
      throw error || new Error("Tu sesión venció. Vuelve a iniciar sesión.");
    }

    return token;
  }

  async function downloadBackofficeCsv(type, label) {
    setOperationsExporting(type);
    setOperationsError("");
    setOperationsMessage("");

    try {
      const token = await getBackofficeAccessToken();
      const response = await fetch(`/api/backoffice/exports?type=${encodeURIComponent(type)}`, {
        headers: {authorization: `Bearer ${token}`}
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "No pudimos preparar el CSV.");
      }

      const file = await response.blob();
      const objectUrl = window.URL.createObjectURL(file);
      const link = document.createElement("a");
      const disposition = response.headers.get("content-disposition") || "";
      const fileName = disposition.match(/filename=\"?([^\";]+)\"?/i)?.[1] || `fullness-${type}.csv`;

      link.href = objectUrl;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
      setOperationsMessage(`${label} descargado.`);
    } catch (error) {
      setOperationsError(getSupabaseErrorMessage(error, "No pudimos descargar el CSV."));
    } finally {
      setOperationsExporting("");
    }
  }

  async function sendAssistedPasswordRecovery(event) {
    event.preventDefault();
    const email = recoveryEmail.trim().toLowerCase();

    if (!email) {
      setOperationsError("Ingresa el correo de la persona que necesita ayuda.");
      return;
    }

    setRecoverySending(true);
    setOperationsError("");
    setOperationsMessage("");

    try {
      const token = await getBackofficeAccessToken();
      const response = await fetch("/api/backoffice/password-recovery", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({email})
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "No pudimos solicitar la recuperación.");
      }

      setRecoveryEmail("");
      setOperationsMessage(payload.data?.message || "Solicitamos el correo de recuperación.");
    } catch (error) {
      setOperationsError(getSupabaseErrorMessage(error, "No pudimos enviar la recuperación."));
    } finally {
      setRecoverySending(false);
    }
  }

  async function loadTechnicalTables() {
    if (!activeIsAdmin) return;

    setTechnicalTablesLoading(true);
    setTechnicalError("");

    try {
      const token = await getBackofficeAccessToken();
      const response = await fetch("/api/backoffice/data-export", {
        headers: {authorization: `Bearer ${token}`}
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(payload.error || "No pudimos cargar las tablas.");

      setTechnicalTables(payload.data?.tables || []);
    } catch (error) {
      setTechnicalError(getSupabaseErrorMessage(error, "No pudimos cargar las tablas."));
    } finally {
      setTechnicalTablesLoading(false);
    }
  }

  async function downloadTechnicalTable(table) {
    setTechnicalExporting(table.key);
    setTechnicalError("");
    setTechnicalMessage("");

    try {
      const token = await getBackofficeAccessToken();
      const response = await fetch(`/api/backoffice/data-export?table=${encodeURIComponent(table.key)}`, {
        headers: {authorization: `Bearer ${token}`}
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "No pudimos preparar el respaldo.");
      }

      downloadBlob(await response.blob(), response.headers.get("content-disposition"), `fullness-${table.key}.csv`);
      setTechnicalMessage(`${table.label} descargada.`);
      await loadTechnicalTables();
    } catch (error) {
      setTechnicalError(getSupabaseErrorMessage(error, "No pudimos descargar la tabla."));
    } finally {
      setTechnicalExporting("");
    }
  }

  async function loadR2Objects({ append = false } = {}) {
    setR2Loading(true);
    setTechnicalError("");
    setTechnicalMessage("");

    try {
      const token = await getBackofficeAccessToken();
      const search = new URLSearchParams();
      if (r2Prefix) search.set("prefix", r2Prefix);
      if (append && r2Cursor) search.set("cursor", r2Cursor);
      const response = await fetch(`/api/backoffice/r2-assets?${search.toString()}`, {
        headers: {authorization: `Bearer ${token}`}
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(payload.error || "No pudimos listar los archivos de R2.");

      const nextObjects = payload.data?.objects || [];
      setR2Objects((current) => append ? [...current, ...nextObjects] : nextObjects);
      setR2Cursor(payload.data?.isTruncated ? payload.data?.cursor || "" : "");
    } catch (error) {
      setTechnicalError(getSupabaseErrorMessage(error, "No pudimos listar los archivos de R2."));
    } finally {
      setR2Loading(false);
    }
  }

  function clearR2Preview() {
    if (r2PreviewUrlRef.current) {
      window.URL.revokeObjectURL(r2PreviewUrlRef.current);
      r2PreviewUrlRef.current = "";
    }
    setR2Preview(null);
  }

  function handleR2PrefixChange(event) {
    setR2Prefix(event.target.value);
    setR2Objects([]);
    setR2Cursor("");
    clearR2Preview();
  }

  async function fetchR2Asset(asset, { download = false } = {}) {
    setR2ObjectLoading(asset.key);
    setTechnicalError("");
    setTechnicalMessage("");

    try {
      const token = await getBackofficeAccessToken();
      const search = new URLSearchParams({key: asset.key});
      if (download) search.set("download", "1");
      const response = await fetch(`/api/backoffice/r2-assets?${search.toString()}`, {
        headers: {authorization: `Bearer ${token}`}
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "No pudimos obtener el archivo de R2.");
      }

      const file = await response.blob();

      if (download) {
        downloadBlob(file, response.headers.get("content-disposition"), asset.key.split("/").pop() || "archivo");
        setTechnicalMessage("Archivo descargado.");
        return;
      }

      clearR2Preview();
      const objectUrl = window.URL.createObjectURL(file);
      r2PreviewUrlRef.current = objectUrl;
      setR2Preview({
        key: asset.key,
        kind: r2AssetKind(asset.key),
        url: objectUrl
      });
    } catch (error) {
      setTechnicalError(getSupabaseErrorMessage(error, "No pudimos obtener el archivo de R2."));
    } finally {
      setR2ObjectLoading("");
    }
  }

  async function loadDnsRecords() {
    setDnsLoading(true);
    setTechnicalError("");
    setTechnicalMessage("");

    try {
      const token = await getBackofficeAccessToken();
      const response = await fetch("/api/backoffice/dns", {
        headers: {authorization: `Bearer ${token}`}
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(payload.error || "No pudimos consultar los registros DNS.");

      setDnsLookup(payload.data || null);
    } catch (error) {
      setTechnicalError(getSupabaseErrorMessage(error, "No pudimos consultar los registros DNS."));
    } finally {
      setDnsLoading(false);
    }
  }

  async function signOut() {
    if (!isSupabaseConfigured) return;

    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
    clearStoredAuthFlowType();
    setMember(null);
    setIsAdmin(false);
    setAdminOpen(false);
    setAccountOpen(false);
    setGoogleMessage("");
  }

  function openBackoffice() {
    if (!hasBackofficeAccess) {
      setAdminOpen(false);
      setAccountOpen(true);
      return;
    }

    if (!activeIsAdmin) setActiveBackofficeModule("operations");
    setAccountOpen(false);
    setMenuOpen(false);
    setAdminOpen(true);
    if (window.location.hash !== "#backoffice") {
      window.history.replaceState(null, "", "#backoffice");
    }
  }

  function closeBackoffice() {
    setBackofficeFeedback(null);
    setMealPrepEditorOpen(false);
    setIncludedMealEditorIndex(null);
    setFamilyProductEditorOpen(false);
    setAdminOpen(false);
    if (window.location.hash === "#backoffice") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }

  useEffect(() => {
    try {
      window.localStorage.setItem("fullness_community_activities", JSON.stringify(communityActivities));
    } catch {
      // Demo persistence is best-effort.
    }
  }, [communityActivities]);

  function updateCommunityActivityForm(event) {
    const { name, value } = event.target;

    setCommunityActivityForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function addCommunityActivity(event) {
    event.preventDefault();

    const date = communityActivityForm.date.trim();
    const description = communityActivityForm.description.trim();
    if (!date || !description) return;

    setCommunityActivities((items) =>
      [...items, { date, description }].sort((left, right) => left.date.localeCompare(right.date))
    );
    setCommunityActivityForm({ date: "", description: "" });
  }

  function removeCommunityActivity(indexToRemove) {
    setCommunityActivities((items) => items.filter((_item, index) => index !== indexToRemove));
  }

  useEffect(() => {
    let ignore = false;

    async function loadProducts() {
      const result = await listActiveMenuItems();
      if (ignore) return;

      if (result.error || !result.configured) {
        setProductsLoading(false);
        return;
      }

      setProducts(result.configured ? result.data : localDevelopmentCatalog);
      setProductsLoading(false);
    }

    loadProducts();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    void refreshCatalogParameters();
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadShopSettings() {
      const result = await getShopSettings();
      if (ignore || result.error || !result.configured || !result.data) return;

      const merged = mergeShopSettings(result.data);
      setShopSettings(merged);
      setShopSettingsForm(createShopSettingsForm(merged));
    }

    loadShopSettings();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let subscription;
    let ignore = false;

    const openPasswordSetup = (type) => {
      setPasswordSetupMode(type === "invite" ? "invite" : "recovery");
      setPasswordSetupMessage("");
      setPasswordSetupOpen(true);
      setAccountOpen(false);
    };

    const getActiveAuthRedirect = () => {
      const current = readAuthRedirectState();
      return current.hasAuthParams || current.type ? current : initialAuthRedirect;
    };

    const finishAuthRedirect = () => {
      authRedirectHandledRef.current = true;
      clearStoredAuthFlowType();
      cleanAuthRedirectUrl();
    };

    const openAuthNotice = (message) => {
      setPasswordSetupOpen(false);
      setGoogleMessage(message);
      setAccountOpen(true);
    };

    const handleAuthRedirect = (session, event = "") => {
      if (authRedirectHandledRef.current) return;

      const redirect = getActiveAuthRedirect();
      const isPasswordRecoveryEvent = event === "PASSWORD_RECOVERY";

      if (redirect.error) {
        openAuthNotice("El enlace no se pudo validar. Solicita uno nuevo e inténtalo otra vez.");
        finishAuthRedirect();
        return;
      }

      if (!redirect.hasAuthParams && !isPasswordRecoveryEvent) return;

      const flowType =
        isPasswordRecoveryEvent ? "recovery" : redirect.type || getStoredAuthFlowType() || "signup";

      if (session?.user && (flowType === "recovery" || flowType === "invite")) {
        openPasswordSetup(flowType);
        finishAuthRedirect();
        return;
      }

      if (flowType === "signup") {
        openAuthNotice(
          session?.user
            ? "Correo confirmado. Tu sesión quedó iniciada."
            : "Correo confirmado. Ya puedes iniciar sesión."
        );
        finishAuthRedirect();
        return;
      }

      if (session?.user && redirect.hasAuthParams) {
        openAuthNotice("Tu sesión quedó iniciada.");
        finishAuthRedirect();
      }
    };

    async function loadSession() {
      if (!isSupabaseConfigured) {
        setAuthLoading(false);
        return;
      }

      const supabase = await getSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (!ignore) {
        setAuthUser(data.session?.user || null);
        handleAuthRedirect(data.session);
        setAuthLoading(false);
      }

      const listener = supabase.auth.onAuthStateChange((event, session) => {
        setAuthUser(session?.user || null);
        handleAuthRedirect(session, event);
      });

      subscription = listener.data.subscription;
    }

    loadSession();

    return () => {
      ignore = true;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadAdminProfile() {
      if (!authUser || !isSupabaseConfigured) {
        setIsAdmin(false);
        return;
      }

      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", authUser.id)
        .maybeSingle();

      if (ignore) return;

      setIsAdmin(Boolean(data?.is_admin && !error));
    }

    loadAdminProfile();

    return () => {
      ignore = true;
    };
  }, [authUser]);

  useEffect(() => {
    const syncBackofficeHash = () => {
      if (window.location.hash !== "#backoffice") return;

      if (hasBackofficeAccess) {
        setAdminOpen(true);
        setAccountOpen(false);
      } else if (!authLoading) {
        setAccountOpen(true);
      }
    };

    syncBackofficeHash();
    window.addEventListener("hashchange", syncBackofficeHash);

    return () => {
      window.removeEventListener("hashchange", syncBackofficeHash);
    };
  }, [hasBackofficeAccess, authLoading]);

  useEffect(() => {
    if (isBackofficeOperator && !activeIsAdmin && activeBackofficeModule !== "operations") {
      setActiveBackofficeModule("operations");
    }
  }, [activeBackofficeModule, activeIsAdmin, isBackofficeOperator]);

  useEffect(() => {
    if (adminOpen && activeIsAdmin) {
      refreshAdminItems();
      refreshMealLibrary({ silent: true });
      refreshCatalogParameters({ silent: true });
      refreshSubscriptionCustomers();
    }
  }, [activeIsAdmin, adminOpen]);

  useEffect(() => {
    if (!activeIsAdmin || menuFormDraftRestoredRef.current) return undefined;

    let ignore = false;
    menuFormDraftRestoredRef.current = true;

    async function restoreNewestDraft() {
      const localDrafts = getStoredMenuFormDrafts();
      let mergedDrafts = localDrafts;

      if (authUser?.id) {
        const result = await listBackofficeDrafts({ ownerId: authUser.id, scope: menuFormDraftScope });
        if (!ignore && result.configured && !result.error) {
          mergedDrafts = mergeMenuFormDrafts(localDrafts, result.data);
          storeMenuFormDrafts(mergedDrafts);
        }
      }

      if (ignore) return;
      setMenuFormDrafts(mergedDrafts);
      setMenuFormDraftStatus("idle");
    }

    void restoreNewestDraft();

    return () => {
      ignore = true;
    };
  }, [activeIsAdmin, authUser?.id]);

  useEffect(() => {
    if (!menuFormHasUnsavedChanges || typeof window === "undefined") return undefined;

    const draft = persistMenuFormDraftLocally();
    if (!draft) return undefined;

    if (!authUser?.id || !activeIsAdmin) {
      setMenuFormDraftStatus("local");
      return undefined;
    }

    const version = ++menuFormDraftSyncVersionRef.current;
    setMenuFormDraftStatus("saving");
    window.clearTimeout(menuFormDraftSyncTimerRef.current);
    menuFormDraftSyncTimerRef.current = window.setTimeout(() => {
      void syncMenuFormDraft(draft, version);
    }, 600);

    return () => window.clearTimeout(menuFormDraftSyncTimerRef.current);
  }, [menuForm, menuFormDraftKey, menuFormHasUnsavedChanges, activeIsAdmin, authUser?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const persistBeforeExit = () => {
      if (menuFormHasUnsavedChanges) persistMenuFormDraftLocally();
    };

    window.addEventListener("pagehide", persistBeforeExit);
    document.addEventListener("visibilitychange", persistBeforeExit);

    return () => {
      window.removeEventListener("pagehide", persistBeforeExit);
      document.removeEventListener("visibilitychange", persistBeforeExit);
    };
  }, [menuForm, menuFormDraftKey, menuFormHasUnsavedChanges]);

  useEffect(() => () => {
    window.clearTimeout(menuFormDraftSyncTimerRef.current);
  }, []);

  useEffect(() => {
    if (adminOpen && activeIsAdmin && activeBackofficeModule === "site-tools") {
      loadTechnicalTables();
    }
  }, [activeBackofficeModule, activeIsAdmin, adminOpen]);

  useEffect(() => () => {
    if (r2PreviewUrlRef.current) {
      window.URL.revokeObjectURL(r2PreviewUrlRef.current);
    }
  }, []);

  useEffect(() => {
    if (currentPath !== "/" || currentProductSlug) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const revealGroups = [
      {
        items: ".food-editorial .editorial-shop-photo",
        trigger: ".food-editorial"
      },
      {
        items: [
          ".philosophy > div:not(.philosophy-visual) > .eyebrow",
          ".philosophy > div:not(.philosophy-visual) > h2",
          ".philosophy > div:not(.philosophy-visual) > .philosophy-lede",
          ".philosophy-list article"
        ].join(", "),
        trigger: ".philosophy"
      },
      {
        items: ".membership > *",
        trigger: ".membership"
      }
    ];
    const revealElements = [];
    const revealByTrigger = new Map();
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const elements = revealByTrigger.get(entry.target) || [];
        elements.forEach((element) => element.classList.add("is-visible"));
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.08
    });

    revealGroups.forEach(({ items, trigger }) => {
      const triggerElement = appRef.current?.querySelector(trigger);
      const elements = Array.from(appRef.current?.querySelectorAll(items) || []);
      if (!triggerElement || elements.length === 0) return;

      elements.forEach((element, index) => {
        element.classList.add("reveal-on-scroll");
        const customDelay = Number(element.dataset.revealDelay);
        element.style.transitionDelay = `${Number.isFinite(customDelay) ? customDelay : Math.min(index * 80, 320)}ms`;
        revealElements.push(element);
      });
      revealByTrigger.set(triggerElement, elements);
      const triggerRect = triggerElement.getBoundingClientRect();
      const isAlreadyVisible = triggerRect.top < window.innerHeight * 0.92 && triggerRect.bottom > window.innerHeight * 0.08;

      if (isAlreadyVisible) {
        window.requestAnimationFrame(() => {
          elements.forEach((element) => element.classList.add("is-visible"));
        });
        return;
      }

      revealObserver.observe(triggerElement);
    });

    const foodMotion = gsap.matchMedia();
    const ctx = gsap.context(() => {
      gsap.set([
        ".plate-hero-copy > *",
        ".plate-hero-visual",
        ".food-editorial .editorial-shop-photo",
        ".editorial-image img",
        ".heating-copy > *",
        ".heating-visual",
        ".heating-steps li",
        ".products .section-heading > *",
        ".product-card",
        ".product-art img",
        ".membership > *"
      ], { clearProps: "all" });

      gsap.utils.toArray([
        ".editorial-image img"
      ].join(", ")).forEach((image) => {
        gsap.fromTo(image,
          { y: 18, scale: 1.025 },
          {
            y: 0,
            scale: 1,
            duration: 1.05,
            ease: "power3.out",
            scrollTrigger: {
              trigger: image,
              start: "top 88%",
              end: "bottom 12%",
              toggleActions: "play none none none"
            }
          }
        );

        gsap.to(image, {
          yPercent: -4,
          ease: "none",
          scrollTrigger: {
            trigger: image,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.4
          }
        });
      });

      foodMotion.add("(min-width: 861px)", () => {
        gsap.set([
          ".food-editorial .editorial-reveal-left",
          ".food-editorial .editorial-reveal-right",
          ".food-editorial .editorial-shop-photo"
        ], { clearProps: "opacity,transform,filter" });
      });

      foodMotion.add("(max-width: 860px)", () => {
        gsap.set([
          ".food-editorial .editorial-reveal-left",
          ".food-editorial .editorial-reveal-right",
          ".food-editorial .editorial-shop-photo"
        ], { clearProps: "opacity,transform,filter" });
      });

    }, appRef);

    const refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 250);

    return () => {
      window.clearTimeout(refreshTimer);
      revealObserver.disconnect();
      revealElements.forEach((element) => {
        element.classList.remove("reveal-on-scroll", "is-visible");
        element.style.transitionDelay = "";
      });
      foodMotion.revert();
      ctx.revert();
    };
  }, [currentPath, currentProductSlug]);

  useEffect(() => {
    const updateHeaderVisibility = () => {
      if (document.documentElement.classList.contains("intro-scroll-consumed")) {
        setHeaderHiddenForHero(false);
        return;
      }

      const introSequence = document.querySelector(".scroll-sequence-intro");
      if (!introSequence) {
        setHeaderHiddenForHero(false);
        return;
      }

      const sequenceTop = introSequence.offsetTop;
      const sequenceEnd = sequenceTop + introSequence.offsetHeight;
      const isInsideIntroScroll = window.scrollY >= sequenceTop - 2 && window.scrollY < sequenceEnd - 2;

      setHeaderHiddenForHero((current) => (current === isInsideIntroScroll ? current : isInsideIntroScroll));
    };

    updateHeaderVisibility();
    window.addEventListener("scroll", updateHeaderVisibility, { passive: true });
    window.addEventListener("resize", updateHeaderVisibility);
    window.addEventListener("fullness:intro-state-change", updateHeaderVisibility);
    window.addEventListener("fullness:intro-reset", updateHeaderVisibility);

    return () => {
      window.removeEventListener("scroll", updateHeaderVisibility);
      window.removeEventListener("resize", updateHeaderVisibility);
      window.removeEventListener("fullness:intro-state-change", updateHeaderVisibility);
      window.removeEventListener("fullness:intro-reset", updateHeaderVisibility);
    };
  }, []);

  useEffect(() => {
    const sectionHashes = new Set(["#programa", "#plato", "#filosofia", "#proposito", "#calentar", "#comunidad"]);

    const syncSectionHash = () => {
      if (window.location.hash === "#oferta") {
        openShopPage(null, { replace: true });
        return;
      }

      if (!sectionHashes.has(window.location.hash)) return;
      navigateToSection(window.location.hash, { smooth: false, replace: true });
    };

    syncSectionHash();
    window.addEventListener("hashchange", syncSectionHash);

    return () => {
      window.removeEventListener("hashchange", syncSectionHash);
    };
  }, []);

  useEffect(() => {
    const syncProductPath = () => {
      setCurrentPath(window.location.pathname);
      const slug = getProductSlugFromPath();
      setCurrentProductSlug(slug);
      if (slug) {
        setProductPreviewSlug("");
        document.documentElement.classList.add("intro-scroll-consumed");
        setHeaderHiddenForHero(false);
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    };

    window.addEventListener("popstate", syncProductPath);

    return () => {
      window.removeEventListener("popstate", syncProductPath);
    };
  }, []);

  useEffect(() => {
    if (currentPath !== faqPath || !window.location.hash) return;

    window.requestAnimationFrame(() => {
      const target = document.querySelector(window.location.hash);
      const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
      if (!target) return;

      window.scrollTo({
        top: Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 14),
        left: 0,
        behavior: "instant"
      });
    });
  }, [currentPath]);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace("#", ""));
    const isSupabaseAuthHash = Boolean(hash.get("type") || hash.get("refresh_token"));

    if (isSupabaseAuthHash) return;

    const accessToken = hash.get("access_token");

    if (!accessToken) return;

    fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo validar Gmail.");
        return response.json();
      })
      .then((profile) => {
        setMember({
          name: profile.name || "Miembro Fullness",
          email: profile.email || "",
          phone: ""
        });
        setAccountOpen(false);
        window.history.replaceState(null, "", window.location.pathname);
      })
      .catch(() => {
        setGoogleMessage("No pudimos conectar Gmail. Revisa el Client ID de Google.");
      });
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;

      setAccountOpen(false);
      setCartOpen(false);
      setMenuOpen(false);
      setAdminOpen(false);
      setMealPreview(null);
      setProductPreviewSlug("");
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const productsBySlug = useMemo(() => {
    const map = new Map();

    products.forEach((product) => {
      const slug = getProductSlug(product);
      if (slug) map.set(slug, product);
    });

    return map;
  }, [products]);
  const currentProduct = currentProductSlug ? productsBySlug.get(currentProductSlug) : null;
  const productPreview = productPreviewSlug ? productsBySlug.get(productPreviewSlug) : null;
  const planProducts = useMemo(
    () => products.filter((product) => getProductType(product) === "plan"),
    [products]
  );
  const familyProducts = useMemo(
    () => products.filter((product) => getProductType(product) === "family"),
    [products]
  );
  const mealPreviewParent = mealPreview?.parentSlug ? productsBySlug.get(mealPreview.parentSlug) : null;
  const mealPreviewItem = mealPreviewParent?.includedItems?.find((meal) =>
    (meal.id || meal.name) === mealPreview?.mealId
  );
  const currentProductIndex = currentProduct
    ? Math.max(0, products.findIndex((product) => getProductSlug(product) === getProductSlug(currentProduct)))
    : 0;
  const productPreviewIndex = productPreview
    ? Math.max(0, products.findIndex((product) => getProductSlug(product) === getProductSlug(productPreview)))
    : 0;
  const isCommunityPage = currentPath === "/comunidad" && !currentProductSlug;
  const isShopPage = currentPath === shopPath && !currentProductSlug;
  const isFaqPage = currentPath === faqPath && !currentProductSlug;
  const isAboutPage = currentPath === aboutPath && !currentProductSlug;
  const isProductPage = Boolean(currentProductSlug);

  function addToCart(product) {
    setCart((items) => {
      const found = items.find((item) => item.id === product.id);
      if (found) {
        return items.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...items, { ...product, qty: 1 }];
    });
    setCartNotice({ id: Date.now(), name: product.name });
    window.clearTimeout(window.fullnessCartNoticeTimer);
    window.fullnessCartNoticeTimer = window.setTimeout(() => {
      setCartNotice(null);
    }, 2200);
  }

  function openMealQuickView(parentProduct, meal, event) {
    event?.preventDefault();
    event?.stopPropagation();
    const parentSlug = getProductSlug(parentProduct);
    const mealId = meal?.id || meal?.name;
    if (!parentSlug || !mealId) return;

    setMealPreview({ parentSlug, mealId });
    setMenuOpen(false);
  }

  function openProductQuickView(product) {
    const slug = getProductSlug(product);
    if (!slug) return;

    setMealPreview(null);
    setProductPreviewSlug(slug);
    setMenuOpen(false);
  }

  function openProductDetail(product, event) {
    event?.preventDefault();
    const slug = getProductSlug(product);
    if (!slug) return;

    setProductPreviewSlug("");
    setMealPreview(null);
    setCurrentProductSlug(slug);
    setMenuOpen(false);
    setCartOpen(false);
    setAccountOpen(false);
    document.documentElement.classList.add("intro-scroll-consumed");
    window.history.pushState(null, "", getProductPath(product));
    setCurrentPath(window.location.pathname);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  function backToShop() {
    openShopPage(null, { replace: true });
  }

  function updateQty(id, delta) {
    setCart((items) =>
      items
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  }

  function updateCheckoutForm(event) {
    const { name, value } = event.target;

    setCheckoutForm((current) => ({
      ...current,
      [name]: value
    }));
    setCheckoutMessage("");
  }

  async function submitCheckout(event) {
    event.preventDefault();
    if (cart.length === 0 || checkoutSubmitting) return;

    setCheckoutSubmitting(true);
    setCheckoutMessage("Conectando de forma segura con Mercado Pago...");

    try {
      const response = await fetch("/api/mercadopago/preferences", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cart: cart.map((item) => ({slug: item.slug, quantity: item.qty})),
          fulfillment: checkoutForm
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.data?.initPoint) {
        throw new Error(payload.error?.message || "No pudimos iniciar el pago.");
      }

      const pendingOrder = {
        items: cart,
        total: payload.data.amount,
        fulfillment: checkoutForm,
        orderId: payload.data.orderId,
        preferenceId: payload.data.preferenceId,
        createdAt: new Date().toISOString()
      };

      try {
        window.localStorage.setItem("fullness_last_order", JSON.stringify(pendingOrder));
        window.localStorage.setItem("fullness_pending_order", JSON.stringify(pendingOrder));
      } catch {
        // Checkout can continue when browser storage is unavailable.
      }
      window.location.assign(payload.data.initPoint);
    } catch (error) {
      setCheckoutMessage(error.message || "No pudimos iniciar el pago. Intenta nuevamente.");
      setCheckoutSubmitting(false);
    }
  }

  function closeCheckoutResult() {
    setCheckoutResult(null);
    window.history.replaceState(null, "", shopPath);
    setCurrentPath(window.location.pathname);
  }

  function submitSubscription(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("subscriptionEmail") || "").trim();

    if (!email) return;

    try {
      window.localStorage.setItem("fullness_subscription_email", email);
    } catch {
      // Local demo persistence is best-effort.
    }

    setSubscriptionMessage("Gracias. Te avisaremos cuando abramos nuevas experiencias Fullness.");
    form.reset();
  }

  function closeSubscriptionPopup() {
    setSubscriptionPopupOpen(false);
    setSubscriptionPopupDismissed(true);
    setSubscriptionPopupMessage("");
  }

  function openSubscriptionPopupForm() {
    setSubscriptionPopupMode("form");
    setSubscriptionPopupMessage("");
  }

  function openSubscriptionPopupPlans(event) {
    event?.preventDefault();
    setSubscriptionPopupOpen(false);
    setSubscriptionPopupDismissed(true);
    openShopPage(event);
  }

  async function submitPopupSubscription(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("subscriberName") || "").trim();
    const phone = String(data.get("subscriberPhone") || "").trim();
    const email = String(data.get("subscriberEmail") || "").trim();

    if (!name || !phone || !email) {
      setSubscriptionPopupMessage("Completa nombre, teléfono y mail para suscribirte.");
      return;
    }

    setSubscriptionPopupSubmitting(true);
    setSubscriptionPopupMessage("");

    try {
      const stored = window.localStorage.getItem(subscriptionPopupSubscribersStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      const subscribers = Array.isArray(parsed) ? parsed : [];
      const nextSubscriber = {
        name,
        phone,
        email,
        source: "subscription-lightbox",
        createdAt: new Date().toISOString()
      };

      window.localStorage.setItem(
        subscriptionPopupSubscribersStorageKey,
        JSON.stringify([
          ...subscribers.filter((subscriber) => String(subscriber.email || "").toLowerCase() !== email.toLowerCase()),
          nextSubscriber
        ])
      );
    } catch {
      // Local demo persistence is best-effort.
    }

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, phone, email})
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(payload.error?.message || "No pudimos registrar tu suscripción.");

      setSubscriptionPopupMode("success");
      form.reset();
    } catch (error) {
      setSubscriptionPopupMessage(error.message || "No pudimos registrar tu suscripción.");
    } finally {
      setSubscriptionPopupSubmitting(false);
    }
  }

  function updateSubscriptionPopupForm(event) {
    const { checked, name, type, value } = event.target;

    setSubscriptionPopupForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
    setSubscriptionPopupAdminMessage("");
    setSubscriptionPopupAdminError("");
  }

  async function handleSubscriptionPopupBackgroundChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSubscriptionPopupUploading(true);
    setSubscriptionPopupAdminMessage("");
    setSubscriptionPopupAdminError("");

    const result = await uploadMenuPhoto(file);

    if (result.error || !result.configured) {
      setSubscriptionPopupAdminError(getSupabaseErrorMessage(result.error, "No pudimos subir la imagen del lightbox."));
    } else {
      setSubscriptionPopupForm((current) => ({
        ...current,
        backgroundUrl: result.data.photoUrl,
        backgroundStoragePath: result.data.photoStoragePath
      }));
      setSubscriptionPopupAdminMessage("Imagen del lightbox cargada.");
    }

    setSubscriptionPopupUploading(false);
    event.target.value = "";
  }

  function submitSubscriptionPopupSettings(event) {
    event.preventDefault();

    if (!activeIsAdmin) {
      setSubscriptionPopupAdminError("Tu cuenta no tiene acceso de administración.");
      return;
    }

    const nextSettings = normalizeSubscriptionPopupSettings(subscriptionPopupForm);

    try {
      window.localStorage.setItem(subscriptionPopupStorageKey, JSON.stringify(nextSettings));
    } catch {
      setSubscriptionPopupAdminError("No pudimos guardar la configuración en este navegador.");
      return;
    }

    setSubscriptionPopupSettings(nextSettings);
    setSubscriptionPopupForm(nextSettings);
    setSubscriptionPopupAdminError("");
    setSubscriptionPopupAdminMessage("Lightbox guardado.");
  }

  function resetSubscriptionPopupSettings() {
    const defaults = createDefaultSubscriptionPopupSettings();
    setSubscriptionPopupForm(defaults);
    setSubscriptionPopupAdminError("");
    setSubscriptionPopupAdminMessage("Configuración restaurada para revisar antes de guardar.");
  }

  function submitCommunityMember(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("communityEmail") || "").trim();
    const name = String(data.get("communityName") || "").trim();
    const consent = data.get("communityConsent") === "on";

    if (!email || !consent) return;

    try {
      const stored = window.localStorage.getItem("fullness_community_members");
      const members = stored ? JSON.parse(stored) : [];
      const cleanMembers = Array.isArray(members) ? members : [];
      const nextMember = {
        name,
        email,
        consent: true,
        createdAt: new Date().toISOString()
      };

      window.localStorage.setItem(
        "fullness_community_members",
        JSON.stringify([
          ...cleanMembers.filter((memberItem) => memberItem.email !== email),
          nextMember
        ])
      );
    } catch {
      // Local demo persistence is best-effort.
    }

    setCommunityMemberMessage("Gracias. Ya quedaste inscrita en la lista de Comunidad Fullness.");
    form.reset();
  }

  async function submitAccount(event) {
    event.preventDefault();

    if (!isSupabaseConfigured) {
      setGoogleMessage("El acceso no está disponible en este entorno.");
      return;
    }

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");

    setAuthLoading(true);
    setGoogleMessage("");
    clearStoredAuthFlowType();

    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setAuthLoading(false);

    if (error) {
      setGoogleMessage(getSupabaseErrorMessage(error, "No pudimos iniciar sesión."));
      return;
    }

    setAccountOpen(false);
  }

  async function requestPasswordReset(event) {
    const form = event.currentTarget.form;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();

    if (!email) {
      setGoogleMessage("Ingresa tu correo para enviarte el enlace de recuperación.");
      return;
    }

    if (!isSupabaseConfigured) {
      setGoogleMessage("El acceso no está disponible en este entorno.");
      return;
    }

    setAuthLoading(true);
    setGoogleMessage("");
    setStoredAuthFlowType("recovery");

    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });

    setAuthLoading(false);

    if (error) {
      clearStoredAuthFlowType();
      setGoogleMessage(getSupabaseErrorMessage(error, "No pudimos enviar el correo de recuperación."));
      return;
    }

    setGoogleMessage("Te enviamos un correo para restablecer tu contraseña.");
  }

  async function submitPasswordSetup(event) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const password = String(data.get("newPassword") || "");
    const passwordConfirm = String(data.get("newPasswordConfirm") || "");

    if (password.length < 8) {
      setPasswordSetupMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== passwordConfirm) {
      setPasswordSetupMessage("Las contraseñas no coinciden.");
      return;
    }

    if (!isSupabaseConfigured) {
      setPasswordSetupMessage("El acceso no está disponible en este entorno.");
      return;
    }

    setPasswordSetupSaving(true);
    setPasswordSetupMessage("");

    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });

    setPasswordSetupSaving(false);

    if (error) {
      setPasswordSetupMessage(getSupabaseErrorMessage(error, "No pudimos guardar tu contraseña."));
      return;
    }

    setPasswordSetupOpen(false);
    setGoogleMessage(
      passwordSetupMode === "invite"
        ? "Contraseña creada. Tu cuenta Fullness quedó activa."
        : "Contraseña actualizada. Ya puedes seguir con tu cuenta Fullness."
    );
    setAccountOpen(true);
  }

  function updateMenuForm(event) {
    const { checked, name, type, value } = event.target;

    markMenuFormChanged();
    setMenuForm((current) => {
      const next = {
        ...current,
        [name]: type === "checkbox" ? checked : value
      };

      if (name === "name" && !current.id && !current.slug) {
        next.slug = slugifyMenuName(value);
      }

      if (name === "productType") {
        next.planFrequency = value === "plan" ? current.planFrequency || "weekly" : "";
        next.includedItems = value === "plan" && current.includedItems.length === 0
          ? [createIncludedMealForm(0)]
          : current.includedItems;
      }

      return next;
    });
  }

  function updateIncludedMealForm(index, field, value) {
    markMenuFormChanged();
    setMenuForm((current) => ({
      ...current,
      includedItems: current.includedItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  }

  function addIncludedMeal() {
    const nextIndex = menuForm.includedItems.length;
    markMenuFormChanged();
    setMenuForm((current) => ({
      ...current,
      includedItems: [...current.includedItems, createIncludedMealForm(current.includedItems.length)]
    }));
    openIncludedMealEditor(nextIndex);
  }

  function removeIncludedMeal(indexToRemove) {
    markMenuFormChanged();
    setMenuForm((current) => ({
      ...current,
      includedItems: current.includedItems.filter((_, index) => index !== indexToRemove)
    }));
    setIncludedMealEditorIndex((current) => {
      if (current === null) return null;
      if (current === indexToRemove) return null;
      return current > indexToRemove ? current - 1 : current;
    });
  }

  function updateShopSettingsForm(event) {
    const { name, value } = event.target;

    setShopSettingsForm((current) => ({
      ...current,
      [name]: value
    }));
    setShopSettingsError("");
    setShopSettingsMessage("");
  }

  async function handleShopHeroPhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setShopHeroUploading(true);
    setShopSettingsError("");
    setShopSettingsMessage("");

    const result = await uploadMenuPhoto(file);

    if (result.error || !result.configured) {
      setShopSettingsError(getSupabaseErrorMessage(result.error, "No pudimos subir la imagen del hero."));
    } else {
      setShopSettingsForm((current) => ({
        ...current,
        heroImageUrl: result.data.photoUrl,
        heroImageStoragePath: result.data.photoStoragePath
      }));
      setShopSettingsMessage("Imagen de tienda cargada.");
    }

    setShopHeroUploading(false);
    event.target.value = "";
  }

  async function submitShopSettings(event) {
    event.preventDefault();

    if (!activeIsAdmin) {
      setShopSettingsError("Tu cuenta no tiene acceso de administración.");
      return;
    }

    setShopSettingsSaving(true);
    setShopSettingsError("");
    setShopSettingsMessage("");

    const result = await saveShopSettings(parseShopSettingsForm(shopSettingsForm));

    if (result.error || !result.configured) {
      setShopSettingsError(getSupabaseErrorMessage(result.error, "No pudimos guardar la tienda."));
    } else {
      const merged = mergeShopSettings(result.data);
      setShopSettings(merged);
      setShopSettingsForm(createShopSettingsForm(merged));
      setShopSettingsMessage("Tienda guardada.");
    }

    setShopSettingsSaving(false);
  }

  async function handleMenuPhotoChange(event, target = "primary", mealIndex = null) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    setAdminError("");
    setAdminMessage("");

    const result = await uploadMenuPhoto(file);

    if (result.error || !result.configured) {
      setAdminError(getSupabaseErrorMessage(result.error, "No pudimos subir la foto."));
    } else {
      markMenuFormChanged();
      setMenuForm((current) => {
        if (mealIndex !== null) {
          return {
            ...current,
            includedItems: current.includedItems.map((item, index) => {
              if (index !== mealIndex) return item;

              if (target === "mealSecondary") {
                return {
                  ...item,
                  secondaryPhotoUrl: result.data.photoUrl,
                  secondaryPhotoStoragePath: result.data.photoStoragePath
                };
              }

              return {
                ...item,
                photoUrl: result.data.photoUrl,
                photoStoragePath: result.data.photoStoragePath
              };
            })
          };
        }

        if (target === "secondary") {
          return {
            ...current,
            secondaryPhotoUrl: result.data.photoUrl,
            secondaryPhotoStoragePath: result.data.photoStoragePath
          };
        }

        return {
          ...current,
          photoUrl: result.data.photoUrl,
          photoStoragePath: result.data.photoStoragePath
        };
      });
      setAdminMessage("Foto cargada.");
    }

    setPhotoUploading(false);
    event.target.value = "";
  }

  async function submitMenuItem(event) {
    event.preventDefault();
    const savingFamilyProduct = menuForm.productType === "family";

    if (!activeIsAdmin) {
      setAdminError("Tu cuenta no tiene acceso de administración.");
      setBackofficeFeedback({
        status: "error",
        title: "No pudimos guardar",
        message: "Esta cuenta no tiene permisos para administrar el catálogo."
      });
      return;
    }

    const publicationIssues = getMenuFormPublicationIssues(menuForm);
    if (publicationIssues.length > 0) {
      const message = `Completa ${publicationIssues.join(", ")}. Tu trabajo sigue protegido como borrador.`;
      setAdminError(message);
      setBackofficeFeedback({
        status: "error",
        title: "Falta información para guardar",
        message
      });
      return;
    }

    setAdminSaving(true);
    setAdminError("");
    setAdminMessage("");
    setBackofficeFeedback({
      status: "saving",
      title: menuForm.id
        ? "Guardando cambios"
        : savingFamilyProduct
          ? "Creando el plato familiar"
          : "Creando el meal prep",
      message: "Estamos actualizando la ficha y el contenido que verá el cliente."
    });

    let includedItems = [];
    let nutritionFacts = {};

    try {
      includedItems = menuForm.productType === "plan"
        ? parseIncludedMealsFromForm(menuForm.includedItems, tagDefinitions)
        : [];
      nutritionFacts = menuForm.productType === "family"
        ? parseJsonObject(menuForm.nutritionFacts)
        : {};
    } catch (error) {
      setAdminSaving(false);
      setAdminError(error.message);
      setBackofficeFeedback({
        status: "error",
        title: "No pudimos guardar",
        message: error.message || "Revisa la información de los platos e inténtalo nuevamente."
      });
      return;
    }

    const result = await saveMenuItem({
      id: menuForm.id || undefined,
      name: menuForm.name,
      slug: menuForm.slug || slugifyMenuName(menuForm.name),
      sku: menuForm.sku,
      productType: menuForm.productType,
      planFrequency: menuForm.planFrequency,
      tag: menuForm.tag,
      description: menuForm.description,
      photoUrl: menuForm.photoUrl,
      photoStoragePath: menuForm.photoStoragePath,
      secondaryPhotoUrl: menuForm.secondaryPhotoUrl,
      secondaryPhotoStoragePath: menuForm.secondaryPhotoStoragePath,
      priceClp: menuForm.priceClp,
      benefitTags: menuForm.benefitTags,
      benefitAssignments: menuForm.benefitAssignments,
      tagIds: menuForm.tagIds,
      tags: tagDefinitions.filter((tag) => menuForm.tagIds?.includes(tag.id)),
      libraryMealId: menuForm.libraryMealId,
      ingredients: menuForm.ingredients,
      nutritionDescription: menuForm.nutritionDescription,
      nutritionHighlights: menuForm.nutritionHighlights,
      nutritionFacts,
      recipeSummary: menuForm.recipeSummary,
      recipeSteps: menuForm.recipeSteps,
      allergens: menuForm.allergens,
      includedItems,
      servingLabel: menuForm.servingLabel,
      purchaseLabel: menuForm.purchaseLabel,
      displayOrder: menuForm.displayOrder,
      isActive: menuForm.isActive
    });

    if (result.error || !result.configured) {
      const message = getSupabaseErrorMessage(result.error, "No pudimos guardar el meal prep.");
      setAdminError(message);
      setBackofficeFeedback({
        status: "error",
        title: "No pudimos guardar",
        message
      });
    } else {
      clearMenuFormDraft();
      setMenuForm(menuItemToForm(result.data));
      setAdminMessage(savingFamilyProduct ? "Plato familiar guardado." : "Meal prep guardado.");
      await refreshAdminItems({ silent: true });
      await refreshPublicProducts();
      setBackofficeFeedback({
        status: "success",
        title: savingFamilyProduct ? "Plato familiar guardado" : "Meal prep guardado",
        message: result.data.isActive
          ? `“${result.data.name}” ya está actualizado y visible en la tienda.`
          : `“${result.data.name}” quedó guardado como inactivo y no se mostrará en la tienda.`
      });
    }

    setAdminSaving(false);
  }

  async function removeMenuItem(item) {
    if (!window.confirm(`¿Eliminar "${item.name}" del catálogo?`)) return;

    setAdminSaving(true);
    setAdminError("");
    setAdminMessage("");

    const result = await deleteMenuItem(item.id);

    if (result.error || !result.configured) {
      setAdminError(getSupabaseErrorMessage(result.error, "No pudimos eliminar el meal prep."));
    } else {
      if (menuForm.id === item.id) {
        if (item.productType === "family") {
          resetFamilyProductForm({ force: true });
          setFamilyProductEditorOpen(false);
        } else {
          resetMenuForm({ force: true });
          setMealPrepEditorOpen(false);
          setIncludedMealEditorIndex(null);
        }
      }
      setAdminMessage(item.productType === "family" ? "Plato familiar eliminado." : "Meal prep eliminado.");
      await refreshAdminItems({ silent: true });
      await refreshPublicProducts();
    }

    setAdminSaving(false);
  }

  function reportMenuFormInvalid() {
    setAdminError("Completa los campos obligatorios antes de guardar. Tu borrador se mantiene protegido en este navegador.");
    const publicationIssues = getMenuFormPublicationIssues(menuForm);
    if (publicationIssues.length > 0) {
      setAdminError(`El meal prep sigue como borrador. Para guardarlo en el catálogo completa: ${publicationIssues.join(", ")}.`);
      return;
    }

  }

  const navItems = [
    { href: shopPath, label: "Planes" },
    { href: "/comunidad", label: "Comunidad" },
    { href: aboutPath, label: "Nosotros" },
    { href: "#contacto", label: "Contacto" },
    ...(hasBackofficeAccess ? [{ href: "#backoffice", label: "Backoffice" }] : [])
  ];

  const nav = navItems.map((item) => (
    <a
      key={`${item.href}-${item.label}`}
      href={item.href}
      onClick={(event) => {
        if (item.href === "#backoffice") {
          event.preventDefault();
          openBackoffice();
          return;
        }

        if (item.href === "/comunidad") {
          openCommunityPage(event);
          return;
        }

        if (item.href === shopPath) {
          openShopPage(event);
          return;
        }

        if (item.href === aboutPath) {
          openAboutPage(event);
          return;
        }

        if (item.href.startsWith("#")) {
          event.preventDefault();
          navigateToSection(item.href);
        }
      }}
    >
      {item.label}
    </a>
  ));

  const mealPrepItems = adminItems.filter((item) => item.productType === "plan");
  const familyProductItems = adminItems.filter((item) => item.productType === "family");
  const activeMealPrepCount = mealPrepItems.filter((item) => item.isActive).length;
  const activeFamilyProductCount = familyProductItems.filter((item) => item.isActive).length;
  const filteredMealPrepItems = useMemo(() => {
    const query = mealPrepSearch.trim().toLocaleLowerCase("es");
    if (!query) return mealPrepItems;

    return mealPrepItems.filter((item) =>
      [item.name, item.tag, item.planFrequency, item.sku]
        .some((value) => String(value || "").toLocaleLowerCase("es").includes(query))
    );
  }, [adminItems, mealPrepSearch]);
  const filteredFamilyProductItems = useMemo(() => {
    const query = familyProductSearch.trim().toLocaleLowerCase("es");
    if (!query) return familyProductItems;

    return familyProductItems.filter((item) =>
      [item.name, item.tag, item.sku]
        .some((value) => String(value || "").toLocaleLowerCase("es").includes(query))
    );
  }, [adminItems, familyProductSearch]);
  const relevantMenuFormDrafts = menuFormDrafts.filter((draft) =>
    (draft.form.productType || "plan") === menuForm.productType
  );
  const activeIncludedMeal =
    includedMealEditorIndex === null ? null : menuForm.includedItems[includedMealEditorIndex] || null;
  const activeSubscriptionCount = subscriptionCustomers.filter((item) => item.status === "active").length;
  const filteredSubscriptions = useMemo(() => {
    const query = subscriptionFilter.query.trim().toLowerCase();

    return subscriptionCustomers.filter((subscription) => {
      if (subscriptionFilter.status !== "all" && subscription.status !== subscriptionFilter.status) return false;
      if (subscriptionFilter.frequency !== "all" && subscription.frequency !== subscriptionFilter.frequency) return false;
      if (!query) return true;

      return [subscription.customerName, subscription.customerEmail, subscription.planName]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [subscriptionCustomers, subscriptionFilter]);
  const adminModuleItems = [
    ...(activeIsAdmin
      ? [
          {
            id: "meal-preps",
            label: "Meal preps",
            description: `${mealPrepItems.length} configurados · ${activeMealPrepCount} activos`,
            Icon: Utensils
          },
          {
            id: "meal-library",
            label: "Platos reutilizables",
            description: `${mealLibrary.length} reutilizables`,
            Icon: CookingPot
          },
          {
            id: "family-products",
            label: "Platos familiares",
            description: `${familyProductItems.length} configurados · ${activeFamilyProductCount} activos`,
            Icon: CookingPot
          },
          {
            id: "parameters",
            label: "Parámetros",
            description: `${benefitDefinitions.length} beneficios · ${tagDefinitions.length} tags`,
            Icon: Tags
          },
          {
            id: "subscriptions",
            label: "Clientes",
            description: `${activeSubscriptionCount} suscripciones activas`,
            Icon: Users
          },
          {
            id: "shop",
            label: "Tienda",
            description: "Hero, CTA y bloque de suscripción",
            Icon: Store
          },
          {
            id: "lightbox",
            label: "Lightbox",
            description: subscriptionPopupForm.enabled ? "Popup activo" : "Popup inactivo",
            Icon: Sparkles
          },
          {
            id: "community",
            label: "Comunidad",
            description: `${communityActivities.length} actividades`,
            Icon: Users
          },
          {
            id: "site-tools",
            label: "Respaldo y conexión",
            description: "Datos, R2 y DNS",
            Icon: Database
          }
        ]
      : []),
    {
      id: "operations",
      label: "Operaciones",
      description: "Exportaciones y recuperación",
      Icon: FileDown
    }
  ];
  const currentAdminModule =
    adminModuleItems.find((item) => item.id === activeBackofficeModule) || adminModuleItems[0];
  const floatingActionsHidden =
    cartOpen ||
    accountOpen ||
    adminOpen ||
    menuOpen ||
    passwordSetupOpen ||
    subscriptionPopupOpen ||
    Boolean(checkoutResult) ||
    Boolean(productPreview) ||
    Boolean(mealPreviewItem) ||
    Boolean(benefitPreview);

  const renderSiteFooter = () => (
    <footer id="contacto">
      <div className="footer-brand">
        <img src={logoHeaderFooterSrc} alt="Fullness Lab" />
        <p>Nutrición consciente para una vida plena y equilibrada.</p>
        <div className="footer-socials" aria-label="Redes Fullness Lab">
          <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram Fullness Lab">
            <InstagramGlyph />
          </a>
        </div>
      </div>
      <nav className="footer-column" aria-label="Navegación de pie de página">
        <h3>Navegación</h3>
        <a href="#programa" onClick={(event) => { event.preventDefault(); navigateToSection("#programa"); }}>Menú</a>
        <a href={shopPath} onClick={openShopPage}>Planes</a>
        <a href={shopPath} onClick={openShopPage}>Tienda</a>
        <a href="/comunidad" onClick={openCommunityPage}>Comunidad</a>
        <a href={aboutPath} onClick={openAboutPage}>Nosotros</a>
        <a href="#contacto" onClick={(event) => { event.preventDefault(); navigateToSection("#contacto"); }}>Contacto</a>
      </nav>
      <div className="footer-column">
        <h3>Ayuda</h3>
        <a href={faqPath} onClick={openFaqPage}>Preguntas frecuentes</a>
        <a href={`${faqPath}#envios`} onClick={(event) => openFaqPage(event, "#envios")}>Políticas de envío</a>
        <a href={`${faqPath}#cambios`} onClick={(event) => openFaqPage(event, "#cambios")}>Cambios y devoluciones</a>
        <a href={`${faqPath}#calidad`} onClick={(event) => openFaqPage(event, "#calidad")}>Compromiso de calidad</a>
      </div>
      <address className="footer-column footer-contact">
        <h3>Contacto</h3>
        <a href={whatsappUrl} target="_blank" rel="noreferrer">+56 9 9658 8199</a>
        <a href="mailto:hola@fullnesslab.com">hola@fullnesslab.com</a>
        <span>Vitacura, Santiago</span>
      </address>
      <p className="footer-legal">© Fullness Lab 2026 · Todos los derechos reservados • By Prof3sional.com</p>
    </footer>
  );

  return (
    <main ref={appRef} className={isShopPage ? "route-shop" : undefined}>
      {!floatingActionsHidden && (
        <a
          className="whatsapp-float"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Escribir a Fullness Lab por WhatsApp"
        >
          <WhatsAppIcon size={24} />
          <span>WhatsApp</span>
        </a>
      )}

      <header className={`site-header ${headerHiddenForHero && !menuOpen ? "site-header-hidden" : ""}`}>
        <a
          className="brand"
          href="#programa"
          aria-label="Fullness Lab inicio"
          onClick={(event) => {
            event.preventDefault();
            navigateToSection("#programa");
          }}
        >
          <img className="brand-reference-logo" src={logoHeaderFooterSrc} alt="Fullness Lab" />
        </a>

        <nav className="desktop-nav">{nav}</nav>

        <div className="header-actions">
          <button className="member-link" type="button" onClick={() => setAccountOpen(true)}>
            <Sprout size={18} />
            <span>{memberButtonLabel}</span>
          </button>
          <button
            className={`icon-button cart-button ${cartNotice ? "cart-pulse" : ""}`}
            type="button"
            onClick={() => setCartOpen(true)}
            data-testid="open-cart"
            aria-label={cartCount > 0 ? `Abrir carrito, ${cartCount} productos` : "Abrir carrito"}
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && <span aria-hidden="true">{cartCount}</span>}
          </button>
          <button className="icon-button menu-toggle" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
            <Menu size={22} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menú principal">
          <button className="icon-button close" type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <X size={22} />
          </button>
          {navItems.map((item) => (
            <a
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={(event) => {
                if (item.href === "#backoffice") {
                  event.preventDefault();
                  openBackoffice();
                  return;
                }

                if (item.href === "/comunidad") {
                  openCommunityPage(event);
                  return;
                }

                if (item.href === shopPath) {
                  openShopPage(event);
                  return;
                }

                if (item.href === aboutPath) {
                  openAboutPage(event);
                  return;
                }

                event.preventDefault();
                setMenuOpen(false);
                navigateToSection(item.href);
              }}
            >
              {item.label}
            </a>
          ))}
          <button
            className="member-link"
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setAccountOpen(true);
            }}
          >
            <Sprout size={18} />
            Acceso miembros
          </button>
        </div>
      )}

      {subscriptionPopupOpen && (
        <SubscriptionLightbox
          settings={subscriptionPopupSettings}
          mode={subscriptionPopupMode}
          message={subscriptionPopupMessage}
          isSubmitting={subscriptionPopupSubmitting}
          onClose={closeSubscriptionPopup}
          onOpenForm={openSubscriptionPopupForm}
          onSubmit={submitPopupSubscription}
          onPlans={openSubscriptionPopupPlans}
        />
      )}

      {isProductPage ? (
        <ProductDetailPage
          product={currentProduct}
          image={currentProduct ? getProductImage(currentProduct, currentProductIndex) : ""}
          loading={productsLoading}
          onAdd={addToCart}
          onBackToShop={backToShop}
          onOpenBenefit={setBenefitPreview}
          onOpenMeal={openMealQuickView}
        />
      ) : isCommunityPage ? (
        <>
          <CommunityPage
            activities={communityActivities}
            activitiesExpanded={activitiesExpanded}
            memberMessage={communityMemberMessage}
            onCommunityMemberSubmit={submitCommunityMember}
            onToggleActivities={() => setActivitiesExpanded((current) => !current)}
          />
          {renderSiteFooter()}
        </>
      ) : isFaqPage ? (
        <>
          <FaqPage onNavigateToShop={openShopPage} />
          {renderSiteFooter()}
        </>
      ) : isAboutPage ? (
        <>
          <AboutPage
            onNavigateToShop={openShopPage}
            onNavigateToCommunity={openCommunityPage}
          />
          {renderSiteFooter()}
        </>
      ) : isShopPage ? (
        <>
          <div className="shop-page-shell">
            <MealPrepCatalog
              plans={planProducts}
              familyProducts={familyProducts}
              shopSettings={shopSettings}
              loading={productsLoading}
              onAdd={addToCart}
              onOpenBenefit={setBenefitPreview}
              onOpenMeal={openMealQuickView}
              onOpenProduct={openProductQuickView}
            />
          </div>
          {renderSiteFooter()}
        </>
      ) : (
        <>
          <IntroScrollSequence />

          <section
            className="plate-hero"
            id="programa"
          >
        <div className="plate-hero-blackout" aria-hidden="true" />
        <div className="plate-hero-vectors" aria-hidden="true">
          <img className="plate-hero-illustration plate-hero-illustration--left" src={landingHeroLeafSrc} alt="" />
          <img className="plate-hero-illustration plate-hero-illustration--right" src={landingHeroCelerySrc} alt="" />
        </div>
        <div className="plate-hero-copy">
          <p className="eyebrow">Nutrir desde la raíz</p>
          <h1>Comida consciente para tu bienestar <span>diario.</span></h1>
          <span className="section-rule" aria-hidden="true" />
          <p>
            Ingredientes honestos, preparaciones funcionales y experiencias que te ayudan a sentirte mejor desde la raíz.
          </p>
          <strong className="hero-manifesto">No contamos calorías. Creemos en aprender a nutrirse.</strong>
          <a
            className="plate-hero-primary"
            href={shopPath}
            onClick={openShopPage}
          >
            Ver planes
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
          <aside className="plate-hero-signals" aria-label="Principios Fullness">
            {heroPrinciples.map((principle) => (
              <article className="plate-hero-signal" key={principle}>
                <span className="signal-title">{principle}</span>
              </article>
            ))}
          </aside>
        </div>
        <div className="plate-hero-visual-stage" aria-hidden="true">
          <img
            className="plate-hero-visual"
            src={heroPlateCutoutSrc}
            alt=""
          />
        </div>
      </section>

      <section className="hero-benefits" aria-label="Beneficios Fullness Lab">
        {heroBenefitFeatures.map(({ title, text, icon: Icon }) => (
          <article key={title}>
            <Icon size={38} aria-hidden="true" />
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </section>

      <span id="plato" className="legacy-anchor" aria-hidden="true" />
      <div
        className="philosophy-scene philosophy-story-combo"
        style={{
          "--philosophy-scene-bg": `url("${philosophySceneBgSrc}")`,
          "--silhouette-root-one": `url("${silhouetteRootOneSrc}")`,
          "--silhouette-root-three": `url("${silhouetteRootThreeSrc}")`,
          "--silhouette-botanical": `url("${silhouetteBotanicalSrc}")`
        }}
      >
        <div className="philosophy-illustrations" aria-hidden="true">
          <img className="philosophy-illustration philosophy-illustration--ginger" src={landingGingerSrc} alt="" />
          <img className="philosophy-illustration philosophy-illustration--carrot" src={landingCarrotSrc} alt="" />
        </div>
        <section className="food-editorial" id="proposito">
          <div className="editorial-copy editorial-reveal-left" data-reveal-delay="0">
            <p className="eyebrow">Nuestra filosofía</p>
            <h2>Así como es por fuera, es por <span>dentro.</span></h2>
            <span className="section-rule" aria-hidden="true" />
            <p>
              Creemos en una alimentación consciente que transforma tu energía, tu salud y tu entorno.
              Seleccionamos ingredientes honestos, preparaciones funcionales y experiencias que te ayudan a sentirte mejor desde la raíz. Porque nutrirte es mucho más que comer.
            </p>
            <a
              className="editorial-cta"
              href={aboutPath}
              onClick={(event) => {
                event.preventDefault();
                openAboutPage(event);
              }}
            >
              Conócenos
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </section>

        <section className="food-story-strip">
          <a
            href={shopPath}
            aria-label="Explorar caminos Fullness Lab"
            onClick={openShopPage}
          >
            <span className="eyebrow">Alimentarse es</span>
            <strong>mucho <em>más</em> que comer.</strong>
            <span className="story-rule" aria-hidden="true" />
            <span className="story-copy">Cada ingrediente, cada preparación y cada elección son una oportunidad para nutrir tu bienestar desde la raíz.</span>
            <span className="section-cta">
              Explorar Fullness
              <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          </a>
          <img className="philosophy-story-plate" src={storyPlateCutoutSrc} alt="" aria-hidden="true" />
        </section>
      </div>

      <section className="meal-prep-feature" id="calentar">
        <div className="meal-prep-illustrations" aria-hidden="true">
          <img className="meal-prep-illustration meal-prep-illustration--celery" src={landingMealPrepCelerySrc} alt="" />
          <img className="meal-prep-illustration meal-prep-illustration--beans" src={landingMealPrepBeansSrc} alt="" />
        </div>
        <div className="meal-prep-copy">
          <p className="eyebrow">Tu semana resuelta</p>
          <h2>Meal Prep <span>Antinflamatorio</span></h2>
          <span className="section-rule" aria-hidden="true" />
          <p>
            Preparaciones pensadas para sostener tu bienestar durante la semana: comida real, equilibrada y lista para volver a ti.
          </p>
          <ul>
            <li>Cocina antinflamatoria</li>
            <li>Ingredientes reales</li>
            <li>Listo para calentar</li>
            <li>Elaborados por chef y nutricionista</li>
          </ul>
          <a
            href={shopPath}
            onClick={openShopPage}
          >
            Ver planes
          </a>
        </div>
        <a
          className="meal-prep-visual-link"
          href={shopPath}
          aria-label="Ir a la tienda de meal preps"
          onClick={openShopPage}
        >
          <img src={mealPrepBandSrc} alt="" aria-hidden="true" />
        </a>
      </section>

      <section
        className="membership"
        id="comunidad"
        style={{ "--community-scene-bg": `url("${communitySceneSrc}")` }}
      >
        <div>
          <p className="eyebrow">Comunidad Fullness</p>
          <h2>Un espacio para aprender, compartir y crecer desde la <span>raíz.</span></h2>
          <span className="section-rule" aria-hidden="true" />
          <p>
            Encuentros, talleres y contenido pensado para acompañar una alimentación consciente más allá del plato.
          </p>
          <div className="community-benefits" aria-label="Beneficios de comunidad">
            {communityLandingFeatures.map(({ title, icon: Icon }) => (
              <article key={title}>
                <Icon size={24} aria-hidden="true" />
                <span>{title}</span>
              </article>
            ))}
          </div>
          <a className="membership-cta" href="/comunidad" onClick={openCommunityPage}>
            Únete a la comunidad
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

          {renderSiteFooter()}
        </>
      )}

      {productPreview && (
        <ProductQuickView
          product={productPreview}
          image={getProductImage(productPreview, productPreviewIndex)}
          onAdd={addToCart}
          onClose={() => {
            setProductPreviewSlug("");
            setMealPreview(null);
          }}
          onOpenBenefit={setBenefitPreview}
          onOpenDetail={openProductDetail}
          onOpenMeal={openMealQuickView}
        />
      )}

      {mealPreviewItem && (
        <MealPrepQuickView
          meal={mealPreviewItem}
          parentProduct={mealPreviewParent}
          onAddParent={addToCart}
          onClose={() => setMealPreview(null)}
          onOpenBenefit={setBenefitPreview}
        />
      )}

      {benefitPreview && (
        <BenefitDetailLightbox
          preview={benefitPreview}
          onClose={() => setBenefitPreview(null)}
        />
      )}

      {accountOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="account-title">
          <section className="plans-panel login-only">
            <button className="icon-button close" type="button" onClick={() => setAccountOpen(false)} aria-label="Cerrar cuenta">
              <X size={22} />
            </button>
            {authUser ? (
              <div className="account-panel embedded">
                <p className="eyebrow">Cuenta Fullness</p>
                <h2 id="account-title">{getMemberLabel(authUser)}</h2>
                <p className="account-email">{authUser.email}</p>
                {googleMessage && <p className="form-note">{googleMessage}</p>}
                {canChooseAccessMode && (
                  <div className="account-mode-switch" aria-label="Modo de acceso">
                    <p>Entrar como</p>
                    <div>
                      <button
                        className={accessMode === "admin" ? "is-active" : ""}
                        type="button"
                        onClick={() => setAccessMode("admin")}
                      >
                        Administrador
                      </button>
                      <button
                        className={accessMode === "user" ? "is-active" : ""}
                        type="button"
                        onClick={() => {
                          setAccessMode("user");
                          setAdminOpen(false);
                        }}
                      >
                        Usuario
                      </button>
                    </div>
                  </div>
                )}
                {hasBackofficeAccess && (
                  <button className="primary-button full" type="button" onClick={openBackoffice}>
                    <ShieldCheck size={18} />
                    Abrir backoffice
                  </button>
                )}
                <button className="google-button account-secondary" type="button" onClick={signOut}>
                  <LogOut size={18} />
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <form className="account-panel embedded" onSubmit={submitAccount}>
                <p className="eyebrow">Acceso miembros</p>
                <h2 id="account-title">Iniciar sesión</h2>
                {googleMessage && <p className="form-note">{googleMessage}</p>}
                <label>
                  Correo electrónico
                  <span><Mail size={18} /><input required name="email" type="email" placeholder="nombre@dominio.cl…" autoComplete="username" /></span>
                </label>
                <label>
                  Contraseña
                  <span><Lock size={18} /><input required name="password" type="password" placeholder="Mínimo 8 caracteres…" minLength={8} autoComplete="current-password" /></span>
                </label>
                <button className="primary-button full" type="submit" disabled={authLoading}>
                  {authLoading ? "Ingresando…" : "Iniciar sesión"}
                </button>
                <button className="account-link-button" type="button" onClick={requestPasswordReset} disabled={authLoading}>
                  Olvidé mi contraseña
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      {passwordSetupOpen && (
        <div className="overlay password-setup-overlay" role="dialog" aria-modal="true" aria-labelledby="password-setup-title">
          <section className="plans-panel login-only">
            <form className="account-panel embedded" onSubmit={submitPasswordSetup}>
              <p className="eyebrow">Cuenta Fullness</p>
              <h2 id="password-setup-title">
                {passwordSetupMode === "invite" ? "Crea tu contraseña" : "Nueva contraseña"}
              </h2>
              <p className="account-helper">
                {passwordSetupMode === "invite"
                  ? "Define tu contraseña para activar tu acceso a Fullness Lab."
                  : "Define una nueva contraseña para volver a entrar a tu cuenta."}
              </p>
              {passwordSetupMessage && <p className="form-note">{passwordSetupMessage}</p>}
              <label>
                Contraseña
                <span><Lock size={18} /><input required name="newPassword" type="password" placeholder="Mínimo 8 caracteres…" minLength={8} autoComplete="new-password" /></span>
              </label>
              <label>
                Repetir contraseña
                <span><Lock size={18} /><input required name="newPasswordConfirm" type="password" placeholder="Repite tu contraseña…" minLength={8} autoComplete="new-password" /></span>
              </label>
              <button className="primary-button full" type="submit" disabled={passwordSetupSaving}>
                {passwordSetupSaving ? "Guardando…" : "Guardar contraseña"}
              </button>
            </form>
          </section>
        </div>
      )}

      {adminOpen && (
        <div className="backoffice-overlay" role="dialog" aria-modal="true" aria-labelledby="backoffice-title">
          <section className="backoffice-panel">
            <header className="backoffice-header">
              <div>
                <p className="eyebrow">Backoffice</p>
                <h2 id="backoffice-title">Panel Fullness</h2>
                <p className="backoffice-header-subtitle">
                  {activeIsAdmin
                    ? "Gestiona contenido, tienda, comunidad y operaciones desde un solo lugar."
                    : "Exporta listados y ayuda a las personas a recuperar su acceso."}
                </p>
              </div>
              <div className="backoffice-header-actions">
                {activeIsAdmin && (
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => refreshAdminItems()}
                    aria-label="Actualizar meal preps"
                    disabled={adminLoading}
                  >
                    <RefreshCw size={20} />
                  </button>
                )}
                <button className="icon-button close-inline" type="button" onClick={closeBackoffice} aria-label="Cerrar backoffice">
                  <X size={22} />
                </button>
              </div>
            </header>

            {!hasBackofficeAccess ? (
              <div className="backoffice-state">
                <ShieldCheck size={34} />
                <h3>Acceso administrador</h3>
                <p>Inicia sesión con una cuenta autorizada para gestionar los meal preps.</p>
                <button className="primary-button" type="button" onClick={() => {
                  setAdminOpen(false);
                  setAccountOpen(true);
                }}>
                  <Lock size={18} />
                  Iniciar sesión
                </button>
              </div>
            ) : (
              <>
                {(adminError || adminMessage) && (
                  <p className={`backoffice-alert ${adminError ? "is-error" : "is-success"}`} role="status">
                    {adminError || adminMessage}
                  </p>
                )}

                <div className="backoffice-dashboard">
                  <aside className="backoffice-module-nav" aria-label="Módulos del backoffice">
                    <div className="backoffice-module-summary">
                      <span>{currentAdminModule.label}</span>
                      <strong>{currentAdminModule.description}</strong>
                    </div>
                    <div className="backoffice-module-buttons" role="tablist" aria-label="Secciones del backoffice">
                      {adminModuleItems.map(({ id, label, description, Icon }) => (
                        <button
                          className={`backoffice-module-button ${activeBackofficeModule === id ? "is-active" : ""}`}
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={activeBackofficeModule === id}
                          onClick={() => openBackofficeModule(id)}
                        >
                          <Icon size={18} />
                          <span>
                            <strong>{label}</strong>
                            <small>{description}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </aside>

                  <div className="backoffice-module-content">
                    {activeBackofficeModule === "meal-preps" && (
                      <div className="backoffice-catalog-view">
                  <section className="backoffice-catalog-panel" aria-label="Meal preps configurados">
                    <div className="backoffice-catalog-heading">
                      <div>
                        <p className="eyebrow">Catálogo</p>
                        <h3>Meal preps</h3>
                        <p>{mealPrepItems.length} planes configurados. Abre uno para editarlo o crea un plan nuevo.</p>
                      </div>
                      <button className="primary-button" type="button" onClick={startNewMealPrep}>
                        <Plus size={17} />
                        Nuevo meal prep
                      </button>
                    </div>

                    <div className="backoffice-catalog-tools">
                      <label className="backoffice-search-field">
                        <span>Buscar meal prep</span>
                        <div>
                          <Search size={18} aria-hidden="true" />
                          <input
                            type="search"
                            value={mealPrepSearch}
                            onChange={(event) => setMealPrepSearch(event.target.value)}
                            placeholder="Buscar por nombre o frecuencia…"
                          />
                        </div>
                      </label>
                      <p aria-live="polite">
                        {filteredMealPrepItems.length} {filteredMealPrepItems.length === 1 ? "resultado" : "resultados"}
                      </p>
                    </div>

                    {adminLoading ? (
                      <p className="backoffice-muted">Cargando meal preps…</p>
                    ) : filteredMealPrepItems.length > 0 ? (
                      <div className="backoffice-catalog-list">
                        {filteredMealPrepItems.map((item) => (
                          <article className={`backoffice-menu-card ${menuForm.id === item.id ? "is-selected" : ""}`} key={item.id}>
                            <button className="backoffice-menu-main" type="button" onClick={() => openMealPrepForEditing(item)}>
                              <img src={item.image || mediaSrc("assets/fullness-food-crop.jpeg")} alt="" aria-hidden="true" />
                              <span>
                                <strong>{item.name}</strong>
                                <small>{item.planFrequency === "monthly" ? "Mensual" : "Semanal"} · {formatPrice(item.price)}</small>
                              </span>
                            </button>
                            <div className="backoffice-card-meta">
                              <span className={`status-pill ${item.isActive ? "is-active" : "is-inactive"}`}>
                                {item.isActive ? <CheckCircle2 size={15} /> : <EyeOff size={15} />}
                                {item.isActive ? "Activo" : "Inactivo"}
                              </span>
                              <span>Orden {item.displayOrder}</span>
                            </div>
                            <div className="backoffice-card-actions">
                              <button type="button" onClick={() => openMealPrepForEditing(item)} aria-label={`Editar ${item.name}`} title="Editar">
                                <Pencil size={16} />
                              </button>
                              <button type="button" onClick={() => removeMenuItem(item)} aria-label={`Eliminar ${item.name}`} title="Eliminar" disabled={adminSaving}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="backoffice-catalog-empty">
                        <Search size={24} aria-hidden="true" />
                        <p>{mealPrepSearch ? "No encontramos meal preps con esa búsqueda." : "Aún no hay meal preps configurados."}</p>
                      </div>
                    )}
                  </section>

                  {mealPrepEditorOpen && (
                    <div className="backoffice-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="meal-prep-editor-title">
                  <form className="backoffice-form backoffice-workspace-form" noValidate onSubmit={submitMenuItem}>
                    <div className="backoffice-form-head">
                      <div className="backoffice-workspace-title">
                        <button className="backoffice-back-button" type="button" onClick={closeMealPrepEditor} aria-label="Volver al listado de meal preps">
                          <ArrowLeft size={19} />
                        </button>
                        <div>
                          <p className="backoffice-breadcrumb">Meal preps / {menuForm.id ? "Editar" : "Nuevo"}</p>
                          <h3 id="meal-prep-editor-title">{menuForm.name || "Nuevo meal prep"}</h3>
                        </div>
                      </div>
                      <div className="backoffice-form-head-actions">
                        <div className={`backoffice-draft-status is-${menuFormDraftStatus}`} aria-live="polite">
                          {menuFormDraftStatus === "saving" ? <RefreshCw size={15} /> : menuFormDraftStatus === "local" ? <CloudOff size={15} /> : <Cloud size={15} />}
                          <span>
                            {menuFormDraftStatus === "saving"
                              ? "Guardando borrador"
                              : menuFormDraftStatus === "local"
                                ? "Borrador local"
                                : menuFormHasUnsavedChanges
                                  ? "Borrador guardado"
                                  : "Sin cambios"}
                          </span>
                        </div>
                        {relevantMenuFormDrafts.length > 0 && (
                          <label className="backoffice-draft-picker">
                            <History size={16} aria-hidden="true" />
                            <select
                              aria-label="Recuperar borrador"
                              value=""
                              onChange={(event) => {
                                const draft = relevantMenuFormDrafts.find((item) => item.draftKey === event.target.value);
                                if (draft) restoreMenuFormDraft(draft);
                              }}
                            >
                              <option value="">Borradores ({relevantMenuFormDrafts.length})</option>
                              {relevantMenuFormDrafts.map((draft) => (
                                <option key={draft.draftKey} value={draft.draftKey}>
                                  {draft.title} · {formatR2Date(draft.updatedAt)}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {menuFormHasUnsavedChanges && (
                          <button
                            className="backoffice-draft-discard"
                            type="button"
                            onClick={discardCurrentMenuFormDraft}
                            title="Descartar borrador"
                            aria-label="Descartar borrador"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <label className="backoffice-switch">
                          <input
                            name="isActive"
                            type="checkbox"
                            checked={menuForm.isActive}
                            onChange={updateMenuForm}
                          />
                          <span>
                            {menuForm.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                            {menuForm.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                      </div>
                    </div>

                    <p className="backoffice-intro-note">
                      Un meal prep reúne varios platos. Su información nutricional, tags y beneficios se obtienen automáticamente desde esos platos.
                    </p>

                    <div className="backoffice-editor-tabs" role="tablist" aria-label="Secciones del meal prep">
                      {[
                        ["general", "Información general"],
                        ["dishes", `Platos (${menuForm.includedItems.length})`],
                        ["publication", "Publicación"]
                      ].map(([id, label]) => (
                        <button
                          className={mealPrepEditorTab === id ? "is-active" : ""}
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={mealPrepEditorTab === id}
                          onClick={() => setMealPrepEditorTab(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {mealPrepEditorTab === "general" && (
                      <section className="backoffice-editor-section" aria-labelledby="meal-prep-general-title">
                        <header>
                          <p className="eyebrow">Paso 1</p>
                          <h4 id="meal-prep-general-title">Información del plan</h4>
                          <p>Define cómo se presenta el meal prep y las fotos de su caja completa.</p>
                        </header>
                    <div className="backoffice-grid">
                      <label>
                        Frecuencia
                        <select name="planFrequency" value={menuForm.planFrequency} onChange={updateMenuForm}>
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensual</option>
                        </select>
                      </label>
                      <label>
                        Nombre
                        <input required name="name" value={menuForm.name} onChange={updateMenuForm} placeholder="Plan semanal antinflamatorio…" />
                      </label>
                      <label>
                        Etiqueta
                        <input name="tag" value={menuForm.tag} onChange={updateMenuForm} placeholder="5 meal preps / 1 semana…" />
                      </label>
                      <label>
                        Precio CLP
                        <input required name="priceClp" type="number" min="0" step="1" value={menuForm.priceClp} onChange={updateMenuForm} placeholder="8990…" />
                      </label>
                      <label>
                        Porciones / duración
                        <input name="servingLabel" value={menuForm.servingLabel} onChange={updateMenuForm} placeholder="5 porciones individuales…" />
                      </label>
                    </div>

                    <label className="backoffice-wide">
                      Descripción
                      <textarea required name="description" rows="3" value={menuForm.description} onChange={updateMenuForm} placeholder="Pescado del sur, raíces dulces, hojas verdes y granos integrales…" />
                    </label>

                    <BackofficePhotoEditor
                      primaryUrl={menuForm.photoUrl}
                      secondaryUrl={menuForm.secondaryPhotoUrl}
                      onPrimaryFile={(event) => handleMenuPhotoChange(event, "primary")}
                      onSecondaryFile={(event) => handleMenuPhotoChange(event, "secondary")}
                      onPrimaryUrlChange={(photoUrl) => {
                        markMenuFormChanged();
                        setMenuForm((current) => ({ ...current, photoUrl }));
                      }}
                      onSecondaryUrlChange={(secondaryPhotoUrl) => {
                        markMenuFormChanged();
                        setMenuForm((current) => ({ ...current, secondaryPhotoUrl }));
                      }}
                      disabled={photoUploading || adminSaving}
                      uploading={photoUploading}
                      idPrefix="meal-prep"
                    />
                      </section>
                    )}

                    {mealPrepEditorTab === "publication" && (
                      <section className="backoffice-editor-section" aria-labelledby="meal-prep-publication-title">
                        <header>
                          <p className="eyebrow">Paso 3</p>
                          <h4 id="meal-prep-publication-title">Publicación</h4>
                          <p>Revisa el estado del plan y deja los ajustes técnicos sólo para casos especiales.</p>
                        </header>
                    <details className="backoffice-advanced-fields" open>
                      <summary>Ajustes avanzados del meal prep</summary>
                      <p>El código interno se genera automáticamente. Sólo cambia los otros campos si necesitas un ajuste especial.</p>
                      <div className="backoffice-grid">
                        <label>
                          Código interno
                          <input value={menuForm.sku} readOnly aria-readonly="true" />
                        </label>
                        <label>
                          Dirección en la tienda
                          <input name="slug" value={menuForm.slug} onChange={updateMenuForm} placeholder="plan-semanal-antinflamatorio…" />
                        </label>
                        <label>
                          Posición en la tienda
                          <input name="displayOrder" type="number" step="1" value={menuForm.displayOrder} onChange={updateMenuForm} />
                        </label>
                        <label>
                          Texto del botón
                          <input name="purchaseLabel" value={menuForm.purchaseLabel} onChange={updateMenuForm} placeholder="Agregar plan semanal…" />
                        </label>
                      </div>
                    </details>
                      </section>
                    )}

                    {mealPrepEditorTab === "dishes" && (
                      <section className="backoffice-included-editor">
                        <div className="backoffice-list-top">
                          <div>
                            <p className="eyebrow">Paso 2</p>
                            <h3>Platos del meal prep</h3>
                            <p className="backoffice-section-copy">Cada plato conserva su propia nutrición, tags y beneficios. El meal prep los hereda automáticamente.</p>
                          </div>
                          <div className="included-editor-actions">
                            <select
                              aria-label="Plato desde biblioteca"
                              value={selectedLibraryMealId}
                              onChange={(event) => setSelectedLibraryMealId(event.target.value)}
                            >
                              <option value="">Biblioteca de platos</option>
                              {mealLibrary.filter((item) => item.isActive).map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                              ))}
                            </select>
                            <button className="backoffice-command" type="button" onClick={addSelectedLibraryMealToPlan} disabled={!selectedLibraryMealId}>
                              <Plus size={17} />
                              Cargar plato
                            </button>
                            <button className="backoffice-command" type="button" onClick={addIncludedMeal}>
                              <Plus size={17} />
                              Nuevo plato
                            </button>
                          </div>
                        </div>

                        {menuForm.includedItems.length === 0 ? (
                          <div className="backoffice-dish-empty">
                            <CookingPot size={28} aria-hidden="true" />
                            <h4>Este meal prep aún no tiene platos</h4>
                            <p>Crea un plato desde cero o añade uno ya guardado en Platos reutilizables.</p>
                            <button className="primary-button" type="button" onClick={addIncludedMeal}>
                              <Plus size={17} />
                              Crear primer plato
                            </button>
                          </div>
                        ) : (
                          <div className="backoffice-dish-list">
                            {menuForm.includedItems.map((meal, mealIndex) => (
                              <article className="included-editor-card" key={meal.id || mealIndex}>
                                <button className="backoffice-dish-main" type="button" onClick={() => openIncludedMealEditor(mealIndex)}>
                                  <span className="backoffice-dish-thumb">
                                    {meal.photoUrl ? (
                                      <img src={meal.photoUrl} alt="" width="112" height="84" />
                                    ) : (
                                      <CookingPot size={24} aria-hidden="true" />
                                    )}
                                  </span>
                                  <span className="backoffice-dish-copy">
                                    <small>Plato {mealIndex + 1}{meal.libraryMealId ? " · Reutilizable" : " · Dentro de este meal prep"}</small>
                                    <strong>{meal.name || "Plato sin nombre"}</strong>
                                    <span>
                                      {meal.tag || "Sin etiqueta"}
                                      {meal.benefitAssignments?.length ? ` · ${meal.benefitAssignments.length} beneficios` : ""}
                                    </span>
                                  </span>
                                </button>
                                <div className="backoffice-dish-actions">
                                  <button
                                    className="backoffice-command"
                                    type="button"
                                    onClick={() => openIncludedMealEditor(mealIndex)}
                                  >
                                    <Pencil size={16} />
                                    Editar plato
                                  </button>
                                  <button
                                    className="backoffice-icon-command"
                                    type="button"
                                    onClick={() => removeIncludedMeal(mealIndex)}
                                    aria-label={`Eliminar plato ${mealIndex + 1}`}
                                    title="Quitar del meal prep"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </section>
                    )}

                    {activeIncludedMeal && includedMealEditorIndex !== null && (
                      <div
                        className="backoffice-nested-editor-overlay"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="included-meal-editor-title"
                      >
                        <section className="backoffice-nested-editor">
                          <header className="backoffice-nested-editor-head">
                            <div className="backoffice-workspace-title">
                              <button
                                className="backoffice-back-button"
                                type="button"
                                onClick={closeIncludedMealEditor}
                                aria-label="Volver al meal prep"
                              >
                                <ArrowLeft size={19} />
                              </button>
                              <div>
                                <p className="backoffice-breadcrumb">
                                  Meal preps / {menuForm.name || "Nuevo meal prep"} / Plato {includedMealEditorIndex + 1}
                                </p>
                                <h3 id="included-meal-editor-title">{activeIncludedMeal.name || "Nuevo plato"}</h3>
                              </div>
                            </div>
                            <button
                              className="icon-button"
                              type="button"
                              onClick={closeIncludedMealEditor}
                              aria-label="Cerrar editor del plato"
                            >
                              <X size={20} />
                            </button>
                          </header>

                          <div className="backoffice-editing-context">
                            <CookingPot size={20} aria-hidden="true" />
                            <div>
                              <span>Estás editando un plato dentro de</span>
                              <strong>{menuForm.name || "este nuevo meal prep"}</strong>
                            </div>
                            <small>Código automático: {activeIncludedMeal.sku}</small>
                          </div>

                          <div className="backoffice-editor-mode" role="group" aria-label="Nivel de edición del plato">
                            <button
                              className={activeIncludedMeal.editorMode === "express" ? "is-active" : ""}
                              type="button"
                              onClick={() => updateIncludedMealForm(includedMealEditorIndex, "editorMode", "express")}
                            >
                              Rápida
                              <small>Nombre, descripción y foto principal</small>
                            </button>
                            <button
                              className={activeIncludedMeal.editorMode === "advanced" ? "is-active" : ""}
                              type="button"
                              onClick={() => updateIncludedMealForm(includedMealEditorIndex, "editorMode", "advanced")}
                            >
                              Completa
                              <small>Nutrición, beneficios, ingredientes y ambas fotos</small>
                            </button>
                          </div>

                          <div className="backoffice-nested-editor-body">
                            {activeIncludedMeal.editorMode === "express" ? (
                              <section className="backoffice-editor-section" aria-labelledby="quick-dish-title">
                                <header>
                                  <p className="eyebrow">Edición rápida</p>
                                  <h4 id="quick-dish-title">Lo esencial del plato</h4>
                                  <p>Estos datos bastan para dejar el plato creado y continuar armando el meal prep.</p>
                                </header>
                                <div className="backoffice-grid">
                                  <label>
                                    Nombre del plato
                                    <input
                                      value={activeIncludedMeal.name}
                                      onChange={(event) => updateIncludedMealForm(includedMealEditorIndex, "name", event.target.value)}
                                      placeholder="Pollo, camote y cúrcuma…"
                                    />
                                  </label>
                                  <label>
                                    Etiqueta breve
                                    <input
                                      value={activeIncludedMeal.tag}
                                      onChange={(event) => updateIncludedMealForm(includedMealEditorIndex, "tag", event.target.value)}
                                      placeholder="Energético…"
                                    />
                                  </label>
                                </div>
                                <label className="backoffice-wide">
                                  Descripción
                                  <textarea
                                    rows="4"
                                    value={activeIncludedMeal.description}
                                    onChange={(event) => updateIncludedMealForm(includedMealEditorIndex, "description", event.target.value)}
                                    placeholder="Describe qué incluye y qué caracteriza a este plato…"
                                  />
                                </label>
                                <BackofficePhotoEditor
                                  primaryUrl={activeIncludedMeal.photoUrl}
                                  secondaryUrl={activeIncludedMeal.secondaryPhotoUrl}
                                  onPrimaryFile={(event) => handleMenuPhotoChange(event, "mealPrimary", includedMealEditorIndex)}
                                  onSecondaryFile={(event) => handleMenuPhotoChange(event, "mealSecondary", includedMealEditorIndex)}
                                  onPrimaryUrlChange={(photoUrl) => updateIncludedMealForm(includedMealEditorIndex, "photoUrl", photoUrl)}
                                  onSecondaryUrlChange={(secondaryPhotoUrl) => updateIncludedMealForm(includedMealEditorIndex, "secondaryPhotoUrl", secondaryPhotoUrl)}
                                  disabled={photoUploading || adminSaving}
                                  uploading={photoUploading}
                                  idPrefix={`included-meal-${activeIncludedMeal.id}`}
                                  showSecondary={false}
                                />
                              </section>
                            ) : (
                              <>
                                <div className="backoffice-editor-tabs is-secondary" role="tablist" aria-label="Información completa del plato">
                                  {[
                                    ["details", "Información"],
                                    ["wellness", "Nutrición y beneficios"],
                                    ["photos", "Imágenes"]
                                  ].map(([id, label]) => (
                                    <button
                                      className={includedMealEditorTab === id ? "is-active" : ""}
                                      key={id}
                                      type="button"
                                      role="tab"
                                      aria-selected={includedMealEditorTab === id}
                                      onClick={() => setIncludedMealEditorTab(id)}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>

                                {includedMealEditorTab === "details" && (
                                  <section className="backoffice-editor-section" aria-labelledby="complete-dish-details-title">
                                    <header>
                                      <p className="eyebrow">Plato</p>
                                      <h4 id="complete-dish-details-title">Información e ingredientes</h4>
                                    </header>
                                    <div className="backoffice-grid">
                                      <label>
                                        Nombre del plato
                                        <input
                                          value={activeIncludedMeal.name}
                                          onChange={(event) => updateIncludedMealForm(includedMealEditorIndex, "name", event.target.value)}
                                          placeholder="Pollo, camote y cúrcuma…"
                                        />
                                      </label>
                                      <label>
                                        Etiqueta breve
                                        <input
                                          value={activeIncludedMeal.tag}
                                          onChange={(event) => updateIncludedMealForm(includedMealEditorIndex, "tag", event.target.value)}
                                          placeholder="Energético…"
                                        />
                                      </label>
                                    </div>
                                    <label className="backoffice-wide">
                                      Descripción
                                      <textarea
                                        rows="4"
                                        value={activeIncludedMeal.description}
                                        onChange={(event) => updateIncludedMealForm(includedMealEditorIndex, "description", event.target.value)}
                                        placeholder="Describe el plato incluido…"
                                      />
                                    </label>
                                    <div className="backoffice-grid">
                                      <label>
                                        Ingredientes
                                        <textarea
                                          rows="6"
                                          value={activeIncludedMeal.ingredients}
                                          onChange={(event) => updateIncludedMealForm(includedMealEditorIndex, "ingredients", event.target.value)}
                                          placeholder={"Pollo\nCamote\nCúrcuma…"}
                                        />
                                      </label>
                                      <label>
                                        Alérgenos
                                        <textarea
                                          rows="6"
                                          value={activeIncludedMeal.allergens}
                                          onChange={(event) => updateIncludedMealForm(includedMealEditorIndex, "allergens", event.target.value)}
                                          placeholder={"Pescado\nFrutos secos…"}
                                        />
                                      </label>
                                    </div>
                                  </section>
                                )}

                                {includedMealEditorTab === "wellness" && (
                                  <section className="backoffice-editor-section" aria-labelledby="complete-dish-wellness-title">
                                    <header>
                                      <p className="eyebrow">Ficha del plato</p>
                                      <h4 id="complete-dish-wellness-title">Nutrición y beneficios</h4>
                                      <p>Esta información pertenece al plato y será heredada por el meal prep.</p>
                                    </header>
                                    <label className="backoffice-wide">
                                      Descripción nutricional
                                      <textarea
                                        rows="3"
                                        value={activeIncludedMeal.nutritionDescription}
                                        onChange={(event) => updateIncludedMealForm(includedMealEditorIndex, "nutritionDescription", event.target.value)}
                                        placeholder="Proteína magra, carbohidrato complejo y especias funcionales…"
                                      />
                                    </label>
                                    <NutritionFactsEditor
                                      value={activeIncludedMeal.nutritionFacts}
                                      onChange={(nutritionFacts) => updateIncludedMealForm(includedMealEditorIndex, "nutritionFacts", nutritionFacts)}
                                      idPrefix={`included-meal-${activeIncludedMeal.id}-nutrition`}
                                    />
                                    <TagSelector
                                      definitions={tagDefinitions}
                                      value={activeIncludedMeal.tagIds}
                                      onChange={(tagIds) => updateIncludedMealForm(includedMealEditorIndex, "tagIds", tagIds)}
                                      idPrefix={`plan-${activeIncludedMeal.id}-tag`}
                                      onCreateQuick={createQuickTagDefinition}
                                    />
                                    <BenefitAssignmentEditor
                                      definitions={benefitDefinitions}
                                      value={activeIncludedMeal.benefitAssignments}
                                      onChange={(benefitAssignments) => updateIncludedMealForm(includedMealEditorIndex, "benefitAssignments", benefitAssignments)}
                                      idPrefix={`plan-${activeIncludedMeal.id}-benefit`}
                                      onCreateQuick={createQuickBenefitDefinition}
                                    />
                                  </section>
                                )}

                                {includedMealEditorTab === "photos" && (
                                  <section className="backoffice-editor-section" aria-labelledby="complete-dish-photos-title">
                                    <header>
                                      <p className="eyebrow">Imágenes</p>
                                      <h4 id="complete-dish-photos-title">Fotos del plato</h4>
                                      <p>La segunda foto aparecerá al pasar el cursor sobre el plato.</p>
                                    </header>
                                    <BackofficePhotoEditor
                                      primaryUrl={activeIncludedMeal.photoUrl}
                                      secondaryUrl={activeIncludedMeal.secondaryPhotoUrl}
                                      onPrimaryFile={(event) => handleMenuPhotoChange(event, "mealPrimary", includedMealEditorIndex)}
                                      onSecondaryFile={(event) => handleMenuPhotoChange(event, "mealSecondary", includedMealEditorIndex)}
                                      onPrimaryUrlChange={(photoUrl) => updateIncludedMealForm(includedMealEditorIndex, "photoUrl", photoUrl)}
                                      onSecondaryUrlChange={(secondaryPhotoUrl) => updateIncludedMealForm(includedMealEditorIndex, "secondaryPhotoUrl", secondaryPhotoUrl)}
                                      disabled={photoUploading || adminSaving}
                                      uploading={photoUploading}
                                      idPrefix={`included-meal-${activeIncludedMeal.id}`}
                                    />
                                  </section>
                                )}
                              </>
                            )}
                          </div>

                          <div className="backoffice-nested-editor-actions">
                            <div>
                              <span>{activeIncludedMeal.libraryMealId ? "Este plato proviene de Platos reutilizables." : "Este plato vive dentro del borrador del meal prep."}</span>
                              <small>Sus cambios quedarán protegidos aunque vuelvas al plan.</small>
                            </div>
                            <div>
                              {!activeIncludedMeal.libraryMealId && (
                                <button
                                  className="backoffice-command"
                                  type="button"
                                  onClick={() => saveIncludedMealToLibrary(includedMealEditorIndex)}
                                  disabled={includedMealSavingIndex !== null}
                                >
                                  {includedMealSavingIndex === includedMealEditorIndex ? <RefreshCw size={16} /> : <Save size={16} />}
                                  {includedMealSavingIndex === includedMealEditorIndex ? "Guardando…" : "Guardar para reutilizar"}
                                </button>
                              )}
                              <button className="primary-button" type="button" onClick={closeIncludedMealEditor}>
                                Listo, volver al meal prep
                              </button>
                            </div>
                          </div>
                        </section>
                      </div>
                    )}

                    <div className="backoffice-form-actions">
                      <div className="backoffice-action-copy">
                        <span>{menuFormHasUnsavedChanges ? "Tus cambios están protegidos como borrador." : "No hay cambios pendientes."}</span>
                        <small>Al guardar, el meal prep se actualizará junto con todos sus platos.</small>
                      </div>
                      <div className="backoffice-action-buttons">
                        <button className="google-button" type="button" onClick={closeMealPrepEditor} disabled={adminSaving}>
                          <ArrowLeft size={18} />
                          Volver al listado
                        </button>
                        {menuForm.includedItems.some((item) => !item.libraryMealId && item.name.trim()) && (
                          <button className="backoffice-command" type="button" onClick={saveAllIncludedMealsToLibrary} disabled={adminSaving || photoUploading || includedMealSavingIndex !== null}>
                            {includedMealSavingIndex === -1 ? <RefreshCw size={17} /> : <Save size={17} />}
                            {includedMealSavingIndex === -1 ? "Guardando platos…" : "Guardar platos para reutilizar"}
                          </button>
                        )}
                        <button className="primary-button" type="submit" disabled={adminSaving || photoUploading}>
                          {adminSaving ? <RefreshCw size={18} /> : <Save size={18} />}
                          {adminSaving ? "Guardando…" : "Guardar meal prep"}
                        </button>
                      </div>
                    </div>
                  </form>
                    </div>
                  )}
                </div>
                    )}

                    {activeBackofficeModule === "meal-library" && (
                      <div className="backoffice-layout backoffice-library-layout">
                        <aside className="backoffice-list" aria-label="Biblioteca de platos">
                          <div className="backoffice-list-top">
                            <h3>Platos</h3>
                            <button className="backoffice-command" type="button" onClick={resetMealLibraryForm}>
                              <Plus size={17} />
                              Nuevo
                            </button>
                          </div>
                          {mealLibraryLoading ? (
                            <p className="backoffice-muted">Cargando platos…</p>
                          ) : mealLibrary.length ? (
                            <div className="backoffice-menu-stack">
                              {mealLibrary.map((item) => (
                                <article className={`backoffice-menu-card ${mealLibraryForm.id === item.id ? "is-selected" : ""}`} key={item.id}>
                                  <button className="backoffice-menu-main" type="button" onClick={() => setMealLibraryForm(mealLibraryItemToForm(item))}>
                                    <img src={item.photoUrl || placeholderProductImage} alt="" aria-hidden="true" />
                                    <span>
                                      <strong>{item.name}</strong>
                                      <small>{item.tag || "Sin etiqueta"}</small>
                                    </span>
                                  </button>
                                  <div className="backoffice-card-meta">
                                    <span className={`status-pill ${item.isActive ? "is-active" : "is-inactive"}`}>
                                      {item.isActive ? <CheckCircle2 size={15} /> : <EyeOff size={15} />}
                                      {item.isActive ? "Activo" : "Inactivo"}
                                    </span>
                                  </div>
                                  <div className="backoffice-card-actions">
                                    <button type="button" onClick={() => setMealLibraryForm(mealLibraryItemToForm(item))} aria-label={`Editar ${item.name}`}>
                                      <Pencil size={16} />
                                    </button>
                                    <button type="button" onClick={() => removeMealLibraryItem(item)} aria-label={`Eliminar ${item.name}`} disabled={mealLibrarySaving || mealLibraryPhotoUploading}>
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="backoffice-muted">Sin platos en biblioteca.</p>
                          )}
                        </aside>

                        <form className="backoffice-form" onSubmit={submitMealLibraryItem}>
                          <div className="backoffice-form-head">
                            <div>
                              <p className="eyebrow">{mealLibraryForm.id ? "Editar" : "Nuevo"}</p>
                              <h3>{mealLibraryForm.name || "Plato reutilizable"}</h3>
                            </div>
                            <label className="backoffice-switch">
                              <input name="isActive" type="checkbox" checked={mealLibraryForm.isActive} onChange={updateMealLibraryForm} />
                              <span>{mealLibraryForm.isActive ? <Eye size={16} /> : <EyeOff size={16} />}{mealLibraryForm.isActive ? "Activo" : "Inactivo"}</span>
                            </label>
                          </div>
                          {(mealLibraryError || mealLibraryMessage) && (
                            <p className={`backoffice-alert ${mealLibraryError ? "is-error" : "is-success"}`} role="status">
                              {mealLibraryError || mealLibraryMessage}
                            </p>
                          )}
                          <div className="backoffice-grid">
                            <label>Nombre<input required name="name" value={mealLibraryForm.name} onChange={updateMealLibraryForm} placeholder="Pollo, camote y cúrcuma…" /></label>
                            <label>Etiqueta<input name="tag" value={mealLibraryForm.tag} onChange={updateMealLibraryForm} placeholder="Energético…" /></label>
                          </div>
                          <label className="backoffice-wide">Descripción<textarea required name="description" rows="3" value={mealLibraryForm.description} onChange={updateMealLibraryForm} placeholder="Describe el plato reutilizable…" /></label>
                          <BackofficePhotoEditor
                            primaryUrl={mealLibraryForm.photoUrl}
                            secondaryUrl={mealLibraryForm.secondaryPhotoUrl}
                            onPrimaryFile={(event) => handleMealLibraryPhotoChange(event)}
                            onSecondaryFile={(event) => handleMealLibraryPhotoChange(event, "secondary")}
                            onPrimaryUrlChange={(photoUrl) => setMealLibraryForm((current) => ({ ...current, photoUrl }))}
                            onSecondaryUrlChange={(secondaryPhotoUrl) => setMealLibraryForm((current) => ({ ...current, secondaryPhotoUrl }))}
                            disabled={mealLibrarySaving || mealLibraryPhotoUploading}
                            uploading={mealLibraryPhotoUploading}
                            idPrefix="library-meal"
                          />
                          <TagSelector
                            definitions={tagDefinitions}
                            value={mealLibraryForm.tagIds}
                            onChange={(tagIds) => setMealLibraryForm((current) => ({ ...current, tagIds }))}
                            idPrefix="library-tag"
                            onCreateQuick={createQuickTagDefinition}
                          />
                          <BenefitAssignmentEditor
                            definitions={benefitDefinitions}
                            value={mealLibraryForm.benefitAssignments}
                            onChange={(benefitAssignments) => setMealLibraryForm((current) => ({ ...current, benefitAssignments }))}
                            idPrefix="library-benefit"
                            onCreateQuick={createQuickBenefitDefinition}
                          />
                          <label className="backoffice-wide">Ingredientes<textarea name="ingredients" rows="4" value={mealLibraryForm.ingredients} onChange={updateMealLibraryForm} placeholder={"Pollo\nCamote\nCúrcuma…"} /></label>
                          <label className="backoffice-wide">Descripción nutricional<textarea name="nutritionDescription" rows="3" value={mealLibraryForm.nutritionDescription} onChange={updateMealLibraryForm} /></label>
                          <NutritionFactsEditor
                            value={mealLibraryForm.nutritionFacts}
                            onChange={(nutritionFacts) => setMealLibraryForm((current) => ({ ...current, nutritionFacts }))}
                            idPrefix="library-meal-nutrition"
                          />
                          <label className="backoffice-wide">Alérgenos<textarea name="allergens" rows="3" value={mealLibraryForm.allergens} onChange={updateMealLibraryForm} placeholder={"Pescado\nFrutos secos…"} /></label>
                          <details className="backoffice-advanced-fields">
                            <summary>Información interna del plato</summary>
                            <p>El código se genera automáticamente y no necesitas modificarlo.</p>
                            <label>
                              Código automático
                              <input value={mealLibraryForm.sku} readOnly aria-readonly="true" />
                            </label>
                          </details>
                          <div className="backoffice-form-actions">
                            <button className="google-button" type="button" onClick={resetMealLibraryForm} disabled={mealLibrarySaving || mealLibraryPhotoUploading}><Plus size={18} />Nuevo</button>
                            <button className="primary-button" type="submit" disabled={mealLibrarySaving || mealLibraryPhotoUploading}>{mealLibrarySaving ? <RefreshCw size={18} /> : <Save size={18} />}{mealLibrarySaving ? "Guardando…" : "Guardar plato"}</button>
                          </div>
                        </form>
                      </div>
                    )}

                    {activeBackofficeModule === "family-products" && (
                      <div className="backoffice-catalog-view">
                        <section className="backoffice-catalog-panel" aria-label="Platos familiares configurados">
                          <div className="backoffice-catalog-heading">
                            <div>
                              <p className="eyebrow">Catálogo</p>
                              <h3>Platos familiares</h3>
                              <p>Preparaciones de formato familiar vendidas directamente, con su propia ficha nutricional.</p>
                            </div>
                            <button className="primary-button" type="button" onClick={startNewFamilyProduct}>
                              <Plus size={17} />
                              Nuevo plato familiar
                            </button>
                          </div>

                          <div className="backoffice-catalog-tools">
                            <label className="backoffice-search-field">
                              <span>Buscar plato familiar</span>
                              <div>
                                <Search size={18} aria-hidden="true" />
                                <input
                                  type="search"
                                  value={familyProductSearch}
                                  onChange={(event) => setFamilyProductSearch(event.target.value)}
                                  placeholder="Buscar por nombre o etiqueta…"
                                />
                              </div>
                            </label>
                            <p aria-live="polite">
                              {filteredFamilyProductItems.length} {filteredFamilyProductItems.length === 1 ? "resultado" : "resultados"}
                            </p>
                          </div>

                          {adminLoading ? (
                            <p className="backoffice-muted">Cargando platos familiares…</p>
                          ) : filteredFamilyProductItems.length ? (
                            <div className="backoffice-catalog-list">
                              {filteredFamilyProductItems.map((item) => (
                                <article className={`backoffice-menu-card ${menuForm.id === item.id ? "is-selected" : ""}`} key={item.id}>
                                  <button className="backoffice-menu-main" type="button" onClick={() => openFamilyProductForEditing(item)}>
                                    <img src={item.image || placeholderProductImage} alt="" aria-hidden="true" />
                                    <span>
                                      <strong>{item.name}</strong>
                                      <small>Formato familiar · {formatPrice(item.price)}</small>
                                    </span>
                                  </button>
                                  <div className="backoffice-card-meta">
                                    <span className={`status-pill ${item.isActive ? "is-active" : "is-inactive"}`}>
                                      {item.isActive ? <CheckCircle2 size={15} /> : <EyeOff size={15} />}
                                      {item.isActive ? "Activo" : "Inactivo"}
                                    </span>
                                    <span>Orden {item.displayOrder}</span>
                                  </div>
                                  <div className="backoffice-card-actions">
                                    <button type="button" onClick={() => openFamilyProductForEditing(item)} aria-label={`Editar ${item.name}`} title="Editar">
                                      <Pencil size={16} />
                                    </button>
                                    <button type="button" onClick={() => removeMenuItem(item)} aria-label={`Eliminar ${item.name}`} title="Eliminar" disabled={adminSaving}>
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div className="backoffice-catalog-empty">
                              <Search size={24} aria-hidden="true" />
                              <p>{familyProductSearch ? "No encontramos platos con esa búsqueda." : "Aún no hay platos familiares configurados."}</p>
                            </div>
                          )}
                        </section>

                        {familyProductEditorOpen && (
                          <div className="backoffice-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="family-product-editor-title">
                            <form className="backoffice-form backoffice-workspace-form" noValidate onSubmit={submitMenuItem}>
                              <div className="backoffice-form-head">
                                <div className="backoffice-workspace-title">
                                  <button className="backoffice-back-button" type="button" onClick={closeFamilyProductEditor} aria-label="Volver al listado de platos familiares">
                                    <ArrowLeft size={19} />
                                  </button>
                                  <div>
                                    <p className="backoffice-breadcrumb">Platos familiares / {menuForm.id ? "Editar" : "Nuevo"}</p>
                                    <h3 id="family-product-editor-title">{menuForm.name || "Nuevo plato familiar"}</h3>
                                  </div>
                                </div>
                                <div className="backoffice-form-head-actions">
                                  <div className={`backoffice-draft-status is-${menuFormDraftStatus}`} aria-live="polite">
                                    {menuFormDraftStatus === "saving" ? <RefreshCw size={15} /> : menuFormDraftStatus === "local" ? <CloudOff size={15} /> : <Cloud size={15} />}
                                    <span>
                                      {menuFormDraftStatus === "saving"
                                        ? "Guardando borrador"
                                        : menuFormDraftStatus === "local"
                                          ? "Borrador local"
                                          : menuFormHasUnsavedChanges
                                            ? "Borrador guardado"
                                            : "Sin cambios"}
                                    </span>
                                  </div>
                                  <label className="backoffice-switch">
                                    <input name="isActive" type="checkbox" checked={menuForm.isActive} onChange={updateMenuForm} />
                                    <span>{menuForm.isActive ? <Eye size={16} /> : <EyeOff size={16} />}{menuForm.isActive ? "Activo" : "Inactivo"}</span>
                                  </label>
                                </div>
                              </div>

                              <p className="backoffice-intro-note">
                                Un plato familiar es una preparación individual de formato grande. Por eso su nutrición, tags y beneficios se editan en esta ficha.
                              </p>

                              <div className="backoffice-editor-tabs" role="tablist" aria-label="Secciones del plato familiar">
                                {[
                                  ["general", "Información general"],
                                  ["wellness", "Nutrición y beneficios"],
                                  ["publication", "Publicación"]
                                ].map(([id, label]) => (
                                  <button
                                    className={familyProductEditorTab === id ? "is-active" : ""}
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={familyProductEditorTab === id}
                                    onClick={() => setFamilyProductEditorTab(id)}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>

                              {familyProductEditorTab === "general" && (
                                <section className="backoffice-editor-section" aria-labelledby="family-general-title">
                                  <header>
                                    <p className="eyebrow">Plato familiar</p>
                                    <h4 id="family-general-title">Información del producto</h4>
                                    <p>Puedes comenzar desde un plato reutilizable y ajustar después el precio y formato familiar.</p>
                                  </header>

                                  <div className="backoffice-library-loader">
                                    <label>
                                      Usar un plato ya guardado
                                      <select value={selectedLibraryMealId} onChange={(event) => setSelectedLibraryMealId(event.target.value)}>
                                        <option value="">Seleccionar plato reutilizable…</option>
                                        {mealLibrary.filter((item) => item.isActive).map((item) => (
                                          <option key={item.id} value={item.id}>{item.name}</option>
                                        ))}
                                      </select>
                                    </label>
                                    <button className="backoffice-command" type="button" onClick={loadSelectedLibraryMealIntoFamily} disabled={!selectedLibraryMealId}>
                                      Cargar información
                                    </button>
                                  </div>

                                  <div className="backoffice-grid">
                                    <label>
                                      Nombre
                                      <input required name="name" value={menuForm.name} onChange={updateMenuForm} placeholder="Apple golden chicken…" />
                                    </label>
                                    <label>
                                      Etiqueta breve
                                      <input name="tag" value={menuForm.tag} onChange={updateMenuForm} placeholder="6 porciones · Congelado…" />
                                    </label>
                                    <label>
                                      Precio CLP
                                      <input required name="priceClp" type="number" min="0" step="1" value={menuForm.priceClp} onChange={updateMenuForm} placeholder="18800…" />
                                    </label>
                                    <label>
                                      Porciones / conservación
                                      <input name="servingLabel" value={menuForm.servingLabel} onChange={updateMenuForm} placeholder="6 porciones · 3 meses congelado…" />
                                    </label>
                                  </div>
                                  <label className="backoffice-wide">
                                    Descripción
                                    <textarea required name="description" rows="4" value={menuForm.description} onChange={updateMenuForm} placeholder="Describe el plato familiar…" />
                                  </label>
                                  <BackofficePhotoEditor
                                    primaryUrl={menuForm.photoUrl}
                                    secondaryUrl={menuForm.secondaryPhotoUrl}
                                    onPrimaryFile={(event) => handleMenuPhotoChange(event, "primary")}
                                    onSecondaryFile={(event) => handleMenuPhotoChange(event, "secondary")}
                                    onPrimaryUrlChange={(photoUrl) => {
                                      markMenuFormChanged();
                                      setMenuForm((current) => ({ ...current, photoUrl }));
                                    }}
                                    onSecondaryUrlChange={(secondaryPhotoUrl) => {
                                      markMenuFormChanged();
                                      setMenuForm((current) => ({ ...current, secondaryPhotoUrl }));
                                    }}
                                    disabled={photoUploading || adminSaving}
                                    uploading={photoUploading}
                                    idPrefix="family-product"
                                  />
                                </section>
                              )}

                              {familyProductEditorTab === "wellness" && (
                                <section className="backoffice-editor-section" aria-labelledby="family-wellness-title">
                                  <header>
                                    <p className="eyebrow">Ficha del plato</p>
                                    <h4 id="family-wellness-title">Nutrición y beneficios</h4>
                                    <p>Esta información se mostrará en el detalle del plato familiar.</p>
                                  </header>
                                  <TagSelector
                                    definitions={tagDefinitions}
                                    value={menuForm.tagIds}
                                    onChange={(tagIds) => {
                                      markMenuFormChanged();
                                      setMenuForm((current) => ({ ...current, tagIds }));
                                    }}
                                    idPrefix="family-tag"
                                    onCreateQuick={createQuickTagDefinition}
                                  />
                                  <BenefitAssignmentEditor
                                    definitions={benefitDefinitions}
                                    value={menuForm.benefitAssignments}
                                    onChange={(benefitAssignments) => {
                                      markMenuFormChanged();
                                      setMenuForm((current) => ({ ...current, benefitAssignments }));
                                    }}
                                    idPrefix="family-benefit"
                                    onCreateQuick={createQuickBenefitDefinition}
                                  />
                                  <div className="backoffice-grid">
                                    <label>
                                      Ingredientes
                                      <textarea name="ingredients" rows="6" value={menuForm.ingredients} onChange={updateMenuForm} placeholder={"Pollo\nCamote\nCúrcuma…"} />
                                    </label>
                                    <label>
                                      Alérgenos
                                      <textarea name="allergens" rows="6" value={menuForm.allergens} onChange={updateMenuForm} placeholder={"Pescado\nFrutos secos…"} />
                                    </label>
                                  </div>
                                  <label className="backoffice-wide">
                                    Descripción nutricional
                                    <textarea name="nutritionDescription" rows="3" value={menuForm.nutritionDescription} onChange={updateMenuForm} placeholder="Resume el aporte nutricional del plato…" />
                                  </label>
                                  <NutritionFactsEditor
                                    value={menuForm.nutritionFacts}
                                    onChange={(nutritionFacts) => {
                                      markMenuFormChanged();
                                      setMenuForm((current) => ({ ...current, nutritionFacts }));
                                    }}
                                    idPrefix="family-product-nutrition"
                                  />
                                  <div className="backoffice-grid">
                                    <label>
                                      Resumen de preparación
                                      <textarea name="recipeSummary" rows="4" value={menuForm.recipeSummary} onChange={updateMenuForm} placeholder="Indicaciones generales…" />
                                    </label>
                                    <label>
                                      Pasos
                                      <textarea name="recipeSteps" rows="4" value={menuForm.recipeSteps} onChange={updateMenuForm} placeholder={"Retirar del congelador\nCalentar\nServir…"} />
                                    </label>
                                  </div>
                                </section>
                              )}

                              {familyProductEditorTab === "publication" && (
                                <section className="backoffice-editor-section" aria-labelledby="family-publication-title">
                                  <header>
                                    <p className="eyebrow">Publicación</p>
                                    <h4 id="family-publication-title">Visibilidad y orden</h4>
                                  </header>
                                  <details className="backoffice-advanced-fields" open>
                                    <summary>Ajustes del producto</summary>
                                    <p>El código interno se genera automáticamente.</p>
                                    <div className="backoffice-grid">
                                      <label>
                                        Código automático
                                        <input value={menuForm.sku} readOnly aria-readonly="true" />
                                      </label>
                                      <label>
                                        Dirección en la tienda
                                        <input name="slug" value={menuForm.slug} onChange={updateMenuForm} placeholder="apple-golden-chicken…" />
                                      </label>
                                      <label>
                                        Posición en la tienda
                                        <input name="displayOrder" type="number" step="1" value={menuForm.displayOrder} onChange={updateMenuForm} />
                                      </label>
                                      <label>
                                        Texto del botón
                                        <input name="purchaseLabel" value={menuForm.purchaseLabel} onChange={updateMenuForm} placeholder="Agregar al carrito…" />
                                      </label>
                                    </div>
                                  </details>
                                </section>
                              )}

                              <div className="backoffice-form-actions">
                                <div className="backoffice-action-copy">
                                  <span>{menuFormHasUnsavedChanges ? "Tus cambios están protegidos como borrador." : "No hay cambios pendientes."}</span>
                                  <small>Al guardar, esta ficha se actualizará en Platos familiares.</small>
                                </div>
                                <div className="backoffice-action-buttons">
                                  <button className="google-button" type="button" onClick={closeFamilyProductEditor} disabled={adminSaving}>
                                    <ArrowLeft size={18} />
                                    Volver al listado
                                  </button>
                                  <button className="primary-button" type="submit" disabled={adminSaving || photoUploading}>
                                    {adminSaving ? <RefreshCw size={18} /> : <Save size={18} />}
                                    {adminSaving ? "Guardando…" : "Guardar plato familiar"}
                                  </button>
                                </div>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    )}

                    {activeBackofficeModule === "parameters" && (
                      <CatalogParametersAdmin
                        benefits={benefitDefinitions}
                        tags={tagDefinitions}
                        loading={catalogParametersLoading}
                        saving={catalogParametersSaving}
                        message={catalogParametersMessage}
                        error={catalogParametersError}
                        onRefresh={() => refreshCatalogParameters()}
                        onSaveBenefit={submitBenefitDefinition}
                        onDeleteBenefit={removeBenefitDefinition}
                        onSaveTag={submitTagDefinition}
                        onDeleteTag={removeTagDefinition}
                        onUploadBenefitIcon={uploadBenefitIcon}
                      />
                    )}

                    {activeBackofficeModule === "subscriptions" && (
                      <section className="backoffice-side-panel backoffice-module-panel subscriptions-panel" aria-labelledby="subscriptions-title">
                        <div className="backoffice-list-top">
                          <h3 id="subscriptions-title">Clientes con suscripción</h3>
                          <button className="icon-button" type="button" onClick={refreshSubscriptionCustomers} aria-label="Actualizar suscripciones" disabled={subscriptionsLoading}><RefreshCw size={18} /></button>
                        </div>
                        <div className="subscription-filters" aria-label="Filtros de suscripciones">
                          <label><Filter size={16} /><span>Estado</span><select value={subscriptionFilter.status} onChange={(event) => setSubscriptionFilter((current) => ({ ...current, status: event.target.value }))}><option value="all">Todos</option><option value="active">Activas</option><option value="paused">Pausadas</option><option value="cancelled">Canceladas</option></select></label>
                          <label><span>Frecuencia</span><select value={subscriptionFilter.frequency} onChange={(event) => setSubscriptionFilter((current) => ({ ...current, frequency: event.target.value }))}><option value="all">Semanal y mensual</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select></label>
                          <label><span>Buscar</span><input value={subscriptionFilter.query} onChange={(event) => setSubscriptionFilter((current) => ({ ...current, query: event.target.value }))} placeholder="Nombre, correo o plan…" /></label>
                        </div>
                        {subscriptionsError && <p className="backoffice-alert is-error" role="status">{subscriptionsError}</p>}
                        {subscriptionsLoading ? (
                          <p className="backoffice-muted">Cargando suscripciones…</p>
                        ) : filteredSubscriptions.length ? (
                          <div className="subscription-customer-table" role="table" aria-label="Clientes con suscripción">
                            <div className="subscription-customer-row is-header" role="row"><span>Cliente</span><span>Plan</span><span>Frecuencia</span><span>Estado</span><span>Próximo despacho</span></div>
                            {filteredSubscriptions.map((subscription) => (
                              <div className="subscription-customer-row" key={subscription.id} role="row">
                                <span><strong>{subscription.customerName}</strong><small>{subscription.customerEmail}</small></span>
                                <span>{subscription.planName}</span>
                                <span>{subscription.frequency === "monthly" ? "Mensual" : "Semanal"}</span>
                                <span><b className={`subscription-status is-${subscription.status}`}>{subscription.status === "active" ? "Activa" : subscription.status === "paused" ? "Pausada" : "Cancelada"}</b></span>
                                <span>{formatSubscriptionDate(subscription.nextDeliveryAt)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="backoffice-muted">Sin clientes para estos filtros.</p>
                        )}
                      </section>
                    )}

                    {activeBackofficeModule === "shop" && (
                    <section className="backoffice-side-panel backoffice-module-panel" aria-labelledby="shop-settings-title">
                      <div className="backoffice-list-top">
                        <h3 id="shop-settings-title">Tienda</h3>
                      </div>
                      {(shopSettingsError || shopSettingsMessage) && (
                        <p className={`backoffice-alert ${shopSettingsError ? "is-error" : "is-success"}`} role="status">
                          {shopSettingsError || shopSettingsMessage}
                        </p>
                      )}
                      <form className="shop-settings-admin-form" onSubmit={submitShopSettings}>
                        <label>
                          Eyebrow hero
                          <input name="heroEyebrow" value={shopSettingsForm.heroEyebrow} onChange={updateShopSettingsForm} />
                        </label>
                        <label>
                          Título hero
                          <textarea required name="heroTitle" rows="3" value={shopSettingsForm.heroTitle} onChange={updateShopSettingsForm} />
                        </label>
                        <label>
                          Bajada hero
                          <textarea required name="heroBody" rows="4" value={shopSettingsForm.heroBody} onChange={updateShopSettingsForm} />
                        </label>

                        <div className="shop-settings-photo">
                          <div className="backoffice-photo-preview">
                            {shopSettingsForm.heroImageUrl ? (
                              <img src={shopSettingsForm.heroImageUrl} alt="" aria-hidden="true" />
                            ) : (
                              <UploadCloud size={28} />
                            )}
                          </div>
                          <label className="upload-control">
                            <UploadCloud size={18} />
                            {shopHeroUploading ? "Subiendo…" : "Subir hero"}
                            <input type="file" accept="image/*" onChange={handleShopHeroPhotoChange} disabled={shopHeroUploading || shopSettingsSaving} />
                          </label>
                        </div>

                        <label>
                          URL imagen hero
                          <input name="heroImageUrl" value={shopSettingsForm.heroImageUrl} onChange={updateShopSettingsForm} placeholder="/api/media?key=images/meal-preps/…" />
                        </label>

                        <div className="shop-settings-two">
                          <label>
                            Botón principal
                            <input name="heroPrimaryLabel" value={shopSettingsForm.heroPrimaryLabel} onChange={updateShopSettingsForm} />
                          </label>
                          <label>
                            Botón secundario
                            <input name="heroSecondaryLabel" value={shopSettingsForm.heroSecondaryLabel} onChange={updateShopSettingsForm} />
                          </label>
                        </div>

                        <label>
                          Métricas hero
                          <textarea name="heroMetrics" rows="4" value={shopSettingsForm.heroMetrics} onChange={updateShopSettingsForm} placeholder={"5 proteínas independientes\n5 acompañamientos independientes"} />
                        </label>

                        <label>
                          Eyebrow suscripción
                          <input name="subscriptionEyebrow" value={shopSettingsForm.subscriptionEyebrow} onChange={updateShopSettingsForm} />
                        </label>
                        <label>
                          Título suscripción
                          <textarea required name="subscriptionTitle" rows="3" value={shopSettingsForm.subscriptionTitle} onChange={updateShopSettingsForm} />
                        </label>
                        <label>
                          Bajada suscripción
                          <textarea required name="subscriptionBody" rows="3" value={shopSettingsForm.subscriptionBody} onChange={updateShopSettingsForm} />
                        </label>
                        <label>
                          Botón suscripción
                          <input name="subscriptionCtaLabel" value={shopSettingsForm.subscriptionCtaLabel} onChange={updateShopSettingsForm} />
                        </label>
                        <label>
                          Beneficios suscripción
                          <textarea name="subscriptionBenefits" rows="5" value={shopSettingsForm.subscriptionBenefits} onChange={updateShopSettingsForm} placeholder={"4 semanas diferentes cada mes\nMenús renovados constantemente"} />
                        </label>
                        <label>
                          Tabla comparativa
                          <textarea name="subscriptionComparison" rows="6" value={shopSettingsForm.subscriptionComparison} onChange={updateShopSettingsForm} placeholder={"Precio | Mejor valor | Precio normal\nRenovación | Automática | Manual"} />
                        </label>

                        <button className="primary-button" type="submit" disabled={shopSettingsSaving || shopHeroUploading}>
                          {shopSettingsSaving ? <RefreshCw size={18} /> : <Save size={18} />}
                          {shopSettingsSaving ? "Guardando…" : "Guardar tienda"}
                        </button>
                      </form>
                    </section>
                    )}

                    {activeBackofficeModule === "lightbox" && (
                    <section className="backoffice-side-panel backoffice-module-panel" aria-labelledby="subscription-popup-admin-title">
                      <div className="backoffice-list-top">
                        <h3 id="subscription-popup-admin-title">Lightbox</h3>
                      </div>
                      {(subscriptionPopupAdminError || subscriptionPopupAdminMessage) && (
                        <p className={`backoffice-alert ${subscriptionPopupAdminError ? "is-error" : "is-success"}`} role="status">
                          {subscriptionPopupAdminError || subscriptionPopupAdminMessage}
                        </p>
                      )}
                      <form className="subscription-popup-admin-form" onSubmit={submitSubscriptionPopupSettings}>
                        <label className="backoffice-switch subscription-popup-enabled">
                          <input
                            name="enabled"
                            type="checkbox"
                            checked={subscriptionPopupForm.enabled}
                            onChange={updateSubscriptionPopupForm}
                          />
                          <span>
                            {subscriptionPopupForm.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                            {subscriptionPopupForm.enabled ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                        <label>
                          Título pequeño
                          <input name="eyebrow" value={subscriptionPopupForm.eyebrow} onChange={updateSubscriptionPopupForm} />
                        </label>
                        <label>
                          Texto grande
                          <textarea required name="title" rows="3" value={subscriptionPopupForm.title} onChange={updateSubscriptionPopupForm} />
                        </label>
                        <label>
                          Bajada
                          <textarea required name="body" rows="4" value={subscriptionPopupForm.body} onChange={updateSubscriptionPopupForm} />
                        </label>
                        <div className="shop-settings-two">
                          <label>
                            Botón suscripción
                            <input name="ctaLabel" value={subscriptionPopupForm.ctaLabel} onChange={updateSubscriptionPopupForm} />
                          </label>
                          <label>
                            Botón final
                            <input name="successCtaLabel" value={subscriptionPopupForm.successCtaLabel} onChange={updateSubscriptionPopupForm} />
                          </label>
                        </div>
                        <label>
                          Botón secundario
                          <input name="secondaryCtaLabel" value={subscriptionPopupForm.secondaryCtaLabel} onChange={updateSubscriptionPopupForm} />
                        </label>
                        <div className="subscription-popup-admin-preview">
                          <div className="backoffice-photo-preview">
                            {subscriptionPopupForm.backgroundUrl ? (
                              <img src={subscriptionPopupForm.backgroundUrl} alt="" aria-hidden="true" />
                            ) : (
                              <UploadCloud size={28} />
                            )}
                          </div>
                          <label className="upload-control">
                            <UploadCloud size={18} />
                            {subscriptionPopupUploading ? "Subiendo…" : "Subir fondo"}
                            <input type="file" accept="image/*" onChange={handleSubscriptionPopupBackgroundChange} disabled={subscriptionPopupUploading} />
                          </label>
                        </div>
                        <label>
                          URL imagen de fondo
                          <input name="backgroundUrl" value={subscriptionPopupForm.backgroundUrl} onChange={updateSubscriptionPopupForm} placeholder="/api/media?key=images/…" />
                        </label>
                        <div className="subscription-popup-admin-actions">
                          <button className="google-button" type="button" onClick={resetSubscriptionPopupSettings}>
                            Restaurar
                          </button>
                          <button className="primary-button" type="submit" disabled={subscriptionPopupUploading}>
                            <Save size={18} />
                            Guardar lightbox
                          </button>
                        </div>
                      </form>
                    </section>
                    )}

                    {activeBackofficeModule === "community" && (
                    <section className="backoffice-side-panel backoffice-module-panel" aria-labelledby="community-admin-title">
                      <div className="backoffice-list-top">
                        <h3 id="community-admin-title">Comunidad</h3>
                      </div>
                    <form className="community-admin-form" onSubmit={addCommunityActivity}>
                      <label>
                        Fecha
                        <input
                          required
                          name="date"
                          type="date"
                          value={communityActivityForm.date}
                          onChange={updateCommunityActivityForm}
                        />
                      </label>
                      <label>
                        Descripción
                        <textarea
                          required
                          name="description"
                          rows="3"
                          value={communityActivityForm.description}
                          onChange={updateCommunityActivityForm}
                          placeholder="Clase de cocina Antinflamatoria…"
                        />
                      </label>
                      <button className="backoffice-command" type="submit">
                        <Plus size={17} />
                        Agregar actividad
                      </button>
                    </form>
                    <div className="community-admin-list">
                      {communityActivities.map((activity, index) => {
                        const date = formatCommunityActivityDate(activity.date);

                        return (
                          <article key={`${activity.date}-${activity.description}-${index}`}>
                            <time dateTime={activity.date}>
                              {date.day} {date.month}
                            </time>
                            <p>{activity.description}</p>
                            <button type="button" onClick={() => removeCommunityActivity(index)} aria-label={`Eliminar ${activity.description}`}>
                              <Trash2 size={15} />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                    </section>
                    )}

                    {activeBackofficeModule === "site-tools" && activeIsAdmin && (
                      <section className="backoffice-side-panel backoffice-module-panel technical-tools-panel" aria-labelledby="technical-tools-title">
                        <div className="backoffice-list-top technical-tools-heading">
                          <div>
                            <p className="eyebrow">Administración técnica</p>
                            <h3 id="technical-tools-title">Respaldo y conexión</h3>
                          </div>
                        </div>

                        <section className="technical-tool-section" aria-labelledby="technical-data-title">
                          <div className="technical-tool-header">
                            <div>
                              <span className="technical-tool-icon"><Database size={18} /></span>
                              <h4 id="technical-data-title">Tablas de datos</h4>
                            </div>
                            <button
                              className="icon-button"
                              type="button"
                              onClick={loadTechnicalTables}
                              disabled={technicalTablesLoading}
                              aria-label="Actualizar tablas disponibles"
                              title="Actualizar"
                            >
                              <RefreshCw size={18} />
                            </button>
                          </div>

                          {technicalTablesLoading && technicalTables.length === 0 ? (
                            <p className="backoffice-muted">Cargando tablas...</p>
                          ) : (
                            <div className="technical-table-list" aria-label="Tablas disponibles para respaldo">
                              {technicalTables.map((table) => (
                                <div className="technical-table-row" key={table.key}>
                                  <span className="technical-table-glyph"><FileText size={17} /></span>
                                  <div>
                                    <strong>{table.label}</strong>
                                    <small>{table.description}</small>
                                  </div>
                                  <span className={`technical-availability ${table.available ? "is-available" : "is-locked"}`}>
                                    {table.available ? "Disponible" : "Mañana"}
                                  </span>
                                  <button
                                    className="icon-button"
                                    type="button"
                                    onClick={() => downloadTechnicalTable(table)}
                                    disabled={!table.available || technicalExporting === table.key}
                                    aria-label={`Descargar ${table.label} en CSV`}
                                    title="Descargar CSV"
                                  >
                                    {technicalExporting === table.key ? <RefreshCw size={18} /> : <FileDown size={18} />}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>

                        <section className="technical-tool-section" aria-labelledby="technical-r2-title">
                          <div className="technical-tool-header">
                            <div>
                              <span className="technical-tool-icon"><HardDrive size={18} /></span>
                              <h4 id="technical-r2-title">Archivos R2</h4>
                            </div>
                            <div className="technical-tool-actions">
                              <label className="visually-hidden" htmlFor="r2-prefix">Carpeta de R2</label>
                              <select id="r2-prefix" value={r2Prefix} onChange={handleR2PrefixChange}>
                                <option value="">Todo el bucket</option>
                                <option value="assets/">Assets</option>
                                <option value="images/">Imágenes</option>
                                <option value="images/meal-preps/">Meal preps</option>
                              </select>
                              <button className="backoffice-command" type="button" onClick={() => loadR2Objects()} disabled={r2Loading}>
                                {r2Loading ? <RefreshCw size={17} /> : <FolderOpen size={17} />}
                                {r2Loading ? "Cargando..." : "Cargar archivos"}
                              </button>
                            </div>
                          </div>

                          {r2Objects.length > 0 && (
                            <div className="technical-r2-layout">
                              <div className="technical-r2-list" aria-label="Archivos de R2">
                                {r2Objects.map((asset) => {
                                  const previewable = canPreviewR2Asset(asset.key);
                                  const isLoadingAsset = r2ObjectLoading === asset.key;

                                  return (
                                    <article key={asset.key} className={`technical-r2-row ${r2Preview?.key === asset.key ? "is-selected" : ""}`}>
                                      <div>
                                        <strong>{asset.key.split("/").pop()}</strong>
                                        <small>{asset.key} · {formatR2Bytes(asset.size)} · {formatR2Date(asset.lastModified)}</small>
                                      </div>
                                      <div className="technical-r2-row-actions">
                                        <button
                                          className="icon-button"
                                          type="button"
                                          onClick={() => fetchR2Asset(asset)}
                                          disabled={!previewable || isLoadingAsset}
                                          aria-label={`Vista previa de ${asset.key}`}
                                          title={previewable ? "Vista previa" : "Sin vista previa"}
                                        >
                                          <Eye size={17} />
                                        </button>
                                        <button
                                          className="icon-button"
                                          type="button"
                                          onClick={() => fetchR2Asset(asset, {download: true})}
                                          disabled={isLoadingAsset}
                                          aria-label={`Descargar ${asset.key}`}
                                          title="Descargar"
                                        >
                                          {isLoadingAsset ? <RefreshCw size={17} /> : <Download size={17} />}
                                        </button>
                                      </div>
                                    </article>
                                  );
                                })}
                                {r2Cursor && (
                                  <button className="technical-load-more" type="button" onClick={() => loadR2Objects({append: true})} disabled={r2Loading}>
                                    <FolderOpen size={17} />
                                    Cargar más
                                  </button>
                                )}
                              </div>

                              <div className="technical-r2-preview" aria-live="polite">
                                {r2Preview?.kind === "image" && <img src={r2Preview.url} alt={`Vista previa de ${r2Preview.key}`} />}
                                {r2Preview?.kind === "video" && <video src={r2Preview.url} controls preload="metadata" />}
                                {r2Preview?.kind === "audio" && <audio src={r2Preview.url} controls preload="metadata" />}
                                {r2Preview?.kind === "pdf" && <iframe src={r2Preview.url} title={`Vista previa de ${r2Preview.key}`} />}
                                {!r2Preview && <p>Selecciona la vista previa de un archivo.</p>}
                              </div>
                            </div>
                          )}
                        </section>

                        <section className="technical-tool-section" aria-labelledby="technical-dns-title">
                          <div className="technical-tool-header">
                            <div>
                              <span className="technical-tool-icon"><HardDrive size={18} /></span>
                              <h4 id="technical-dns-title">Registros DNS</h4>
                            </div>
                            <button className="backoffice-command" type="button" onClick={loadDnsRecords} disabled={dnsLoading}>
                              {dnsLoading ? <RefreshCw size={17} /> : <RefreshCw size={17} />}
                              {dnsLoading ? "Consultando..." : "Consultar DNS"}
                            </button>
                          </div>

                          {dnsLookup && (
                            <div className="technical-dns-results">
                              <strong className="technical-dns-host">{dnsLookup.hostname}</strong>
                              {dnsLookup.records.map((group) => (
                                <article className="technical-dns-group" key={group.type}>
                                  <span>{group.type}</span>
                                  {group.records.length > 0 ? (
                                    <ul>
                                      {group.records.map((record) => (
                                        <li key={`${record.name}-${record.value}`}>
                                          <code>{record.value}</code>
                                          <small>TTL {record.ttl}s</small>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p>{group.error || "Sin registros publicados."}</p>
                                  )}
                                </article>
                              ))}
                            </div>
                          )}
                        </section>

                        {(technicalError || technicalMessage) && (
                          <p className={`backoffice-alert ${technicalError ? "is-error" : "is-success"}`} role="status">
                            {technicalError || technicalMessage}
                          </p>
                        )}
                      </section>
                    )}

                    {activeBackofficeModule === "operations" && (
                      <section className="backoffice-side-panel backoffice-module-panel backoffice-operations-panel" aria-labelledby="operations-title">
                        <div className="backoffice-list-top">
                          <div>
                            <p className="eyebrow">Operaciones</p>
                            <h3 id="operations-title">Listados y recuperación</h3>
                          </div>
                        </div>

                        <div className="operations-export-grid" aria-label="Exportar listados en CSV">
                          <button
                            type="button"
                            onClick={() => downloadBackofficeCsv("subscribers", "Listado de suscritos")}
                            disabled={Boolean(operationsExporting)}
                          >
                            <FileDown size={20} />
                            <span>
                              <strong>Suscritos</strong>
                              <small>Nombre, correo, teléfono y estado de suscripción.</small>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadBackofficeCsv("customers", "Listado de clientes")}
                            disabled={Boolean(operationsExporting)}
                          >
                            <FileDown size={20} />
                            <span>
                              <strong>Clientes</strong>
                              <small>Datos de contacto, compras y total histórico.</small>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadBackofficeCsv("sales", "Ventas históricas")}
                            disabled={Boolean(operationsExporting)}
                          >
                            <FileDown size={20} />
                            <span>
                              <strong>Ventas históricas</strong>
                              <small>Órdenes, estados, fechas y montos.</small>
                            </span>
                          </button>
                        </div>

                        <form className="operations-recovery-form" onSubmit={sendAssistedPasswordRecovery}>
                          <div>
                            <p className="eyebrow">Ayuda de acceso</p>
                            <h4>Enviar recuperación de contraseña</h4>
                            <p>La persona recibirá un enlace seguro para crear una nueva contraseña.</p>
                          </div>
                          <label>
                            Correo de la persona
                            <input
                              type="email"
                              value={recoveryEmail}
                              onChange={(event) => setRecoveryEmail(event.target.value)}
                              placeholder="nombre@correo.com"
                              autoComplete="email"
                              required
                            />
                          </label>
                          <button className="primary-button" type="submit" disabled={recoverySending}>
                            {recoverySending ? <RefreshCw size={18} /> : <KeyRound size={18} />}
                            {recoverySending ? "Enviando..." : "Enviar recuperación"}
                          </button>
                        </form>

                        {(operationsError || operationsMessage) && (
                          <p className={`backoffice-alert ${operationsError ? "is-error" : "is-success"}`} role="status">
                            {operationsError || operationsMessage}
                          </p>
                        )}
                      </section>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
          <BackofficeSaveLightbox feedback={backofficeFeedback} onClose={() => setBackofficeFeedback(null)} />
        </div>
      )}

      {cartNotice && (
        <div className="cart-toast" role="status" aria-live="polite" key={cartNotice.id}>
          <span className="cart-toast-icon">
            <ShoppingBag size={18} />
          </span>
          <div>
            <strong>Agregado al carrito</strong>
            <p>{cartNotice.name}</p>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <button className="icon-button close" type="button" onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">
            <X size={22} />
          </button>
          <p className="eyebrow">Tu carrito</p>
          <h2 id="cart-title">Pedido Fullness</h2>
          {cart.length === 0 ? (
            <p className="empty-cart">Aún no agregas platos. Elige un favorito para empezar.</p>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <article className="cart-item" key={item.id}>
                    <div>
                      <h3>{item.name}</h3>
                      <p>{formatPrice(item.price)}</p>
                    </div>
                    <div className="qty">
                      <button type="button" onClick={() => updateQty(item.id, -1)} aria-label={`Restar ${item.name}`}>
                        <Minus size={16} />
                      </button>
                      <span>{item.qty}</span>
                      <button type="button" onClick={() => updateQty(item.id, 1)} aria-label={`Sumar ${item.name}`}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="cart-total">
                <span>Total</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
              <form className="checkout-form" data-testid="checkout-form" onSubmit={submitCheckout}>
                <fieldset className="checkout-mode">
                  <legend>Modalidad</legend>
                  <label>
                    <input
                      type="radio"
                      name="mode"
                      value="delivery"
                      checked={checkoutForm.mode === "delivery"}
                      onChange={updateCheckoutForm}
                    />
                    <span><Truck size={17} /> Despacho</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="mode"
                      value="pickup"
                      checked={checkoutForm.mode === "pickup"}
                      onChange={updateCheckoutForm}
                    />
                    <span><Store size={17} /> Retiro</span>
                  </label>
                </fieldset>

                <div className="checkout-grid">
                  <label>
                    Nombre
                    <input required name="name" value={checkoutForm.name} onChange={updateCheckoutForm} autoComplete="name" />
                  </label>
                  <label>
                    Teléfono
                    <input required name="phone" value={checkoutForm.phone} onChange={updateCheckoutForm} autoComplete="tel" />
                  </label>
                  <label className="checkout-wide">
                    Correo
                    <input required name="email" type="email" value={checkoutForm.email} onChange={updateCheckoutForm} autoComplete="email" />
                  </label>
                  {checkoutForm.mode === "delivery" && (
                    <>
                      <label className="checkout-wide">
                        Dirección de despacho
                        <span><MapPin size={17} /><input required name="address" value={checkoutForm.address} onChange={updateCheckoutForm} autoComplete="street-address" /></span>
                      </label>
                      <label className="checkout-wide">
                        Comuna
                        <span><Home size={17} /><input required name="comuna" value={checkoutForm.comuna} onChange={updateCheckoutForm} autoComplete="address-level2" /></span>
                      </label>
                    </>
                  )}
                  <label className="checkout-wide">
                    Notas
                    <textarea name="instructions" rows="3" value={checkoutForm.instructions} onChange={updateCheckoutForm} placeholder={checkoutForm.mode === "delivery" ? "Departamento, referencia o ventana horaria…" : "Nombre de quien retira o comentario…"} />
                  </label>
                </div>

                {checkoutMessage && <p className="checkout-message" role="status">{checkoutMessage}</p>}

                <button
                  className="primary-button full checkout-submit"
                  type="submit"
                  data-testid="checkout-submit"
                  disabled={checkoutSubmitting}
                  aria-busy={checkoutSubmitting}
                >
                  <ShieldCheck size={18} />
                  {checkoutSubmitting ? "Abriendo Mercado Pago..." : "Pagar con Mercado Pago"}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {checkoutResult && (
        <div className="checkout-result-overlay" role="presentation">
          <section
            className={`checkout-result checkout-result-${checkoutResult.status}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-result-title"
            data-testid="checkout-result"
          >
            <button className="icon-button close" type="button" onClick={closeCheckoutResult} aria-label="Cerrar confirmacion">
              <X size={22} />
            </button>
            <span className="checkout-result-icon" aria-hidden="true">
              {checkoutResult.syncing ? (
                <RefreshCw size={28} />
              ) : checkoutResult.status === "approved" ? (
                <CheckCircle2 size={30} />
              ) : checkoutResult.status === "failure" ? (
                <X size={30} />
              ) : (
                <Timer size={30} />
              )}
            </span>
            <p className="eyebrow">{checkoutResult.syncing ? "Validando pago" : "Estado de tu compra"}</p>
            <h2 id="checkout-result-title">
              {checkoutResult.syncing
                ? "Un momento"
                : checkoutResult.status === "approved"
                  ? "Compra confirmada"
                  : checkoutResult.status === "failure"
                    ? "Pago no realizado"
                    : "Pago pendiente"}
            </h2>
            <p>{checkoutResult.message}</p>
            {checkoutResult.orderId && (
              <small>Orden Fullness {checkoutResult.orderId.slice(0, 8).toUpperCase()}</small>
            )}
            {!checkoutResult.syncing && (
              <button className="primary-button" type="button" onClick={closeCheckoutResult}>
                Volver a la tienda
              </button>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

const rootElement = document.getElementById("root");
const root = window.fullnessRoot || createRoot(rootElement);
window.fullnessRoot = root;
root.render(<App />);
