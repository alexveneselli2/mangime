import { Router } from "express";
import rateLimit from "express-rate-limit";
import { query, withTransaction } from "../db/pool.js";
import { asyncHandler, ApiError } from "../middleware/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { cleanString, parseDate, toNumber, assert } from "../lib/validate.js";
import { analyzeMeal } from "../lib/ai.js";

export const entriesRouter = Router();
entriesRouter.use(requireAuth);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Troppe analisi in poco tempo, attendi un momento" },
});

const MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack", "meal"]);

function serializeEntry(entry, items) {
  return {
    id: entry.id,
    date: entry.entry_date instanceof Date ? entry.entry_date.toISOString().slice(0, 10) : entry.entry_date,
    mealType: entry.meal_type,
    description: entry.description,
    name: entry.name,
    edited: entry.edited,
    aiModel: entry.ai_model,
    calories: Number(entry.calories),
    protein: Number(entry.protein),
    carbs: Number(entry.carbs),
    fat: Number(entry.fat),
    fiber: Number(entry.fiber),
    sugar: Number(entry.sugar),
    sodium: Number(entry.sodium),
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
    items: (items || []).map((it) => ({
      id: it.id,
      name: it.name,
      quantity: it.quantity,
      calories: Number(it.calories),
      protein: Number(it.protein),
      carbs: Number(it.carbs),
      fat: Number(it.fat),
      fiber: Number(it.fiber),
      source: it.source,
      offCode: it.off_code,
      offName: it.off_name,
      offUrl: it.off_url,
    })),
  };
}

function sumItems(items) {
  return items.reduce(
    (a, i) => ({
      calories: a.calories + toNumber(i.calories),
      protein: a.protein + toNumber(i.protein),
      carbs: a.carbs + toNumber(i.carbs),
      fat: a.fat + toNumber(i.fat),
      fiber: a.fiber + toNumber(i.fiber),
      sugar: a.sugar + toNumber(i.sugar),
      sodium: a.sodium + toNumber(i.sodium),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
  );
}

async function loadEntry(userId, entryId) {
  const { rows } = await query("SELECT * FROM food_entries WHERE id = $1 AND user_id = $2", [entryId, userId]);
  if (!rows[0]) throw new ApiError(404, "Pasto non trovato", "NOT_FOUND");
  const items = await query("SELECT * FROM food_items WHERE entry_id = $1 ORDER BY position, created_at", [entryId]);
  return { entry: rows[0], items: items.rows };
}

async function insertEntryWithItems(client, { userId, date, mealType, description, analysis }) {
  const t = analysis.totals;
  const { rows } = await client.query(
    `INSERT INTO food_entries
       (user_id, entry_date, meal_type, description, name, calories, protein, carbs, fat, fiber, sugar, sodium, ai_model)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [userId, date, mealType, description, analysis.name, t.calories, t.protein, t.carbs, t.fat, t.fiber, t.sugar, t.sodium, analysis.model]
  );
  const entry = rows[0];
  let pos = 0;
  const items = [];
  for (const it of analysis.items) {
    const r = await client.query(
      `INSERT INTO food_items
         (entry_id, position, name, quantity, calories, protein, carbs, fat, fiber, source, off_code, off_name, off_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [entry.id, pos++, it.name, it.quantity, it.calories, it.protein, it.carbs, it.fat, it.fiber, it.source, it.off_code, it.off_name, it.off_url]
    );
    items.push(r.rows[0]);
  }
  return { entry, items };
}

// ---- List entries for a day ----
entriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const date = parseDate(req.query.date);
    const { rows: entries } = await query(
      "SELECT * FROM food_entries WHERE user_id = $1 AND entry_date = $2 ORDER BY created_at",
      [req.session.userId, date]
    );
    const ids = entries.map((e) => e.id);
    let itemsByEntry = {};
    if (ids.length) {
      const { rows: items } = await query(
        "SELECT * FROM food_items WHERE entry_id = ANY($1) ORDER BY position, created_at",
        [ids]
      );
      itemsByEntry = items.reduce((m, it) => ((m[it.entry_id] ||= []).push(it), m), {});
    }
    const serialized = entries.map((e) => serializeEntry(e, itemsByEntry[e.id]));
    const totals = serialized.reduce(
      (a, e) => ({
        calories: a.calories + e.calories,
        protein: a.protein + e.protein,
        carbs: a.carbs + e.carbs,
        fat: a.fat + e.fat,
        fiber: a.fiber + e.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
    res.json({ date, entries: serialized, totals });
  })
);

// ---- Create entry (AI analysis) ----
entriesRouter.post(
  "/",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const description = cleanString(req.body.description, { max: 1000, field: "Descrizione" });
    const date = parseDate(req.body.date);
    const mealType = MEAL_TYPES.has(req.body.mealType) ? req.body.mealType : "meal";

    const analysis = await analyzeMeal(description);
    const { entry, items } = await withTransaction((client) =>
      insertEntryWithItems(client, { userId: req.session.userId, date, mealType, description, analysis })
    );
    res.status(201).json({ entry: serializeEntry(entry, items) });
  })
);

