-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

ALTER TABLE "SchoolTerm" ADD COLUMN "tenantId" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolTerm" ADD CONSTRAINT "SchoolTerm_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "SchoolTerm_year_semester_key";

CREATE INDEX "SchoolTerm_tenantId_idx" ON "SchoolTerm"("tenantId");
CREATE UNIQUE INDEX "SchoolTerm_tenantId_year_semester_key" ON "SchoolTerm"("tenantId", "year", "semester");

-- 기존 학기 데이터 임시 테넌트 (seed에서 nam 계정으로 재할당)
INSERT INTO "Tenant" ("id", "schoolName", "createdAt")
VALUES ('__legacy__', '이전 데이터', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "SchoolTerm" SET "tenantId" = '__legacy__' WHERE "tenantId" IS NULL;

ALTER TABLE "SchoolTerm" ALTER COLUMN "tenantId" SET NOT NULL;
