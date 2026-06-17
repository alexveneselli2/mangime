import { Router } from "express";
import { query } from "../db/pool.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { cleanString, assert } from "../lib/validate.js";

export const profileRouter = Router();
profileRouter.use(requireAuth);

profileRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const updates = {};
    if (req.body.name !== undefined) {
      updates.name = req.body.name ? cleanString(req.body.name, { max: 80, field: "Nome" }) : null;
    }
    if (req.body.calorieGoal !== undefined) {
      const goal = parseInt(req.body.calorieGoal, 10);
      assert(Number.isFinite(goal) && goal >= 800 && goal <= 8000, "Obiettivo calorico non valido", "INVALID_GOAL");
      updates.calorie_goal = goal;
    }

    const keys = Object.keys(updates);
    if (keys.length) {
      const set = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
      const values = keys.map((k) => updates[k]);
      values.push(req.session.userId);
      await query(`UPDATE users SET ${set}, updated_at = now() WHERE id = $${values.length}`, values);
    }

    const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
    const u = rows[0];
    res.json({
      user: { id: u.id, email: u.email, name: u.name, calorieGoal: u.calorie_goal, emailVerified: u.email_verified },
    });
  })
);
