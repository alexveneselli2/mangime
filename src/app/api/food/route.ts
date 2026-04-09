import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { analyzeFoodEntry } from "@/lib/ai";
import { formatDateISO } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { description, mealType } = await request.json();

    if (!description || !mealType) {
      return NextResponse.json({ error: "Description and meal type are required" }, { status: 400 });
    }

    // Analyze food with AI
    const analysis = await analyzeFoodEntry(description, mealType);
    const mainItem = analysis.items[0];

    // Create food entry
    const entry = await prisma.foodEntry.create({
      data: {
        userId: user.id,
        description,
        mealType,
        foodName: mainItem?.foodName || description,
        quantity: mainItem?.quantity,
        calories: analysis.totalCalories,
        protein: analysis.totalProtein,
        carbs: analysis.totalCarbs,
        fat: analysis.totalFat,
        fiber: analysis.totalFiber,
        sugar: mainItem?.sugar,
        sodium: mainItem?.sodium,
        confidence: mainItem?.confidence,
        aiAnalysis: JSON.stringify(analysis),
      },
    });

    // Update daily summary
    const today = formatDateISO();
    await prisma.dailySummary.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      create: {
        userId: user.id,
        date: today,
        totalCalories: analysis.totalCalories,
        totalProtein: analysis.totalProtein,
        totalCarbs: analysis.totalCarbs,
        totalFat: analysis.totalFat,
        totalFiber: analysis.totalFiber,
      },
      update: {
        totalCalories: { increment: analysis.totalCalories },
        totalProtein: { increment: analysis.totalProtein },
        totalCarbs: { increment: analysis.totalCarbs },
        totalFat: { increment: analysis.totalFat },
        totalFiber: { increment: analysis.totalFiber },
      },
    });

    return NextResponse.json({ entry, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to log food";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || formatDateISO();

  const startOfDay = new Date(date + "T00:00:00.000Z");
  const endOfDay = new Date(date + "T23:59:59.999Z");

  const entries = await prisma.foodEntry.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { createdAt: "desc" },
  });

  const summary = await prisma.dailySummary.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });

  return NextResponse.json({ entries, summary });
}
