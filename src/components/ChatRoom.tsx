"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Message {
  id: string;
  content: string;
  sender: string;
  senderId: string | null;
  createdAt: Date | string;
  user?: {
    id: string;
    nickname: string | null;
    avatarUrl: string | null;
  } | null;
}

interface Participant {
  id: string;
  role: string;
  user: {
    id: string;
    nickname: string | null;
    avatarUrl: string | null;
  };
}

interface Room {
  id: string;
  title: string;
  description: string | null;
  status: string;
  participants: Participant[];
  _count: {
    messages: number;
  };
}

interface ChatRoomProps {
  room: Room;
  initialMessages: Message[];
  currentUserId: string;
}

export function ChatRoom({ room, initialMessages, currentUserId }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          content: userMessage,
        }),
      });

      const data = await res.json();
      if (data.code === 0) {
        setMessages((prev) => [
          ...prev,
          data.data.userMessage,
          data.data.agentMessage,
        ]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-2xl border border-[#E8E6E1] overflow-hidden">
      {/* 聊天室头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E1] bg-[#FAF9F6]">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-[#E8E6E1] rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-[#636E72]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-[#2D3436]">{room.title}</h1>
            <p className="text-sm text-[#636E72]">
              {room.participants.length} 人参与
            </p>
          </div>
        </div>

        {/* 参与者列表 */}
        <div className="flex items-center gap-2">
          {room.participants.map((participant) => (
            <div
              key={participant.id}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE] border-2 border-white flex items-center justify-center text-white text-xs font-medium"
              title={participant.user.nickname || "用户"}
            >
              {participant.user.avatarUrl ? (
                <img
                  src={participant.user.avatarUrl}
                  alt={participant.user.nickname || "用户"}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                participant.user.nickname?.charAt(0) || "?"
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 mb-4 bg-[#FAF9F6] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#636E72]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#2D3436] mb-2">开始讨论</h3>
            <p className="text-[#636E72]">发送第一条消息开始讨论吧</p>
          </div>
        ) : (
          messages.map((message) => {
            const isUserMessage = message.sender === "user" && message.senderId === currentUserId;
            const isAgent = message.sender === "agent";

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUserMessage ? "flex-row-reverse" : ""}`}
              >
                {/* 头像 */}
                <div
                  className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium ${
                    isAgent
                      ? "bg-gradient-to-br from-[#00B894] to-[#55EFC4]"
                      : "bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE]"
                  }`}
                >
                  {isAgent ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  ) : message.user?.avatarUrl ? (
                    <img
                      src={message.user.avatarUrl}
                      alt={message.user.nickname || "用户"}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    message.user?.nickname?.charAt(0) || "?"
                  )}
                </div>

                {/* 消息内容 */}
                <div className={`max-w-[70%] ${isUserMessage ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[#2D3436]">
                      {isAgent ? "AI Agent" : message.user?.nickname || "用户"}
                    </span>
                  </div>
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      isUserMessage
                        ? "bg-[#6C5CE7] text-white rounded-tr-sm"
                        : isAgent
                        ? "bg-[#00B894]/10 text-[#2D3436] rounded-tl-sm"
                        : "bg-[#FAF9F6] text-[#2D3436] rounded-tl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <span className="text-xs text-[#636E72] mt-1 block">
                    {new Date(message.createdAt).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-[#E8E6E1] bg-[#FAF9F6]">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入你的想法..."
            className="flex-1 px-5 py-3 bg-white border border-[#E8E6E1] rounded-xl text-[#2D3436] placeholder-[#636E72] focus:outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20 transition-all"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSending}
            className="px-6 py-3 bg-[#6C5CE7] text-white rounded-xl font-medium hover:bg-[#5B4CD6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSending ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                发送中
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                发送
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
