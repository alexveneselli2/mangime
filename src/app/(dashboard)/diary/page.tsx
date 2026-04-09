"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { FoodEntryCard } from "@/components/food/food-entry-card";
import { WeeklyCaloriesChart } from "@/components/charts/weekly-chart";
import { FoodInput } from "@/components/food/food-input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatDateISO } from "@/lib/utils";

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
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export default function DiaryPage() {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [entriesByDate, setEntriesByDate] = useState<Record<string, FoodEntry[]>>({});
  const [selectedDate, setSelectedDate] = useState(formatDateISO());
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiary = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/diary?days=${days}`);
        const data = await res.json();
        setSummaries(data.summaries || []);
        setEntriesByDate(data.entriesByDate || {});
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchDiary();
  }, [days]);

  const navigateDate = (direction: number) => {
    const current = new Date(selectedDate + "T12:00:00");
    current.setDate(current.getDate() + direction);
    setSelectedDate(formatDateISO(current));
  };

  const selectedEntries = entriesByDate[selectedDate] || [];
  const selectedSummary = summaries.find(s => s.date === selectedDate);

  const chartData = summaries.map(s => ({
    date: s.date,
    calories: s.totalCalories,
    protein: s.totalProtein,
    carbs: s.totalCarbs,
    fat: s.totalFat,
  })).sort((a, b) => a.date.localeCompare(b.date));

  const handleFoodSubmit = async (description: string, mealType: string) => {
    const res = await fetch("/api/food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, mealType }),
    });
    if (!res.ok) throw new Error("Failed to log food");
    // Refresh
    const diaryRes = await fetch(`/api/diary?days=${days}`);
    const data = await diaryRes.json();
    setSummaries(data.summaries || []);
    setEntriesByDate(data.entriesByDate || {});
  };

  const handleDeleteEntry = async (id: string) => {
    await fetch(`/api/food/${id}`, { method: "DELETE" });
    const diaryRes = await fetch(`/api/diary?days=${days}`);
    const data = await diaryRes.json();
    setSummaries(data.summaries || []);
    setEntriesByDate(data.entriesByDate || {});
  };

  const formattedDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Diario</h1>
        <div className="flex gap-1">
          {[7, 14, 30].map(d => (
            <Button
              key={d}
              variant={days === d ? "primary" : "ghost"}
              size="sm"
              onClick={() => setDays(d)}
              className="text-xs"
            >
              {d}g
            </Button>
          ))}
        </div>
      </div>

      {/* Weekly Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardTitle className="text-sm mb-3">Calorie Settimanali</CardTitle>
          <WeeklyCaloriesChart data={chartData} />
        </Card>
      )}

      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-gray-100">
        <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Calendar size={16} className="text-emerald-500" />
          <span className="capitalize">{formattedDate}</span>
        </div>
        <button
          onClick={() => navigateDate(1)}
          className="p-2 hover:bg-gray-100 rounded-xl"
          disabled={selectedDate >= formatDateISO()}
        >
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Daily Summary */}
      {selectedSummary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="!p-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <SummaryPill label="Calorie" value={`${Math.round(selectedSummary.totalCalories)}`} unit="kcal" />
              <SummaryPill label="Proteine" value={`${Math.round(selectedSummary.totalProtein)}`} unit="g" />
              <SummaryPill label="Carb" value={`${Math.round(selectedSummary.totalCarbs)}`} unit="g" />
              <SummaryPill label="Grassi" value={`${Math.round(selectedSummary.totalFat)}`} unit="g" />
            </div>
          </Card>
        </motion.div>
      )}

      {/* Entries for selected date */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Pasti {selectedDate === formatDateISO() ? "di oggi" : ""}
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : selectedEntries.length === 0 ? (
          <Card className="!p-6 text-center">
            <p className="text-gray-400 text-sm">Nessun pasto registrato per questa data</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {selectedEntries.map(entry => (
              <FoodEntryCard key={entry.id} entry={entry} onDelete={handleDeleteEntry} />
            ))}
          </div>
        )}
      </div>

      <FoodInput onSubmit={handleFoodSubmit} />
    </div>
  );
}

function SummaryPill({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="p-2 bg-gray-50 rounded-xl">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-bold text-gray-900">
        {value}<span className="text-xs font-normal text-gray-400">{unit}</span>
      </p>
    </div>
  );
}
