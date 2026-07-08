-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "renewalNoticeFor" TIMESTAMP(3),
ADD COLUMN     "renewalNoticeSentAt" TIMESTAMP(3),
ADD COLUMN     "withdrawalWaived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "withdrawalWaivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalAcceptance_userId_docType_idx" ON "LegalAcceptance"("userId", "docType");

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
