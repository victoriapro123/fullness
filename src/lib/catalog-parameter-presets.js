const benefitAssetUrl = (slug) =>
  `/api/media?key=${encodeURIComponent(`assets/benefits/${slug}.png`)}`;

export const benefitPresets = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "antiinflamatorio",
    name: "Antiinflamatorio",
    iconUrl: benefitAssetUrl("antiinflamatorio"),
    iconStoragePath: "assets/benefits/antiinflamatorio.png",
    defaultDescription: "Combina ingredientes con compuestos bioactivos que acompañan una respuesta inflamatoria equilibrada.",
    displayOrder: 10,
    isActive: true
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "energetico",
    name: "Energético",
    iconUrl: benefitAssetUrl("energetico"),
    iconStoragePath: "assets/benefits/energetico.png",
    defaultDescription: "Aporta una combinación de nutrientes pensada para sostener la energía durante el día.",
    displayOrder: 20,
    isActive: true
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    slug: "digestivo",
    name: "Digestivo",
    iconUrl: benefitAssetUrl("digestivo"),
    iconStoragePath: "assets/benefits/digestivo.png",
    defaultDescription: "Incluye ingredientes y fibra que acompañan una digestión amable y el bienestar intestinal.",
    displayOrder: 30,
    isActive: true
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    slug: "antioxidante",
    name: "Antioxidante",
    iconUrl: benefitAssetUrl("antioxidante"),
    iconStoragePath: "assets/benefits/antioxidante.png",
    defaultDescription: "Reúne ingredientes naturalmente ricos en compuestos antioxidantes que ayudan a proteger las células del estrés oxidativo.",
    displayOrder: 40,
    isActive: true
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    slug: "alto-en-proteina",
    name: "Alto en proteína",
    iconUrl: benefitAssetUrl("alto-en-proteina"),
    iconStoragePath: "assets/benefits/alto-en-proteina.png",
    defaultDescription: "Entrega una porción relevante de proteína, clave para la mantención muscular y una saciedad duradera.",
    displayOrder: 50,
    isActive: true
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    slug: "alto-en-fibra",
    name: "Alto en fibra",
    iconUrl: benefitAssetUrl("alto-en-fibra"),
    iconStoragePath: "assets/benefits/alto-en-fibra.png",
    defaultDescription: "Aporta fibra dietaria que favorece el tránsito intestinal y ayuda a prolongar la saciedad.",
    displayOrder: 60,
    isActive: true
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    slug: "omega-3",
    name: "Omega-3",
    iconUrl: benefitAssetUrl("omega-3"),
    iconStoragePath: "assets/benefits/omega-3.png",
    defaultDescription: "Incluye fuentes naturales de ácidos grasos omega-3, asociados al cuidado cardiovascular y cerebral.",
    displayOrder: 70,
    isActive: true
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    slug: "equilibrio",
    name: "Equilibrio",
    iconUrl: benefitAssetUrl("equilibrio"),
    iconStoragePath: "assets/benefits/equilibrio.png",
    defaultDescription: "Combina proteínas, vegetales, grasas saludables y carbohidratos para una comida completa.",
    displayOrder: 80,
    isActive: true
  },
  {
    id: "10000000-0000-4000-8000-000000000009",
    slug: "detox",
    name: "Detox",
    iconUrl: benefitAssetUrl("detox"),
    iconStoragePath: "assets/benefits/detox.png",
    defaultDescription: "Integra vegetales y fibra que acompañan los procesos naturales de eliminación del organismo.",
    displayOrder: 90,
    isActive: true
  },
  {
    id: "10000000-0000-4000-8000-000000000010",
    slug: "inmunidad",
    name: "Inmunidad",
    iconUrl: benefitAssetUrl("inmunidad"),
    iconStoragePath: "assets/benefits/inmunidad.png",
    defaultDescription: "Aporta nutrientes que participan en el funcionamiento normal del sistema inmune.",
    displayOrder: 100,
    isActive: true
  },
  {
    id: "10000000-0000-4000-8000-000000000011",
    slug: "salud-cardiovascular",
    name: "Salud cardiovascular",
    iconUrl: benefitAssetUrl("salud-cardiovascular"),
    iconStoragePath: "assets/benefits/salud-cardiovascular.png",
    defaultDescription: "Combina grasas saludables, fibra y vegetales que acompañan el cuidado cardiovascular.",
    displayOrder: 110,
    isActive: true
  },
  {
    id: "10000000-0000-4000-8000-000000000012",
    slug: "saciedad",
    name: "Saciedad",
    iconUrl: benefitAssetUrl("saciedad"),
    iconStoragePath: "assets/benefits/saciedad.png",
    defaultDescription: "Su combinación de proteína, fibra y grasas saludables ayuda a mantener la saciedad por más tiempo.",
    displayOrder: 120,
    isActive: true
  }
];

export const tagPresets = [
  ["20000000-0000-4000-8000-000000000001", "alto-en-proteina", "Alto en proteína"],
  ["20000000-0000-4000-8000-000000000002", "alto-en-fibra", "Alto en fibra"],
  ["20000000-0000-4000-8000-000000000003", "rico-en-omega-3", "Rico en omega-3"],
  ["20000000-0000-4000-8000-000000000004", "fuente-de-antioxidantes", "Fuente de antioxidantes"],
  ["20000000-0000-4000-8000-000000000005", "carbohidratos-complejos", "Carbohidratos complejos"],
  ["20000000-0000-4000-8000-000000000006", "grasas-saludables", "Grasas saludables"],
  ["20000000-0000-4000-8000-000000000007", "proteina-vegetal", "Proteína vegetal"],
  ["20000000-0000-4000-8000-000000000008", "sin-azucar-anadida", "Sin azúcar añadida"],
  ["20000000-0000-4000-8000-000000000009", "sin-gluten", "Sin gluten"],
  ["20000000-0000-4000-8000-000000000010", "sin-lacteos", "Sin lácteos"],
  ["20000000-0000-4000-8000-000000000011", "vegano", "Vegano"],
  ["20000000-0000-4000-8000-000000000012", "ingredientes-naturales", "Ingredientes naturales"]
].map(([id, slug, name], index) => ({
  id,
  slug,
  name,
  displayOrder: (index + 1) * 10,
  isActive: true
}));
