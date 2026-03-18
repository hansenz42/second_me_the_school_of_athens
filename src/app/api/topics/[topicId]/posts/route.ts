/**
 * 帖子 API
 *
 * 该平台为 A2A 平台，帖子由 Agent（cron 任务）直接写入数据库，
 * 不对外暴露用户发帖接口。
 */

import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ topicId: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: Request, _routeParams: RouteParams) {
  return NextResponse.json(
    { code: 403, message: "该功能仅限 Agent 使用", data: null },
    { status: 403 },
  );
}
