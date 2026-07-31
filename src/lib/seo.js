export const SITE_URL = "https://www.fullnesslab.com";
export const SITE_NAME = "Fullness Lab";
export const SITE_LANGUAGE = "es-CL";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/assets/brand/fullness-lab-og-2026.png`;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const BUSINESS_ADDRESS = {
  streetAddress: "Av. La Dehesa 1844, local 204",
  addressLocality: "Lo Barnechea",
  addressRegion: "Región Metropolitana",
  addressCountry: "CL"
};

const BRAND_DESCRIPTION =
  "Fullness Lab ofrece meal prep saludable, alimentación consciente y preparaciones listas para calentar en Santiago.";

export const SEO_PUBLIC_ROUTES = [
  "/",
  "/tienda",
  "/comunidad",
  "/quienes-somos",
  "/preguntas-frecuentes"
];

const ROUTE_METADATA = {
  "/": {
    title: "Fullness Lab | Meal prep saludable en Santiago",
    description: BRAND_DESCRIPTION,
    pageType: "WebPage"
  },
  "/tienda": {
    title: "Meal prep saludable y planes semanales | Fullness Lab",
    description:
      "Conoce los planes de meal prep saludable de Fullness Lab: comida real, equilibrada y lista para calentar durante la semana.",
    pageType: "CollectionPage"
  },
  "/comunidad": {
    title: "Comunidad Fullness Lab | Alimentación consciente y bienestar",
    description:
      "Encuentros, talleres y experiencias para aprender, compartir y crecer desde una alimentación consciente.",
    pageType: "CollectionPage"
  },
  "/quienes-somos": {
    title: "Quiénes somos | Fullness Lab",
    description:
      "Conoce la historia de Cecilia Salas y el propósito detrás de Fullness Lab, una propuesta que une gastronomía, bienestar y alimentación consciente.",
    pageType: "AboutPage"
  },
  "/preguntas-frecuentes": {
    title: "Preguntas frecuentes y políticas | Fullness Lab",
    description:
      "Resuelve tus dudas sobre productos, conservación, despachos, meal prep, cambios y el compromiso de calidad de Fullness Lab.",
    pageType: "FAQPage"
  }
};

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncate(value, maxLength = 160) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, "")}…`;
}

function normalizePath(pathname = "/") {
  const value = String(pathname || "/").split("?")[0].split("#")[0] || "/";
  if (value === "/") return "/";
  return value.replace(/\/+$/, "");
}

function absoluteUrl(value, fallback = "") {
  const candidate = cleanText(value);
  if (!candidate) return fallback;

  try {
    return new URL(candidate, SITE_URL).toString();
  } catch {
    return fallback;
  }
}

function productPath(product) {
  const slug = cleanText(product?.slug || product?.id);
  return slug ? `/producto/${encodeURIComponent(slug)}` : "/tienda";
}

