// src/lib/prisma.ts
//
// Prisma 클라이언트 싱글톤 패턴
//
// 왜 싱글톤이 필요한가?
// Next.js 개발 서버는 Hot Reload 시 모듈을 재실행합니다.
// 매번 new PrismaClient()를 호출하면 DB 커넥션이 누적되어
// "too many connections" 오류가 발생합니다.
// global 객체에 인스턴스를 캐싱해서 이를 방지합니다.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
