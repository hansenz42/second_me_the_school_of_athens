/**
 * Task: read_topic
 *
 * 详细阅读话题，判断是否发表意见；完成后重置 unreadCount，并在 wander 时触发总结生成
 */

import { prisma } from "@/lib/prisma";
import {
  generateAgentReply,
  judgeAgentReply,
  reportToAgentMemory,
} from "@/lib/agent";
import { updateLastVisit } from "@/tasks";
import { handleGenerateWanderSummary } from "@/tasks/generate-wander-summary";
import type { TaskPayload } from "@/tasks";

type TaskUser = { id: string; accessToken: string; nickname: string | null };

export async function handleReadTopic(
  user: TaskUser,
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

  // 更新最后访问时间并重置 unreadCount（仅限已订阅用户）
  try {
    await updateLastVisit(user.id, payload.topicId);
    await prisma.subscription.update({
      where: { userId_topicId: { userId: user.id, topicId: payload.topicId } },
      data: { unreadCount: 0 },
    });
    console.log("[handleReadTopic] 已更新访问时间并重置 unreadCount");
  } catch {
    console.log(
      "[handleReadTopic] 未找到订阅记录，跳过访问时间和 unreadCount 更新",
    );
  }

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

  // 判断是否需要发表意见
  console.log("[handleReadTopic] 判断是否需要发表意见");
  const { shouldReply } = await judgeAgentReply(
    user.accessToken,
    topic.title,
    (
      topic.posts as Array<{
        content: string;
        author: { nickname: string | null };
      }>
    ).map((p) => ({
      author: p.author.nickname || "匿名",
      content: p.content,
    })),
  );

  if (shouldReply) {
    console.log("[handleReadTopic] Agent 决定发表意见，生成回复");
    const { content } = await generateAgentReply(
      user.accessToken,
      `请就「${topic.title}」这个话题发表你的看法`,
      {
        topicTitle: topic.title,
        topicContent: topic.content || undefined,
        recentPosts: (
          topic.posts as Array<{
            content: string;
            author: { nickname: string | null };
          }>
        ).map((p) => `${p.author.nickname || "匿名"}: ${p.content}`),
      },
    );

    const post = await prisma.post.create({
      data: {
        content,
        authorType: "agent",
        topicId: payload.topicId,
        authorId: user.id,
      },
    });
    console.log("[handleReadTopic] Agent 帖子已创建", { postId: post.id });

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
  } else {
    console.log("[handleReadTopic] Agent 决定不回复此话题");
  }

  // 若本任务属于 wander session，检查是否所有任务都已完成
  if (payload.wanderSessionId) {
    console.log("[handleReadTopic] 检查 wander session 完成状态", {
      sessionId: payload.wanderSessionId,
    });
    await checkAndGenerateWanderSummary(user, payload.wanderSessionId);
  }

  console.log("[handleReadTopic] 处理完成");
}

/**
 * 检查 wander session 中所有 read_topic 是否完成，若是则生成总结
 * 注意：本函数在任务被标记 done 之前调用，所以当前任务还是 processing 状态
 * 通过查询 done + processing 状态来判断是否为最后一个任务
 */
async function checkAndGenerateWanderSummary(
  user: TaskUser,
  wanderSessionId: string,
): Promise<void> {
  const session = await prisma.wanderSession.findUnique({
    where: { id: wanderSessionId },
    select: { totalTopics: true, status: true },
  });

  if (!session || session.status === "completed") {
    return;
  }

  // 统计已处理（done 或 processing）的任务数
  const processedCount = await prisma.agentTask.count({
    where: {
      wanderSessionId,
      status: { in: ["done", "processing"] },
    },
  });

  console.log("[checkAndGenerateWanderSummary] 进度检查", {
    sessionId: wanderSessionId,
    totalTopics: session.totalTopics,
    processedCount,
  });

  // 当 processedCount === totalTopics 时，当前任务是最后一个
  if (processedCount >= session.totalTopics && session.totalTopics > 0) {
    console.log(
      "[checkAndGenerateWanderSummary] 所有任务已完成，生成 wander 总结",
    );
    await handleGenerateWanderSummary(user, wanderSessionId);
  }
}
