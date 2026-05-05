// src/app/api/activities/route.ts
//
// 활동 데이터 API
//   GET  /api/activities  — 목록 조회 (필터 지원)
//   POST /api/activities  — 신규 활동 등록 + co2e 자동 계산

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCO2e, classifyScope } from "@/lib/pcf";
import { ActivityType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as ActivityType | null;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const activities = await prisma.activity.findMany({
      where: {
        ...(type ? { activityType: type } : {}),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        emissionFactor: {
          select: { factor: true, description: true, source: true },
        },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ data: activities });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, activityType, description, amount, unit } = body;

    // 입력값 검증
    if (!date || !activityType || !description || amount == null || !unit) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력하세요 (날짜, 활동유형, 설명, 량, 단위)" },
        { status: 400 }
      );
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "량은 0보다 큰 숫자여야 합니다" },
        { status: 400 }
      );
    }

    // 현재 유효한 배출계수 조회 (validTo가 null인 것)
    const emissionFactor = await prisma.emissionFactor.findFirst({
      where: {
        activityType: activityType as ActivityType,
        description: { contains: description.split(" ")[0] }, // 첫 단어로 매칭
        validTo: null, // 현재 유효한 계수
      },
    });

    const co2e = emissionFactor
      ? calculateCO2e(Number(amount), emissionFactor.factor)
      : null;

    const activity = await prisma.activity.create({
      data: {
        date: new Date(date),
        activityType: activityType as ActivityType,
        description,
        amount: Number(amount),
        unit,
        ghgScope: classifyScope(activityType as ActivityType),
        emissionFactorId: emissionFactor?.id ?? null,
        co2e,
      },
      include: {
        emissionFactor: {
          select: { factor: true, description: true, source: true },
        },
      },
    });

    return NextResponse.json({ data: activity }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
