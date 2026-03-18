/**
 * 报告详情 API
 *
 * GET: 获取报告详情
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { reportId } = await params;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: 401, message: "未登录", data: null },
        { status: 401 },
      );
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            content: true,
            source: true,
            sourceId: true,
            sourceUrl: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { code: 404, message: "报告不存在", data: null },
        { status: 404 },
      );
    }

    // 验证报告属于当前用户
    if (report.userId !== user.id) {
      return NextResponse.json(
        { code: 403, message: "无权访问", data: null },
        { status: 403 },
      );
    }

    // 查询提交者信息（如果是用户提交的话题）
    let submitter = null;
    if (report.topic.source === "user_submitted" && report.topic.sourceId) {
      submitter = await prisma.user.findUnique({
        where: { id: report.topic.sourceId },
        select: { id: true, nickname: true, avatarUrl: true },
      });
    }

    return NextResponse.json({
      code: 0,
      data: {
        id: report.id,
        topic: report.topic,
        content: report.content,
        status: report.status,
        syncedAt: report.syncedAt,
        submitter,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get report error:", error);
    return NextResponse.json(
      { code: 500, message: "Internal server error", data: null },
      { status: 500 },
    );
  }
}
