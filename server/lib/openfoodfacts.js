// Open Food Facts lookup. No API key required.
// We use the v2 search API and pick the best-matching product, then return
// its nutriments per 100g so the caller can scale to the eaten quantity.
//
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/

// Overridable for testing or a self-hosted Open Food Facts instance.
const SEARCH_URL = process.env.OFF_SEARCH_URL || "https://world.openfoodfacts.org/cgi/search.pl";
const FIELDS = [
  "code",
  "product_name",
  "brands",
  "nutriments",
  "serving_quantity",
  "quantity",
];

const cache = new Map(); // query -> { at, value }
const CACHE_TTL = 1000 * 60 * 60; // 1h

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Returns normalized nutriment data per 100g, or null if not usable.
function extractPer100g(product) {
  const n = product?.nutriments;
  if (!n) return null;
  const energyKcal =
    num(n["energy-kcal_100g"]) ??
    (num(n["energy_100g"]) != null ? num(n["energy_100g"]) / 4.184 : null);
  if (energyKcal == null) return null;
  return {
    calories: energyKcal,
    protein: num(n["proteins_100g"]) ?? 0,
    carbs: num(n["carbohydrates_100g"]) ?? 0,
    fat: num(n["fat_100g"]) ?? 0,
    fiber: num(n["fiber_100g"]) ?? 0,
    sugar: num(n["sugars_100g"]) ?? 0,
    sodium: num(n["sodium_100g"]) != null ? num(n["sodium_100g"]) * 1000 : 0, // g -> mg
  };
}

/**
 * Search Open Food Facts for a branded product.
 * @param {string} queryText e.g. "Nutella", "Coca-Cola Zero", "Barilla penne"
 * @returns {Promise<null | {
 *   code: string, name: string, brands: string, url: string, per100g: object
 * }>}
 */
export async function searchProduct(queryText) {
  const key = queryText.trim().toLowerCase();
  if (!key) return null;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.value;

  const url = new URL(SEARCH_URL);
  url.searchParams.set("search_terms", queryText);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "5");
  url.searchParams.set("fields", FIELDS.join(","));

  let value = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "NutrIA/1.0 (food diary; contact: support@nutria.app)" },
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const products = Array.isArray(data.products) ? data.products : [];
      for (const p of products) {
        const per100g = extractPer100g(p);
        if (per100g && p.product_name) {
          value = {
            code: String(p.code || ""),
            name: p.product_name,
            brands: p.brands || "",
            url: p.code ? `https://world.openfoodfacts.org/product/${p.code}` : "",
            per100g,
          };
          break;
        }
      }
    }
  } catch (err) {
    console.warn("[off] lookup failed:", err.message);
  }

  cache.set(key, { at: Date.now(), value });
  return value;
}

// Scale per-100g nutriments to a number of grams.
export function scaleNutriments(per100g, grams) {
  const f = grams / 100;
  return {
    calories: per100g.calories * f,
    protein: per100g.protein * f,
    carbs: per100g.carbs * f,
    fat: per100g.fat * f,
    fiber: per100g.fiber * f,
    sugar: per100g.sugar * f,
    sodium: per100g.sodium * f,
  };
}
