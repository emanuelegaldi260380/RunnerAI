-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN "hrZones" JSONB;

-- CreateTable
CREATE TABLE "RaceGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distanceKm" REAL NOT NULL,
    "raceDate" DATETIME,
    "targetTimeSec" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'A',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RaceGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RaceGoal_userId_raceDate_idx" ON "RaceGoal"("userId", "raceDate");
