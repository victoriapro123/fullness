import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CookingPot,
  Eye,
  EyeOff,
  Heart,
  Home,
  ImagePlus,
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
  deleteMenuItem,
  getShopSettings,
  listActiveMenuItems,
  listAdminMenuItems,
  saveMenuItem,
  saveShopSettings,
  uploadMenuPhoto
} from "./lib/menu-items.js";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabase.js";
import mealPrepBandSrc from "./assets/fullness-mealprep-band-label-fullness.png";
import heroPlateCutoutSrc from "./assets/fullness-hero-plate-cutout.png";
import storyPlateCutoutSrc from "./assets/fullness-story-plate-vegetable-cutout.png";
import philosophySceneBgSrc from "./assets/fullness-beet-roots-continuum.jpg";
import philosophyPlantIllustrationSrc from "./assets/ilustraciones-fondo/editorial-600ppi/planta30.png";
import philosophyBroccoliIllustrationSrc from "./assets/ilustraciones-fondo/editorial-600ppi/bocoli30.png";
import philosophyCarrotIllustrationSrc from "./assets/ilustraciones-fondo/editorial-600ppi/zanahoria30.png";
import storyTomatoesIllustrationSrc from "./assets/ilustraciones-fondo/editorial-600ppi/tomates30.png";
import "./styles.css";

gsap.registerPlugin(ScrollTrigger);

const mediaSrc = (key) => `/api/media?key=${encodeURIComponent(key)}`;
const logoHeaderFooterSrc = mediaSrc("assets/fullness-lab-logo-horizontal-oficial.png");
const logoVerticalSrc = mediaSrc("assets/fullness-lab-logo-vertical-marfil.png");
const silhouetteRootOneSrc = mediaSrc("assets/fullness-silhouette-root-1.png");
const silhouetteRootTwoSrc = mediaSrc("assets/fullness-silhouette-root-2.png");
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
const legacyPlaceholderProductSlugs = new Set([
  "trucha-betarraga-quinoa",
  "pollo-curcuma-vegetales",
  "legumbres-granos-oliva"
]);
const shopPath = "/tienda";
const faqPath = "/preguntas-frecuentes";
const aboutPath = "/quienes-somos";

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
        answer: ["Para cualquier consulta relacionada con pedidos o despachos: contacto@fullnesslab.cl · WhatsApp: +56 9 9658 8199."]
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

function getProductImage(product, index) {
  const image = product.image || "";
  if (!image || image === placeholderProductImage || image.includes("fullness-food-crop.jpeg")) {
    return sampleProductImages[index % sampleProductImages.length];
  }

  return image;
}

function getProductSecondaryImage(product, index) {
  const secondaryImage = product.secondaryImage || product.secondaryPhotoUrl || "";
  if (secondaryImage) return secondaryImage;

  return sampleProductImages[(index + 1) % sampleProductImages.length];
}

function getMealImage(meal, index) {
  return meal?.photoUrl || meal?.image || sampleProductImages[index % sampleProductImages.length];
}

