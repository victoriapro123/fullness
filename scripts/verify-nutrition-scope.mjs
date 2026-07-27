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
      nutritionDescription: "No debe viajar con el plato.",
      nutritionHighlights: ["No debe viajar"],
      nutritionFacts: { protein_g: 99 }
    }
  ]
});

assert.equal("nutrition_description" in mealPrepPayload, false);
assert.equal("nutrition_highlights" in mealPrepPayload, false);
assert.equal("nutrition_detail" in mealPrepPayload, false);
assert.equal("nutrition_facts" in mealPrepPayload, false);
assert.deepEqual(mealPrepPayload.included_items, [
  {
    id: "plato-qa",
    libraryMealId: "",
    name: "Plato reutilizable QA",
    tag: "",
    description: "Ficha del plato.",
    photoUrl: "",
    photoStoragePath: "",
    secondaryPhotoUrl: "",
    secondaryPhotoStoragePath: "",
    benefitTags: ["Energetico"],
    ingredients: ["Quinoa"],
    nutritionDescription: "No debe viajar con el plato.",
    nutritionHighlights: ["No debe viajar"],
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
assert.deepEqual(libraryPayload.nutrition_highlights, ["Alto en proteina"]);
assert.deepEqual(libraryPayload.nutrition_facts, { protein_g: 99 });

console.log("Nutrición validada: se conserva en platos y se excluye del meal prep principal.");
