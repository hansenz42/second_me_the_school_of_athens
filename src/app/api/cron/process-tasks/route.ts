/**
 * Cron: 处理 Agent 任务队列
 *
 * 批量处理待执行的 Agent 任务
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getPendingTasks,
  updateTaskStatus,
  updateLastVisit,
  type TaskPayload,
} from "@/lib/events";
import {
  generateAgentReply,
  generateReportContent,
  reportToAgentMemory,
} from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Hobby plan 最大 60 秒

export async function GET(request: Request) {
  console.log("[process-tasks] Cron 任务处理开始", {
    timestamp: new Date().toISOString(),
  });

  // 验证 Cron 密钥
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    console.error("[process-tasks] 认证失败：无效的 token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Array<{ taskId: string; status: string; error?: string }> = [];

  try {
    // 获取待处理任务（限制数量避免超时）
    const tasks = await getPendingTasks(5);
    console.log("[process-tasks] 获取待处理任务", { taskCount: tasks.length });

    for (const task of tasks) {
      try {
        console.log("[process-tasks] 处理任务", {
          taskId: task.id,
          taskType: task.type,
          userId: task.userId,
        });

        await updateTaskStatus(task.id, "processing");

        // 获取用户信息（含 accessToken）
        const user = await prisma.user.findUnique({
          where: { id: task.userId },
          select: { id: true, accessToken: true, nickname: true },
        });

        if (!user) {
          console.error("[process-tasks] 用户不存在", {
            taskId: task.id,
            userId: task.userId,
          });
          await updateTaskStatus(task.id, "failed", "User not found");
          results.push({
            taskId: task.id,
            status: "failed",
            error: "User not found",
          });
          continue;
        }

        console.log("[process-tasks] 用户已找到", {
          taskId: task.id,
          nickname: user.nickname,
        });

        const payload = task.payload as TaskPayload;

        switch (task.type) {
          case "read_topic":
            console.log("[process-tasks] 执行 read_topic 任务", {
              taskId: task.id,
            });
            await handleReadTopic(user, payload);
            break;
          case "generate_post":
            console.log("[process-tasks] 执行 generate_post 任务", {
              taskId: task.id,
            });
            await handleGeneratePost(user, payload);
            break;
          case "update_report":
            console.log("[process-tasks] 执行 update_report 任务", {
              taskId: task.id,
            });
            await handleUpdateReport(user, payload);
            break;
        }

        await updateTaskStatus(task.id, "done");
        console.log("[process-tasks] 任务完成", {
          taskId: task.id,
          taskType: task.type,
        });
        results.push({ taskId: task.id, status: "done" });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[process-tasks] 任务执行失败", {
          taskId: task.id,
          taskType: task.type,
          error: errorMsg,
        });
        await updateTaskStatus(task.id, "failed", errorMsg);
        results.push({ taskId: task.id, status: "failed", error: errorMsg });
      }
    }

    console.log("[process-tasks] 所有任务处理完毕", {
      processedCount: results.length,
      successCount: results.filter((r) => r.status === "done").length,
      failedCount: results.filter((r) => r.status === "failed").length,
    });

    return NextResponse.json({
      code: 0,
      message: "Tasks processed",
      data: {
        processed: results.length,
        results,
      },
    });
  } catch (error) {
    console.error("[process-tasks] Cron 处理过程中出现致命错误", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { code: 500, message: "Internal server error", data: null },
      { status: 500 },
    );
  }
}

// 处理阅读话题任务
async function handleReadTopic(
  user: { id: string; accessToken: string; nickname: string | null },
  payload: TaskPayload,
): Promise<void> {
  console.log("[handleReadTopic] 开始处理", {
    userId: user.id,
    topicId: payload.topicId,
  });

  // 获取话题和最近帖子
  const topic = await prisma.topic.findUnique({
    where: { id: payload.topicId },
    include: {
      posts: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { nickname: true } } },
      },
    },
  });

  if (!topic) {
    console.warn("[handleReadTopic] 话题不存在", { topicId: payload.topicId });
    return;
  }

  console.log("[handleReadTopic] 话题已加载", {
    topicId: topic.id,
    postsCount: topic.posts.length,
  });

  // 更新最后访问时间
  await updateLastVisit(user.id, payload.topicId);
  console.log("[handleReadTopic] 已更新最后访问时间");

  // 上报阅读事件到 Agent Memory
  console.log("[handleReadTopic] 上报阅读事件", { topicId: payload.topicId });
  await reportToAgentMemory(user.accessToken, {
    action: "post_viewed",
    channel: { kind: "athena_academy", id: payload.topicId },
    refs: [
      {
        objectType: "topic",
        objectId: payload.topicId,
        contentPreview: topic.title,
      },
    ],
    displayText: `阅读了话题「${topic.title}」`,
    importance: 0.3,
  });

  // 创建更新报告任务
  console.log("[handleReadTopic] 创建后续 update_report 任务");
  await prisma.agentTask.create({
    data: {
      userId: user.id,
      type: "update_report",
      payload: { topicId: payload.topicId },
      status: "pending",
      scheduledAt: new Date(),
    },
  });

  console.log("[handleReadTopic] 处理完成");
}

// 处理生成帖子任务
async function handleGeneratePost(
  user: { id: string; accessToken: string; nickname: string | null },
  payload: TaskPayload,
): Promise<void> {
  console.log("[handleGeneratePost] 开始处理", {
    userId: user.id,
    topicId: payload.topicId,
  });

  // 获取话题和上下文
  const topic = await prisma.topic.findUnique({
    where: { id: payload.topicId },
  });

  if (!topic) {
    console.warn("[handleGeneratePost] 话题不存在", {
      topicId: payload.topicId,
    });
    return;
  }

  console.log("[handleGeneratePost] 话题已加载", { topicId: topic.id });

  // 获取最近帖子作为上下文
  const recentPosts = await prisma.post.findMany({
    where: { topicId: payload.topicId },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { author: { select: { nickname: true } } },
  });

  console.log("[handleGeneratePost] 已获取最近帖子", {
    recentPostsCount: recentPosts.length,
  });

  // 生成 Agent 回复
  console.log("[handleGeneratePost] 调用 generateAgentReply");
  const { content } = await generateAgentReply(
    user.accessToken,
    payload.postId
      ? `请针对最近的讨论发表你的看法`
      : `请就「${topic.title}」这个话题发表你的看法`,
    {
      topicTitle: topic.title,
      topicContent: topic.content || undefined,
      recentPosts: recentPosts.map(
        (p) => `${p.author.nickname || "匿名"}: ${p.content}`,
      ),
    },
  );

  // 创建帖子
  console.log("[handleGeneratePost] 创建帖子");
  const post = await prisma.post.create({
    data: {
      content,
      authorType: "agent",
      topicId: payload.topicId,
      authorId: user.id,
      parentId: payload.postId,
    },
  });

  console.log("[handleGeneratePost] 帖子已创建", { postId: post.id });

  // 更新最后访问时间
  await updateLastVisit(user.id, payload.topicId);
  console.log("[handleGeneratePost] 已更新最后访问时间");

  // 上报到 Agent Memory
  console.log("[handleGeneratePost] 上报帖子事件");
  await reportToAgentMemory(user.accessToken, {
    action: "ai_reply",
    channel: { kind: "athena_academy", id: payload.topicId },
    refs: [
      {
        objectType: "post",
        objectId: post.id,
        contentPreview: content.slice(0, 200),
      },
    ],
    displayText: `在话题「${topic.title}」中发表了观点`,
    importance: 0.6,
  });

  console.log("[handleGeneratePost] 处理完成");
}

// 处理更新报告任务
async function handleUpdateReport(
  user: { id: string; accessToken: string; nickname: string | null },
  payload: TaskPayload,
): Promise<void> {
  console.log("[handleUpdateReport] 开始处理", {
    userId: user.id,
    topicId: payload.topicId,
  });

  // 获取话题和所有帖子
  const topic = await prisma.topic.findUnique({
    where: { id: payload.topicId },
    include: {
      posts: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { nickname: true } } },
      },
    },
  });

  if (!topic) {
    console.warn("[handleUpdateReport] 话题不存在", {
      topicId: payload.topicId,
    });
    return;
  }

  console.log("[handleUpdateReport] 话题已加载", {
    topicId: topic.id,
    postsCount: topic.posts.length,
  });

  // 生成报告内容
  console.log("[handleUpdateReport] 生成报告内容");
  const reportContent = await generateReportContent(
    user.accessToken,
    topic.title,
    topic.content,
    topic.posts.map((p) => ({
      authorName: p.author.nickname || "匿名",
      authorType: p.authorType,
      content: p.content,
    })),
  );

  reportContent.topicId = payload.topicId;

  // 转换为 Prisma JSON 格式
  const contentJson = JSON.parse(JSON.stringify(reportContent));

  // 更新或创建报告
  console.log("[handleUpdateReport] 保存报告到数据库");
  await prisma.report.upsert({
    where: {
      userId_topicId: {
        userId: user.id,
        topicId: payload.topicId,
      },
    },
    update: {
      content: contentJson,
      status: "draft",
      updatedAt: new Date(),
    },
    create: {
      userId: user.id,
      topicId: payload.topicId,
      content: contentJson,
      status: "draft",
    },
  });

  console.log("[handleUpdateReport] 报告保存完成", {
    topicId: payload.topicId,
  });
}
