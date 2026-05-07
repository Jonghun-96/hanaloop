// src/app/api/pcf/route.ts
//
// PCF 집계 요약 API
// GET /api/pcf — 전체 PCF 요약 (KPI, Scope별, 월별, 유형별)
// 이 엔드포인트 하나로 대시보드에 필요한 모든 데이터를 제공합니다.
//
// Trade-off 설명:
//   단일 엔드포인트 vs 분리된 엔드포인트
//   → 대시보드는 페이지 로드 시 모든 데이터가 한 번에 필요하므로
//     단일 엔드포인트로 네트워크 왕복을 줄이는 게 유리합니다.
//   → 데이터가 커지면 /api/pcf/monthly, /api/pcf/summary로 분리할 수 있습니다.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePCFSummary } from "@/lib/pcf";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activities = await prisma.activity.findMany({
      include: {
        emissionFactor: {
          select: { factor: true, description: true, source: true },
        },
      },
      orderBy: { date: "asc" },
    });

    const summary = calculatePCFSummary(activities);

    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "PCF 계산 실패" }, { status: 500 });
  }
}
