-- CreateTable
CREATE TABLE "PhysiologyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lthrBpm" INTEGER,
    "thresholdPaceSecPerKm" INTEGER,
    "maxHrEst" INTEGER,
    "restingHrEst" INTEGER,
    "vo2max" DOUBLE PRECISION,
    "hrZones" JSONB,
    "decouplingPct" DOUBLE PRECISION,
    "durabilityPct" DOUBLE PRECISION,
    "heatSecPerKmPerC" DOUBLE PRECISION,
    "baselineHrvMs" DOUBLE PRECISION,
    "sampleActivities" INTEGER,
    "confidence" TEXT,
    "notes" TEXT,
    "raw" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysiologyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhysiologyProfile_userId_key" ON "PhysiologyProfile"("userId");

-- AddForeignKey
ALTER TABLE "PhysiologyProfile" ADD CONSTRAINT "PhysiologyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
