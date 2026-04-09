import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const data = await request.json();

  const allowedFields = [
    "name", "height", "weight", "age", "gender",
    "activityLevel", "goal", "dietType", "allergies", "intolerances",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in data) {
      updateData[field] = data[field];
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  return NextResponse.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      height: updated.height,
      weight: updated.weight,
      age: updated.age,
      gender: updated.gender,
      activityLevel: updated.activityLevel,
      goal: updated.goal,
      dietType: updated.dietType,
      allergies: updated.allergies,
      intolerances: updated.intolerances,
    },
  });
}
