-- CreateTable
CREATE TABLE "PhysiologyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activitiesUsed" INTEGER NOT NULL DEFAULT 0,
    "maxHr" INTEGER,
    "restingHr" INTEGER,
    "lthr" INTEGER,
    "thresholdPaceSecPerKm" INTEGER,
    "hrZones" JSONB,
    "decouplingPct" DOUBLE PRECISION,
    "durabilityPct" DOUBLE PRECISION,
    "vo2max" DOUBLE PRECISION,
    "heatSlopePctPerDewC" DOUBLE PRECISION,
    "summary" TEXT,
    "raw" JSONB,

    CONSTRAINT "PhysiologyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhysiologyProfile_userId_key" ON "PhysiologyProfile"("userId");

-- AddForeignKey
ALTER TABLE "PhysiologyProfile" ADD CONSTRAINT "PhysiologyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
