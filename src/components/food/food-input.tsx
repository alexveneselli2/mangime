"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { Plus, Sunrise, Sun, Moon, Cookie, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const mealTypes = [
  { value: "breakfast", label: "Colazione", icon: Sunrise, color: "bg-amber-50 text-amber-600 border-amber-200" },
  { value: "lunch", label: "Pranzo", icon: Sun, color: "bg-orange-50 text-orange-600 border-orange-200" },
  { value: "dinner", label: "Cena", icon: Moon, color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  { value: "snack", label: "Spuntino", icon: Cookie, color: "bg-pink-50 text-pink-600 border-pink-200" },
];

interface FoodInputProps {
  onSubmit: (description: string, mealType: string) => Promise<void>;
}

export function FoodInput({ onSubmit }: FoodInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState("lunch");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setAnalyzing(true);
    try {
      await onSubmit(description.trim(), selectedMeal);
      setDescription("");
      setIsOpen(false);
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full",
          "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30",
          "flex items-center justify-center",
          "hover:bg-emerald-700 transition-colors"
        )}
      >
        <Plus size={24} />
      </motion.button>

      {/* Food Input Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Cosa hai mangiato?">
        <div className="space-y-4">
          {/* Meal Type Selector */}
          <div className="grid grid-cols-4 gap-2">
            {mealTypes.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => setSelectedMeal(value)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all duration-200",
                  selectedMeal === value
                    ? color
                    : "border-transparent bg-gray-50 text-gray-400"
                )}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Text Input */}
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Es: Un piatto di pasta al pomodoro con parmigiano, un'insalata mista e un bicchiere di vino rosso"
              className={cn(
                "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900",
                "placeholder:text-gray-400 resize-none",
                "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none",
                "transition-all duration-150 min-h-[100px]"
              )}
              rows={4}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!description.trim()}
            className="w-full"
            size="lg"
          >
            <AnimatePresence mode="wait">
              {analyzing ? (
                <motion.span
                  key="analyzing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Sparkles size={18} className="animate-pulse" />
                  AI sta analizzando...
                </motion.span>
              ) : (
                <motion.span
                  key="send"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Send size={18} />
                  Analizza con AI
                </motion.span>
              )}
            </AnimatePresence>
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Descrivi liberamente cosa hai mangiato. NutrIA analizzer&agrave; tutto automaticamente.
          </p>
        </div>
      </Modal>
    </>
  );
}
