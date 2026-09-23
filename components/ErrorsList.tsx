// components/ErrorsList.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import SolutionModal from "./SolutionModal";

interface Error {
  errorId: string;
  projectName: string;
  errorTitle: string;
  reportedBy: string;
  category?: string;
  environment?: string;
  priority?: string;
  difficultyLevel?: string;
  assignedTo?: string;
  description: string;
  timestamp: string;
  status?: string;
  solutionCount?: number;
  attemptCount?: number;
}

const priorityColors: Record<string, string> = {
  Low:      "bg-emerald-100 text-emerald-700",
  Medium:   "bg-amber-100 text-amber-700",
  High:     "bg-orange-100 text-orange-700",
  Critical: "bg-rose-100 text-rose-700",
};

const priorityDot: Record<string, string> = {
  Low:      "bg-emerald-400",
  Medium:   "bg-amber-400",
  High:     "bg-orange-500",
  Critical: "bg-rose-500",
};

const priorityOrder: Record<string, number> = {
  Critical: 0,
  High:     1,
  Medium:   2,
  Low:      3,
};

// Compact metadata pill
function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium truncate">{label}</span>
      <span className="text-xs font-semibold text-slate-700 truncate">{value || "—"}</span>
    </div>
  );
}

type TabKey = "all" | "high" | "medium" | "low";

const TABS: { key: TabKey; label: string; shortLabel: string; activeClass: string }[] = [
  { key: "all",    label: "All",         shortLabel: "All",    activeClass: "border-blue-600 text-blue-600"    },
  { key: "high",   label: "🔴 High",     shortLabel: "🔴",     activeClass: "border-rose-600 text-rose-600"    },
  { key: "medium", label: "🟡 Medium",   shortLabel: "🟡",     activeClass: "border-amber-600 text-amber-600"  },
  { key: "low",    label: "🟢 Low",      shortLabel: "🟢",     activeClass: "border-emerald-600 text-emerald-600" },
];

export default function ErrorsList() {
  const [errors, setErrors]           = useState<Error[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedError, setSelectedError] = useState<Error | null>(null);
  const [showModal, setShowModal]     = useState(false);
  const [activeTab, setActiveTab]     = useState<TabKey>("all");

  const loadErrors = async () => {
    setLoading(true);
    try {
      const res = await axios.get<{ success: boolean; data: Error[]; count: number }>(
        "/api/errors"
      );
      const sorted = (res.data.data || []).sort((a, b) => {
        const pa = priorityOrder[a.priority || "Medium"] ?? 2;
        const pb = priorityOrder[b.priority || "Medium"] ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      setErrors(sorted);
    } catch (err) {
      console.error("Failed to load errors:", err);
      setErrors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadErrors(); }, []);

  const openSolutionsModal = (error: Error) => {
    setSelectedError(error);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedError(null);
  };

  const filteredErrors = errors.filter((e) => {
    if (activeTab === "all")    return true;
    if (activeTab === "high")   return e.priority === "High" || e.priority === "Critical";
    if (activeTab === "medium") return e.priority === "Medium";
    if (activeTab === "low")    return e.priority === "Low";
    return true;
  });

  const counts = {
    all:    errors.length,
    high:   errors.filter(e => e.priority === "High" || e.priority === "Critical").length,
    medium: errors.filter(e => e.priority === "Medium").length,
    low:    errors.filter(e => e.priority === "Low").length,
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">📋 Error Log</h2>
          <p className="text-xs text-slate-500 mt-0.5">{filteredErrors.length} error{filteredErrors.length !== 1 ? "s" : ""} shown</p>
        </div>
        <button
          onClick={loadErrors}
          disabled={loading}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition flex items-center gap-1.5"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0120 15M19.418 15A8 8 0 014 9" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Tabs — scrollable on mobile ── */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide mb-5 -mx-1 px-1">
        {TABS.map(({ key, label, shortLabel, activeClass }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === key
                ? `${activeClass} bg-transparent`
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {/* Show short label on very small screens, full on sm+ */}
            <span className="xs:hidden">
              {shortLabel} <span className="text-[10px] opacity-70">({counts[key]})</span>
            </span>
            <span className="hidden xs:inline sm:hidden">{label} ({counts[key]})</span>
            <span className="hidden sm:inline">{label} ({counts[key]})</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
          <p className="text-sm text-slate-500">Loading errors…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredErrors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center px-4">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-slate-600 font-medium text-sm">
            {activeTab === "high"
              ? "No high priority errors — great job! 🎉"
              : activeTab === "medium"
              ? "No medium priority errors found"
              : activeTab === "low"
              ? "No low priority errors found"
              : "No errors logged yet"}
          </p>
          <p className="text-slate-400 text-xs mt-1">
            {activeTab === "all" ? "Start by reporting an error above" : "Try a different filter"}
          </p>
        </div>
      )}

      {/* Errors list */}
      {!loading && filteredErrors.length > 0 && (
        <div className="space-y-3">
          {filteredErrors.map((error, index) => {
            const hasSolutions = (error.solutionCount ?? error.attemptCount ?? 0) > 0;
            const solutionN    = error.solutionCount ?? error.attemptCount ?? 0;
            const dotColor     = priorityDot[error.priority || "Medium"] || priorityDot.Medium;

            return (
              <div
                key={error.errorId}
                onClick={() => openSolutionsModal(error)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openSolutionsModal(error)}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 active:scale-[0.99] transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {/* ── Top row ── */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Priority dot */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${dotColor}`} />

                  <div className="flex-1 min-w-0">
                    {/* Title + index */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 shrink-0">
                        #{index + 1}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition leading-snug">
                        {error.errorTitle}
                      </h3>
                    </div>

                    {/* Error ID — truncated on small screens */}
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                      {error.errorId}
                    </p>

                    <p className="text-xs text-slate-500 mt-0.5">{error.projectName}</p>
                  </div>

                  {/* Badges column */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        priorityColors[error.priority || "Medium"] || priorityColors.Medium
                      }`}
                    >
                      {error.priority || "Medium"}
                    </span>
                    {hasSolutions && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        💡 {solutionN}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Meta grid — 2 cols on mobile, 4 on sm+ ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 mb-3 pl-5">
                  <MetaPill label="Category"    value={error.category    || "—"} />
                  <MetaPill label="Environment" value={error.environment || "—"} />
                  <MetaPill label="Assigned"    value={error.assignedTo  || "—"} />
                  <MetaPill label="Reporter"    value={error.reportedBy} />
                </div>

                {/* Description preview */}
                <p className="text-xs text-slate-500 line-clamp-2 pl-5 mb-3 leading-relaxed">
                  {error.description}
                </p>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between pl-5 text-[10px] text-slate-400">
                  <span>{new Date(error.timestamp).toLocaleString()}</span>
                  <span className="text-blue-500 font-semibold group-hover:text-blue-700 transition">
                    View Solutions →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Solution Modal */}
      {selectedError && (
        <SolutionModal
          isOpen={showModal}
          errorId={selectedError.errorId}
          errorTitle={selectedError.errorTitle}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
