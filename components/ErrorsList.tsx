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

export default function ErrorsList() {
  const [errors, setErrors] = useState<Error[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<Error | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "high" | "medium" | "low">("all");

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

  // Filter errors based on active tab
  const filteredErrors = errors.filter((error) => {
    if (activeTab === "all") return true;
    if (activeTab === "high") return error.priority === "High" || error.priority === "Critical";
    if (activeTab === "medium") return error.priority === "Medium";
    if (activeTab === "low") return error.priority === "Low";
    return true;
  });

  // Calculate statistics
  const totalErrors = errors.length;
  const highPriority = errors.filter(e => e.priority === "High" || e.priority === "Critical").length;
  const mediumPriority = errors.filter(e => e.priority === "Medium").length;
  const lowPriority = errors.filter(e => e.priority === "Low").length;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">📋 Error Log</h2>
          <p className="text-sm text-slate-500 mt-1">{filteredErrors.length} error(s) logged</p>
        </div>

        {/* Refresh button */}
        <button
          onClick={loadErrors}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition flex items-center gap-1"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Numbering */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-md transition">
          <div className="text-2xl font-bold text-blue-600">{totalErrors}</div>
          <div className="text-sm text-slate-600">Total Errors</div>
        </div>
        <div className="bg-white rounded-xl border border-rose-200 p-4 text-center hover:shadow-md transition">
          <div className="text-2xl font-bold text-rose-600">🔴 {highPriority}</div>
          <div className="text-sm text-slate-600">High Priority</div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4 text-center hover:shadow-md transition">
          <div className="text-2xl font-bold text-amber-600">🟡 {mediumPriority}</div>
          <div className="text-sm text-slate-600">Medium Priority</div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4 text-center hover:shadow-md transition">
          <div className="text-2xl font-bold text-emerald-600">🟢 {lowPriority}</div>
          <div className="text-sm text-slate-600">Low Priority</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
            activeTab === "all"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          All Errors ({totalErrors})
        </button>
        <button
          onClick={() => setActiveTab("high")}
          className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
            activeTab === "high"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          🔴 High Priority ({highPriority})
        </button>
        <button
          onClick={() => setActiveTab("medium")}
          className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
            activeTab === "medium"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          🟡 Medium Priority ({mediumPriority})
        </button>
        <button
          onClick={() => setActiveTab("low")}
          className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
            activeTab === "low"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          🟢 Low Priority ({lowPriority})
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
          <p className="text-slate-600 font-medium">
            {activeTab === "high" 
              ? "No high priority errors found 🎉" 
              : activeTab === "medium"
              ? "No medium priority errors found"
              : activeTab === "low"
              ? "No low priority errors found"
              : "No errors found"}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {activeTab === "all" 
              ? "Start by reporting an error above"
              : "Try checking other priority levels"}
          </p>
        </div>
      )}

      {/* Errors list */}
      {!loading && filteredErrors.length > 0 && (
        <div className="overflow-x-auto">
          <div className="space-y-3">
            {filteredErrors.map((error, index) => (
              <div
                key={error.errorId}
                onClick={() => openSolutionsModal(error)}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition cursor-pointer group"
              >
                {/* Error header with index number */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500 min-w-[30px] text-center">
                        #{index + 1}
                      </span>
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