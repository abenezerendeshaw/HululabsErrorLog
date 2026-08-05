"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Script from "next/script";
import axios from "axios";

// Define TypeScript interfaces for Telegram WebApp SDK
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        initDataUnsafe?: {
          user?: {
            id?: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
      };
    };
  }
}

interface FormDataState {
  projectName: string;
  errorTitle: string;
  reportedBy: string;
  category: string;
  environment: string;
  priority: string;
  difficultyLevel: string;
  assignedTo: string;
  description: string;
  solutionText: string;
  solutionVideoUrl: string;
}

interface ResponseState {
  type: "success" | "error" | "";
  text: string;
}

export default function ErrorLoggerPage() {
  const [formData, setFormData] = useState<FormDataState>({
    projectName: "",
    errorTitle: "",
    reportedBy: "",
    category: "Frontend",
    environment: "Production",
    priority: "Medium",
    difficultyLevel: "Moderate",
    assignedTo: "",
    description: "",
    solutionText: "",
    solutionVideoUrl: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [responseMsg, setResponseMsg] = useState<ResponseState>({ type: "", text: "" });

  const handleTelegramInit = () => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();

      const user = tg.initDataUnsafe?.user;
      if (user) {
        const formattedUser = user.username
          ? `@${user.username}`
          : `${user.first_name || ""} ${user.last_name || ""}`.trim();

        if (formattedUser) {
          setFormData((prev) => ({ ...prev, reportedBy: formattedUser }));
        }
      }
    }
  };

  useEffect(() => {
    handleTelegramInit();
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResponseMsg({ type: "", text: "" });

    try {
      const res = await axios.post<{ success: boolean; message: string }>("/api/error-log", formData);
      setResponseMsg({ type: "success", text: res.data.message });
      setFormData((prev) => ({
        ...prev,
        errorTitle: "",
        assignedTo: "",
        description: "",
        solutionText: "",
        solutionVideoUrl: "",
      }));
    } catch (err: any) {
      setResponseMsg({
        type: "error",
        text: err.response?.data?.message || "ስህተት አጋጥሟል። እባክዎ ደግመው ይሞክሩ።",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        onLoad={handleTelegramInit}
      />

      <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6 sm:p-10 border border-slate-100">
          <div className="mb-8 border-b pb-4">
            <h1 className="text-2xl font-bold text-slate-800">
              Company Error Logging Portal
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Submit technical bugs and solutions directly to the engineering team channel.
            </p>
          </div>

          {responseMsg.text && (
            <div
              className={`p-4 rounded-lg mb-6 text-sm font-medium ${
                responseMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {responseMsg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  name="projectName"
                  required
                  value={formData.projectName}
                  onChange={handleChange}
                  placeholder="e.g. Core Mobile App"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Reported By (Telegram Handle) *
                </label>
                <input
                  type="text"
                  name="reportedBy"
                  required
                  value={formData.reportedBy}
                  onChange={handleChange}
                  placeholder="e.g. @username"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Error Title *
                </label>
                <input
                  type="text"
                  name="errorTitle"
                  required
                  value={formData.errorTitle}
                  onChange={handleChange}
                  placeholder="e.g. Payment Gateway 500 Error"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Assigned To
                </label>
                <input
                  type="text"
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                  placeholder="e.g. @lead_developer"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="Database">Database</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="UI/UX">UI/UX</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Environment
                </label>
                <select
                  name="environment"
                  value={formData.environment}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Development">Development</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Difficulty
                </label>
                <select
                  name="difficultyLevel"
                  value={formData.difficultyLevel}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Hard">Hard</option>
                  <option value="Complex">Complex</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Error Description *
              </label>
              <textarea
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe steps to reproduce, expected result, and actual behavior..."
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Possible Solution (Text)
              </label>
              <textarea
                name="solutionText"
                rows={3}
                value={formData.solutionText}
                onChange={handleChange}
                placeholder="Outline steps to fix or workarounds if known..."
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Possible Solution (Video URL)
              </label>
              <input
                type="url"
                name="solutionVideoUrl"
                value={formData.solutionVideoUrl}
                onChange={handleChange}
                placeholder="https://loom.com/share/... or YouTube link"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg transition duration-200 text-sm disabled:opacity-50"
            >
              {loading ? "Submitting Log..." : "Submit Error Log"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}