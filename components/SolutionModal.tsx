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
  proposed: { emoji: "💭", color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200"   },
  tried:    { emoji: "🧪", color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200"  },
  working:  { emoji: "✅", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200"},
  verified: { emoji: "🎯", color: "text-indigo-700",  bg: "bg-indigo-50",  border: "border-indigo-200" },
};

// ── Image lightbox ───────────────────────────────────────────────────────────
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Solution screenshot"
        className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg transition"
        aria-label="Close image"
      >
        ✕
      </button>
    </div>
  );
}

export default function SolutionModal({
  isOpen,
  errorId,
  errorTitle,
  onClose,
  onProposeSolution,
}: SolutionModalProps) {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading]     = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Prevent body scroll while modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Load solutions when modal opens
  useEffect(() => {
    if (isOpen && !hasLoaded && !loading) {
      const load = async () => {
        setLoading(true);
        try {
          const res = await axios.get<{
            success: boolean;
            data: Solution[];
            count: number;
          }>(`/api/errors/${errorId}/solutions`);
          setSolutions(res.data.data || []);
          setHasLoaded(true);
        } catch (err) {
          console.error("Failed to load solutions:", err);
          setSolutions([]);
        } finally {
          setLoading(false);
        }
      };
      void load();
    }
  }, [isOpen, errorId, hasLoaded, loading]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasLoaded(false);
      setLightboxSrc(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Lightbox (above everything) */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal — fills most of the screen on mobile, capped on desktop */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        <div className="relative w-full sm:max-w-3xl max-h-[92dvh] sm:max-h-[90vh] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">

          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 px-4 sm:px-6 py-4 sm:py-5 flex items-start justify-between shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl">💡</span>
                <h2 className="text-lg sm:text-xl font-bold text-white">Solutions</h2>
              </div>
              <p className="text-xs sm:text-sm text-indigo-100 mt-1 truncate">{errorTitle}</p>
              <p className="text-[10px] sm:text-xs text-indigo-200 mt-0.5 font-mono">{errorId}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition shrink-0 ml-3"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-slate-500 text-sm font-medium">Loading solutions…</p>
              </div>
            )}

            {/* Empty */}
            {!loading && solutions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl">🔍</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-1">No solutions yet</h3>
                <p className="text-slate-500 text-sm max-w-xs">
                  Be the first to propose a solution for this error.
                </p>
                <div className="mt-4 bg-slate-100 rounded-lg px-3 py-2">
                  <code className="text-xs font-mono text-slate-600 select-all">
                    {errorId}
                  </code>
                </div>
                {onProposeSolution && (
                  <button
                    onClick={() => onProposeSolution(errorId)}
                    className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition shadow-sm text-sm"
                  >
                    ✏️ Propose Solution
                  </button>
                )}
              </div>
            )}

            {/* Solutions list */}
            {!loading && solutions.length > 0 && (
              <div className="space-y-4">
                {/* Count + propose button */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">
                    {solutions.length} solution{solutions.length !== 1 ? "s" : ""} found
                  </span>
                  {onProposeSolution && (
                    <button
                      onClick={() => onProposeSolution(errorId)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition shadow-sm"
                    >
                      ✏️ Add Solution
                    </button>
                  )}
                </div>

                {solutions.map((solution, idx) => {
                  const st = statusConfig[solution.solutionStatus] || statusConfig.proposed;
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border-2 ${st.bg} ${st.border} overflow-hidden`}
                    >
                      {/* Solution card header */}
                      <div className="flex items-start justify-between px-4 pt-4 pb-3 gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{st.emoji}</span>
                          <div>
                            <span className={`text-sm font-semibold capitalize ${st.color}`}>
                              {solution.solutionStatus}
                            </span>
                            {solution.submittedBy && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                by {solution.submittedBy}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 bg-white/60 px-2 py-1 rounded shrink-0">
                          {new Date(solution.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="px-4 pb-4 space-y-3">
                        {/* Solution Text */}
                        {solution.solutionText && (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                              📄 Description
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white/60 rounded-lg p-3 border border-slate-200/60">
                              {solution.solutionText}
                            </p>
                          </div>
                        )}

                        {/* Code Snippet */}
                        {solution.codeSnippet && (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                💻 Code
                              </p>
                              <button
                                onClick={() => navigator.clipboard.writeText(solution.codeSnippet || "")}
                                className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-medium"
                              >
                                Copy
                              </button>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                              <pre className="text-xs font-mono text-slate-100 whitespace-pre-wrap break-words">
                                {solution.codeSnippet}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Video Link */}
                        {solution.videoUrl && (
                          <a
                            href={solution.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white/60 px-3 py-2 rounded-lg border border-slate-200/60 hover:border-blue-300 transition"
                          >
                            <span className="text-base">🎥</span>
                            Watch Video
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}

                        {/* Attempt count */}
                        {solution.attemptCount && solution.attemptCount > 0 ? (
                          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                            <span className="text-[11px] text-slate-400">🔄 Attempts:</span>
                            <span className="text-[11px] font-semibold text-slate-600">{solution.attemptCount}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400">
              {solutions.length > 0
                ? `${solutions.length} solution${solutions.length !== 1 ? "s" : ""}`
                : ""}
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @media (max-width: 639px) {
          .fixed.inset-0.z-50 > div {
            animation: slide-up 0.25s ease-out;
          }
        }
      `}</style>
    </>
  );
}
