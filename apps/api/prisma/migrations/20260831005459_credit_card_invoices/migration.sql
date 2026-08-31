-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "closingDay" INTEGER,
ADD COLUMN     "dueDay" INTEGER;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "installmentGroupId" TEXT,
ADD COLUMN     "installmentNo" INTEGER,
ADD COLUMN     "installmentTotal" INTEGER,
ADD COLUMN     "isCardPayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "settledInPaymentId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_accountId_paid_settledInPaymentId_idx" ON "Transaction"("accountId", "paid", "settledInPaymentId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_settledInPaymentId_fkey" FOREIGN KEY ("settledInPaymentId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
