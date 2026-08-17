// components/SolutionModal.tsx
"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface Solution {
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

const statusConfig: Record<string, { emoji: string; color: string; bg: string; border: string }> = {
  proposed: {
    emoji: "💭",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  tried: {
    emoji: "🧪",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  working: {
    emoji: "✅",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  verified: {
    emoji: "🎯",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
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
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load solutions when modal opens
  useEffect(() => {
    if (isOpen && !hasLoaded && !loading) {
      const loadSolutions = async () => {
        setLoading(true);
        try {
          const res = await axios.get<{ 
            success: boolean; 
            data: Solution[]; 
            count: number;
          }>(`/api/errors/${errorId}/solutions`);

          setSolutions(res.data.data || []);
          setHasLoaded(true);
        } catch (error) {
          console.error("Failed to load solutions:", error);
          setSolutions([]);
        } finally {
          setLoading(false);
        }
      };
      loadSolutions();
    }
  }, [isOpen, errorId, hasLoaded, loading]);

  // Reset loaded state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasLoaded(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in-zoom duration-200">
          
          {/* Header - Gradient with better styling */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 px-6 py-5 flex items-start justify-between sticky top-0 shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💡</span>
                <h2 className="text-xl font-bold text-white truncate">Solutions</h2>
              </div>
              <p className="text-sm text-indigo-100 mt-1 truncate">{errorTitle}</p>
              <p className="text-xs text-indigo-200 mt-0.5 font-mono">ID: {errorId}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors flex-shrink-0 ml-4"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl">🔍</span>
                    </div>
                  </div>
                  <p className="text-slate-600 mt-4 font-medium">Loading solutions...</p>
                </div>
              </div>
            )}

            {!loading && solutions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-5xl">🔍</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No solutions yet</h3>
                <p className="text-slate-500 text-center max-w-sm">
                  Be the first to propose a solution for this error.
                </p>
                <div className="mt-6 bg-slate-100 rounded-lg px-4 py-2">
                  <code className="text-xs font-mono text-slate-600 select-all">
                    Error ID: {errorId}
                  </code>
                </div>
                {onProposeSolution && (
                  <button
                    onClick={() => onProposeSolution(errorId)}
                    className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition shadow-sm"
                  >
                    ✏️ Propose Solution
                  </button>
                )}
              </div>
            )}

            {!loading && solutions.length > 0 && (
              <div className="space-y-4">
                {/* Solution count header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-slate-600">
                    {solutions.length} solution{solutions.length !== 1 ? 's' : ''} found
                  </span>
                  {onProposeSolution && (
                    <button
                      onClick={() => onProposeSolution(errorId)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-1"
                    >
                      ✏️ Propose Solution
                    </button>
                  )}
                </div>

                {solutions.map((solution, idx) => {
                  const status = statusConfig[solution.solutionStatus] || statusConfig.proposed;
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl p-5 border-2 ${status.bg} ${status.border} transition hover:shadow-md`}
                    >
                      {/* Status Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{status.emoji}</span>
                          <div>
                            <span className={`font-semibold capitalize ${status.color}`}>
                              {solution.solutionStatus}
                            </span>
                            {solution.submittedBy && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                By {solution.submittedBy}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 bg-white/50 px-2 py-1 rounded">
                          {new Date(solution.timestamp).toLocaleString()}
                        </div>
                      </div>

                      {/* Text Content */}
                      {solution.solutionText && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-slate-700">📄 Description</span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white/50 rounded-lg p-3 border border-slate-100">
                            {solution.solutionText}
                          </p>
                        </div>
                      )}

                      {/* Code Snippet */}
                      {solution.codeSnippet && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-slate-700">💻 Code</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(solution.codeSnippet || '');
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              Copy
                            </button>
                          </div>
                          <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-xs font-mono text-slate-100 whitespace-pre-wrap break-words">
                              {solution.codeSnippet}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Video Link */}
                      {solution.videoUrl && (
                        <div className="mb-3">
                          <a
                            href={solution.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white/50 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 transition"
                          >
                            <span className="text-lg">🎥</span>
                            Watch Video
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}

                      {/* Attempt Count */}
                      {solution.attemptCount && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/50">
                          <span className="text-xs text-slate-500">🔄 Attempts:</span>
                          <span className="text-xs font-medium text-slate-700">{solution.attemptCount}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-between items-center sticky bottom-0">
            <div className="text-xs text-slate-400">
              {solutions.length > 0 && `Showing ${solutions.length} solution${solutions.length !== 1 ? 's' : ''}`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-zoom {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-in.fade-in-zoom {
          animation: fade-in-zoom 0.2s ease-out;
        }
      `}</style>
    </>
  );
}