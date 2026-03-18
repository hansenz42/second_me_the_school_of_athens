"use client";

import { useState } from "react";
import Link from "next/link";

interface WanderTopicSummary {
  topicId: string;
  title: string;
  insights: string[];
  recommended: boolean;
  reason: string;
}

interface WanderSummaryContent {
  topics: WanderTopicSummary[];
  overallTakeaways: string[];
  generatedAt: string;
}

interface WanderSummaryCardProps {
  summary: {
    id: string;
    sessionId: string;
    content: WanderSummaryContent;
    totalTopics: number;
    wanderedAt: string;
    createdAt: string;
  };
}

export function ReportCard({ summary }: WanderSummaryCardProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const wanderedDate = new Date(summary.wanderedAt);
  const recommendedCount =
    summary.content.topics?.filter((t) => t.recommended).length ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E8E6E1] overflow-hidden">
      {/* 头部：wander 时间 + 概览 */}
      <div className="p-6 border-b border-[#E8E6E1] bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                Agent 报告
              </span>
              <span className="text-xs text-[#B2BEC3]">
                {wanderedDate.toLocaleString("zh-CN", {
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#2D3436]">
              本次漫游了 {summary.totalTopics} 个话题
              {recommendedCount > 0 && (
                <span className="ml-2 text-sm font-normal text-indigo-600">
                  · {recommendedCount} 个值得关注
                </span>
              )}
            </h3>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 总体认知建议 */}
        {summary.content.overallTakeaways?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[#2D3436] mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-indigo-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              认知升级要点
            </h4>
            <ul className="space-y-2">
              {summary.content.overallTakeaways.map((takeaway, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[#636E72] text-sm"
                >
                  <span className="text-indigo-500 mt-0.5 shrink-0">✦</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 话题列表 */}
        {summary.content.topics?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[#2D3436] mb-3">
              话题启发
            </h4>
            <div className="space-y-3">
              {summary.content.topics.map((topic) => (
                <div
                  key={topic.topicId}
                  className={`rounded-xl border p-4 transition-colors ${
                    topic.recommended
                      ? "border-indigo-200 bg-indigo-50/50"
                      : "border-gray-200 bg-gray-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {topic.recommended && (
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                          推荐
                        </span>
                      )}
                      <Link
                        href={`/topics/${topic.topicId}`}
                        className="text-sm font-semibold text-[#2D3436] hover:text-indigo-600 transition-colors truncate"
                      >
                        {topic.title}
                      </Link>
                    </div>
                    <button
                      onClick={() => toggleTopic(topic.topicId)}
                      className="shrink-0 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      {expandedTopics.has(topic.topicId) ? "收起" : "展开"}
                    </button>
                  </div>

                  {expandedTopics.has(topic.topicId) && (
                    <div className="mt-3 space-y-3">
                      {topic.insights?.length > 0 && (
                        <ul className="space-y-1.5">
                          {topic.insights.map((insight, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-[#636E72]"
                            >
                              <span className="text-indigo-400 mt-0.5 shrink-0">
                                •
                              </span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {topic.reason && (
                        <p className="text-xs text-[#B2BEC3] italic border-t border-gray-100 pt-2">
                          {topic.reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
