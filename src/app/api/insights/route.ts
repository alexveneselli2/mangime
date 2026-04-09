import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateDailyInsight, generateWeeklyReport } from "@/lib/ai";
import { formatDateISO } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "daily";

  if (type === "weekly") {
    // Get last 7 days summaries
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return formatDateISO(d);
    });

    const summaries = await prisma.dailySummary.findMany({
      where: { userId: user.id, date: { in: dates } },
      orderBy: { date: "asc" },
    });

    const healthData = await prisma.healthData.findMany({
      where: { userId: user.id, date: { in: dates } },
    });

    const report = await generateWeeklyReport(summaries, user, healthData);
    return NextResponse.json(report);
  }

  // Daily insight
  const today = formatDateISO();
  const startOfDay = new Date(today + "T00:00:00.000Z");
  const endOfDay = new Date(today + "T23:59:59.999Z");

  const entries = await prisma.foodEntry.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
  });

  if (entries.length === 0) {
    return NextResponse.json({
      summary: "Nessun pasto registrato oggi. Inizia a tracciare i tuoi pasti!",
      score: 0,
      tips: ["Registra la tua colazione", "Non saltare i pasti", "Bevi un bicchiere d'acqua"],
    });
  }

  const healthData = await prisma.healthData.findFirst({
    where: { userId: user.id, date: today },
  });

  const insight = await generateDailyInsight(
    entries.map(e => ({
      description: e.description,
      calories: e.calories || 0,
      protein: e.protein || 0,
      carbs: e.carbs || 0,
      fat: e.fat || 0,
      mealType: e.mealType,
    })),
    user,
    healthData || undefined
  );

  return NextResponse.json(insight);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get stored insights
  const insights = await prisma.aIInsight.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ insights });
}
