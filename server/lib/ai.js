import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { searchProduct, scaleNutriments } from "./openfoodfacts.js";
import { ApiError } from "../middleware/errors.js";

const client = config.anthropic.apiKey
  ? new Anthropic({
      apiKey: config.anthropic.apiKey,
      // Optional override (testing / proxy). Ignored if unset.
      ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}),
    })
  : null;

const SYSTEM_PROMPT = `Sei un nutrizionista esperto che analizza i pasti descritti in linguaggio naturale.

Dato il testo dell'utente, scomponi il pasto nei singoli alimenti e stima i valori nutrizionali con porzioni realistiche (cucina italiana di riferimento).

Per ogni alimento, se riconosci un PRODOTTO COMMERCIALE DI MARCA (es. "Nutella", "Coca-Cola", "biscotti Oro Saiwa", "yogurt Müller"), imposta "branded": true e fornisci in "search_query" il nome più adatto per cercarlo in un database di prodotti (marca + nome prodotto). Per cibi generici (es. "pasta al pomodoro", "mela", "petto di pollo") imposta "branded": false.

Stima sempre anche "grams" = il peso totale stimato della porzione in grammi (numero), che servirà per i prodotti di marca.

Rispondi ESCLUSIVAMENTE con JSON valido, senza markdown né testo extra, in questo formato:
{
  "name": "etichetta breve del pasto (max 60 caratteri)",
  "items": [
    {
      "name": "nome alimento",
      "quantity": "quantità leggibile (es. '1 piatto', '200 g')",
      "grams": 200,
      "branded": false,
      "search_query": "",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "fiber": 0,
      "sugar": 0,
      "sodium": 0
    }
  ]
}
calories in kcal; protein, carbs, fat, fiber, sugar in grammi; sodium in milligrammi.`;

function extractJson(text) {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callModel(description) {
  if (!client) {
    throw new ApiError(503, "Servizio AI non configurato (manca ANTHROPIC_API_KEY)", "AI_UNCONFIGURED");
  }
  const msg = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: description }],
  });
  const text = msg.content.find((b) => b.type === "text")?.text || "";
  return extractJson(text);
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}

/**
 * Analyze a meal description: model estimate + Open Food Facts enrichment for
 * branded products. Returns a structured entry ready to persist.
 */
export async function analyzeMeal(description) {
  const parsed = await callModel(description);
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

  const items = [];
  for (const it of rawItems) {
    const base = {
      name: String(it.name || "Alimento").slice(0, 200),
      quantity: it.quantity ? String(it.quantity).slice(0, 100) : null,
      calories: n(it.calories),
      protein: n(it.protein),
      carbs: n(it.carbs),
      fat: n(it.fat),
      fiber: n(it.fiber),
      sugar: n(it.sugar),
      sodium: n(it.sodium),
      source: "ai",
      off_code: null,
      off_name: null,
      off_url: null,
    };

    // For branded products, look up official Open Food Facts data and, if found,
    // replace the estimate with the official values (explicitly attributed).
    if (it.branded && it.search_query) {
      const grams = n(it.grams) || 100;
      const product = await searchProduct(String(it.search_query));
      if (product) {
        const scaled = scaleNutriments(product.per100g, grams);
        base.calories = scaled.calories;
        base.protein = scaled.protein;
        base.carbs = scaled.carbs;
        base.fat = scaled.fat;
        base.fiber = scaled.fiber;
        base.sugar = scaled.sugar;
        base.sodium = scaled.sodium;
        base.source = "openfoodfacts";
        base.off_code = product.code;
        base.off_name = product.brands ? `${product.name} — ${product.brands}` : product.name;
        base.off_url = product.url;
      }
    }

    items.push(base);
  }

  const totals = items.reduce(
    (acc, i) => {
      acc.calories += i.calories;
      acc.protein += i.protein;
      acc.carbs += i.carbs;
      acc.fat += i.fat;
      acc.fiber += i.fiber;
      acc.sugar += i.sugar;
      acc.sodium += i.sodium;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
  );

  return {
    name: String(parsed.name || description).slice(0, 60),
    items,
    totals,
    model: config.anthropic.model,
  };
}
