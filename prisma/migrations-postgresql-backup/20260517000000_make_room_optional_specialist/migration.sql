-- DropForeignKey
ALTER TABLE "ScheduleEntry" DROP CONSTRAINT "ScheduleEntry_roomId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleRule" DROP CONSTRAINT "ScheduleRule_roomId_fkey";

-- DropIndex
DROP INDEX "ScheduleEntry_date_periodId_roomId_classId_key";

-- AlterTable
ALTER TABLE "ScheduleEntry" ALTER COLUMN "roomId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ScheduleRule" ALTER COLUMN "roomId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEntry_date_periodId_classId_key" ON "ScheduleEntry"("date", "periodId", "classId");

-- AddForeignKey
ALTER TABLE "ScheduleRule" ADD CONSTRAINT "ScheduleRule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "SpecialRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "SpecialRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