function isTransactionalUrl({search = "", hash = ""} = {}) {
  const searchParams = new URLSearchParams(search);
  const hashParams = new URLSearchParams(String(hash).replace(/^#/, ""));
  const hasCheckoutParams = [
    "checkout_status",
    "status",
    "collection_status",
    "payment_id",
    "collection_id",
    "order_id",
    "external_reference"
  ].some((key) => searchParams.has(key));
  const hasAuthParams = [
    "type",
    "auth",
    "access_token",
    "refresh_token",
    "code",
    "token",
    "token_hash",
    "error",
    "error_description"
  ].some((key) => searchParams.has(key) || hashParams.has(key));
  const isBackofficeHash = String(hash).replace(/^#/, "").split("&")[0] === "backoffice";

  return hasCheckoutParams || hasAuthParams || isBackofficeHash;
}

export function getSeoMetadata({
  pathname = "/",
  product = null,
  productLoading = false,
  search = "",
  hash = "",
  authRedirect = false,
  checkoutResult = false
} = {}) {
  const normalizedPath = normalizePath(pathname);
  const productMatch = normalizedPath.match(/^\/producto\/([^/]+)$/);
  const isProduct = Boolean(productMatch);
  const transactional =
    authRedirect || checkoutResult || isTransactionalUrl({search, hash});

  if (transactional) {
    return {
      title: "Fullness Lab",
      description: BRAND_DESCRIPTION,
      canonical: `${SITE_URL}${normalizedPath}`,
      robots: "noindex, nofollow",
      pageType: "WebPage",
      route: normalizedPath,
      isIndexable: false
    };
  }

  if (isProduct) {
    if (productLoading || !product) {
      return {
        title: "Producto Fullness Lab | Cargando información",
        description: "Consulta la información del producto Fullness Lab.",
        canonical: `${SITE_URL}${normalizedPath}`,
        robots: "noindex, follow",
        pageType: "WebPage",
        route: normalizedPath,
        isIndexable: false,
        isProduct: true
      };
    }

    const productName = cleanText(product.name) || "Producto Fullness Lab";
    const productDescription = truncate(
      product.description || product.recipeSummary || `${productName} de Fullness Lab.`
    );

    return {
      title: `${productName} | Fullness Lab`,
      description: productDescription,
      canonical: `${SITE_URL}${productPath(product)}`,
      robots: product.isActive === false ? "noindex, nofollow" : "index, follow",
      image: absoluteUrl(product.image || product.photoUrl, DEFAULT_SOCIAL_IMAGE),
      pageType: "Product",
      route: normalizedPath,
      isIndexable: product.isActive !== false,
      isProduct: true
    };
  }

  const routeMetadata = ROUTE_METADATA[normalizedPath];
  if (!routeMetadata) {
    return {
      title: SITE_NAME,
      description: BRAND_DESCRIPTION,
      canonical: `${SITE_URL}/`,
      robots: "noindex, follow",
      pageType: "WebPage",
      route: normalizedPath,
      isIndexable: false
    };
  }

  return {
    ...routeMetadata,
    description: truncate(routeMetadata.description),
    canonical: `${SITE_URL}${normalizedPath}`,
    image: DEFAULT_SOCIAL_IMAGE,
    robots: "index, follow, max-image-preview:large",
    route: normalizedPath,
    isIndexable: true
  };
}

function flattenAnswer(value) {
  if (Array.isArray(value)) return value.flatMap(flattenAnswer);
  const text = cleanText(value);
  return text ? [text] : [];
}

function buildOrganizationSchema() {
  return {
    "@type": ["Organization", "LocalBusiness"],
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/assets/brand/fullness-lab-horizontal-contrast-2026.png`,
    image: DEFAULT_SOCIAL_IMAGE,
    telephone: "+56 9 9658 8199",
    email: "hola@fullnesslab.com",
    address: {
      "@type": "PostalAddress",
      ...BUSINESS_ADDRESS
    },
    areaServed: {
      "@type": "City",
      name: "Santiago"
    },
    sameAs: ["https://www.instagram.com/fullnesslab"]
  };
}

function buildBreadcrumbSchema(metadata, product) {
  const items = [
    { name: "Inicio", url: `${SITE_URL}/` }
  ];

  if (metadata.isProduct) {
    items.push({ name: "Tienda", url: `${SITE_URL}/tienda` });
    if (product) items.push({ name: cleanText(product.name), url: metadata.canonical });
  } else if (metadata.route !== "/") {
    const routeName = {
      "/tienda": "Tienda",
      "/comunidad": "Comunidad",
      "/quienes-somos": "Quiénes somos",
      "/preguntas-frecuentes": "Preguntas frecuentes"
    }[metadata.route];

    if (routeName) items.push({ name: routeName, url: metadata.canonical });
  }

  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

function buildProductSchema(metadata, product) {
  if (!product || !metadata.isProduct) return null;

  const schema = {
    "@type": "Product",
    "@id": `${metadata.canonical}#product`,
    name: cleanText(product.name),
    description: metadata.description,
    url: metadata.canonical,
    brand: {
      "@type": "Brand",
      name: SITE_NAME
    },
    category: product.productType === "plan" ? "Meal prep saludable" : "Mealprep familiar",
    sku: cleanText(product.sku || product.id)
  };

  if (metadata.image) schema.image = [metadata.image];

  const price = Number(product.price);
  if (Number.isFinite(price) && price >= 0) {
    schema.offers = {
      "@type": "Offer",
      url: metadata.canonical,
      priceCurrency: "CLP",
      price: String(Math.round(price)),
      availability: product.isActive === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition"
    };
  }

  return schema;
}

function buildFaqSchema(faqGroups) {
  const mainEntity = (Array.isArray(faqGroups) ? faqGroups : [])
    .flatMap((group) => Array.isArray(group?.items) ? group.items : [])
    .map((item) => {
      const question = cleanText(item?.question);
      const answer = flattenAnswer(item?.answer).join(" ");
      if (!question || !answer) return null;

      return {
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer
        }
      };
    })
    .filter(Boolean);

  return mainEntity.length > 0 ? { mainEntity } : null;
}

export function buildStructuredData({metadata, product = null, faqGroups = []} = {}) {
  if (!metadata) return null;

  const pageTypes = ["Product", "FAQPage"].includes(metadata.pageType)
    ? ["WebPage"]
    : ["WebPage", metadata.pageType].filter(Boolean);
  const graph = [
    buildOrganizationSchema(),
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      inLanguage: SITE_LANGUAGE,
      publisher: { "@id": ORGANIZATION_ID }
    },
    {
      "@type": pageTypes,
      "@id": `${metadata.canonical}#webpage`,
      url: metadata.canonical,
      name: metadata.title,
      description: metadata.description,
      inLanguage: SITE_LANGUAGE,
      isPartOf: { "@id": `${SITE_URL}/#website` }
    }
  ];

  if (metadata.isIndexable && metadata.route !== "/") {
    graph.push(buildBreadcrumbSchema(metadata, product));
  }

  const productSchema = buildProductSchema(metadata, product);
  if (productSchema && metadata.isIndexable) graph.push(productSchema);

  if (metadata.route === "/preguntas-frecuentes" && metadata.isIndexable) {
    const faqSchema = buildFaqSchema(faqGroups);
    if (faqSchema) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${metadata.canonical}#faq`,
        url: metadata.canonical,
        inLanguage: SITE_LANGUAGE,
        ...faqSchema
      });
    }
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}

