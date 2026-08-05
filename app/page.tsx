"use client";

import { useState, useEffect, ChangeEvent } from "react";
import Script from "next/script";
import axios from "axios";

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

// ── Priority badge colours ──────────────────────────────────────────────────
const priorityColors: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-rose-100 text-rose-700",
};

// ── Field wrapper ───────────────────────────────────────────────────────────
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

const selectCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none";

// ── Team data (shared by sidebar + mobile header) ───────────────────────────
const TEAM = [
  { name: "Amir",     role: "Chief Technology Officer", avatar: "AM" },
  { name: "Abenezer", role: "Full-Stack Engineer",       avatar: "AB" },
  { name: "Aderaw",   role: "Backend Engineer",          avatar: "AD" },
  { name: "Yohannes", role: "Frontend Engineer",         avatar: "YO" },
];

// ── Page ────────────────────────────────────────────────────────────────────
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

  const [loading, setLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState<ResponseState>({ type: "", text: "" });

  const handleTelegramInit = () => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      const user = tg.initDataUnsafe?.user;
      if (user) {
        const formatted = user.username
          ? `@${user.username}`
          : `${user.first_name || ""} ${user.last_name || ""}`.trim();
        if (formatted) setFormData((p) => ({ ...p, reportedBy: formatted }));
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
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResponseMsg({ type: "", text: "" });
    try {
      const res = await axios.post<{ success: boolean; message: string }>(
        "/api/error-log",
        formData
      );
      setResponseMsg({ type: "success", text: res.data.message });
      setFormData((p) => ({
        ...p,
        errorTitle: "",
        assignedTo: "",
        description: "",
        solutionText: "",
        solutionVideoUrl: "",
      }));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setResponseMsg({
        type: "error",
        text: axiosErr.response?.data?.message || "ስህተት አጋጥሟል። እባክዎ ደግመው ይሞክሩ።",
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

      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen">

          {/* ═══════════════════════════════════════════════════════════════
              LEFT SIDEBAR — desktop only (lg+)
          ═══════════════════════════════════════════════════════════════ */}
          <aside className="hidden lg:flex lg:w-[360px] xl:w-[400px] bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white flex-col justify-between sticky top-0 h-screen overflow-y-auto p-10">
            <div>
              {/* Logo */}
              <div className="flex items-center gap-3 mb-8">
                <img
                  src="/logo.png"
                  alt="Hulu Software Labs"
                  className="w-14 h-14 rounded-xl bg-white/10 p-1.5"
                />
                <div>
                  <h2 className="text-xl font-bold tracking-tight leading-tight">Hulu Software Labs</h2>
                  <p className="text-blue-300 text-xs mt-0.5">Engineering Excellence</p>
                </div>
              </div>

              <div className="h-px bg-white/15 mb-6" />

              {/* Who we are */}
              <div className="mb-6">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-blue-300 mb-2">Who We Are</h3>
                <p className="text-sm leading-relaxed text-blue-100">
                  We build digital platforms and tools that help businesses sell, receive payments, automate operations, and grow with confidence.
                </p>
              </div>

              {/* Team */}
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-blue-300 mb-3">Core Engineering Team</h3>
                <div className="space-y-2.5">
                  {TEAM.map((m) => (
                    <div key={m.name} className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-500/40 border border-blue-400/30 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {m.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white leading-none">{m.name}</p>
                        <p className="text-xs text-blue-300 mt-0.5">{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-blue-400 italic mt-8">"Building tomorrow's solutions, today."</p>
          </aside>

          {/* ═══════════════════════════════════════════════════════════════
              MAIN — mobile + desktop form area
          ═══════════════════════════════════════════════════════════════ */}
          <main className="flex-1 flex flex-col min-w-0">

            {/* ── Mobile-only top bar ── */}
            <header className="lg:hidden bg-blue-800 text-white px-4 pt-safe-top pb-4 pt-4">
              {/* Logo row */}
              <div className="flex items-center gap-2.5 mb-4">
                <img
                  src="/logo.png"
                  alt="Hulu Software Labs"
                  className="w-9 h-9 rounded-lg bg-white/10 p-1"
                />
                <div>
                  <p className="text-base font-bold leading-none">Hulu Software Labs</p>
                  <p className="text-blue-300 text-[11px] mt-0.5">Error Logger</p>
                </div>
              </div>

              {/* Team avatar strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-[10px] text-blue-300 uppercase tracking-wider shrink-0 mr-1">Team</span>
                {TEAM.map((m) => (
                  <div key={m.name} className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 shrink-0">
                    <div className="w-5 h-5 rounded-full bg-blue-500/50 flex items-center justify-center text-[9px] font-bold">
                      {m.avatar}
                    </div>
                    <span className="text-[11px] font-medium text-blue-100">{m.name}</span>
                  </div>
                ))}
              </div>
            </header>

            {/* ── Form scroll area ── */}
            <div className="flex-1 overflow-y-auto">
              <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                  {/* Card header */}
                  <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="Hululabs"
                      className="w-8 h-8 rounded-lg bg-white/10 p-0.5 shrink-0"
                    />
                    <div>
                      <h1 className="text-base font-semibold text-white">Company Error Logging Portal</h1>
                      <p className="text-slate-400 text-xs mt-0.5">Posts to the engineering Telegram channel.</p>
                    </div>
                    <span className="ml-auto text-xl">🐛</span>
                  </div>

                  {/* Response banner */}
                  {responseMsg.text && (
                    <div
                      role="alert"
                      className={`mx-4 mt-4 rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2 ${
                        responseMsg.type === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      <span>{responseMsg.type === "success" ? "✅" : "❌"}</span>
                      <span>{responseMsg.text}</span>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-5">

                    {/* Project & Reporter — stack on mobile, side-by-side on sm+ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Project Name" required>
                        <input
                          type="text"
                          name="projectName"
                          required
                          value={formData.projectName}
                          onChange={handleChange}
                          placeholder="e.g. Magento website"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Reported By" required>
                        <input
                          type="text"
                          name="reportedBy"
                          required
                          value={formData.reportedBy}
                          onChange={handleChange}
                          placeholder="@username"
                          className={inputCls}
                        />
                      </Field>
                    </div>

                    {/* Error Title & Assigned */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Error Title" required>
                        <input
                          type="text"
                          name="errorTitle"
                          required
                          value={formData.errorTitle}
                          onChange={handleChange}
                          placeholder="e.g. Payment Gateway 500 Error"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Assigned To">
                        <input
                          type="text"
                          name="assignedTo"
                          value={formData.assignedTo}
                          onChange={handleChange}
                          placeholder="@lead_developer"
                          className={inputCls}
                        />
                      </Field>
                    </div>

                    {/* 4 selects — 2 cols on mobile, 4 on sm+ */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Field label="Category">
                        <select name="category" value={formData.category} onChange={handleChange} className={selectCls}>
                          {["Frontend", "Backend", "Database", "Infrastructure", "UI/UX"].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Environment">
                        <select name="environment" value={formData.environment} onChange={handleChange} className={selectCls}>
                          {["Production", "Staging", "Development"].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Priority">
                        <div className="relative">
                          <select name="priority" value={formData.priority} onChange={handleChange} className={selectCls}>
                            {["Low", "Medium", "High", "Critical"].map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                          </select>
                          <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full pointer-events-none ${priorityColors[formData.priority]}`}>
                            {formData.priority}
                          </span>
                        </div>
                      </Field>
                      <Field label="Difficulty">
                        <select name="difficultyLevel" value={formData.difficultyLevel} onChange={handleChange} className={selectCls}>
                          {["Easy", "Moderate", "Hard", "Complex"].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="border-t border-slate-100" />

                    {/* Description */}
                    <Field label="Error Description" required>
                      <textarea
                        name="description"
                        required
                        rows={4}
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Steps to reproduce, expected vs actual behaviour..."
                        className={inputCls}
                      />
                    </Field>

                    {/* Solution text */}
                    <Field label="Possible Solution (Text)">
                      <textarea
                        name="solutionText"
                        rows={3}
                        value={formData.solutionText}
                        onChange={handleChange}
                        placeholder="Outline steps to fix or known workarounds..."
                        className={inputCls}
                      />
                    </Field>

                    {/* Solution video */}
                    <Field label="Possible Solution (Video URL)">
                      <input
                        type="url"
                        name="solutionVideoUrl"
                        value={formData.solutionVideoUrl}
                        onChange={handleChange}
                        placeholder="https://loom.com/share/... or YouTube link"
                        className={inputCls}
                      />
                    </Field>

                    {/* Submit — large touch target for mobile */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all text-sm tracking-wide flex items-center justify-center gap-2 mt-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                          </svg>
                          Submitting…
                        </>
                      ) : (
                        "Submit Error Log"
                      )}
                    </button>
                  </form>
                </div>

                <p className="text-center text-xs text-slate-400 mt-5 pb-safe-bottom pb-4">
                  Hulu Software Labs · Internal Error Tracking
                </p>
              </div>
            </div>
          </main>

        </div>
      </div>
    </>
  );
}
