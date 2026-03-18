import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ReportCard } from "./ReportCard";
import { MainHeader } from "@/components/MainHeader";

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/api/auth/login");
  }

  const reports = await prisma.report.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      topic: {
        select: {
          id: true,
          title: true,
          source: true,
          sourceId: true,
        },
      },
    },
  });

  // 批量查询用户提交话题的提交者信息
  const submitterIds = reports
    .filter((r) => r.topic.source === "user_submitted" && r.topic.sourceId)
    .map((r) => r.topic.sourceId as string);

  const submitters =
    submitterIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: submitterIds } },
          select: { id: true, nickname: true, avatarUrl: true },
        })
      : [];

  const submitterMap = new Map(submitters.map((u) => [u.id, u]));

  const reportCount = reports.length;

  const serializedReports = reports.map((r) => ({
    id: r.id,
    topic: r.topic,
    content: r.content as {
      topic: string;
      viewpoints: Array<{ source: string; content: string }>;
      differences: string[];
      takeaways: string[];
    },
    status: r.status,
    syncedAt: r.syncedAt?.toISOString() || null,
    updatedAt: r.updatedAt.toISOString(),
    submitter:
      r.topic.source === "user_submitted" && r.topic.sourceId
        ? (submitterMap.get(r.topic.sourceId) ?? null)
        : null,
  }));

  return (
    <div className="min-h-screen bg-white">
      <MainHeader user={user} activeTab="reports" reportCount={reportCount} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="text-[#636E72]">
            SecondMe 为你整合的知识报告，如果你觉得不错，可以一键加入到 SecondMe
            知识库。
          </p>
        </div>

        {/* 报告列表 */}
        {serializedReports.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E6E1]">
            <div className="w-16 h-16 rounded-full bg-[#F8F9FA] flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[#B2BEC3]"
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
            <h3 className="text-lg font-medium text-[#2D3436] mb-2">
              还没有报告
            </h3>
            <p className="text-[#636E72] mb-6">
              订阅知识广场中的话题，你的 AI 分身会为你生成洞察报告
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 bg-[#6C5CE7] text-white rounded-xl font-medium hover:bg-[#5B4AD6] transition-colors"
            >
              浏览知识广场
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {serializedReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                submitter={report.submitter}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
