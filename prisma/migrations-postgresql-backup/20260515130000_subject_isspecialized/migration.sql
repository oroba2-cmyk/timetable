ALTER TABLE "Subject" ADD COLUMN "isSpecialized" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Subject" SET "isSpecialized" = true WHERE type = 'SPECIALIZED';

ALTER TABLE "Subject" DROP COLUMN "type";

DROP TYPE IF EXISTS "SubjectType";
