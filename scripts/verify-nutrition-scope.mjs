import assert from "node:assert/strict";
import { buildMealLibraryPayload, buildMenuItemPayload } from "../src/lib/menu-items.js";

const mealPrepPayload = buildMenuItemPayload({
  slug: "plan-qa-nutricion",
  name: "Plan QA nutricion",
  productType: "plan",
  planFrequency: "weekly",
  description: "Plan de prueba.",
  priceClp: 12345,
  nutritionDescription: "Nutricion del meal prep principal.",
  nutritionHighlights: ["Proteina", "Fibra"],
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

assert.equal(mealPrepPayload.nutrition_description, "Nutricion del meal prep principal.");
assert.deepEqual(mealPrepPayload.nutrition_highlights, ["Proteina", "Fibra"]);
assert.deepEqual(mealPrepPayload.nutrition_facts, { protein_g: 32, fiber_g: 8 });
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
    allergens: ["Frutos secos"]
  }
]);

const libraryPayload = buildMealLibraryPayload({
  name: "Plato reutilizable QA",
  description: "Ficha del plato.",
  nutritionDescription: "No debe persistir.",
  nutritionHighlights: ["No debe persistir"],
  nutritionFacts: { protein_g: 99 }
});

assert.equal(libraryPayload.nutrition_description, null);
assert.deepEqual(libraryPayload.nutrition_highlights, []);
assert.deepEqual(libraryPayload.nutrition_facts, {});

console.log("Nutrición validada: se conserva en el meal prep y se excluye de platos reutilizables.");
