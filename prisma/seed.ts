// prisma/seed.ts
// 과제에서 제공된 배출계수와 활동 데이터를 DB에 초기 세팅합니다.
// yarn db:seed 로 실행

import { PrismaClient, ActivityType, GHGScope } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. 배출계수 초기 데이터 (과제 제공값)
  const efElectricity = await prisma.emissionFactor.upsert({
    where: { id: "ef-elec-kr-2024" },
    update: {},
    create: {
      id: "ef-elec-kr-2024",
      activityType: ActivityType.ELECTRICITY,
      description: "전기 (한국전력 기본값)",
      factor: 0.456,
      unit: "kWh",
      source: "한국전력 2024 배출계수",
      validFrom: new Date("2024-01-01"),
      validTo: null, // 현재 유효
    },
  });

  const efPlastic1 = await prisma.emissionFactor.upsert({
    where: { id: "ef-plastic1-2024" },
    update: {},
    create: {
      id: "ef-plastic1-2024",
      activityType: ActivityType.MATERIAL,
      description: "원소재 (플라스틱 1)",
      factor: 2.3,
      unit: "kg",
      source: "ecoinvent 3.9",
      validFrom: new Date("2024-01-01"),
      validTo: null,
    },
  });

  const efPlastic2 = await prisma.emissionFactor.upsert({
    where: { id: "ef-plastic2-2024" },
    update: {},
    create: {
      id: "ef-plastic2-2024",
      activityType: ActivityType.MATERIAL,
      description: "원소재 (플라스틱 2)",
      factor: 3.2,
      unit: "kg",
      source: "ecoinvent 3.9",
      validFrom: new Date("2024-01-01"),
      validTo: null,
    },
  });

  const efTruck = await prisma.emissionFactor.upsert({
    where: { id: "ef-truck-2024" },
    update: {},
    create: {
      id: "ef-truck-2024",
      activityType: ActivityType.TRANSPORT,
      description: "운송 (트럭)",
      factor: 3.5,
      unit: "ton-km",
      source: "국가 온실가스 인벤토리 2024",
      validFrom: new Date("2024-01-01"),
      validTo: null,
    },
  });

  console.log("✅ Emission factors created");

  // 2. 과제 제공 활동 데이터 (CT-045 컴퓨터 화면 제품)
  // GHG Scope 분류 규칙:
  //   전기 → Scope 2 (구매 전기는 간접 배출)
  //   원소재, 운송 → Scope 3 (upstream, 제조 전 단계)
  const rawActivities = [
    // 전기 (Scope 2)
    { date: "2025-01-01", type: ActivityType.ELECTRICITY, desc: "한국전력", amount: 110.0, unit: "kWh", ef: efElectricity },
    { date: "2025-02-01", type: ActivityType.ELECTRICITY, desc: "한국전력", amount: 112.0, unit: "kWh", ef: efElectricity },
    { date: "2025-03-01", type: ActivityType.ELECTRICITY, desc: "한국전력", amount: 115.0, unit: "kWh", ef: efElectricity },
    { date: "2025-04-01", type: ActivityType.ELECTRICITY, desc: "한국전력", amount: 130.0, unit: "kWh", ef: efElectricity },
    { date: "2025-05-01", type: ActivityType.ELECTRICITY, desc: "한국전력", amount: 120.0, unit: "kWh", ef: efElectricity },
    { date: "2025-06-01", type: ActivityType.ELECTRICITY, desc: "한국전력", amount: 110.0, unit: "kWh", ef: efElectricity },
    { date: "2025-07-01", type: ActivityType.ELECTRICITY, desc: "한국전력", amount: 120.0, unit: "kWh", ef: efElectricity },
    { date: "2025-08-01", type: ActivityType.ELECTRICITY, desc: "한국전력", amount: 111.0, unit: "kWh", ef: efElectricity },
    { date: "2025-05-01", type: ActivityType.ELECTRICITY, desc: "한국전력", amount: 101.0, unit: "kWh", ef: efElectricity },
    // 원소재 (Scope 3)
    { date: "2025-01-01", type: ActivityType.MATERIAL, desc: "플라스틱 1", amount: 230.0, unit: "kg", ef: efPlastic1 },
    { date: "2025-02-01", type: ActivityType.MATERIAL, desc: "플라스틱 1", amount: 340.0, unit: "kg", ef: efPlastic1 },
    { date: "2025-03-01", type: ActivityType.MATERIAL, desc: "플라스틱 2", amount: 23.0, unit: "kg", ef: efPlastic2 },
    { date: "2025-03-01", type: ActivityType.MATERIAL, desc: "플라스틱 1", amount: 430.0, unit: "kg", ef: efPlastic1 },
    { date: "2025-04-01", type: ActivityType.MATERIAL, desc: "플라스틱 1", amount: 510.0, unit: "kg", ef: efPlastic1 },
    { date: "2025-05-01", type: ActivityType.MATERIAL, desc: "플라스틱 1", amount: 424.0, unit: "kg", ef: efPlastic1 },
    { date: "2025-05-01", type: ActivityType.MATERIAL, desc: "플라스틱 2", amount: 40.0, unit: "kg", ef: efPlastic2 },
    { date: "2025-06-01", type: ActivityType.MATERIAL, desc: "플라스틱 1", amount: 450.0, unit: "kg", ef: efPlastic1 },
    { date: "2025-07-01", type: ActivityType.MATERIAL, desc: "플라스틱 1", amount: 340.0, unit: "kg", ef: efPlastic1 },
    { date: "2025-07-01", type: ActivityType.MATERIAL, desc: "플라스틱 2", amount: 43.0, unit: "kg", ef: efPlastic2 },
    { date: "2025-08-01", type: ActivityType.MATERIAL, desc: "플라스틱 1", amount: 230.0, unit: "kg", ef: efPlastic1 },
    { date: "2025-05-01", type: ActivityType.MATERIAL, desc: "플라스틱 1", amount: 232.0, unit: "kg", ef: efPlastic1 },
    // 운송 (Scope 3)
    { date: "2025-01-01", type: ActivityType.TRANSPORT, desc: "트럭", amount: 41.0, unit: "ton-km", ef: efTruck },
    { date: "2025-02-01", type: ActivityType.TRANSPORT, desc: "트럭", amount: 211.0, unit: "ton-km", ef: efTruck },
    { date: "2025-03-01", type: ActivityType.TRANSPORT, desc: "트럭", amount: 123.0, unit: "ton-km", ef: efTruck },
    { date: "2025-04-01", type: ActivityType.TRANSPORT, desc: "트럭", amount: 42.0, unit: "ton-km", ef: efTruck },
    { date: "2025-05-01", type: ActivityType.TRANSPORT, desc: "트럭", amount: 123.0, unit: "ton-km", ef: efTruck },
    { date: "2025-06-01", type: ActivityType.TRANSPORT, desc: "트럭", amount: 123.0, unit: "ton-km", ef: efTruck },
    { date: "2025-07-01", type: ActivityType.TRANSPORT, desc: "트럭", amount: 41.0, unit: "ton-km", ef: efTruck },
    { date: "2025-08-01", type: ActivityType.TRANSPORT, desc: "트럭", amount: 123.0, unit: "ton-km", ef: efTruck },
    { date: "2025-05-01", type: ActivityType.TRANSPORT, desc: "트럭", amount: 12.0, unit: "ton-km", ef: efTruck },
  ];

  const scopeMap: Record<ActivityType, GHGScope> = {
    ELECTRICITY: GHGScope.SCOPE_2,
    MATERIAL: GHGScope.SCOPE_3,
    TRANSPORT: GHGScope.SCOPE_3,
  };

  await prisma.activity.deleteMany();

  for (const a of rawActivities) {
    
    await prisma.activity.create({
      data: {
        date: new Date(a.date),
        activityType: a.type,
        description: a.desc,
        amount: a.amount,
        unit: a.unit,
        ghgScope: scopeMap[a.type],
        emissionFactorId: a.ef.id,
        co2e: a.amount * a.ef.factor, // 핵심 계산: 량 × 배출계수
      },
    });
  }

  console.log(`✅ ${rawActivities.length} activities seeded`);
  console.log("🎉 Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
