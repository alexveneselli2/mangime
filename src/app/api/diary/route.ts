import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateISO } from "@/lib/utils";
import { NextResponse } from "next/server";

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

  const summaries = await prisma.dailySummary.findMany({
    where: { userId: user.id, date: { in: dates } },
    orderBy: { date: "desc" },
  });

  // Get entries grouped by date
  const allEntries = await prisma.foodEntry.findMany({
    where: {
      userId: user.id,
      createdAt: {
        gte: new Date(dates[dates.length - 1] + "T00:00:00.000Z"),
        lte: new Date(dates[0] + "T23:59:59.999Z"),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group entries by date
  const entriesByDate: Record<string, typeof allEntries> = {};
  for (const entry of allEntries) {
    const date = formatDateISO(entry.createdAt);
    if (!entriesByDate[date]) entriesByDate[date] = [];
    entriesByDate[date].push(entry);
  }

  return NextResponse.json({ summaries, entriesByDate });
}
