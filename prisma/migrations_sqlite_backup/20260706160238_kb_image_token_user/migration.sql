-- AlterTable
ALTER TABLE "ScientificSource" ADD COLUMN "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "TokenUsage" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "TokenUsage_userId_idx" ON "TokenUsage"("userId");