function getMealSecondaryImage(meal, index) {
  return meal?.secondaryPhotoUrl || meal?.secondaryImage || sampleProductImages[(index + 1) % sampleProductImages.length];
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

function applySampleProduct(product, index) {
  const image = product.image || "";
  const isLegacyPlaceholder =
    legacyPlaceholderProductSlugs.has(product.slug) &&
    (image === placeholderProductImage || image.includes("fullness-food-crop.jpeg"));

  if (!isLegacyPlaceholder) return product;

  const sample = demoProducts[index % demoProducts.length];
  return {
    ...product,
    name: sample.name,
    tag: sample.tag,
    price: sample.price,
    description: sample.description,
    image: sample.image,
    secondaryImage: sample.secondaryImage,
    productType: sample.productType,
    planFrequency: sample.planFrequency,
    benefitTags: sample.benefitTags,
    ingredients: sample.ingredients,
    nutritionDescription: sample.nutritionDescription,
    nutritionHighlights: sample.nutritionHighlights,
    nutritionDetail: sample.nutritionDetail,
    nutritionFacts: sample.nutritionFacts,
    recipeSummary: sample.recipeSummary,
    recipeSteps: sample.recipeSteps,
    includedItems: sample.includedItems,
    servingLabel: sample.servingLabel,
    purchaseLabel: sample.purchaseLabel
  };
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
    nutritionDescription: "Plan equilibrado con proteína, fibra vegetal, grasas saludables y carbohidratos de energía estable.",
    nutritionHighlights: ["Proteína diaria", "Fibra vegetal", "Energía estable", "Cocina antinflamatoria"],
    nutritionDetail: "Diseñado para resolver almuerzos o cenas de una semana laboral con platos variados y funcionales.",
    nutritionFacts: { protein_g: 34, carbs_g: 38, fat_g: 17, fiber_g: 8 },
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
        nutritionFacts: { protein_g: 38, carbs_g: 34, fat_g: 16, fiber_g: 7 }
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
        nutritionFacts: { protein_g: 24, carbs_g: 44, fat_g: 14, fiber_g: 12 }
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
        nutritionFacts: { protein_g: 34, carbs_g: 44, fat_g: 20, fiber_g: 8 }
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
    nutritionDescription: "Rotación funcional para cubrir proteína, fibra, grasas saludables y micronutrientes durante el mes.",
    nutritionHighlights: ["Rotación semanal", "Micronutrientes", "Saciedad", "Preparaciones listas"],
    nutritionDetail: "Plan diseñado para mantener variedad, adherencia y bienestar a lo largo de cuatro semanas.",
    nutritionFacts: { protein_g: 32, carbs_g: 40, fat_g: 18, fiber_g: 9 },
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
        nutritionFacts: { protein_g: 34, carbs_g: 38, fat_g: 18, fiber_g: 9 }
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
        nutritionFacts: { protein_g: 36, carbs_g: 36, fat_g: 15, fiber_g: 8 }
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
        nutritionFacts: { protein_g: 22, carbs_g: 48, fat_g: 18, fiber_g: 11 }
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
    nutritionDescription: "Proteína completa, grasas saludables y carbohidratos de energía estable.",
    nutritionHighlights: ["Grasas saludables", "Proteína completa", "Energía estable"],
    nutritionDetail: "Preparación familiar pensada para compartir sin perder balance nutricional.",
    nutritionFacts: { protein_g: 34, carbs_g: 44, fat_g: 20, fiber_g: 8 },
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
    nutritionDescription: "Plato alto en proteína con carbohidrato complejo y especias funcionales.",
    nutritionHighlights: ["Alto en proteína", "Carbohidrato complejo", "Saciedad prolongada"],
    nutritionDetail: "Preparación abundante para resolver una comida familiar con ingredientes reales.",
    nutritionFacts: { protein_g: 38, carbs_g: 34, fat_g: 16, fiber_g: 7 },
    recipeSummary: "Pollo especiado, camote rústico y hojas verdes frescas.",
    recipeSteps: ["Calentar el pollo y camote.", "Terminar con hojas verdes.", "Servir en fuente familiar."],
    servingLabel: "3 a 4 personas",
    purchaseLabel: "Agregar familiar"
  }
];

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
const adminAccessModeStorageKey = "fullness_carlos_access_mode";
const adminPersonaEmail = "carlos@prof3sional.com";
const subscriptionLightboxHighlights = [
  { label: "Alimentación consciente", image: philosophyPlantIllustrationSrc },
  { label: "Nutrición funcional", image: philosophyBroccoliIllustrationSrc },
  { label: "Experiencias Fullness", image: philosophyCarrotIllustrationSrc },
  { label: "Comunidad", image: storyTomatoesIllustrationSrc }
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
            <button className="subscription-lightbox-primary" type="submit">
              Suscribirme
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
    heroImageUrl: mealPrepBandSrc,
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

function slugifyMenuName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

function createIncludedMealForm(index = 0) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `meal-${Date.now()}-${index}`;

  return {
    id,
    name: "",
    tag: "",
    description: "",
    photoUrl: "",
    photoStoragePath: "",
    secondaryPhotoUrl: "",
    secondaryPhotoStoragePath: "",
    benefitTags: "",
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
    name: item.name || "",
    tag: item.tag || "",
    description: item.description || "",
    photoUrl: item.photoUrl || item.image || "",
    photoStoragePath: item.photoStoragePath || "",
    secondaryPhotoUrl: item.secondaryPhotoUrl || item.secondaryImage || "",
    secondaryPhotoStoragePath: item.secondaryPhotoStoragePath || "",
    benefitTags: (item.benefitTags || item.benefit_tags || []).join("\n"),
    ingredients: (item.ingredients || []).join("\n"),
    nutritionDescription: item.nutritionDescription || item.nutrition_description || "",
    nutritionHighlights: (item.nutritionHighlights || item.nutrition_highlights || []).join("\n"),
    nutritionFacts: JSON.stringify(item.nutritionFacts || item.nutrition_facts || {}, null, 2),
    allergens: (item.allergens || []).join("\n")
  };
}

function createMenuForm(displayOrder = 0) {
  return {
    id: "",
    name: "",
    slug: "",
    sku: "",
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
    ingredients: "",
    nutritionDescription: "",
    nutritionHighlights: "",
    nutritionDetail: "",
    nutritionFacts: "{}",
    recipeSummary: "",
    recipeSteps: "",
    allergens: "",
    includedItems: [createIncludedMealForm(0)],
    servingLabel: "",
    purchaseLabel: "",
    displayOrder: String(displayOrder),
    isActive: true
  };
}

function menuItemToForm(item) {
  return {
    id: item.id || "",
    name: item.name || "",
    slug: item.slug || "",
    sku: item.sku || "",
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
    ingredients: (item.ingredients || []).join("\n"),
    nutritionDescription: item.nutritionDescription || "",
    nutritionHighlights: (item.nutritionHighlights || []).join("\n"),
    nutritionDetail: item.nutritionDetail || "",
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

function parseIncludedMealsFromForm(items) {
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
        name: item.name,
        tag: item.tag,
        description: item.description,
        photoUrl: item.photoUrl,
        photoStoragePath: item.photoStoragePath,
        secondaryPhotoUrl: item.secondaryPhotoUrl,
        secondaryPhotoStoragePath: item.secondaryPhotoStoragePath,
        benefitTags: item.benefitTags,
        ingredients: item.ingredients,
        nutritionDescription: item.nutritionDescription,
        nutritionHighlights: item.nutritionHighlights,
        nutritionFacts,
        allergens: item.allergens
      };
    })
    .filter(Boolean);
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
  if (product?.benefitTags?.length) return product.benefitTags;
  if (product?.nutritionHighlights?.length) return product.nutritionHighlights;
  if (product?.tag) return [product.tag];
  return [];
}

