ALTER TABLE "Subject" DROP COLUMN IF EXISTS "grades";

CREATE TABLE "SubjectClassGroup" (
  "id" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "classGroupId" TEXT NOT NULL,
  CONSTRAINT "SubjectClassGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubjectClassGroup_subjectId_classGroupId_key"
  ON "SubjectClassGroup"("subjectId", "classGroupId");

ALTER TABLE "SubjectClassGroup"
  ADD CONSTRAINT "SubjectClassGroup_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubjectClassGroup"
  ADD CONSTRAINT "SubjectClassGroup_classGroupId_fkey"
  FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
