"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { FoodInput } from "@/components/food/food-input";
import { FoodEntryCard } from "@/components/food/food-entry-card";
import { MacroChart, MacroLegend } from "@/components/charts/macro-chart";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Plus, Sparkles } from "lucide-react";

interface FoodEntry {
  id: string;
  description: string;
  mealType: string;
  foodName: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  confidence: number | null;
  createdAt: string;
}

interface DailySummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalWater: number;
}

interface UserProfile {
  name: string | null;
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: string | null;
  activityLevel: string | null;
  goal: string | null;
}

export default function DashboardPage() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [waterTotal, setWaterTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const targetCalories = 2000; // TODO: calculate from user profile
  const targetWater = 2500; // ml

  const fetchData = useCallback(async () => {
    try {
      const [foodRes, waterRes, meRes] = await Promise.all([
        fetch("/api/food"),
        fetch("/api/water"),
        fetch("/api/auth/me"),
      ]);

      const foodData = await foodRes.json();
      const waterData = await waterRes.json();
      const meData = await meRes.json();

      setEntries(foodData.entries || []);
      setSummary(foodData.summary || null);
      setWaterTotal(waterData.total || 0);
      setUser(meData.user || null);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFoodSubmit = async (description: string, mealType: string) => {
    const res = await fetch("/api/food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, mealType }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    await fetchData();
  };

  const handleDeleteEntry = async (id: string) => {
    await fetch(`/api/food/${id}`, { method: "DELETE" });
    await fetchData();
  };

  const handleAddWater = async (amount: number) => {
    await fetch("/api/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    await fetchData();
  };

  const cal = summary?.totalCalories || 0;
  const prot = summary?.totalProtein || 0;
  const carbs = summary?.totalCarbs || 0;
  const fat = summary?.totalFat || 0;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ciao{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600">
          <span className="text-sm font-black text-white">N</span>
        </div>
      </div>

      {/* Calories Ring + Macros */}
      <Card className="!p-5">
        <div className="flex items-center gap-5">
          <ProgressRing
            value={cal}
            max={targetCalories}
            size={110}
            strokeWidth={10}
            color={cal > targetCalories ? "stroke-red-500" : "stroke-emerald-500"}
            label={`${Math.round(cal)}`}
            sublabel="kcal"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <CardTitle className="text-sm">Oggi</CardTitle>
              <span className="text-xs text-gray-400">
                Obiettivo: {targetCalories} kcal
              </span>
            </div>
            <MacroLegend protein={prot} carbs={carbs} fat={fat} />
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
              <span>Rimanenti: {Math.max(0, Math.round(targetCalories - cal))} kcal</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Water Tracker */}
      <Card className="!p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-500">
              <Droplets size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Acqua</p>
              <p className="text-xs text-gray-400">{Math.round(waterTotal)} / {targetWater} ml</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick water buttons */}
            {[250, 500].map(ml => (
              <Button
                key={ml}
                variant="secondary"
                size="sm"
                onClick={() => handleAddWater(ml)}
                className="text-xs"
              >
                <Plus size={12} className="mr-1" />
                {ml}ml
              </Button>
            ))}
          </div>
        </div>
        {/* Water progress bar */}
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (waterTotal / targetWater) * 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </Card>

      {/* Macro Chart */}
      {cal > 0 && (
        <Card className="!p-4">
          <CardTitle className="text-sm mb-3">Distribuzione Macros</CardTitle>
          <div className="flex items-center justify-center">
            <MacroChart protein={prot} carbs={carbs} fat={fat} size={140} />
          </div>
        </Card>
      )}

      {/* AI Insight Quick */}
      {entries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-900">Insight AI</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Hai registrato {entries.length} pasto/i oggi per un totale di {Math.round(cal)} kcal.
                  Vai alla sezione Insights per un&apos;analisi completa.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Today's Entries */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Pasti di oggi</h2>
        {entries.length === 0 ? (
          <Card className="!p-8 text-center">
            <p className="text-gray-400 text-sm">Nessun pasto registrato</p>
            <p className="text-gray-300 text-xs mt-1">
              Tocca il + per aggiungere il tuo primo pasto
            </p>
          </Card>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {entries.map(entry => (
                <FoodEntryCard
                  key={entry.id}
                  entry={entry}
                  onDelete={handleDeleteEntry}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* FAB */}
      <FoodInput onSubmit={handleFoodSubmit} />
    </div>
  );
}