function createDefaultCheckoutForm() {
  return {
    mode: "delivery",
    name: "",
    email: "",
    phone: "",
    address: "",
    comuna: "",
    instructions: ""
  };
}

function loadStoredCheckoutForm() {
  if (typeof window === "undefined") return createDefaultCheckoutForm();

  try {
    const stored = JSON.parse(window.localStorage.getItem("fullness_checkout_form") || "null");
    return {
      ...createDefaultCheckoutForm(),
      ...(stored && typeof stored === "object" ? stored : {})
    };
  } catch {
    return createDefaultCheckoutForm();
  }
}

function buildOrderMessage(cart, total, checkoutForm) {
  const lines = [
    "Hola Fullness Lab, quiero continuar este pedido:",
    "",
    ...cart.map((item) => `- ${item.qty} x ${item.name} (${formatPrice(item.price * item.qty)})`),
    "",
    `Total: ${formatPrice(total)}`,
    "",
    checkoutForm.mode === "pickup"
      ? "Modalidad: retiro en local"
      : "Modalidad: despacho",
    `Nombre: ${checkoutForm.name}`,
    `Correo: ${checkoutForm.email}`,
    `Teléfono: ${checkoutForm.phone}`
  ];

  if (checkoutForm.mode === "delivery") {
    lines.push(`Dirección: ${checkoutForm.address}`, `Comuna: ${checkoutForm.comuna}`);
  }

  if (checkoutForm.instructions) {
    lines.push(`Notas: ${checkoutForm.instructions}`);
  }

  return lines.join("\n");
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

function getPlanFeatureIcon(meal = {}, index = 0) {
  const text = [
    meal.tag,
    meal.name,
    ...(meal.benefitTags || [])
  ].join(" ").toLowerCase();

  if (/omega|salm[oó]n|pescad|grasa/.test(text)) return Heart;
  if (/digest|fibra|lenteja|legumbre/.test(text)) return Leaf;
  if (/detox|verde|quinoa|micro/.test(text)) return Sprout;
  if (/antiinflama|c[uú]rcuma|prote[ií]na|pollo/.test(text)) return ShieldCheck;
  if (/energ|camote|ra[ií]z|carbo/.test(text)) return Sparkles;

  return [Leaf, Sparkles, Heart, Sprout, CookingPot][index % 5];
}

function ShopPlanCard({ product, index, onAdd, onOpenMeal, onOpenProduct }) {
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
        <div className="shop-plan-meals" aria-label={`Características incluidas en ${product.name}`}>
          {includedItems.slice(0, 3).map((meal, mealIndex) => {
            const FeatureIcon = getPlanFeatureIcon(meal, mealIndex);

            return (
              <button
                key={meal.id || meal.name}
                type="button"
                onClick={(event) => onOpenMeal(product, meal, event)}
              >
                <span className="shop-plan-meal-icon" aria-hidden="true">
                  <FeatureIcon size={22} />
                </span>
                <span className="shop-plan-meal-kicker">{meal.tag || meal.benefitTags?.[0] || "Meal prep"}</span>
                <strong>{meal.name}</strong>
              </button>
            );
          })}
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

function ShopFamilyCard({ product, index, onAdd, onOpenProduct }) {
  const primaryImage = getProductImage(product, index);
  const secondaryImage = getProductSecondaryImage(product, index);
  const benefitTags = getBenefitTags(product);

  return (
    <article className="shop-family-card">
      <button className="shop-family-media-button" type="button" onClick={() => onOpenProduct(product)}>
        <HoverImage primary={primaryImage} secondary={secondaryImage} alt={product.name} />
      </button>
      <div className="shop-family-copy">
        <span>{product.servingLabel || product.tag || "Para compartir"}</span>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        {benefitTags.length > 0 && (
          <ul className="shop-benefit-tags" aria-label="Beneficios">
            {benefitTags.slice(0, 2).map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        )}
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

function MealPrepCatalog({ familyProducts, loading, onAdd, onOpenMeal, onOpenProduct, plans, shopSettings }) {
  const settings = mergeShopSettings(shopSettings);
  const monthlyPlan = plans.find((product) => product.planFrequency === "monthly");
  const subscriptionProduct = monthlyPlan || plans[0] || null;
  const heroFallbackProduct = plans[0] || familyProducts[0] || demoProducts[0];
  const heroImage = settings.heroImageUrl || getProductImage(heroFallbackProduct, 0);
  const heroMetrics = settings.heroMetrics.slice(0, 3);
  const comparisonRows = settings.subscriptionComparison;
  const planHeading = plans.some((product) => product.planFrequency === "monthly")
    ? "Planes semanales y mensuales"
    : "Planes semanales";

  const scrollToBlock = (event, selector) => {
    event.preventDefault();
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="meal-prep-shop shop-commerce-page" id="oferta">
      <section className="shop-hero-showcase" aria-labelledby="shop-hero-title">
        <img className="shop-hero-botanical" src={silhouetteRootOneSrc} alt="" aria-hidden="true" />
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
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td>{row.subscription}</td>
                      <td>{row.weekly}</td>
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
            {plans.length > 0 ? (
              <div className="shop-plan-grid">
                {plans.map((product, index) => (
                  <ShopPlanCard
                    key={product.id}
                    product={product}
                    index={index}
                    onAdd={onAdd}
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
                    index={index + plans.length}
                    onAdd={onAdd}
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

function ProductQuickView({ product, image, onAdd, onClose, onOpenDetail, onOpenMeal }) {
  const highlights = product?.nutritionHighlights?.length
    ? product.nutritionHighlights
    : product?.nutritionDescription
      ? [product.nutritionDescription]
      : [];
  const benefitTags = getBenefitTags(product);
  const includedItems = product?.includedItems || [];

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

          <div className="product-lightbox-block">
            <h3>Características nutricionales</h3>
            {highlights.length > 0 && (
              <ul className="product-pill-list">
                {highlights.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
            <ProductNutritionFacts product={product} />
          </div>

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

function MealPrepQuickView({ meal, parentProduct, onAddParent, onClose }) {
  const benefitTags = getBenefitTags(meal);

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

function ProductDetailPage({ product, image, loading, onAdd, onBackToShop, onOpenMeal }) {
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

  const highlights = product.nutritionHighlights?.length
    ? product.nutritionHighlights
    : product.nutritionDescription
      ? [product.nutritionDescription]
      : [];
  const recipeSteps = product.recipeSteps?.length ? product.recipeSteps : [];
  const includedItems = product.includedItems || [];

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
          <strong>{formatPrice(product.price)}</strong>
          <button className="primary-button" type="button" onClick={() => onAdd(product)}>
            <Plus size={18} />
            {product.purchaseLabel || "Agregar al pedido"}
          </button>
        </div>
      </section>

      <section className="product-detail-content" aria-label="Detalle del meal prep">
        <div className="product-detail-panel">
          <h2>Nutrición</h2>
          {product.nutritionDescription && <p>{product.nutritionDescription}</p>}
          {highlights.length > 0 && (
            <ul className="product-pill-list">
              {highlights.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          {product.nutritionDetail && <p>{product.nutritionDetail}</p>}
          <ProductNutritionFacts product={product} />
        </div>

        <div className="product-detail-panel">
          <h2>Receta</h2>
          <p>{product.recipeSummary || product.description}</p>
          {recipeSteps.length > 0 && (
            <ol className="recipe-step-list">
              {recipeSteps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          )}
        </div>

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

function AboutPage({ onNavigateToShop, onNavigateToCommunity }) {
  return (
    <article className="about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="eyebrow">Nuestra Historia</p>
          <h1>Nuestra <span>Historia</span></h1>
          <span className="section-rule" aria-hidden="true" />
          <p>{aboutStoryParagraphs[0]}</p>
        </div>
      </section>

      <section className="about-story" aria-label="Historia de Cecilia Salas y Fullness Lab">
        <aside className="about-story-aside" aria-hidden="true">
          <span>NUTRIRSE DESDE LA RAÍZ</span>
        </aside>
        <div className="about-story-body">
          {aboutStoryParagraphs.slice(1).map((paragraph, index) => {
            const isAccent = paragraph === "Así nació Fullness Lab.";
            const isBelief = paragraph === "Creemos que alimentarse es mucho más que comer.";
            const isClosing = paragraph === "Como es adentro, es afuera";

            if (isClosing) {
              return (
                <p className="about-story-closing" key={paragraph}>
                  {paragraph}
                </p>
              );
            }

            if (isAccent || isBelief) {
              return (
                <p className="about-story-highlight" key={paragraph}>
                  {paragraph}
                </p>
              );
            }

            return <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>;
          })}
        </div>
      </section>

      <section className="about-next">
        <div>
          <p className="eyebrow">Fullness Lab</p>
          <h2>Bienestar que se construye desde dentro.</h2>
        </div>
        <div className="about-next-actions">
          <a href={shopPath} onClick={onNavigateToShop}>
            Ver planes
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <a href="/comunidad" onClick={onNavigateToCommunity}>
            Comunidad
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
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
          <a href="mailto:contacto@fullnesslab.cl">
            contacto@fullnesslab.cl
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
  const [cart, setCart] = useState([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [member, setMember] = useState(null);
  const [googleMessage, setGoogleMessage] = useState("");
  const [cartNotice, setCartNotice] = useState(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState("");
  const [headerHiddenForHero, setHeaderHiddenForHero] = useState(false);
  const [products, setProducts] = useState(demoProducts);
  const [productsLoading, setProductsLoading] = useState(isSupabaseConfigured);
  const [productPreviewSlug, setProductPreviewSlug] = useState("");
  const [mealPreview, setMealPreview] = useState(null);
  const [currentProductSlug, setCurrentProductSlug] = useState(() => getProductSlugFromPath());
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [checkoutForm, setCheckoutForm] = useState(loadStoredCheckoutForm);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [initialAuthRedirect] = useState(() => readAuthRedirectState());
  const authRedirectHandledRef = useRef(false);
  const [passwordSetupOpen, setPasswordSetupOpen] = useState(false);
  const [passwordSetupMode, setPasswordSetupMode] = useState("recovery");
  const [passwordSetupSaving, setPasswordSetupSaving] = useState(false);
  const [passwordSetupMessage, setPasswordSetupMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [menuForm, setMenuForm] = useState(() => createMenuForm(10));
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

  function resetMenuForm() {
    const nextOrder =
      adminItems.reduce((max, item) => Math.max(max, Number(item.displayOrder || 0)), 0) + 10;
    setMenuForm(createMenuForm(nextOrder));
    setAdminError("");
    setAdminMessage("");
  }

  async function refreshPublicProducts() {
    const result = await listActiveMenuItems();
    if (result.error || !result.configured) return;

    setProducts(result.data.length > 0 ? result.data.map(applySampleProduct) : demoProducts);
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
    if (!activeIsAdmin) {
      setAdminOpen(false);
      setAccountOpen(true);
      return;
    }

    setAccountOpen(false);
    setMenuOpen(false);
    setAdminOpen(true);
    if (window.location.hash !== "#backoffice") {
      window.history.replaceState(null, "", "#backoffice");
    }
  }

  function closeBackoffice() {
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

      setProducts(result.data.map(applySampleProduct));
      setProductsLoading(false);
    }

    loadProducts();

    return () => {
      ignore = true;
    };
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

      if (activeIsAdmin) {
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
  }, [activeIsAdmin, authLoading]);

  useEffect(() => {
    if (adminOpen && activeIsAdmin) {
      refreshAdminItems();
    }
  }, [activeIsAdmin, adminOpen]);

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
  const singleDishProduct = familyProducts[0] || products[0] || demoProducts[0];
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

  function submitCheckout(event) {
    event.preventDefault();
    if (cart.length === 0) return;

    const order = {
      items: cart,
      total: cartTotal,
      fulfillment: checkoutForm,
      createdAt: new Date().toISOString()
    };

    try {
      window.localStorage.setItem("fullness_last_order", JSON.stringify(order));
    } catch {
      // Local order persistence is best-effort.
    }

    setCheckoutMessage("Pedido preparado. Te abrimos WhatsApp para coordinar el pago y la entrega.");
    window.open(createWhatsappUrl(buildOrderMessage(cart, cartTotal, checkoutForm)), "_blank", "noopener,noreferrer");
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

  function submitPopupSubscription(event) {
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

    setSubscriptionPopupMode("success");
    setSubscriptionPopupMessage("");
    form.reset();
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
    setMenuForm((current) => ({
      ...current,
      includedItems: current.includedItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  }

  function addIncludedMeal() {
    setMenuForm((current) => ({
      ...current,
      includedItems: [...current.includedItems, createIncludedMealForm(current.includedItems.length)]
    }));
  }

  function removeIncludedMeal(indexToRemove) {
    setMenuForm((current) => ({
      ...current,
      includedItems: current.includedItems.filter((_, index) => index !== indexToRemove)
    }));
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

    if (!activeIsAdmin) {
      setAdminError("Tu cuenta no tiene acceso de administración.");
      return;
    }

    setAdminSaving(true);
    setAdminError("");
    setAdminMessage("");

    let nutritionFacts = {};
    let includedItems = [];

    try {
      nutritionFacts = parseJsonObject(menuForm.nutritionFacts);
      includedItems = menuForm.productType === "plan"
        ? parseIncludedMealsFromForm(menuForm.includedItems)
        : [];
    } catch (error) {
      setAdminSaving(false);
      setAdminError(error.message);
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
      ingredients: menuForm.ingredients,
      nutritionDescription: menuForm.nutritionDescription,
      nutritionHighlights: menuForm.nutritionHighlights,
      nutritionDetail: menuForm.nutritionDetail,
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
      setAdminError(getSupabaseErrorMessage(result.error, "No pudimos guardar el meal prep."));
    } else {
      setMenuForm(menuItemToForm(result.data));
      setAdminMessage("Meal prep guardado.");
      await refreshAdminItems({ silent: true });
      await refreshPublicProducts();
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
      if (menuForm.id === item.id) resetMenuForm();
      setAdminMessage("Meal prep eliminado.");
      await refreshAdminItems({ silent: true });
      await refreshPublicProducts();
    }

    setAdminSaving(false);
  }

  const navItems = [
    { href: shopPath, label: "Planes" },
    { href: "/comunidad", label: "Comunidad" },
    { href: aboutPath, label: "Nosotros" },
    { href: "#contacto", label: "Contacto" },
    ...(activeIsAdmin ? [{ href: "#backoffice", label: "Backoffice" }] : [])
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
  const floatingActionsHidden =
    cartOpen ||
    accountOpen ||
    adminOpen ||
    menuOpen ||
    passwordSetupOpen ||
    subscriptionPopupOpen ||
    Boolean(productPreview) ||
    Boolean(mealPreviewItem);

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
        <a href="mailto:hola@fullnesslab.cl">hola@fullnesslab.cl</a>
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
        <div className="plate-hero-vectors" aria-hidden="true" />
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
          "--silhouette-root-two": `url("${silhouetteRootTwoSrc}")`,
          "--silhouette-root-three": `url("${silhouetteRootThreeSrc}")`,
          "--silhouette-botanical": `url("${silhouetteBotanicalSrc}")`
        }}
      >
        <div className="philosophy-illustrations" aria-hidden="true">
          <img className="philosophy-illustration philosophy-illustration-plant" src={philosophyPlantIllustrationSrc} alt="" />
          <img className="philosophy-illustration philosophy-illustration-broccoli" src={philosophyBroccoliIllustrationSrc} alt="" />
          <img className="philosophy-illustration philosophy-illustration-carrot" src={philosophyCarrotIllustrationSrc} alt="" />
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
          <img className="food-editorial-beet" src={silhouetteRootTwoSrc} alt="" aria-hidden="true" />
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
          <img className="philosophy-story-tomatoes" src={storyTomatoesIllustrationSrc} alt="" aria-hidden="true" />
        </section>
      </div>

      <section className="meal-prep-feature" id="calentar">
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
                {activeIsAdmin && (
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
                <h2 id="backoffice-title">Meal preps</h2>
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

            {!activeIsAdmin ? (
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

                <div className="backoffice-layout backoffice-layout-with-community">
                  <aside className="backoffice-list" aria-label="Meal preps configurados">
                    <div className="backoffice-list-top">
                      <h3>Configurados</h3>
                      <button className="backoffice-command" type="button" onClick={resetMenuForm}>
                        <Plus size={17} />
                        Nuevo
                      </button>
                    </div>

                    {adminLoading ? (
                      <p className="backoffice-muted">Cargando meal preps…</p>
                    ) : adminItems.length > 0 ? (
                      <div className="backoffice-menu-stack">
                        {adminItems.map((item) => (
                          <article className={`backoffice-menu-card ${menuForm.id === item.id ? "is-selected" : ""}`} key={item.id}>
                            <button className="backoffice-menu-main" type="button" onClick={() => setMenuForm(menuItemToForm(item))}>
                              <img src={item.image || mediaSrc("assets/fullness-food-crop.jpeg")} alt="" aria-hidden="true" />
                              <span>
                                <strong>{item.name}</strong>
                                <small>{getProductTypeLabel(item)} · {formatPrice(item.price)}</small>
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
                              <button type="button" onClick={() => setMenuForm(menuItemToForm(item))} aria-label={`Editar ${item.name}`}>
                                <Pencil size={16} />
                              </button>
                              <button type="button" onClick={() => removeMenuItem(item)} aria-label={`Eliminar ${item.name}`} disabled={adminSaving}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="backoffice-muted">Sin meal preps cargados.</p>
                    )}
                  </aside>

                  <form className="backoffice-form" onSubmit={submitMenuItem}>
                    <div className="backoffice-form-head">
                      <div>
                        <p className="eyebrow">{menuForm.id ? "Editar" : "Nuevo"}</p>
                        <h3>{menuForm.name || "Meal prep Fullness"}</h3>
                      </div>
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

                    <div className="backoffice-grid">
                      <label>
                        Tipo
                        <select name="productType" value={menuForm.productType} onChange={updateMenuForm}>
                          <option value="plan">Plan</option>
                          <option value="family">Familiar</option>
                        </select>
                      </label>
                      <label>
                        Frecuencia
                        <select name="planFrequency" value={menuForm.planFrequency} onChange={updateMenuForm} disabled={menuForm.productType !== "plan"}>
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensual</option>
                        </select>
                      </label>
                      <label>
                        Nombre
                        <input required name="name" value={menuForm.name} onChange={updateMenuForm} placeholder="Plan semanal antinflamatorio…" />
                      </label>
                      <label>
                        Slug
                        <input required name="slug" value={menuForm.slug} onChange={updateMenuForm} placeholder="plan-semanal-antinflamatorio…" />
                      </label>
                      <label>
                        SKU
                        <input name="sku" value={menuForm.sku} onChange={updateMenuForm} placeholder="FULL-PLAN-001…" />
                      </label>
                      <label>
                        Etiqueta
                        <input name="tag" value={menuForm.tag} onChange={updateMenuForm} placeholder="5 meal preps / 1 semana…" />
                      </label>
                      <label>
                        Precio CLP
                        <input required name="priceClp" type="number" min="0" step="100" value={menuForm.priceClp} onChange={updateMenuForm} placeholder="8990…" />
                      </label>
                      <label>
                        Orden
                        <input name="displayOrder" type="number" step="1" value={menuForm.displayOrder} onChange={updateMenuForm} />
                      </label>
                      <label>
                        Porciones / duración
                        <input name="servingLabel" value={menuForm.servingLabel} onChange={updateMenuForm} placeholder="5 porciones individuales…" />
                      </label>
                      <label>
                        Botón
                        <input name="purchaseLabel" value={menuForm.purchaseLabel} onChange={updateMenuForm} placeholder="Agregar plan semanal…" />
                      </label>
                    </div>

                    <label className="backoffice-wide">
                      Descripción
                      <textarea required name="description" rows="3" value={menuForm.description} onChange={updateMenuForm} placeholder="Pescado del sur, raíces dulces, hojas verdes y granos integrales…" />
                    </label>

                    <label className="backoffice-wide">
                      Tags de beneficios
                      <textarea name="benefitTags" rows="3" value={menuForm.benefitTags} onChange={updateMenuForm} placeholder={"Antioxidante\nEnergético\nDetox…"} />
                    </label>

                    <div className="backoffice-photo-row backoffice-photo-row-double">
                      <div className="backoffice-photo-block">
                        <div className="backoffice-photo-preview">
                          {menuForm.photoUrl ? (
                            <img src={menuForm.photoUrl} alt="" aria-hidden="true" />
                          ) : (
                            <UploadCloud size={30} />
                          )}
                        </div>
                        <label className="upload-control">
                          <UploadCloud size={18} />
                          {photoUploading ? "Subiendo…" : "Subir principal"}
                          <input type="file" accept="image/*" onChange={(event) => handleMenuPhotoChange(event, "primary")} disabled={photoUploading || adminSaving} />
                        </label>
                        <label className="backoffice-wide">
                          URL principal
                          <input name="photoUrl" value={menuForm.photoUrl} onChange={updateMenuForm} placeholder="/api/media?key=images/meal-preps/…" />
                        </label>
                      </div>

                      <div className="backoffice-photo-block">
                        <div className="backoffice-photo-preview">
                          {menuForm.secondaryPhotoUrl ? (
                            <img src={menuForm.secondaryPhotoUrl} alt="" aria-hidden="true" />
                          ) : (
                            <ImagePlus size={30} />
                          )}
                        </div>
                        <label className="upload-control">
                          <ImagePlus size={18} />
                          {photoUploading ? "Subiendo…" : "Subir hover"}
                          <input type="file" accept="image/*" onChange={(event) => handleMenuPhotoChange(event, "secondary")} disabled={photoUploading || adminSaving} />
                        </label>
                        <label className="backoffice-wide">
                          URL hover
                          <input name="secondaryPhotoUrl" value={menuForm.secondaryPhotoUrl} onChange={updateMenuForm} placeholder="/api/media?key=images/meal-preps/…" />
                        </label>
                      </div>
                    </div>

                    <div className="backoffice-grid">
                      <label>
                        Ingredientes
                        <textarea name="ingredients" rows="6" value={menuForm.ingredients} onChange={updateMenuForm} placeholder={"Trucha\nBetarraga\nQuinoa…"} />
                      </label>
                      <label>
                        Alérgenos
                        <textarea name="allergens" rows="6" value={menuForm.allergens} onChange={updateMenuForm} placeholder={"Pescado\nFrutos secos…"} />
                      </label>
                    </div>

                    <label className="backoffice-wide">
                      Descripción nutricional
                      <textarea name="nutritionDescription" rows="3" value={menuForm.nutritionDescription} onChange={updateMenuForm} placeholder="Proteína de calidad, omega 3, fibra y antioxidantes naturales…" />
                    </label>

                    <div className="backoffice-grid">
                      <label>
                        Características nutricionales
                        <textarea name="nutritionHighlights" rows="6" value={menuForm.nutritionHighlights} onChange={updateMenuForm} placeholder={"Omega 3 natural\nFibra vegetal\nEnergía estable…"} />
                      </label>
                      <label>
                        Receta resumida
                        <textarea name="recipeSummary" rows="6" value={menuForm.recipeSummary} onChange={updateMenuForm} placeholder="Salmón dorado al punto, lentejas especiadas y hojas verdes…" />
                      </label>
                    </div>

                    <label className="backoffice-wide">
                      Detalle nutricional
                      <textarea name="nutritionDetail" rows="4" value={menuForm.nutritionDetail} onChange={updateMenuForm} placeholder="Explica por qué el plato funciona nutricionalmente y qué aporta al bienestar…" />
                    </label>

                    <label className="backoffice-wide">
                      Pasos de receta / preparación
                      <textarea name="recipeSteps" rows="5" value={menuForm.recipeSteps} onChange={updateMenuForm} placeholder={"Dorar el salmón con calor controlado.\nCalentar las lentejas especiadas.\nTerminar con hojas verdes frescas…"} />
                    </label>

                    <label className="backoffice-wide">
                      Datos nutricionales JSON
                      <textarea name="nutritionFacts" rows="6" value={menuForm.nutritionFacts} onChange={updateMenuForm} spellCheck={false} />
                    </label>

                    {menuForm.productType === "plan" && (
                      <section className="backoffice-included-editor">
                        <div className="backoffice-list-top">
                          <h3>Platos del plan</h3>
                          <button className="backoffice-command" type="button" onClick={addIncludedMeal}>
                            <Plus size={17} />
                            Agregar plato
                          </button>
                        </div>

                        {menuForm.includedItems.length === 0 ? (
                          <p className="backoffice-muted">Agrega al menos un meal prep para mostrar el detalle del plan.</p>
                        ) : (
                          <div className="included-editor-stack">
                            {menuForm.includedItems.map((meal, mealIndex) => (
                              <article className="included-editor-card" key={meal.id || mealIndex}>
                                <header>
                                  <div>
                                    <p className="eyebrow">Plato {mealIndex + 1}</p>
                                    <h4>{meal.name || "Meal prep incluido"}</h4>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeIncludedMeal(mealIndex)}
                                    aria-label={`Eliminar plato ${mealIndex + 1}`}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </header>

                                <div className="backoffice-grid">
                                  <label>
                                    Nombre
                                    <input value={meal.name} onChange={(event) => updateIncludedMealForm(mealIndex, "name", event.target.value)} placeholder="Pollo, camote y cúrcuma…" />
                                  </label>
                                  <label>
                                    Etiqueta
                                    <input value={meal.tag} onChange={(event) => updateIncludedMealForm(mealIndex, "tag", event.target.value)} placeholder="Energético…" />
                                  </label>
                                </div>

                                <label className="backoffice-wide">
                                  Descripción
                                  <textarea rows="3" value={meal.description} onChange={(event) => updateIncludedMealForm(mealIndex, "description", event.target.value)} placeholder="Describe el plato incluido…" />
                                </label>

                                <div className="backoffice-photo-row backoffice-photo-row-double">
                                  <div className="backoffice-photo-block">
                                    <div className="backoffice-photo-preview">
                                      {meal.photoUrl ? (
                                        <img src={meal.photoUrl} alt="" aria-hidden="true" />
                                      ) : (
                                        <UploadCloud size={28} />
                                      )}
                                    </div>
                                    <label className="upload-control">
                                      <UploadCloud size={18} />
                                      Principal
                                      <input type="file" accept="image/*" onChange={(event) => handleMenuPhotoChange(event, "mealPrimary", mealIndex)} disabled={photoUploading || adminSaving} />
                                    </label>
                                    <label className="backoffice-wide">
                                      URL principal
                                      <input value={meal.photoUrl} onChange={(event) => updateIncludedMealForm(mealIndex, "photoUrl", event.target.value)} placeholder="/api/media?key=images/meal-preps/…" />
                                    </label>
                                  </div>

                                  <div className="backoffice-photo-block">
                                    <div className="backoffice-photo-preview">
                                      {meal.secondaryPhotoUrl ? (
                                        <img src={meal.secondaryPhotoUrl} alt="" aria-hidden="true" />
                                      ) : (
                                        <ImagePlus size={28} />
                                      )}
                                    </div>
                                    <label className="upload-control">
                                      <ImagePlus size={18} />
                                      Hover
                                      <input type="file" accept="image/*" onChange={(event) => handleMenuPhotoChange(event, "mealSecondary", mealIndex)} disabled={photoUploading || adminSaving} />
                                    </label>
                                    <label className="backoffice-wide">
                                      URL hover
                                      <input value={meal.secondaryPhotoUrl} onChange={(event) => updateIncludedMealForm(mealIndex, "secondaryPhotoUrl", event.target.value)} placeholder="/api/media?key=images/meal-preps/…" />
                                    </label>
                                  </div>
                                </div>

                                <div className="backoffice-grid">
                                  <label>
                                    Tags de beneficios
                                    <textarea rows="4" value={meal.benefitTags} onChange={(event) => updateIncludedMealForm(mealIndex, "benefitTags", event.target.value)} placeholder={"Antioxidante\nEnergético…"} />
                                  </label>
                                  <label>
                                    Ingredientes
                                    <textarea rows="4" value={meal.ingredients} onChange={(event) => updateIncludedMealForm(mealIndex, "ingredients", event.target.value)} placeholder={"Pollo\nCamote\nCúrcuma…"} />
                                  </label>
                                </div>

                                <label className="backoffice-wide">
                                  Descripción nutricional
                                  <textarea rows="3" value={meal.nutritionDescription} onChange={(event) => updateIncludedMealForm(mealIndex, "nutritionDescription", event.target.value)} placeholder="Proteína magra, carbohidrato complejo y especias funcionales…" />
                                </label>

                                <div className="backoffice-grid">
                                  <label>
                                    Características nutricionales
                                    <textarea rows="4" value={meal.nutritionHighlights} onChange={(event) => updateIncludedMealForm(mealIndex, "nutritionHighlights", event.target.value)} placeholder={"Alto en proteína\nFibra vegetal…"} />
                                  </label>
                                  <label>
                                    Datos nutricionales JSON
                                    <textarea rows="4" value={meal.nutritionFacts} onChange={(event) => updateIncludedMealForm(mealIndex, "nutritionFacts", event.target.value)} spellCheck={false} />
                                  </label>
                                </div>

                                <label className="backoffice-wide">
                                  Alérgenos
                                  <textarea rows="3" value={meal.allergens} onChange={(event) => updateIncludedMealForm(mealIndex, "allergens", event.target.value)} placeholder={"Pescado\nFrutos secos…"} />
                                </label>
                              </article>
                            ))}
                          </div>
                        )}
                      </section>
                    )}

                    <div className="backoffice-form-actions">
                      <button className="google-button" type="button" onClick={resetMenuForm} disabled={adminSaving}>
                        <Plus size={18} />
                        Nuevo
                      </button>
                      <button className="primary-button" type="submit" disabled={adminSaving || photoUploading}>
                        {adminSaving ? <RefreshCw size={18} /> : <Save size={18} />}
                        {adminSaving ? "Guardando…" : "Guardar meal prep"}
                      </button>
                    </div>
                  </form>

                  <aside className="backoffice-activities" aria-label="Tienda y comunidad">
                    <section className="backoffice-side-panel" aria-labelledby="shop-settings-title">
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

                    <section className="backoffice-side-panel" aria-labelledby="subscription-popup-admin-title">
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

                    <section className="backoffice-side-panel" aria-labelledby="community-admin-title">
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
                  </aside>
                </div>
              </>
            )}
          </section>
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
              <form className="checkout-form" onSubmit={submitCheckout}>
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

                <button className="primary-button full" type="submit">
                  Continuar pedido
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </main>
  );
}

const rootElement = document.getElementById("root");
const root = window.fullnessRoot || createRoot(rootElement);
window.fullnessRoot = root;
root.render(<App />);
