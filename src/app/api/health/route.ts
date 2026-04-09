import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateISO } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { steps, activeEnergy, weight, heartRate, sleepHours, date, source } = await request.json();

  const targetDate = date || formatDateISO();

  const healthData = await prisma.healthData.upsert({
    where: {
      id: `${user.id}_${targetDate}`,
    },
    create: {
      userId: user.id,
      date: targetDate,
      steps,
      activeEnergy,
      weight,
      heartRate,
      sleepHours,
      source: source || "manual",
    },
    update: {
      steps,
      activeEnergy,
      weight,
      heartRate,
      sleepHours,
      source: source || "manual",
    },
  });

  // Also update user weight if provided
  if (weight) {
    await prisma.user.update({
      where: { id: user.id },
      data: { weight },
    });
  }

  return NextResponse.json({ healthData });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7");

  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return formatDateISO(d);
  });

  const data = await prisma.healthData.findMany({
    where: { userId: user.id, date: { in: dates } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ data });
}
