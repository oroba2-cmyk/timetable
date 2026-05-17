ALTER TABLE "Period" ADD COLUMN "gradeNumber" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Period" ADD COLUMN "label" TEXT;

ALTER TABLE "Period" DROP CONSTRAINT "Period_termId_number_key";
CREATE UNIQUE INDEX "Period_termId_number_gradeNumber_key" ON "Period"("termId", "number", "gradeNumber");
