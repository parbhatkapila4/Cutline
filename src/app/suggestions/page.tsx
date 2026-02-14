"use client";

import { useState } from "react";
import Link from "next/link";

type SuggestionCategory = "all" | "correctness" | "clarity" | "engagement";

interface Suggestion {
  id: string;
  category: "correctness" | "clarity" | "engagement";
  title: string;
  percentage: number;
  description: string;
  highlight: string;
  afterHighlight: string;
  timeAgo: string;
  fileName: string;
}


const SUGGESTIONS: Suggestion[] = [
  {
    id: "1",
    category: "correctness",
    title: "Change preposition",
    percentage: 12,
    description: "Human beings have existed for a ",
    highlight: "remarkably",
    afterHighlight: " long time, evolving and adapting through countless gener...",
    timeAgo: "A few secs ago",
    fileName: "ludxrls_revsor0",
  },
  {
    id: "2",
    category: "clarity",
    title: "Fix Subject-Verb Agreement",
    percentage: 6,
    description: "...our mission is to leverage cutting-edge Al technologies to ",
    highlight: "streamline logistics",
    afterHighlight: " long time, evolving and adapting through countless gener...",
    timeAgo: "20 mins ago",
    fileName: "project_summary_v2",
  },
  {
    id: "3",
    category: "engagement",
    title: "Introduction Improvement",
    percentage: 85,
    description: "This Agreement shall be governed by and ",
    highlight: "constructed",
    afterHighlight: " long time, evolving and adapting through countless gener...",
    timeAgo: "30 mins ago",
    fileName: "Q3_financials_final",
  },
  {
    id: "4",
    category: "correctness",
    title: "Change preposition",
    percentage: 9,
    description: "Human beings have existed for a ",
    highlight: "remarkably",
    afterHighlight: " long time, evolving and adapting through countless gener...",
    timeAgo: "40 mins ago",
    fileName: "team_meeting_notes_0513",
  },
  {
    id: "5",
    category: "engagement",
    title: "Add Transition Word",
    percentage: 64,
    description: "Change contlx to accommodate. To accommodate, ensuring all aspects ",
    highlight: "are",
    afterHighlight: " long time, evolving and adapting through countless gener...",
    timeAgo: "40 mins ago",
    fileName: "chand_assets_revA",
  },
  {
    id: "6",
    category: "correctness",
    title: "Change preposition",
    percentage: 12,
    description: "Human beings have existed for a ",
    highlight: "remarkably",
    afterHighlight: " long time, evolving and adapting through countless gener...",
    timeAgo: "45 mins ago",
    fileName: "user_data_backup_2025",
  },
];

const CATEGORY_COLORS = {
  correctness: { dot: "bg-red-500", text: "text-red-400", badge: "text-red-400", highlight: "text-red-400 underline decoration-red-400/50" },
  clarity: { dot: "bg-blue-500", text: "text-blue-400", badge: "text-blue-400", highlight: "text-blue-400 underline decoration-blue-400/50" },
  engagement: { dot: "bg-emerald-500", text: "text-emerald-400", badge: "text-emerald-400", highlight: "text-emerald-400 underline decoration-emerald-400/50" },
};

export default function SuggestionsPage() {
  const [activeTab, setActiveTab] = useState<SuggestionCategory>("all");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const filteredSuggestions = SUGGESTIONS.filter((s) => {
    if (dismissed.has(s.id)) return false;
    if (activeTab === "all") return true;
    return s.category === activeTab;
  });

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const tabs: { id: SuggestionCategory; label: string }[] = [
    { id: "all", label: "All" },
    { id: "correctness", label: "Correctness" },
    { id: "clarity", label: "Clarity" },
    { id: "engagement", label: "Engagement" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      <div className="fixed top-4 left-4 z-50">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50 px-4 py-2 rounded-lg transition-colors"
        >
          Home page
        </Link>
      </div>

      <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Suggestions</h1>
          <p className="text-zinc-400">
            Refine your writing with intelligent, real-time suggestions, context, and purpose.
          </p>
        </div>


        <div className="mb-6 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
          <span className="text-sm text-zinc-300">
            Use two-factor authentication (2FA) when you sign in to better protect your account.{" "}
            <Link href="#" className="text-zinc-100 underline hover:text-white">Manage Account</Link>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-sm">
            <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Sort by : Date created
            </button>
            <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </button>
            <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuggestions.map((suggestion) => {
            const colors = CATEGORY_COLORS[suggestion.category];
            return (
              <div
                key={suggestion.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <span className={`text-sm font-medium ${colors.text} capitalize`}>
                      {suggestion.category}
                    </span>
                  </div>
                  <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-white">{suggestion.title}</h3>
                  <span className={`text-sm font-medium ${colors.badge}`}>
                    {suggestion.percentage}%
                  </span>
                </div>

                <p className="text-sm text-zinc-400 mb-4 flex-1">
                  {suggestion.description}
                  <span className={colors.highlight}>{suggestion.highlight}</span>
                  {suggestion.afterHighlight}
                </p>


                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{suggestion.timeAgo}</span>
                  <span className="text-zinc-600">|</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate">On file {suggestion.fileName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDismiss(suggestion.id)}
                    className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    Dismiss
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors">
                    Go to File
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                  <button className="ml-auto p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredSuggestions.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-300 mb-1">All caught up!</h3>
            <p className="text-zinc-500">No suggestions to show in this category.</p>
          </div>
        )}
      </main>
    </div>
  );
}
