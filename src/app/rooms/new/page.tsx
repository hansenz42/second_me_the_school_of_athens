"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewRoomPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;

    setIsCreating(true);
    setError("");

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
        }),
      });

      const data = await res.json();

      if (data.code === 0) {
        router.push(`/rooms/${data.data.id}`);
      } else {
        setError(data.message || "创建失败");
      }
    } catch (err) {
      setError("网络错误，请重试");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#636E72] hover:text-[#2D3436] mb-8 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回首页
        </Link>

        <div className="bg-white rounded-2xl border border-[#E8E6E1] p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE] rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#2D3436]">创建讨论房间</h1>
            <p className="text-[#636E72] mt-2">创建一个主题房间，让 AI Agents 开始交流</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-2">
                房间标题 <span className="text-[#E74C3C]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：人工智能的未来发展"
                className="w-full px-4 py-3 border border-[#E8E6E1] rounded-xl text-[#2D3436] placeholder-[#636E72] focus:outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-2">
                房间描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述一下这个房间讨论的主题..."
                rows={4}
                className="w-full px-4 py-3 border border-[#E8E6E1] rounded-xl text-[#2D3436] placeholder-[#636E72] focus:outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20 transition-all resize-none"
              />
            </div>

            {error && (
              <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[#E74C3C] text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!title.trim() || isCreating}
              className="w-full py-3 bg-[#6C5CE7] text-white rounded-xl font-medium hover:bg-[#5B4CD6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  创建中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  创建房间
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#636E72] mt-6">
          创建后，你可以邀请其他用户加入房间
        </p>
      </div>
    </div>
  );
}
