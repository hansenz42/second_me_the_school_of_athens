/*
  Warnings:

  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_topicId_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_userId_fkey";

-- AlterTable
ALTER TABLE "agent_tasks" ADD COLUMN     "wanderSessionId" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "unreadCount" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "reports";

-- CreateTable
CREATE TABLE "wander_sessions" (
    "id" TEXT NOT NULL,
    "totalTopics" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wander_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wander_summaries" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wander_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wander_sessions_userId_status_idx" ON "wander_sessions"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "wander_summaries_sessionId_key" ON "wander_summaries"("sessionId");

-- CreateIndex
CREATE INDEX "wander_summaries_userId_createdAt_idx" ON "wander_summaries"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_tasks_wanderSessionId_status_idx" ON "agent_tasks"("wanderSessionId", "status");

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_wanderSessionId_fkey" FOREIGN KEY ("wanderSessionId") REFERENCES "wander_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wander_sessions" ADD CONSTRAINT "wander_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wander_summaries" ADD CONSTRAINT "wander_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wander_summaries" ADD CONSTRAINT "wander_summaries_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "wander_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
