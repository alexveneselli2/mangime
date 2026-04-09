"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface WeeklyChartProps {
  data: { date: string; calories: number; protein: number; carbs: number; fat: number }[];
}

export function WeeklyCaloriesChart({ data }: WeeklyChartProps) {
  const formatted = data.map(d => ({
    ...d,
    day: new Date(d.date + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short" }).slice(0, 2),
  }));

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} barSize={20}>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            width={35}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              fontSize: "12px",
            }}
            formatter={(value) => [`${Math.round(Number(value))} kcal`, "Calorie"]}
            labelFormatter={() => ""}
          />
          <Bar dataKey="calories" fill="#10B981" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
