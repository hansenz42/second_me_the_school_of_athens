/**
 * 报告 API
 *
 * GET: 获取用户的报告列表
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: 401, message: "未登录", data: null },
        { status: 401 },
      );
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

    // 批量查询提交者信息
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

    return NextResponse.json({
      code: 0,
      data: {
        reports: reports.map((r) => ({
          id: r.id,
          topic: {
            id: r.topic.id,
            title: r.topic.title,
            source: r.topic.source,
            sourceId: r.topic.sourceId,
          },
          content: r.content,
          status: r.status,
          syncedAt: r.syncedAt,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          submitter:
            r.topic.source === "user_submitted" && r.topic.sourceId
              ? (submitterMap.get(r.topic.sourceId) ?? null)
              : null,
        })),
      },
    });
  } catch (error) {
    console.error("Get reports error:", error);
    return NextResponse.json(
      { code: 500, message: "Internal server error", data: null },
      { status: 500 },
    );
  }
}
