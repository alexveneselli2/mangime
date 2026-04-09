import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatDateISO(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

export function getMealTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    breakfast: "Colazione",
    lunch: "Pranzo",
    dinner: "Cena",
    snack: "Spuntino",
  };
  return labels[type] || type;
}

export function getMealTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    breakfast: "sunrise",
    lunch: "sun",
    dinner: "moon",
    snack: "coffee",
  };
  return icons[type] || "utensils";
}

export function getQualityColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

export function getQualityBgColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  // Mifflin-St Jeor equation
  if (gender === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.55));
}

export function macroPercentage(macro: number, gramsMultiplier: number, totalCalories: number): number {
  if (totalCalories === 0) return 0;
  return Math.round((macro * gramsMultiplier / totalCalories) * 100);
}
