"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface MacroChartProps {
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
}

const COLORS = ["#3B82F6", "#F59E0B", "#EF4444"];

export function MacroChart({ protein, carbs, fat, size = 120 }: MacroChartProps) {
  const data = [
    { name: "Proteine", value: protein * 4, grams: protein },
    { name: "Carboidrati", value: carbs * 4, grams: carbs },
    { name: "Grassi", value: fat * 9, grams: fat },
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-300 text-sm" style={{ width: size, height: size }}>
        Nessun dato
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.32}
            outerRadius={size * 0.45}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-gray-900">{Math.round(total)}</span>
        <span className="text-[9px] text-gray-400">kcal</span>
      </div>
    </div>
  );
}

export function MacroLegend({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const items = [
    { label: "Proteine", value: protein, color: "bg-blue-500", unit: "g" },
    { label: "Carboidrati", value: carbs, color: "bg-amber-500", unit: "g" },
    { label: "Grassi", value: fat, color: "bg-red-500", unit: "g" },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {items.map(({ label, value, color, unit }) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
          <span className="text-xs text-gray-500 flex-1">{label}</span>
          <span className="text-xs font-semibold text-gray-900">{Math.round(value)}{unit}</span>
        </div>
      ))}
    </div>
  );
}
