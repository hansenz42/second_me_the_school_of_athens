/**
 * Wander Summaries API
 *
 * GET: 获取用户的 wander 总结列表
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

    return NextResponse.json({
      code: 0,
      data: {
        summaries: (
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
          content: s.content,
          totalTopics: s.wanderSession.totalTopics,
          wanderedAt: s.wanderSession.createdAt.toISOString(),
          createdAt: s.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Get wander summaries error:", error);
    return NextResponse.json(
      { code: 500, message: "Internal server error", data: null },
      { status: 500 },
    );
  }
}
