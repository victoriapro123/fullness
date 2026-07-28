import assert from "node:assert/strict";
import { buildMealLibraryPayload, buildMenuItemPayload } from "../src/lib/menu-items.js";

const mealPrepPayload = buildMenuItemPayload({
  slug: "plan-qa-nutricion",
  name: "Plan QA nutricion",
  productType: "plan",
  planFrequency: "weekly",
  description: "Plan de prueba.",
  priceClp: 12345,
  nutritionDescription: "No debe viajar con el meal prep.",
  nutritionHighlights: ["No debe viajar"],
  nutritionFacts: { protein_g: 32, fiber_g: 8 },
  includedItems: [
    {
      id: "plato-qa",
      name: "Plato reutilizable QA",
      description: "Ficha del plato.",
      benefitTags: ["Energetico"],
      ingredients: ["Quinoa"],
      allergens: ["Frutos secos"],
      nutritionDescription: "Debe conservarse en el plato.",
      nutritionHighlights: ["Alto en proteina"],
      nutritionFacts: { protein_g: 99 }
    }
  ]
});

assert.equal("nutrition_description" in mealPrepPayload, false);
assert.equal("nutrition_highlights" in mealPrepPayload, false);
assert.equal("nutrition_detail" in mealPrepPayload, false);
assert.equal("nutrition_facts" in mealPrepPayload, false);
assert.equal("benefit_assignments" in mealPrepPayload, false);
assert.equal("benefit_tags" in mealPrepPayload, false);
assert.equal("tag_ids" in mealPrepPayload, false);
assert.deepEqual(mealPrepPayload.included_items, [
  {
    id: "plato-qa",
    sku: "PL-PLATOQA",
    libraryMealId: "",
    name: "Plato reutilizable QA",
    tag: "",
    description: "Ficha del plato.",
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
    nutritionDescription: "Debe conservarse en el plato.",
    nutritionHighlights: ["Alto en proteína"],
    nutritionFacts: { protein_g: 99 },
    allergens: ["Frutos secos"]
  }
]);

const libraryPayload = buildMealLibraryPayload({
  name: "Plato reutilizable QA",
  description: "Ficha del plato.",
  nutritionDescription: "Nutricion del plato reutilizable.",
  nutritionHighlights: ["Alto en proteina"],
  nutritionFacts: { protein_g: 99 }
});

assert.equal(libraryPayload.nutrition_description, "Nutricion del plato reutilizable.");
assert.deepEqual(libraryPayload.nutrition_highlights, ["Alto en proteína"]);
assert.deepEqual(libraryPayload.nutrition_facts, { protein_g: 99 });

console.log("Nutrición validada: se conserva en platos y se excluye del meal prep principal.");
