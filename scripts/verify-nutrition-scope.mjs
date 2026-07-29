import assert from "node:assert/strict";
import { buildMealLibraryPayload, buildMenuItemPayload } from "../src/lib/menu-items.js";

const planPayload = buildMenuItemPayload({
  slug: "plan-qa-nutricion",
  name: "Plan QA nutricion",
  productType: "plan",
  planFrequency: "weekly",
  description: "Plan de prueba.",
  priceClp: 12345,
  nutritionDescription: "No debe viajar con el plan.",
  nutritionHighlights: ["No debe viajar"],
  nutritionFacts: { protein_g: 32, fiber_g: 8 },
  includedItems: [
    {
      id: "mealprep-qa",
      name: "Mealprep QA",
      description: "Ficha del mealprep.",
      benefitTags: ["Energetico"],
      ingredients: ["Quinoa"],
      allergens: "Frutos secos, puede contener trazas de sésamo",
      nutritionDescription: "Debe conservarse en el mealprep.",
      nutritionHighlights: ["Alto en proteina"],
      nutritionFacts: { protein_g: 99 },
      rethermalizationInstructions: "Calentar la bolsa sellada a baño María durante 12 minutos."
    }
  ]
});

assert.equal("nutrition_description" in planPayload, false);
assert.equal("nutrition_highlights" in planPayload, false);
assert.equal("nutrition_detail" in planPayload, false);
assert.equal("nutrition_facts" in planPayload, false);
assert.equal("benefit_assignments" in planPayload, false);
assert.equal("benefit_tags" in planPayload, false);
assert.equal("tag_ids" in planPayload, false);
assert.deepEqual(planPayload.included_items, [
  {
    id: "mealprep-qa",
    sku: "PL-MEALPREPQA",
    libraryMealId: "",
    name: "Mealprep QA",
    tag: "",
    description: "Ficha del mealprep.",
    photoUrl: "",
    photoStoragePath: "",
    secondaryPhotoUrl: "",
    secondaryPhotoStoragePath: "",
    benefitAssignments: [
      {
        benefitId: "10000000-0000-4000-8000-000000000002",
        slug: "energetico",
        name: "Energético",
        iconUrl: "/api/media?key=assets%2Fbenefits%2Fenergetico.png",
        iconStoragePath: "assets/benefits/energetico.png",
        defaultDescription: "Aporta una combinación de nutrientes pensada para sostener la energía durante el día.",
        explanation: ""
      }
    ],
    benefitTags: ["Energético"],
    tagIds: ["20000000-0000-4000-8000-000000000001"],
    ingredients: ["Quinoa"],
    nutritionDescription: "Debe conservarse en el mealprep.",
    nutritionHighlights: ["Alto en proteína"],
    nutritionFacts: { protein_g: 99 },
    rethermalizationInstructions: "Calentar la bolsa sellada a baño María durante 12 minutos.",
    allergens: ["Frutos secos", "puede contener trazas de sésamo"]
  }
]);

const mealprepPayload = buildMealLibraryPayload({
  name: "Mealprep QA",
  description: "Ficha del mealprep.",
  allergens: "Pescado\nElaborado en cocina compartida",
  nutritionDescription: "Nutricion del mealprep.",
  nutritionHighlights: ["Alto en proteina"],
  nutritionFacts: { protein_g: 99, vitamin_b12_mcg: 2.4, source: "Laboratorio" },
  rethermalizationInstructions: "Calentar a baño María sin abrir la bolsa."
});

assert.equal(mealprepPayload.nutrition_description, "Nutricion del mealprep.");
assert.deepEqual(mealprepPayload.nutrition_highlights, ["Alto en proteína"]);
assert.deepEqual(mealprepPayload.nutrition_facts, {
  protein_g: 99,
  vitamin_b12_mcg: 2.4,
  source: "Laboratorio"
});
assert.deepEqual(mealprepPayload.allergens, ["Pescado", "Elaborado en cocina compartida"]);
assert.equal(mealprepPayload.rethermalization_instructions, "Calentar a baño María sin abrir la bolsa.");

const familyPayload = buildMenuItemPayload({
  slug: "mealprep-familiar-qa",
  name: "Mealprep familiar QA",
  productType: "family",
  description: "Formato familiar de prueba.",
  allergens: "Mostaza, puede contener trazas de frutos secos",
  rethermalizationInstructions: "Calentar a baño María y servir en una fuente."
});

assert.deepEqual(familyPayload.allergens, ["Mostaza", "puede contener trazas de frutos secos"]);
assert.equal(familyPayload.recipe_summary, "Calentar a baño María y servir en una fuente.");

console.log("Nutrición, alérgenos y retermalización validados en cada mealprep.");
