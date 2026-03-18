import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ReportCard } from "./ReportCard";
import { MainHeader } from "@/components/MainHeader";
import type { WanderSummaryContent } from "@/lib/agent";

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/api/auth/login");
  }

  const summaries = await prisma.wanderSummary.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      wanderSession: {
        select: {
          totalTopics: true,
          createdAt: true,
        },
      },
    },
  });

  const summaryCount = summaries.length;

  const serializedSummaries = (
    summaries as Array<{
      id: string;
      sessionId: string;
      content: unknown;
      createdAt: Date;
      wanderSession: { totalTopics: number; createdAt: Date };
    }>
  ).map((s) => ({
    id: s.id,
    sessionId: s.sessionId,
    content: s.content as WanderSummaryContent,
    totalTopics: s.wanderSession.totalTopics,
    wanderedAt: s.wanderSession.createdAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-white">
      <MainHeader user={user} activeTab="reports" reportCount={summaryCount} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 标题区域 */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">
            Agent 报告
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl">
            每次漫游后，你的 SecondMe 会结合自身知识库，为你提炼认知升级要点
          </p>
        </section>

        {/* 报告列表 */}
        {serializedSummaries.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-300">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              还没有 Agent 报告
            </h3>
            <p className="text-gray-700 mb-6">
              订阅话题后，等待下次 Agent 漫游完成，即可在此查看认知总结报告
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              浏览知识广场
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {serializedSummaries.map(
              (summary: (typeof serializedSummaries)[number]) => (
                <ReportCard key={summary.id} summary={summary} />
              ),
            )}
          </div>
        )}
      </main>
    </div>
  );
}
