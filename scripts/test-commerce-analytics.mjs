import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const source = await readFile(new URL("../src/lib/analytics.js", import.meta.url), "utf8");
const env = {PROD: true, VITE_GA_MEASUREMENT_ID: "G-TEST123456", VITE_META_PIXEL_ID: "1455887106694379"};
const storage = new Map();
const scripts = [];
globalThis.window = {
  location: {hostname: "www.fullnesslab.com", origin: "https://www.fullnesslab.com"},
  localStorage: {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value)}
};
globalThis.document = {
  querySelector: () => null,
  createElement: () => ({dataset: {}}),
  head: {appendChild(script) { scripts.push(script); script.onload?.(); }},
  title: "Fullness"
};
const load = variant => import("data:text/javascript," + encodeURIComponent(source.replaceAll("import.meta.env", JSON.stringify(env)) + "\n//" + variant));
const analytics = await load("first");
const items = [analytics.buildAnalyticsItem({id: "meal-1", name: "Plato", price: 9800}, 2)];
analytics.trackEvent("view_item", {value: 9800, currency: "CLP", items});
analytics.trackEvent("add_to_cart", {value: 19600, currency: "CLP", items});
analytics.trackCheckoutStart("attempt-1", items, 23590);
analytics.trackCheckoutStart("attempt-1", items, 23590);
const payment = {orderId: "order-1", status: "approved", testMode: false, total: 23590, deliveryFee: 3990};
analytics.trackApprovedPurchase({...payment, status: "pending"}, items);
analytics.trackApprovedPurchase({...payment, testMode: true}, items);
analytics.trackApprovedPurchase(payment, items);
analytics.trackApprovedPurchase(payment, items);
(await load("reload")).trackApprovedPurchase(payment, items);
window.location.hostname = "localhost";
analytics.trackEvent("add_to_cart", {value: 1});
await Promise.resolve();
const meta = window.fbq.queue.filter(entry => entry[0] === "trackSingle");
const ga = window.dataLayer.map(entry => Array.from(entry)).filter(entry => entry[0] === "event");
assert.deepEqual(meta.map(entry => entry[2]), ["ViewContent", "AddToCart", "InitiateCheckout", "Purchase"]);
assert.deepEqual(ga.map(entry => entry[1]), ["view_item", "add_to_cart", "begin_checkout", "purchase"]);
assert.equal(scripts.length, 2);
assert.equal(meta[3][3].currency, "CLP");
assert.equal(meta[3][3].value, 23590);
assert.equal(meta[3][4].eventID, "order-1");
assert.equal(ga[3][2].value, 19600);
assert.equal(ga[3][2].shipping, 3990);
assert.equal(ga[3][2].transaction_id, "order-1");
assert.ok(!("metaValue" in ga[3][2]));
console.log("PASS commerce events, CLP, canonical purchase ID, local deduplication and TEST exclusion");