// ---- Re-analyze an entry with a modified prompt ----
entriesRouter.post(
  "/:id/reprompt",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { entry: existing } = await loadEntry(req.session.userId, req.params.id);
    const description = cleanString(req.body.description, { max: 1000, field: "Descrizione" });
    const mealType = MEAL_TYPES.has(req.body.mealType) ? req.body.mealType : existing.meal_type;

    const analysis = await analyzeMeal(description);
    const { entry, items } = await withTransaction(async (client) => {
      await client.query("DELETE FROM food_items WHERE entry_id = $1", [existing.id]);
      const t = analysis.totals;
      const { rows } = await client.query(
        `UPDATE food_entries SET
           description=$1, name=$2, meal_type=$3, calories=$4, protein=$5, carbs=$6, fat=$7,
           fiber=$8, sugar=$9, sodium=$10, ai_model=$11, edited=FALSE, updated_at=now()
         WHERE id=$12 RETURNING *`,
        [description, analysis.name, mealType, t.calories, t.protein, t.carbs, t.fat, t.fiber, t.sugar, t.sodium, analysis.model, existing.id]
      );
      const newItems = [];
      let pos = 0;
      for (const it of analysis.items) {
        const r = await client.query(
          `INSERT INTO food_items
             (entry_id, position, name, quantity, calories, protein, carbs, fat, fiber, source, off_code, off_name, off_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
          [existing.id, pos++, it.name, it.quantity, it.calories, it.protein, it.carbs, it.fat, it.fiber, it.source, it.off_code, it.off_name, it.off_url]
        );
        newItems.push(r.rows[0]);
      }
      return { entry: rows[0], items: newItems };
    });
    res.json({ entry: serializeEntry(entry, items) });
  })
);

// ---- Manual edit of an entry (name, meal type, and items) ----
entriesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { entry: existing } = await loadEntry(req.session.userId, req.params.id);

    const name = req.body.name ? cleanString(req.body.name, { max: 60, field: "Nome" }) : existing.name;
    const mealType = MEAL_TYPES.has(req.body.mealType) ? req.body.mealType : existing.meal_type;
    assert(Array.isArray(req.body.items), "Elenco alimenti non valido", "INVALID_ITEMS");
    assert(req.body.items.length > 0, "Serve almeno un alimento", "EMPTY_ITEMS");

    const items = req.body.items.map((it) => ({
      name: cleanString(it.name, { max: 200, field: "Nome alimento" }),
      quantity: it.quantity ? String(it.quantity).slice(0, 100) : null,
      calories: toNumber(it.calories),
      protein: toNumber(it.protein),
      carbs: toNumber(it.carbs),
      fat: toNumber(it.fat),
      fiber: toNumber(it.fiber),
      sugar: toNumber(it.sugar),
      sodium: toNumber(it.sodium),
      // Editing an item makes it user-sourced unless it keeps an OFF reference.
      source: it.source === "openfoodfacts" && it.offCode ? "openfoodfacts" : "manual",
      offCode: it.offCode || null,
      offName: it.offName || null,
      offUrl: it.offUrl || null,
    }));

    const totals = sumItems(items);
    const { entry, savedItems } = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE food_entries SET
           name=$1, meal_type=$2, calories=$3, protein=$4, carbs=$5, fat=$6, fiber=$7, sugar=$8, sodium=$9,
           edited=TRUE, updated_at=now()
         WHERE id=$10 RETURNING *`,
        [name, mealType, totals.calories, totals.protein, totals.carbs, totals.fat, totals.fiber, totals.sugar, totals.sodium, existing.id]
      );
      await client.query("DELETE FROM food_items WHERE entry_id = $1", [existing.id]);
      const saved = [];
      let pos = 0;
      for (const it of items) {
        const r = await client.query(
          `INSERT INTO food_items
             (entry_id, position, name, quantity, calories, protein, carbs, fat, fiber, source, off_code, off_name, off_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
          [existing.id, pos++, it.name, it.quantity, it.calories, it.protein, it.carbs, it.fat, it.fiber, it.source, it.offCode, it.offName, it.offUrl]
        );
        saved.push(r.rows[0]);
      }
      return { entry: rows[0], savedItems: saved };
    });
    res.json({ entry: serializeEntry(entry, savedItems) });
  })
);

// ---- Delete entry ----
entriesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { rowCount } = await query("DELETE FROM food_entries WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.session.userId,
    ]);
    if (!rowCount) throw new ApiError(404, "Pasto non trovato", "NOT_FOUND");
    res.json({ ok: true });
  })
);
