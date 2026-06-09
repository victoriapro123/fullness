import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  CookingPot,
  Eye,
  EyeOff,
  HandPlatter,
  Heart,
  Leaf,
  Lock,
  LogOut,
  Mail,
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
  Timer,
  Trash2,
  UploadCloud,
  Video,
  X
} from "lucide-react";
import {
  deleteMenuItem,
  listActiveMenuItems,
  listAdminMenuItems,
  saveMenuItem,
  uploadMenuPhoto
} from "./lib/menu-items.js";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabase.js";
import philosophySceneBgSrc from "./assets/fullness-beet-roots-continuum.jpg";
import "./styles.css";

gsap.registerPlugin(ScrollTrigger);

const mediaSrc = (key) => `/api/media?key=${encodeURIComponent(key)}`;
const beetIsotypeSrc = "/assets/fullness-beet-isotype.svg";
const placeholderProductImage = mediaSrc("assets/fullness-food-crop.jpeg");
const sampleProductImages = [
  mediaSrc("images/menu-samples/lentejas-hojas.jpeg"),
  mediaSrc("images/menu-samples/pollo-camote-hojas.jpeg"),
  mediaSrc("images/menu-samples/salmon-arroz-avocado.jpeg")
];
const legacyPlaceholderProductSlugs = new Set([
  "trucha-betarraga-quinoa",
  "pollo-curcuma-vegetales",
  "legumbres-granos-oliva"
]);

function getProductImage(product, index) {
  const image = product.image || "";
  if (!image || image === placeholderProductImage || image.includes("fullness-food-crop.jpeg")) {
    return sampleProductImages[index % sampleProductImages.length];
  }

  return image;
}

function getProductSlug(product) {
  return product?.slug || product?.id || "";
}

function getProductPath(product) {
  const slug = getProductSlug(product);
  return slug ? `/producto/${encodeURIComponent(slug)}` : "/#productos";
}

function getProductSlugFromPath() {
  if (typeof window === "undefined") return "";

  const match = window.location.pathname.match(/^\/producto\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
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
    ingredients: sample.ingredients,
    nutritionDescription: sample.nutritionDescription,
    nutritionHighlights: sample.nutritionHighlights,
    nutritionDetail: sample.nutritionDetail,
    nutritionFacts: sample.nutritionFacts,
    recipeSummary: sample.recipeSummary,
    recipeSteps: sample.recipeSteps
  };
}

const demoProducts = [
  {
    id: "salmon-lentejas-hojas",
    slug: "salmon-lentejas-hojas",
    name: "Salmón, lentejas y hojas verdes",
    tag: "Omega 3 + legumbres",
    price: 8990,
    description: "Salmón dorado, lentejas especiadas y hojas frescas con brillo de oliva.",
    image: sampleProductImages[0],
    ingredients: ["salmón", "lentejas", "hojas verdes", "aceite de oliva"],
    nutritionDescription: "Proteína de calidad, omega 3, fibra vegetal y grasas saludables.",
    nutritionHighlights: ["Omega 3 natural", "Fibra vegetal", "Proteína de calidad", "Energía estable"],
    nutritionDetail: "Menú pensado para combinar grasas saludables, proteína de alta calidad y fibra de legumbres en una preparación saciante y equilibrada.",
    nutritionFacts: { protein_g: 34, carbs_g: 38, fat_g: 18, fiber_g: 9 },
    recipeSummary: "Salmón dorado al punto, lentejas especiadas y hojas verdes frescas terminadas con aceite de oliva.",
    recipeSteps: [
      "Dorar el salmón con calor controlado.",
      "Calentar las lentejas especiadas hasta que queden cremosas.",
      "Terminar con hojas verdes frescas y oliva al servir."
    ]
  },
  {
    id: "pollo-camote-hojas",
    slug: "pollo-camote-hojas",
    name: "Pollo especiado, camote y hojas verdes",
    tag: "Antiinflamatorio",
    price: 7990,
    description: "Pollo con especias cálidas, puré de camote y hojas verdes frescas.",
    image: sampleProductImages[1],
    ingredients: ["pollo", "camote", "cúrcuma", "hojas verdes", "oliva"],
    nutritionDescription: "Plato alto en proteína con carbohidrato complejo y especias funcionales.",
    nutritionHighlights: ["Alto en proteína", "Carbohidrato complejo", "Especias antiinflamatorias", "Saciedad prolongada"],
    nutritionDetail: "Preparación equilibrada para sostener energía durante el día, con especias cálidas y vegetales que aportan color, fibra y sabor.",
    nutritionFacts: { protein_g: 38, carbs_g: 34, fat_g: 16, fiber_g: 7 },
    recipeSummary: "Pollo especiado con cúrcuma, puré rústico de camote y hojas verdes frescas.",
    recipeSteps: [
      "Sellar el pollo con especias cálidas.",
      "Acompañar con puré de camote de textura suave.",
      "Agregar hojas verdes al final para mantener frescura."
    ]
  },
  {
    id: "salmon-arroz-palta",
    slug: "salmon-arroz-palta",
    name: "Salmón glaseado, arroz verde y palta",
    tag: "Grasas saludables",
    price: 8990,
    description: "Salmón glaseado con arroz verde, palta, mango y hierbas frescas.",
    image: sampleProductImages[2],
    ingredients: ["salmón", "arroz verde", "palta", "mango", "cilantro"],
    nutritionDescription: "Proteína, grasas saludables y carbohidratos de energía estable.",
    nutritionHighlights: ["Grasas saludables", "Proteína completa", "Carbohidrato de energía estable", "Hierbas frescas"],
    nutritionDetail: "Menú diseñado para entregar energía amable y textura fresca, combinando salmón, palta y arroz verde con notas herbales.",
    nutritionFacts: { protein_g: 34, carbs_g: 44, fat_g: 20, fiber_g: 8 },
    recipeSummary: "Salmón glaseado, arroz verde, palta, mango y hierbas frescas con terminación brillante.",
    recipeSteps: [
      "Glasear el salmón hasta lograr una superficie intensa.",
      "Servir con arroz verde tibio.",
      "Terminar con palta, mango y hierbas frescas."
    ]
  }
];

