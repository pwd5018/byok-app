-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "comparisonGroupId" TEXT,
ADD COLUMN     "completionTokens" INTEGER,
ADD COLUMN     "latencyMs" INTEGER,
ADD COLUMN     "memoryMode" TEXT,
ADD COLUMN     "promptTokens" INTEGER,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "runMode" TEXT,
ADD COLUMN     "toolCalls" INTEGER,
ADD COLUMN     "totalTokens" INTEGER;

-- CreateIndex
CREATE INDEX "ChatMessage_userId_comparisonGroupId_idx" ON "ChatMessage"("userId", "comparisonGroupId");
