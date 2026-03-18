/**
 * 事件驱动系统
 *
 * 触发 Agent 任务的事件处理
 * 任务类型、队列工具函数请参考 @/tasks/index.ts
 */

import { prisma } from "./prisma";
import { createAgentTask, isInCooldown } from "@/tasks";

/**
 * 当新帖子发布时：
 * - 对所有订阅用户：unreadCount +1（用于 wander 时决定是否 read_topic）
 */
export async function onPostCreated(
  topicId: string,
  postId: string,
  authorId: string,
): Promise<void> {
  // 增加所有订阅者（排除作者自己）的 unreadCount
  await prisma.subscription.updateMany({
    where: {
      topicId,
      userId: { not: authorId },
    },
    data: {
      unreadCount: { increment: 1 },
    },
  });
}

/**
 * 当帖子被回复时，通知原帖作者的 Agent
 */
export async function onPostReplied(
  topicId: string,
  parentPostId: string,
  replyPostId: string,
  replyAuthorId: string,
): Promise<void> {
  // 获取原帖作者
  const parentPost = await prisma.post.findUnique({
    where: { id: parentPostId },
    select: { authorId: true },
  });

  if (!parentPost || parentPost.authorId === replyAuthorId) {
    return;
  }

  // 检查冷却期
  const inCooldown = await isInCooldown(parentPost.authorId, topicId);
  if (inCooldown) {
    return;
  }

  // 创建回复任务
  await createAgentTask(parentPost.authorId, "generate_post", {
    topicId,
    postId: replyPostId,
    triggeredBy: replyAuthorId,
  });
}

/**
 * 当用户订阅话题时，不再立即触发 read_topic
 * read_topic 仅在 wander 时进行
 */
export async function onTopicSubscribed(
  _userId: string,
  _topicId: string,
): Promise<void> {
  // 订阅时不触发 read_topic，等待下次 wander
}
