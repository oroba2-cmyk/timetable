-- AlterTable
ALTER TABLE "ClassGroup" ADD COLUMN     "displayName" TEXT;

-- AlterTable
ALTER TABLE "SpecialRoom" ADD COLUMN     "grades" INTEGER[],
ADD COLUMN     "location" TEXT,
ADD COLUMN     "otherGradeNote" TEXT,
ALTER COLUMN "roomType" DROP NOT NULL;
