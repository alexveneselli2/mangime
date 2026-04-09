import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateISO } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { amount } = await request.json();
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
  }

  const entry = await prisma.waterEntry.create({
    data: { userId: user.id, amount },
  });

  // Update daily summary
  const today = formatDateISO();
  await prisma.dailySummary.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    create: {
      userId: user.id,
      date: today,
      totalWater: amount,
    },
    update: {
      totalWater: { increment: amount },
    },
  });

  return NextResponse.json({ entry });
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

  const entries = await prisma.waterEntry.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({ entries, total });
}
