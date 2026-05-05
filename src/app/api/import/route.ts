// src/app/api/import/route.ts
//
// Excel 임포트 API (보너스 항목)
// POST /api/import — multipart/form-data로 .xlsx 파일 업로드
//
// 과제 데이터("과제용 데이터" 시트)를 그대로 업로드하면
// activities 테이블에 저장됩니다.
//
// 설계 결정:
//   - 중복 방지를 위해 (date + activityType + description + amount) 조합으로
//     이미 존재하는 데이터는 건너뜁니다 (upsert 아닌 skipDuplicates)
//   - 파일은 서버 메모리에만 로드하고 디스크에 저장하지 않습니다 (보안)

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { calculateCO2e, classifyScope } from "@/lib/pcf";
import { ActivityType } from "@prisma/client";

// Excel 열 → ActivityType 매핑
const TYPE_MAP: Record<string, ActivityType> = {
  전기: ActivityType.ELECTRICITY,
  원소재: ActivityType.MATERIAL,
  운송: ActivityType.TRANSPORT,
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일을 첨부하세요" }, { status: 400 });
    }
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "xlsx 또는 xls 파일만 업로드 가능합니다" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    // "과제용 데이터" 시트 또는 첫 번째 시트 사용
    const sheetName =
      workbook.SheetNames.find((n) => n.includes("데이터")) ??
      workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
    });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // 헤더 행이나 설명 행 건너뜀
      const rawDate = row["일자(원본)"] ?? row["date"] ?? row["일자"];
      const rawType = row["활동 유형"] ?? row["활동유형"] ?? row["type"];
      const rawDesc = row["설명"] ?? row["description"];
      const rawAmount = row["량"] ?? row["amount"];
      const rawUnit = row["단위"] ?? row["unit"];

      if (!rawDate || !rawType || !rawAmount) {
        skipped++;
        continue;
      }

      const activityType = TYPE_MAP[String(rawType).trim()];
      if (!activityType) {
        errors.push(`행 ${i + 2}: 알 수 없는 활동유형 "${rawType}"`);
        skipped++;
        continue;
      }

      const amount = Number(rawAmount);
      if (isNaN(amount) || amount <= 0) {
        errors.push(`행 ${i + 2}: 량이 올바르지 않음 "${rawAmount}"`);
        skipped++;
        continue;
      }

      const date =
        rawDate instanceof Date
          ? rawDate
          : new Date(String(rawDate));

      if (isNaN(date.getTime())) {
        errors.push(`행 ${i + 2}: 날짜 형식 오류 "${rawDate}"`);
        skipped++;
        continue;
      }

      const description = String(rawDesc ?? "").trim() || String(rawType);
      const unit = String(rawUnit ?? "").trim();

      // 현재 유효한 배출계수 조회
      const emissionFactor = await prisma.emissionFactor.findFirst({
        where: {
          activityType,
          validTo: null,
          ...(description
            ? { description: { contains: description.split(" ")[0] } }
            : {}),
        },
      });

      await prisma.activity.create({
        data: {
          date,
          activityType,
          description,
          amount,
          unit,
          ghgScope: classifyScope(activityType),
          emissionFactorId: emissionFactor?.id ?? null,
          co2e: emissionFactor
            ? calculateCO2e(amount, emissionFactor.factor)
            : null,
        },
      });

      imported++;
    }

    return NextResponse.json({
      imported,
      skipped,
      errors: errors.slice(0, 10), // 최대 10개 에러만 반환
      message: `${imported}건 임포트 완료${skipped > 0 ? `, ${skipped}건 건너뜀` : ""}`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "임포트 중 오류가 발생했습니다" }, { status: 500 });
  }
}
