-- AlterTable
ALTER TABLE "PlannedWorkout" ADD COLUMN "exercises" JSONB;

-- CreateTable
CREATE TABLE "OffDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OffDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OffDay_userId_idx" ON "OffDay"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OffDay_userId_date_key" ON "OffDay"("userId", "date");
