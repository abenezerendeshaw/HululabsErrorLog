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
}

const priorityColors: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-rose-100 text-rose-700",
};

// Priority order for sorting
const priorityOrder: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

// Status badge colors for future use
// const statusBadgeColors: Record<string, string> = {
//   open: "bg-blue-100 text-blue-700",
//   "in-progress": "bg-purple-100 text-purple-700",
//   resolved: "bg-emerald-100 text-emerald-700",
//   closed: "bg-slate-100 text-slate-700",
// };

export default function ErrorsList() {
  const [errors, setErrors] = useState<Error[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<Error | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const loadErrors = async () => {
    setLoading(true);
    try {
      const res = await axios.get<{ success: boolean; data: Error[]; count: number }>(
        "/api/errors"
      );
      // Sort errors: by priority (High > Medium > Low) and then by timestamp (latest first)
      const sortedErrors = (res.data.data || []).sort((a, b) => {
        // First sort by priority
        const priorityA = priorityOrder[a.priority || "Medium"] ?? 2;
        const priorityB = priorityOrder[b.priority || "Medium"] ?? 2;
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // If same priority, sort by timestamp (latest first)
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      setErrors(sortedErrors);
    } catch (error) {
      console.error("Failed to load errors:", error);
      setErrors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch errors on component mount - this is an acceptable use of setState in effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadErrors();
  }, []);

  const openSolutionsModal = (error: Error) => {
    setSelectedError(error);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedError(null);
  };

  const filteredErrors = errors.filter((error) => {
    if (filter === "all") return true;
    if (filter === "with-solutions") return (error.solutionCount || 0) > 0;
    if (filter === "without-solutions") return (error.solutionCount || 0) === 0;
    if (filter === "open") return error.status === "open";
    if (filter === "critical") return error.priority === "Critical";
    return true;
  });

  return (
    <div className="w-full">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">📋 Error Log</h2>
          <p className="text-sm text-slate-500 mt-1">{filteredErrors.length} error(s) logged</p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "All", value: "all" },
            { label: "With Solutions", value: "with-solutions" },
            { label: "Without Solutions", value: "without-solutions" },
            { label: "Open", value: "open" },
            { label: "Critical", value: "critical" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <button
          onClick={loadErrors}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition flex items-center gap-1"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            <p className="text-slate-600">Loading errors...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredErrors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-slate-600 font-medium">No errors found</p>
          <p className="text-slate-500 text-sm mt-1">Start by reporting an error above</p>
        </div>
      )}

      {/* Errors table */}
      {!loading && filteredErrors.length > 0 && (
        <div className="overflow-x-auto">
          <div className="space-y-3">
            {filteredErrors.map((error) => (
              <div
                key={error.errorId}
                onClick={() => openSolutionsModal(error)}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition cursor-pointer group"
              >
                {/* Error header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 group-hover:text-blue-600">
                        {error.errorTitle}
                      </h3>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-600">
                        {error.errorId}
                      </code>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{error.projectName}</p>
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 ml-4">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        priorityColors[error.priority || "Medium"] || priorityColors.Medium
                      }`}
                    >
                      {error.priority || "Medium"}
                    </span>
                    {error.solutionCount && error.solutionCount > 0 && (
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-700">
                        💡 {error.solutionCount} solution{error.solutionCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Error details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-xs">
                  <div>
                    <span className="text-slate-500">Category</span>
                    <p className="font-medium text-slate-800">{error.category || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Environment</span>
                    <p className="font-medium text-slate-800">{error.environment || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Assigned To</span>
                    <p className="font-medium text-slate-800">{error.assignedTo || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Reported By</span>
                    <p className="font-medium text-slate-800">{error.reportedBy}</p>
                  </div>
                </div>

                {/* Description preview */}
                <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                  {error.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(error.timestamp).toLocaleString()}</span>
                  <span className="text-blue-600 font-medium group-hover:flex items-center gap-1">
                    View Solutions →
                  </span>
                </div>
              </div>
            ))}
          </div>
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