function upsertMeta({name, property, content}) {
  const selector = name
    ? `meta[name="${name}"]`
    : `meta[property="${property}"]`;
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    if (name) element.setAttribute("name", name);
    if (property) element.setAttribute("property", property);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
}

function upsertJsonLd(schema) {
  const id = "fullness-seo-jsonld";
  let script = document.head.querySelector(`#${id}`);
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(schema);
}

export function updateSeoHead({
  pathname = "/",
  product = null,
  productLoading = false,
  faqGroups = [],
  authRedirect = false,
  checkoutResult = false
} = {}) {
  if (typeof document === "undefined") return null;

  const metadata = getSeoMetadata({
    pathname,
    product,
    productLoading,
    search: window.location.search,
    hash: window.location.hash,
    authRedirect,
    checkoutResult
  });

  document.documentElement.lang = SITE_LANGUAGE;
  document.title = metadata.title;
  upsertMeta({name: "description", content: metadata.description});
  upsertMeta({name: "robots", content: metadata.robots});
  upsertMeta({name: "author", content: SITE_NAME});
  upsertMeta({property: "og:type", content: metadata.isProduct ? "product" : "website"});
  upsertMeta({property: "og:locale", content: SITE_LANGUAGE.replace("-", "_")});
  upsertMeta({property: "og:site_name", content: SITE_NAME});
  upsertMeta({property: "og:title", content: metadata.title});
  upsertMeta({property: "og:description", content: metadata.description});
  upsertMeta({property: "og:url", content: metadata.canonical});
  upsertMeta({property: "og:image", content: metadata.image || DEFAULT_SOCIAL_IMAGE});
  upsertMeta({name: "twitter:card", content: "summary_large_image"});
  upsertMeta({name: "twitter:title", content: metadata.title});
  upsertMeta({name: "twitter:description", content: metadata.description});
  upsertMeta({name: "twitter:image", content: metadata.image || DEFAULT_SOCIAL_IMAGE});

  const productPrice = Number(product?.price);
  if (metadata.isProduct && Number.isFinite(productPrice)) {
    upsertMeta({property: "product:price:amount", content: String(Math.round(productPrice))});
    upsertMeta({property: "product:price:currency", content: "CLP"});
  } else {
    document.head
      .querySelectorAll('meta[property^="product:"]')
      .forEach((element) => element.remove());
  }

  const verification = String(import.meta.env?.VITE_GOOGLE_SITE_VERIFICATION || "").trim();
  if (verification) upsertMeta({name: "google-site-verification", content: verification});

  upsertCanonical(metadata.canonical);
  upsertJsonLd(buildStructuredData({metadata, product, faqGroups}));

  return metadata;
}
