import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateISO } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const entry = await prisma.foodEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  // Remove from daily summary
  const date = formatDateISO(entry.createdAt);
  await prisma.dailySummary.update({
    where: { userId_date: { userId: user.id, date } },
    data: {
      totalCalories: { decrement: entry.calories || 0 },
      totalProtein: { decrement: entry.protein || 0 },
      totalCarbs: { decrement: entry.carbs || 0 },
      totalFat: { decrement: entry.fat || 0 },
      totalFiber: { decrement: entry.fiber || 0 },
    },
  }).catch(() => {});

  await prisma.foodEntry.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
