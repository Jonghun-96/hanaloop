// src/lib/pcf.ts
//
// PCF (Product Carbon Footprint) 핵심 계산 로직
//
// 이 파일이 가장 중요한 비즈니스 로직입니다.
// 발표에서 반드시 설명해야 할 부분:
//   1. GHG Scope 분류 기준 (왜 전기는 Scope 2인가?)
//   2. kgCO₂e 계산 공식
//   3. tCO₂e 단위 변환 (경영자 보고용)

import { ActivityType, GHGScope } from "@prisma/client";

// ─── 타입 정의 ───────────────────────────────────────────────

export interface ActivityWithFactor {
  id: string;
  date: Date;
  activityType: ActivityType;
  description: string;
  amount: number;
  unit: string;
  ghgScope: GHGScope;
  co2e: number | null;
  emissionFactor: {
    factor: number;
    description: string;
    source: string;
  } | null;
}

export interface PCFSummary {
  totalKgCO2e: number;
  totalTCO2e: number; // 경영자 보고용 (tCO₂e = kgCO₂e / 1000)
  byScope: ScopeSummary;
  byType: TypeSummary;
  byMonth: MonthSummary[];
  activityCount: number;
}

export interface ScopeSummary {
  scope1: number;
  scope2: number;
  scope3: number;
}

export interface TypeSummary {
  electricity: number;
  material: number;
  transport: number;
}

export interface MonthSummary {
  month: string; // "2025-01"
  label: string; // "1월"
  total: number; // kgCO₂e
  electricity: number;
  material: number;
  transport: number;
}

// ─── GHG Scope 분류 ─────────────────────────────────────────
//
// GHG Protocol 기준:
//   Scope 1: 회사가 직접 소유/통제하는 배출원에서 발생 (자체 보일러, 차량 연료 등)
//   Scope 2: 구매한 전기, 열, 증기에서 발생하는 간접 배출
//   Scope 3: 나머지 모든 간접 배출 (공급망, 운송, 제품 사용 등)
//
// 이 과제 데이터 기준:
//   전기 → Scope 2 (한국전력에서 구매)
//   원소재 → Scope 3 (플라스틱 생산 과정의 upstream 배출)
//   운송 → Scope 3 (외주 물류의 upstream 배출)

export function classifyScope(type: ActivityType): GHGScope {
  switch (type) {
    case ActivityType.ELECTRICITY:
      return GHGScope.SCOPE_2;
    case ActivityType.MATERIAL:
    case ActivityType.TRANSPORT:
      return GHGScope.SCOPE_3;
    default:
      return GHGScope.SCOPE_3;
  }
}

// ─── 핵심 계산 공식 ──────────────────────────────────────────
//
// kgCO₂e = 활동량 × 배출계수
// 예: 110 kWh × 0.456 kgCO₂e/kWh = 50.16 kgCO₂e
//
// CO₂e(equivalent): CO₂, CH₄, N₂O 등 여러 온실가스를
// CO₂ 기준으로 환산한 값. 단일 지표로 비교 가능하게 합니다.

export function calculateCO2e(amount: number, factor: number): number {
  return Math.round(amount * factor * 100) / 100; // 소수점 2자리
}

// ─── PCF 전체 요약 계산 ──────────────────────────────────────

export function calculatePCFSummary(activities: ActivityWithFactor[]): PCFSummary {
  const validActivities = activities.filter((a) => a.co2e !== null);

  const totalKgCO2e = validActivities.reduce((sum, a) => sum + (a.co2e ?? 0), 0);

  // Scope별 합계
  const byScope: ScopeSummary = {
    scope1: sumByCriteria(validActivities, (a) => a.ghgScope === GHGScope.SCOPE_1),
    scope2: sumByCriteria(validActivities, (a) => a.ghgScope === GHGScope.SCOPE_2),
    scope3: sumByCriteria(validActivities, (a) => a.ghgScope === GHGScope.SCOPE_3),
  };

  // 활동 유형별 합계
  const byType: TypeSummary = {
    electricity: sumByCriteria(validActivities, (a) => a.activityType === ActivityType.ELECTRICITY),
    material: sumByCriteria(validActivities, (a) => a.activityType === ActivityType.MATERIAL),
    transport: sumByCriteria(validActivities, (a) => a.activityType === ActivityType.TRANSPORT),
  };

  // 월별 집계
  const monthMap = new Map<string, MonthSummary>();
  for (const a of validActivities) {
    const key = a.date.toISOString().slice(0, 7); // "2025-01"
    const month = parseInt(key.slice(5, 7));
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        month: key,
        label: `${month}월`,
        total: 0,
        electricity: 0,
        material: 0,
        transport: 0,
      });
    }
    const entry = monthMap.get(key)!;
    const co2e = a.co2e ?? 0;
    entry.total += co2e;
    if (a.activityType === ActivityType.ELECTRICITY) entry.electricity += co2e;
    if (a.activityType === ActivityType.MATERIAL) entry.material += co2e;
    if (a.activityType === ActivityType.TRANSPORT) entry.transport += co2e;
  }

  const byMonth = Array.from(monthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      total: Math.round(m.total * 10) / 10,
      electricity: Math.round(m.electricity * 10) / 10,
      material: Math.round(m.material * 10) / 10,
      transport: Math.round(m.transport * 10) / 10,
    }));

  return {
    totalKgCO2e: Math.round(totalKgCO2e * 10) / 10,
    totalTCO2e: Math.round((totalKgCO2e / 1000) * 1000) / 1000,
    byScope,
    byType,
    byMonth,
    activityCount: validActivities.length,
  };
}

function sumByCriteria(
  activities: ActivityWithFactor[],
  predicate: (a: ActivityWithFactor) => boolean
): number {
  return Math.round(
    activities.filter(predicate).reduce((sum, a) => sum + (a.co2e ?? 0), 0) * 10
  ) / 10;
}

// ─── 활동 유형 한국어 라벨 ────────────────────────────────────

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  ELECTRICITY: "전기",
  MATERIAL: "원소재",
  TRANSPORT: "운송",
};

export const SCOPE_LABELS: Record<GHGScope, string> = {
  SCOPE_1: "Scope 1 (직접)",
  SCOPE_2: "Scope 2 (전기)",
  SCOPE_3: "Scope 3 (간접)",
};

// 단위 검증: 활동 유형별 허용 단위
export const VALID_UNITS: Record<ActivityType, string[]> = {
  ELECTRICITY: ["kWh", "MWh"],
  MATERIAL: ["kg", "g", "t"],
  TRANSPORT: ["ton-km", "tkm"],
};

export function isValidUnit(type: ActivityType, unit: string): boolean {
  return VALID_UNITS[type].includes(unit);
}
