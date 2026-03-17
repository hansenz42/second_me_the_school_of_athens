import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  // 清除用户 session cookie
  cookieStore.delete("user_id");

  return NextResponse.json({ success: true });
}