const functionalNotes = [
  {
    title: "Cúrcuma + jengibre + pimienta",
    image: mediaSrc("assets/combo-curcuma-jengibre.png"),
    description: "Especias elegidas para sumar sabor profundo y acompañar una alimentación antiinflamatoria."
  },
  {
    title: "Grasas saludables + vegetales",
    image: mediaSrc("assets/combo-grasas-saludables.png"),
    description: "Palta, oliva, semillas y hojas verdes ayudan a dar saciedad y equilibrio al plato."
  },
  {
    title: "Limón + hojas verdes",
    image: mediaSrc("assets/combo-espinaca-limon.png"),
    imageClass: "functional-image-limon",
    description: "El ácido del limón favorece la absorción del hierro vegetal presente en hojas verdes."
  },
  {
    title: "Legumbres + granos integrales",
    image: mediaSrc("assets/combo-legumbres-granos.png"),
    description: "Se complementan para lograr una proteína vegetal más completa, con fibra y energía estable."
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
const workshopsWhatsappUrl = createWhatsappUrl("Hola Fullness Lab, quiero información sobre los talleres.");
const introTechSignals = [
  {
    id: "anti",
    label: "Antiinflamatorio"
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

function slugifyMenuName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

function createMenuForm(displayOrder = 0) {
  return {
    id: "",
    name: "",
    slug: "",
    sku: "",
    tag: "",
    description: "",
    photoUrl: "",
    photoStoragePath: "",
    priceClp: "",
    ingredients: "",
    nutritionDescription: "",
    nutritionHighlights: "",
    nutritionDetail: "",
    nutritionFacts: "{}",
    recipeSummary: "",
    recipeSteps: "",
    allergens: "",
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
    tag: item.tag || "",
    description: item.description || "",
    photoUrl: item.photoUrl || item.image || "",
    photoStoragePath: item.photoStoragePath || "",
    priceClp: String(item.price || 0),
    ingredients: (item.ingredients || []).join("\n"),
    nutritionDescription: item.nutritionDescription || "",
    nutritionHighlights: (item.nutritionHighlights || []).join("\n"),
    nutritionDetail: item.nutritionDetail || "",
    nutritionFacts: JSON.stringify(item.nutritionFacts || {}, null, 2),
    recipeSummary: item.recipeSummary || "",
    recipeSteps: (item.recipeSteps || []).join("\n"),
    allergens: (item.allergens || []).join("\n"),
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

function ProductQuickView({ product, image, onAdd, onClose, onOpenDetail }) {
  const highlights = product?.nutritionHighlights?.length
    ? product.nutritionHighlights
    : product?.nutritionDescription
      ? [product.nutritionDescription]
      : [];

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
          <p className="eyebrow">{product.tag}</p>
          <h2 id="product-lightbox-title">{product.name}</h2>
          <p>{product.description}</p>

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

          <div className="product-lightbox-actions">
            <button className="primary-button" type="button" onClick={() => onAdd(product)}>
              <Plus size={18} />
              Agregar al pedido
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

function ProductDetailPage({ product, image, loading, onAdd, onBackToShop }) {
  if (loading && !product) {
    return (
      <section className="product-detail-page product-detail-state">
        <Sprout size={34} />
        <h1>Cargando menú Fullness.</h1>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="product-detail-page product-detail-state">
        <Sprout size={34} />
        <h1>No encontramos este menú.</h1>
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
            Agregar al pedido
          </button>
        </div>
      </section>

      <section className="product-detail-content" aria-label="Detalle del menú">
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
  const progressRef = useRef(0);
  const playbackRef = useRef(null);
  const touchStartYRef = useRef(null);

  useEffect(() => {
    let animationFrame = 0;
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

    const handleWheel = (event) => {
      if (playbackRef.current) {
        event.preventDefault();
        return;
      }

      const direction = event.deltaY >= 0 ? 1 : -1;
      if (!isSequenceActive()) return;

      if (direction < 0) return;

      event.preventDefault();
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

      syncHeaderVisibility();
    };

    const handleStartClick = (event) => {
      event.preventDefault();
      startPlayback(1);
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

    return () => {
      videoRef.current?.removeEventListener("loadedmetadata", handleLoadedMetadata);
      logoButtonRef.current?.removeEventListener("click", handleStartClick);
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
          <img src={mediaSrc("assets/fullness-lab-logo-official.png")} alt="" aria-hidden="true" />
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
  const [currentProductSlug, setCurrentProductSlug] = useState(() => getProductSlugFromPath());
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminItems, setAdminItems] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminError, setAdminError] = useState("");
  const [menuForm, setMenuForm] = useState(() => createMenuForm(10));

  useLayoutEffect(() => {
    const sectionHashes = new Set(["#programa", "#plato", "#filosofia", "#proposito", "#calentar", "#oferta", "#productos", "#fundamento", "#comunidad"]);
    const productSlug = getProductSlugFromPath();

    if (productSlug) {
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

  const returnToIntro = () => {
    if (isMobileIntroViewport()) {
      document.documentElement.classList.add("intro-scroll-consumed", "intro-mobile-skip");
      window.dispatchEvent(new CustomEvent("fullness:intro-state-change", { detail: { consumed: true } }));
      setHeaderHiddenForHero(false);
      navigateToSection("#programa", { smooth: true, replace: true });
      return;
    }

    document.documentElement.classList.remove("intro-scroll-consumed", "intro-mobile-skip");
    if (window.location.hash && window.location.hash !== "#inicio") {
      window.history.replaceState(null, "", window.location.pathname);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    window.dispatchEvent(new Event("fullness:intro-reset"));
  };

  const navigateToSection = (href, { smooth = true, replace = false } = {}) => {
    const resolvedHref = href === "#filosofia" ? "#proposito" : href;
    const scrollToTarget = (target) => {
      const sectionTop = target.getBoundingClientRect().top + window.pageYOffset;
      const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;

      if (resolvedHref === "#programa") return 0;
      if (resolvedHref === "#plato") return Math.max(0, sectionTop - headerHeight);

      return Math.max(0, sectionTop - headerHeight - 14);
    };

    if (currentProductSlug) {
      setCurrentProductSlug("");
      setProductPreviewSlug("");
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

    setProducts(result.data.map(applySampleProduct));
  }

  async function refreshAdminItems({ silent = false } = {}) {
    if (!isAdmin) return;

    if (!silent) {
      setAdminLoading(true);
      setAdminError("");
      setAdminMessage("");
    }

    const result = await listAdminMenuItems();

    if (result.error) {
      setAdminError(getSupabaseErrorMessage(result.error, "No pudimos cargar los menús."));
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
    setMember(null);
    setIsAdmin(false);
    setAdminOpen(false);
    setAccountOpen(false);
    setGoogleMessage("");
  }

  function openBackoffice() {
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
    let subscription;
    let ignore = false;

    async function loadSession() {
      if (!isSupabaseConfigured) {
        setAuthLoading(false);
        return;
      }

      const supabase = await getSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (!ignore) {
        setAuthUser(data.session?.user || null);
        setAuthLoading(false);
      }

      const listener = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthUser(session?.user || null);
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

      if (isAdmin) {
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
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (adminOpen && isAdmin) {
      refreshAdminItems();
    }
  }, [adminOpen, isAdmin]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const revealGroups = [
      {
        items: ".food-editorial .editorial-copy > *",
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
        element.style.transitionDelay = `${Math.min(index * 80, 320)}ms`;
        revealElements.push(element);
      });
      revealByTrigger.set(triggerElement, elements);
      revealObserver.observe(triggerElement);
    });

    const ctx = gsap.context(() => {
      gsap.set([
        ".plate-hero-copy > *",
        ".plate-hero-visual",
        ".food-editorial .editorial-copy > *",
        ".editorial-image img",
        ".functional-band .section-heading > *",
        ".functional-grid article",
        ".functional-grid article img",
        ".heating-copy > *",
        ".heating-visual",
        ".heating-steps li",
        ".products .section-heading > *",
        ".product-card",
        ".product-art img",
        ".membership > *"
      ], { clearProps: "all" });

      gsap.utils.toArray([
        ".editorial-image img",
        ".functional-grid article img"
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

    }, appRef);

    const refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 250);

    return () => {
      window.clearTimeout(refreshTimer);
      revealObserver.disconnect();
      revealElements.forEach((element) => {
        element.classList.remove("reveal-on-scroll", "is-visible");
        element.style.transitionDelay = "";
      });
      ctx.revert();
    };
  }, []);

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
    const sectionHashes = new Set(["#programa", "#plato", "#filosofia", "#proposito", "#calentar", "#oferta", "#productos", "#fundamento", "#comunidad"]);

    const syncSectionHash = () => {
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
    const hash = new URLSearchParams(window.location.hash.replace("#", ""));
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
  const currentProductIndex = currentProduct
    ? Math.max(0, products.findIndex((product) => getProductSlug(product) === getProductSlug(currentProduct)))
    : 0;
  const productPreviewIndex = productPreview
    ? Math.max(0, products.findIndex((product) => getProductSlug(product) === getProductSlug(productPreview)))
    : 0;
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

  function openProductQuickView(product) {
    const slug = getProductSlug(product);
    if (!slug) return;

    setProductPreviewSlug(slug);
    setMenuOpen(false);
  }

  function openProductDetail(product, event) {
    event?.preventDefault();
    const slug = getProductSlug(product);
    if (!slug) return;

    setProductPreviewSlug("");
    setCurrentProductSlug(slug);
    setMenuOpen(false);
    setCartOpen(false);
    setAccountOpen(false);
    document.documentElement.classList.add("intro-scroll-consumed");
    window.history.pushState(null, "", getProductPath(product));
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  function backToShop() {
    navigateToSection("#productos", { smooth: false });
  }

  function updateQty(id, delta) {
    setCart((items) =>
      items
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
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

    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setAuthLoading(false);

    if (error) {
      setGoogleMessage(getSupabaseErrorMessage(error, "No pudimos iniciar sesión."));
      return;
    }

    setAccountOpen(false);
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

      return next;
    });
  }

  async function handleMenuPhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    setAdminError("");
    setAdminMessage("");

    const result = await uploadMenuPhoto(file);

    if (result.error || !result.configured) {
      setAdminError(getSupabaseErrorMessage(result.error, "No pudimos subir la foto."));
    } else {
      setMenuForm((current) => ({
        ...current,
        photoUrl: result.data.photoUrl,
        photoStoragePath: result.data.photoStoragePath
      }));
      setAdminMessage("Foto cargada.");
    }

    setPhotoUploading(false);
    event.target.value = "";
  }

  async function submitMenuItem(event) {
    event.preventDefault();

    if (!isAdmin) {
      setAdminError("Tu cuenta no tiene acceso de administración.");
      return;
    }

    setAdminSaving(true);
    setAdminError("");
    setAdminMessage("");

    let nutritionFacts = {};

    try {
      nutritionFacts = parseJsonObject(menuForm.nutritionFacts);
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
      tag: menuForm.tag,
      description: menuForm.description,
      photoUrl: menuForm.photoUrl,
      photoStoragePath: menuForm.photoStoragePath,
      priceClp: menuForm.priceClp,
      ingredients: menuForm.ingredients,
      nutritionDescription: menuForm.nutritionDescription,
      nutritionHighlights: menuForm.nutritionHighlights,
      nutritionDetail: menuForm.nutritionDetail,
      nutritionFacts,
      recipeSummary: menuForm.recipeSummary,
      recipeSteps: menuForm.recipeSteps,
      allergens: menuForm.allergens,
      displayOrder: menuForm.displayOrder,
      isActive: menuForm.isActive
    });

    if (result.error || !result.configured) {
      setAdminError(getSupabaseErrorMessage(result.error, "No pudimos guardar el menú."));
    } else {
      setMenuForm(menuItemToForm(result.data));
      setAdminMessage("Menú guardado.");
      await refreshAdminItems({ silent: true });
      await refreshPublicProducts();
    }

    setAdminSaving(false);
  }

  async function removeMenuItem(item) {
    if (!window.confirm(`¿Eliminar "${item.name}" del menú?`)) return;

    setAdminSaving(true);
    setAdminError("");
    setAdminMessage("");

    const result = await deleteMenuItem(item.id);

    if (result.error || !result.configured) {
      setAdminError(getSupabaseErrorMessage(result.error, "No pudimos eliminar el menú."));
    } else {
      if (menuForm.id === item.id) resetMenuForm();
      setAdminMessage("Menú eliminado.");
      await refreshAdminItems({ silent: true });
      await refreshPublicProducts();
    }

    setAdminSaving(false);
  }

  const navItems = [
    { href: "#proposito", label: "Propósito" },
    { href: "#calentar", label: "Cómo calentar" },
    { href: "#productos", label: "Tienda" },
    ...(isAdmin ? [{ href: "#backoffice", label: "Backoffice" }] : [])
  ];

  const nav = navItems.map((item) => (
    <a
      key={item.href}
      href={item.href}
      onClick={(event) => {
        if (item.href === "#backoffice") {
          event.preventDefault();
          openBackoffice();
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

  return (
    <main ref={appRef}>
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
          <img className="brand-reference-logo" src={mediaSrc("assets/fullness-lab-logo-official.png")} alt="Fullness Lab" />
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
              key={item.href}
              href={item.href}
              onClick={(event) => {
                if (item.href === "#backoffice") {
                  event.preventDefault();
                  openBackoffice();
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

      {isProductPage ? (
        <ProductDetailPage
          product={currentProduct}
          image={currentProduct ? getProductImage(currentProduct, currentProductIndex) : ""}
          loading={productsLoading}
          onAdd={addToCart}
          onBackToShop={backToShop}
        />
      ) : (
        <>
          <IntroScrollSequence />

          <section className="plate-hero" id="programa">
        <div className="plate-hero-copy">
          <img className="hero-root-mark" src={beetIsotypeSrc} alt="" aria-hidden="true" />
          <p className="eyebrow">Nutrirse desde la raíz</p>
          <h1>El bienestar comienza desde adentro</h1>
          <p>
            En Fullness Lab creemos que la comida puede ser una herramienta de bienestar, energía y conexión con uno mismo.
          </p>
          <p>
            Por eso desarrollamos preparaciones nutritivas, sabrosas y cuidadosamente elaboradas para nutrirte desde la raíz.
          </p>
          <strong className="hero-manifesto">No contamos calorías. Creemos en aprender a nutrirse.</strong>
          <p className="hero-closing">Como es adentro, es afuera.</p>
          <a
            className="plate-hero-primary"
            href="#proposito"
            onClick={(event) => {
              event.preventDefault();
              navigateToSection("#proposito");
            }}
          >
            Explorar Fullness Lab
          </a>
          <aside className="plate-hero-signals" aria-label="Principios Fullness">
            {heroPrinciples.map((principle) => (
              <article className="plate-hero-signal" key={principle}>
                <span className="signal-title">{principle}</span>
              </article>
            ))}
          </aside>
        </div>
        <button className="plate-hero-replay" type="button" onClick={returnToIntro}>
          <Video size={17} aria-hidden="true" />
          Volver a la animación
        </button>
        <img
          className="plate-hero-visual"
          src={introScrollFinalFrameSrc}
          alt=""
          aria-hidden="true"
        />
      </section>

      <div
        className="philosophy-scene"
        style={{ "--philosophy-scene-bg": `url("${philosophySceneBgSrc}")` }}
      >
        <section className="food-editorial" id="plato">
          <div className="editorial-copy">
            <h2>Rico, consciente y lleno de información para tu sistema.</h2>
            <p>
              Fullness Lab une placer gastronómico, nutrición antiinflamatoria y criterio funcional para que comer bien no se sienta como castigo.
            </p>
            <div className="editorial-pills">
              <span>Sin gluten</span>
              <span>Sin lácteos</span>
              <span>Sin azúcar refinada</span>
              <span>Grasas saludables</span>
            </div>
          </div>
        </section>

        <section className="philosophy" id="proposito">
          <div>
            <img className="section-root-mark" src={beetIsotypeSrc} alt="" aria-hidden="true" />
            <p className="eyebrow">Nuestro propósito</p>
            <h2>Bienestar desde la raíz, todos los días.</h2>
            <p className="philosophy-lede">
              Creemos que el bienestar se construye a través de pequeñas decisiones cotidianas. Por eso desarrollamos una propuesta que integra nutrición consciente, cocina antiinflamatoria y educación alimentaria, para ayudarte a sentirte mejor desde la raíz.
            </p>
            <div className="philosophy-list">
              <article>
                <Leaf size={28} />
                <div>
                  <h3>Nutrición consciente</h3>
                  <p>Seleccionamos ingredientes reales y preparaciones equilibradas que nutren más allá de las calorías.</p>
                </div>
              </article>
              <article>
                <CookingPot size={28} />
                <div>
                  <h3>Cocina antiinflamatoria</h3>
                  <p>Diseñamos recetas ricas en nutrientes, con técnicas culinarias que respetan los ingredientes y potencian su sabor.</p>
                </div>
              </article>
              <article>
                <Heart size={28} />
                <div>
                  <h3>Bienestar integral</h3>
                  <p>Entendemos la alimentación como parte de un sistema más amplio: hábitos, emociones y calidad de vida.</p>
                </div>
              </article>
              <article>
                <Sparkles size={28} />
                <div>
                  <h3>Ciencia y sabor</h3>
                  <p>Combinamos conocimiento nutricional con cocina de verdad, porque comer saludable también debe ser rico.</p>
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>

      <section className="heating" id="calentar">
        <div
          className="heating-water"
          style={{ "--heating-water-bg": `url("${mediaSrc("images/fullness-boiling-water-bg.jpg")}")` }}
          aria-hidden="true"
        ></div>
        <div className="heating-visual" aria-hidden="true">
          <span className="heating-splash"></span>
          <span className="heating-splash heating-splash-secondary"></span>
          <img
            className="heating-bag"
            src={mediaSrc("images/fullness-heating-bag-realistic-v2.png")}
            alt=""
          />
        </div>
        <div className="heating-copy">
          <p className="eyebrow">Cómo calentar tus platos</p>
          <h2>Un ritual simple para cuidar lo que comes.</h2>
          <p>
            Lo bueno hecho simple: en Fullness Lab cuidamos cada preparación para que alimentarte bien sea una forma de volver a ti.
          </p>
        </div>
        <ol className="heating-steps">
          <li>
            <span className="step-icon"><CookingPot size={28} /></span>
            <span className="step-content">
              <span className="step-heading"><span className="step-number">1.</span><strong>Calienta agua.</strong></span>
              <span>Lleva a hervor en una olla grande.</span>
            </span>
          </li>
          <li>
            <span className="step-icon"><PackageCheck size={28} /></span>
            <span className="step-content">
              <span className="step-heading"><span className="step-number">2.</span><strong>Sumerge la bolsa sellada.</strong></span>
              <span>Baja el fuego para mantener un hervor suave.</span>
            </span>
          </li>
          <li>
            <span className="step-icon"><Timer size={28} /></span>
            <span className="step-content">
              <span className="step-heading"><span className="step-number">3.</span><strong>Espera unos minutos.</strong></span>
              <span>El tiempo varía según el plato.</span>
            </span>
          </li>
          <li>
            <span className="step-icon"><HandPlatter size={28} /></span>
            <span className="step-content">
              <span className="step-heading"><span className="step-number">4.</span><strong>Sirve y disfruta.</strong></span>
              <span>Abre la bolsa con cuidado y sirve tu plato real.</span>
            </span>
          </li>
        </ol>
      </section>

      <section className="fullness-offer" id="oferta">
        <div className="section-heading">
          <img className="section-root-mark" src={beetIsotypeSrc} alt="" aria-hidden="true" />
          <p className="eyebrow">Oferta Fullness Lab</p>
          <h2>Elige cómo quieres nutrirte.</h2>
          <p>
            Preparaciones y experiencias pensadas para sostener una alimentación práctica, nutritiva y llena de sabor.
          </p>
        </div>
        <div className="offer-grid">
          <article className="offer-card">
            <HandPlatter size={30} aria-hidden="true" />
            <p className="offer-kicker">Menús preparados</p>
            <h3>Comida real para el día a día</h3>
            <p>Platos equilibrados, elaborados con ingredientes cuidadosamente seleccionados y listos para disfrutar.</p>
            <a
              href="#productos"
              onClick={(event) => {
                event.preventDefault();
                navigateToSection("#productos");
              }}
            >
              Ver Menús
            </a>
          </article>
          <article className="offer-card">
            <PackageCheck size={30} aria-hidden="true" />
            <p className="offer-kicker">Meal Prep</p>
            <h3>Tu semana resuelta</h3>
            <p>Preparaciones listas para consumir durante la semana, pensadas para una alimentación práctica, nutritiva y llena de sabor.</p>
            <a href={mealPrepWhatsappUrl} target="_blank" rel="noreferrer">Conocer Meal Prep</a>
          </article>
          <article className="offer-card">
            <Sparkles size={30} aria-hidden="true" />
            <p className="offer-kicker">Talleres</p>
            <h3>Aprende a nutrirte de forma consciente</h3>
            <p>Talleres prácticos donde combinamos cocina, nutrición y bienestar para desarrollar una relación más saludable con la alimentación.</p>
            <a href={workshopsWhatsappUrl} target="_blank" rel="noreferrer">Ver Talleres</a>
          </article>
        </div>
      </section>

      <section className="products section" id="productos">
        <div className="section-heading">
          <p className="eyebrow">Tienda Fullness Lab</p>
          <h2>Elige tus platos.</h2>
        </div>
        {products.length > 0 ? (
          <div className="product-grid">
            {products.map((product, index) => (
              <article className="product-card" key={product.id}>
                <button
                  className="product-card-main"
                  type="button"
                  onClick={() => openProductQuickView(product)}
                  aria-label={`Ver características de ${product.name}`}
                >
                  <div className="product-art">
                    <img src={getProductImage(product, index)} alt={`Plato ${product.name}`} />
                  </div>
                  <span>{product.tag}</span>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                </button>
                <div className="product-footer">
                  <strong>{formatPrice(product.price)}</strong>
                  <button className="add-button" type="button" onClick={() => addToCart(product)}>
                    <Plus size={18} />
                    Agregar al pedido
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="products-empty">Pronto abriremos nuevos platos Fullness Lab.</p>
        )}
      </section>

      <section className="functional-band" id="fundamento">
        <div className="section-heading">
          <p className="eyebrow">Nutrición con fundamento</p>
          <h2>Combinaciones que trabajan juntas.</h2>
        </div>
        <div className="functional-grid">
          {functionalNotes.map((note) => (
            <article key={note.title}>
              <img className={note.imageClass || ""} src={note.image} alt={note.title} />
              <div>
                <Sprout size={22} />
                <h3>{note.title}</h3>
                <p>{note.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="membership" id="comunidad">
        <p className="eyebrow">Nutrición emocional</p>
        <h2>El cuidado personal empieza por dentro.</h2>
        <p>
          El siguiente paso de Fullness Lab abre espacio a acompañamiento, sesiones y una comunidad para comer mejor desde el amor propio.
        </p>
        <form className="membership-form" onSubmit={submitSubscription}>
          <label htmlFor="subscription-email">Recibe novedades Fullness</label>
          <div>
            <input
              id="subscription-email"
              name="subscriptionEmail"
              type="email"
              placeholder="nombre@dominio.cl…"
              autoComplete="email"
              spellCheck={false}
              required
            />
            <button type="submit">Suscribirme</button>
          </div>
          {subscriptionMessage && <p className="membership-status" role="status">{subscriptionMessage}</p>}
        </form>
      </section>

          <footer>
            <div className="footer-brand">
              <img src={beetIsotypeSrc} alt="" aria-hidden="true" />
              <span>Fullness Lab</span>
            </div>
            <p>
              Fullness Lab nace de la convicción de que el bienestar no se construye desde la perfección, sino desde pequeñas decisiones sostenibles que se repiten día a día.
            </p>
            <strong>Nutrirse desde la raíz.</strong>
          </footer>
        </>
      )}

      {productPreview && (
        <ProductQuickView
          product={productPreview}
          image={getProductImage(productPreview, productPreviewIndex)}
          onAdd={addToCart}
          onClose={() => setProductPreviewSlug("")}
          onOpenDetail={openProductDetail}
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
                {isAdmin && (
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
              </form>
            )}
          </section>
        </div>
      )}

      {adminOpen && (
        <div className="backoffice-overlay" role="dialog" aria-modal="true" aria-labelledby="backoffice-title">
          <section className="backoffice-panel">
            <header className="backoffice-header">
              <div>
                <p className="eyebrow">Backoffice</p>
                <h2 id="backoffice-title">Menús</h2>
              </div>
              <div className="backoffice-header-actions">
                {isAdmin && (
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => refreshAdminItems()}
                    aria-label="Actualizar menús"
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

            {!isAdmin ? (
              <div className="backoffice-state">
                <ShieldCheck size={34} />
                <h3>Acceso administrador</h3>
                <p>Inicia sesión con una cuenta autorizada para gestionar los menús.</p>
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

                <div className="backoffice-layout">
                  <aside className="backoffice-list" aria-label="Menús configurados">
                    <div className="backoffice-list-top">
                      <h3>Configurados</h3>
                      <button className="backoffice-command" type="button" onClick={resetMenuForm}>
                        <Plus size={17} />
                        Nuevo
                      </button>
                    </div>

                    {adminLoading ? (
                      <p className="backoffice-muted">Cargando menús…</p>
                    ) : adminItems.length > 0 ? (
                      <div className="backoffice-menu-stack">
                        {adminItems.map((item) => (
                          <article className={`backoffice-menu-card ${menuForm.id === item.id ? "is-selected" : ""}`} key={item.id}>
                            <button className="backoffice-menu-main" type="button" onClick={() => setMenuForm(menuItemToForm(item))}>
                              <img src={item.image || mediaSrc("assets/fullness-food-crop.jpeg")} alt="" aria-hidden="true" />
                              <span>
                                <strong>{item.name}</strong>
                                <small>{formatPrice(item.price)}</small>
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
                      <p className="backoffice-muted">Sin menús cargados.</p>
                    )}
                  </aside>

                  <form className="backoffice-form" onSubmit={submitMenuItem}>
                    <div className="backoffice-form-head">
                      <div>
                        <p className="eyebrow">{menuForm.id ? "Editar" : "Nuevo"}</p>
                        <h3>{menuForm.name || "Menú Fullness"}</h3>
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
                        Nombre
                        <input required name="name" value={menuForm.name} onChange={updateMenuForm} placeholder="Trucha, betarraga y quinoa…" />
                      </label>
                      <label>
                        Slug
                        <input required name="slug" value={menuForm.slug} onChange={updateMenuForm} placeholder="trucha-betarraga-quinoa…" />
                      </label>
                      <label>
                        SKU
                        <input name="sku" value={menuForm.sku} onChange={updateMenuForm} placeholder="FULL-001…" />
                      </label>
                      <label>
                        Etiqueta
                        <input name="tag" value={menuForm.tag} onChange={updateMenuForm} placeholder="Omega 3 + antioxidantes…" />
                      </label>
                      <label>
                        Precio CLP
                        <input required name="priceClp" type="number" min="0" step="100" value={menuForm.priceClp} onChange={updateMenuForm} placeholder="8990…" />
                      </label>
                      <label>
                        Orden
                        <input name="displayOrder" type="number" step="1" value={menuForm.displayOrder} onChange={updateMenuForm} />
                      </label>
                    </div>

                    <label className="backoffice-wide">
                      Descripción
                      <textarea required name="description" rows="3" value={menuForm.description} onChange={updateMenuForm} placeholder="Pescado del sur, raíces dulces, hojas verdes y granos integrales…" />
                    </label>

                    <div className="backoffice-photo-row">
                      <div className="backoffice-photo-preview">
                        {menuForm.photoUrl ? (
                          <img src={menuForm.photoUrl} alt="" aria-hidden="true" />
                        ) : (
                          <UploadCloud size={30} />
                        )}
                      </div>
                      <div>
                        <label className="upload-control">
                          <UploadCloud size={18} />
                          {photoUploading ? "Subiendo…" : "Subir foto"}
                          <input type="file" accept="image/*" onChange={handleMenuPhotoChange} disabled={photoUploading || adminSaving} />
                        </label>
                        <label className="backoffice-wide">
                          URL foto
                          <input name="photoUrl" value={menuForm.photoUrl} onChange={updateMenuForm} placeholder="https://…" />
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

                    <div className="backoffice-form-actions">
                      <button className="google-button" type="button" onClick={resetMenuForm} disabled={adminSaving}>
                        <Plus size={18} />
                        Nuevo
                      </button>
                      <button className="primary-button" type="submit" disabled={adminSaving || photoUploading}>
                        {adminSaving ? <RefreshCw size={18} /> : <Save size={18} />}
                        {adminSaving ? "Guardando…" : "Guardar menú"}
                      </button>
                    </div>
                  </form>
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
              <button
                className="primary-button full"
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  setAccountOpen(true);
                }}
              >
                Continuar pedido
              </button>
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
