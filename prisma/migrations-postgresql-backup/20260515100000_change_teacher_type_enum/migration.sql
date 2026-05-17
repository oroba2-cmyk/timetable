-- Convert any CONCURRENT teachers to HOMEROOM before changing enum
UPDATE "Teacher" SET type = 'HOMEROOM' WHERE type = 'CONCURRENT';

-- Drop default before altering column type
ALTER TABLE "Teacher" ALTER COLUMN type DROP DEFAULT;

-- Rename old enum
ALTER TYPE "TeacherType" RENAME TO "TeacherType_old";

-- Create new enum without CONCURRENT, with TEMP_HOMEROOM
CREATE TYPE "TeacherType" AS ENUM ('HOMEROOM', 'SPECIALIZED', 'TEMP_HOMEROOM');

-- Update column to use new enum
ALTER TABLE "Teacher" ALTER COLUMN type TYPE "TeacherType" USING type::text::"TeacherType";

-- Restore default
ALTER TABLE "Teacher" ALTER COLUMN type SET DEFAULT 'HOMEROOM'::"TeacherType";

-- Drop old enum
DROP TYPE "TeacherType_old";
