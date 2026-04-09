"use client";

import { Card } from "@/components/ui/card";
import { cn, getMealTypeLabel } from "@/lib/utils";
import { Trash2, Sunrise, Sun, Moon, Cookie, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface FoodEntryCardProps {
  entry: {
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
  };
  onDelete?: (id: string) => void;
}

const mealIcons: Record<string, typeof Sunrise> = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

const mealColors: Record<string, string> = {
  breakfast: "text-amber-500 bg-amber-50",
  lunch: "text-orange-500 bg-orange-50",
  dinner: "text-indigo-500 bg-indigo-50",
  snack: "text-pink-500 bg-pink-50",
};

export function FoodEntryCard({ entry, onDelete }: FoodEntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = mealIcons[entry.mealType] || Sun;
  const color = mealColors[entry.mealType] || "text-gray-500 bg-gray-50";
  const time = new Date(entry.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
    >
      <Card className="overflow-hidden">
        <div className="flex items-start gap-3">
          {/* Meal icon */}
          <div className={cn("p-2 rounded-xl shrink-0", color)}>
            <Icon size={18} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-gray-900 line-clamp-2">
                  {entry.foodName || entry.description}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {getMealTypeLabel(entry.mealType)} &middot; {time}
                </p>
              </div>
              <span className="text-sm font-bold text-gray-900 shrink-0">
                {entry.calories ? Math.round(entry.calories) : "—"} kcal
              </span>
            </div>

            {/* Macro pills */}
            <div className="flex gap-2 mt-2">
              <MacroPill label="P" value={entry.protein} color="bg-blue-100 text-blue-700" />
              <MacroPill label="C" value={entry.carbs} color="bg-amber-100 text-amber-700" />
              <MacroPill label="G" value={entry.fat} color="bg-red-100 text-red-700" />
              {entry.fiber != null && entry.fiber > 0 && (
                <MacroPill label="F" value={entry.fiber} color="bg-green-100 text-green-700" />
              )}
            </div>

            {/* Expand for details */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-2 text-xs text-gray-400 hover:text-gray-600"
            >
              <ChevronDown size={14} className={cn("transition-transform", expanded && "rotate-180")} />
              {expanded ? "Meno dettagli" : "Dettagli"}
            </button>

            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2 text-xs text-gray-500 space-y-1"
              >
                <p><span className="text-gray-400">Descrizione:</span> {entry.description}</p>
                {entry.confidence != null && (
                  <p><span className="text-gray-400">Confidenza AI:</span> {Math.round(entry.confidence * 100)}%</p>
                )}
              </motion.div>
            )}
          </div>

          {/* Delete */}
          {onDelete && (
            <button
              onClick={() => onDelete(entry.id)}
              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number | null; color: string }) {
  if (!value) return null;
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", color)}>
      {label} {Math.round(value)}g
    </span>
  );
}
