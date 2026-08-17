// components/SolutionModal.tsx
"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface Solution {
  id?: string;
  errorId: string;
  solutionStatus: string;
  solutionText?: string;
  codeSnippet?: string;
  videoUrl?: string;
  submittedBy?: string;
  timestamp: string;
  attemptCount?: number;
}

interface SolutionModalProps {
  isOpen: boolean;
  errorId: string;
  errorTitle: string;
  onClose: () => void;
  onProposeSolution?: (errorId: string) => void;
}

const statusEmoji: Record<string, string> = {
  proposed: "💭",
  tried: "🧪",
  working: "✅",
  verified: "🎯",
};

const statusColors: Record<string, string> = {
  proposed: "bg-blue-50 text-blue-700 border-blue-200",
  tried: "bg-amber-50 text-amber-700 border-amber-200",
  working: "bg-emerald-50 text-emerald-700 border-emerald-200",
  verified: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export default function SolutionModal({
  isOpen,
  errorId,
  errorTitle,
  onClose,
  onProposeSolution,
}: SolutionModalProps) {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(false);

  // Load solutions safely inside useEffect
  useEffect(() => {
    let isMounted = true;

    if (!isOpen || !errorId) return;

    const loadSolutions = async () => {
      setLoading(true);
      try {
        const res = await axios.get<{
          success: boolean;
          data: Solution[];
          count: number;
        }>(`/api/errors/${errorId}/solutions`);

        if (isMounted) {
          setSolutions(res.data.data || []);
        }
      } catch (error) {
        console.error("Failed to load solutions:", error);
        if (isMounted) {
          setSolutions([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSolutions();

    // Cleanup on unmount or when dependencies change
    return () => {
      isMounted = false;
    };
  }, [isOpen, errorId]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-start justify-between sticky top-0 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">💡 Solutions</h2>
            <p className="text-sm text-indigo-100 mt-1">{errorTitle}</p>
            <p className="text-xs text-indigo-200 mt-0.5 font-mono">ID: {errorId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                <p className="text-slate-600">Loading solutions...</p>
              </div>
            </div>
          )}

          {!loading && solutions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <p className="text-6xl mb-3" aria-hidden="true">🔍</p>
              <p className="text-slate-600 font-medium text-center">No solutions yet</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProposeSolution?.(errorId);
                }}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm text-center mt-3 underline hover:no-underline transition"
              >
                💡 Be the first to propose a solution using the Add Solution tab
              </button>
            </div>
          )}

          {!loading && solutions.length > 0 && (
            <div className="space-y-4 p-6">
              {solutions.map((solution, idx) => (
                <div
                  key={solution.id || idx}
                  className={`rounded-xl p-4 border-2 ${statusColors[solution.solutionStatus] || statusColors.proposed}`}
                >
                  {/* Status Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {statusEmoji[solution.solutionStatus] || "💭"}
                      </span>
                      <span className="font-semibold capitalize">
                        {solution.solutionStatus}
                      </span>
                    </div>
                    <div className="text-xs opacity-75">
                      {solution.timestamp}
                    </div>
                  </div>

                  {/* Submitter */}
                  {solution.submittedBy && (
                    <p className="text-sm opacity-75 mb-3">
                      By {solution.submittedBy}
                    </p>
                  )}

                  {/* Text Content */}
                  {solution.solutionText && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">📄 Solution</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {solution.solutionText}
                      </p>
                    </div>
                  )}

                  {/* Code Snippet */}
                  {solution.codeSnippet && (
                    <div className="mb-3 bg-black/5 rounded-lg p-3 overflow-x-auto">
                      <p className="text-xs font-medium mb-2 opacity-75">💻 Code</p>
                      <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                        {solution.codeSnippet}
                      </pre>
                    </div>
                  )}

                  {/* Video Link */}
                  {solution.videoUrl && (
                    <div className="flex items-center gap-2 mb-2">
                      <a
                        href={solution.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
                      >
                        🎥 Watch Video
                        <span>→</span>
                      </a>
                    </div>
                  )}

                  {/* Attempt Count */}
                  {solution.attemptCount !== undefined && (
                    <p className="text-xs opacity-60 mt-3">
                      Attempts: {solution.attemptCount}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}