// src/app/api/activities/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCO2e } from "@/lib/pcf";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    include: { emissionFactor: true },
  });
  if (!activity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: activity });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { amount } = body;

    const existing = await prisma.activity.findUnique({
      where: { id: params.id },
      include: { emissionFactor: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const newAmount = Number(amount ?? existing.amount);
    const co2e = existing.emissionFactor
      ? calculateCO2e(newAmount, existing.emissionFactor.factor)
      : null;

    const updated = await prisma.activity.update({
      where: { id: params.id },
      data: { amount: newAmount, co2e },
      include: { emissionFactor: { select: { factor: true, description: true, source: true } } },
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.activity.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
