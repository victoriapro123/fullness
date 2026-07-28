import assert from "node:assert/strict";
import { buildMealLibraryPayload, buildMenuItemPayload, mapMenuItem } from "../src/lib/menu-items.js";
import { benefitPresets, tagPresets } from "../src/lib/catalog-parameter-presets.js";

const antiInflammatory = benefitPresets.find((item) => item.slug === "antiinflamatorio");
const highProtein = tagPresets.find((item) => item.slug === "alto-en-proteina");
const highFiber = tagPresets.find((item) => item.slug === "alto-en-fibra");

const dish = {
  id: "dish-qa",
  name: "Pollo, camote y cúrcuma",
  description: "Plato QA.",
  benefitAssignments: [
    {
      ...antiInflammatory,
      benefitId: antiInflammatory.id,
      explanation: "La cúrcuma, el jengibre y el aceite de oliva aportan compuestos bioactivos."
    }
  ],
  tagIds: [highProtein.id, highFiber.id],
  tags: [highProtein, highFiber],
  nutritionDescription: "Proteína magra, fibra y grasas saludables.",
  nutritionFacts: { energy_kcal: 520, protein_g: 34, fiber_g: 9 }
};

const libraryPayload = buildMealLibraryPayload(dish);
assert.equal(libraryPayload.benefit_assignments.length, 1);
assert.equal(libraryPayload.benefit_assignments[0].benefitId, antiInflammatory.id);
assert.match(libraryPayload.benefit_assignments[0].explanation, /cúrcuma/i);
assert.deepEqual(libraryPayload.tag_ids, [highProtein.id, highFiber.id]);
assert.equal(libraryPayload.nutrition_description, dish.nutritionDescription);
assert.deepEqual(libraryPayload.nutrition_facts, dish.nutritionFacts);

const planPayload = buildMenuItemPayload({
  slug: "plan-qa",
  name: "Plan QA",
  productType: "plan",
  planFrequency: "weekly",
  description: "Plan compuesto por platos.",
  priceClp: 58200,
  benefitAssignments: [
    {
      ...benefitPresets[1],
      benefitId: benefitPresets[1].id,
      explanation: "Este beneficio directo no debe pertenecer al plan."
    }
  ],
  nutritionDescription: "La nutrición nunca pertenece al plan.",
  nutritionFacts: { protein_g: 999 },
  includedItems: [dish, { ...dish, id: "dish-qa-duplicate" }]
});

assert.equal("nutrition_description" in planPayload, false);
assert.equal("nutrition_highlights" in planPayload, false);
assert.equal("nutrition_facts" in planPayload, false);
assert.equal("benefit_assignments" in planPayload, false);
assert.equal("benefit_tags" in planPayload, false);
assert.equal("tag_ids" in planPayload, false);
assert.equal(planPayload.included_items.length, 2);
assert.equal(planPayload.included_items[0].nutritionDescription, dish.nutritionDescription);
assert.deepEqual(planPayload.included_items[0].nutritionFacts, dish.nutritionFacts);

const mappedPlan = mapMenuItem({
  id: "plan-qa",
  slug: planPayload.slug,
  name: planPayload.name,
  product_type: "plan",
  plan_frequency: "weekly",
  price_clp: planPayload.price_clp,
  description: planPayload.description,
  benefit_assignments: [],
  benefit_tags: [],
  tag_ids: [],
  nutrition_highlights: [],
  included_items: planPayload.included_items,
  is_active: true
});

assert.equal(mappedPlan.benefits.length, 1);
assert.equal(mappedPlan.benefits[0].benefitId, antiInflammatory.id);
assert.equal(mappedPlan.benefits[0].sources.length, 2);
assert.deepEqual(mappedPlan.tagIds, [highProtein.id, highFiber.id]);
assert.equal(mappedPlan.nutritionDescription, "");
assert.deepEqual(mappedPlan.nutritionFacts, {});

const familyPayload = buildMenuItemPayload({
  ...dish,
  slug: "familiar-qa",
  productType: "family",
  priceClp: 18800
});

assert.equal(familyPayload.product_type, "family");
assert.equal(familyPayload.nutrition_description, dish.nutritionDescription);
assert.deepEqual(familyPayload.nutrition_facts, dish.nutritionFacts);
assert.equal(familyPayload.benefit_assignments[0].benefitId, antiInflammatory.id);
assert.deepEqual(familyPayload.tag_ids, [highProtein.id, highFiber.id]);

console.log("Parámetros validados: platos conservan ficha propia y planes heredan sin duplicar.");
