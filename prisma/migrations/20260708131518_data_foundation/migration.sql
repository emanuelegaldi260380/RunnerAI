-- CreateTable
CREATE TABLE "SleepRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'garmin',
    "durationSec" INTEGER,
    "deepSec" INTEGER,
    "lightSec" INTEGER,
    "remSec" INTEGER,
    "awakeSec" INTEGER,
    "latencySec" INTEGER,
    "efficiency" DOUBLE PRECISION,
    "score" INTEGER,
    "spo2Avg" INTEGER,
    "spo2Min" INTEGER,
    "respirationAvg" DOUBLE PRECISION,
    "hrvOvernight" DOUBLE PRECISION,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SleepRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'garmin',
    "restingHr" INTEGER,
    "hrv" DOUBLE PRECISION,
    "hrvStatus" TEXT,
    "bodyBatteryHigh" INTEGER,
    "bodyBatteryLow" INTEGER,
    "stressAvg" INTEGER,
    "vo2maxRunning" DOUBLE PRECISION,
    "vo2maxCycling" DOUBLE PRECISION,
    "trainingLoadAcute" DOUBLE PRECISION,
    "trainingLoadChronic" DOUBLE PRECISION,
    "trainingStatus" TEXT,
    "hydrationMl" INTEGER,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityStream" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "samples" JSONB,
    "avgPowerW" INTEGER,
    "avgGctMs" INTEGER,
    "avgVertOscCm" DOUBLE PRECISION,
    "avgStrideLenM" DOUBLE PRECISION,
    "sampleCount" INTEGER,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentSnapshot" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'garmin',
    "tempC" DOUBLE PRECISION,
    "dewPointC" DOUBLE PRECISION,
    "humidityPct" INTEGER,
    "windKph" DOUBLE PRECISION,
    "windDir" TEXT,
    "altitudeM" INTEGER,
    "conditions" TEXT,
    "aqi" INTEGER,
    "uvIndex" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3),
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvironmentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectiveLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "activityId" TEXT,
    "rpe" INTEGER,
    "legs" INTEGER,
    "sleepPerceived" INTEGER,
    "mood" INTEGER,
    "niggle" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubjectiveLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SleepRecord_userId_date_idx" ON "SleepRecord"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SleepRecord_userId_date_key" ON "SleepRecord"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyMetric_userId_date_idx" ON "DailyMetric"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_userId_date_key" ON "DailyMetric"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityStream_activityId_key" ON "ActivityStream"("activityId");

-- CreateIndex
CREATE INDEX "ActivityStream_userId_idx" ON "ActivityStream"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EnvironmentSnapshot_activityId_key" ON "EnvironmentSnapshot"("activityId");

-- CreateIndex
CREATE INDEX "EnvironmentSnapshot_userId_idx" ON "EnvironmentSnapshot"("userId");

-- CreateIndex
CREATE INDEX "SubjectiveLog_userId_date_idx" ON "SubjectiveLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "SleepRecord" ADD CONSTRAINT "SleepRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityStream" ADD CONSTRAINT "ActivityStream_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentSnapshot" ADD CONSTRAINT "EnvironmentSnapshot_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectiveLog" ADD CONSTRAINT "SubjectiveLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
