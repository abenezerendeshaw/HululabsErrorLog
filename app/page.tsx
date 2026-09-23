"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import Script from "next/script";
import axios from "axios";
import ErrorsList from "@/components/ErrorsList";

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
  topic: string;
  reportedBy: string;
  category: string;
  environment: string;
  priority: string;
  difficultyLevel: string;
  assignedTo: string;
  description: string;
  solutionText: string;
  solutionVideoUrl: string;
  solutionCodeSnippet: string;
  solutionStatus: "proposed" | "tried" | "working" | "verified";
}

interface ResponseState {
  type: "success" | "error" | "";
  text: string;
  errorId?: string;
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
  { name: "Abenezer", role: "Chief Technical Officer",  avatar: "AB" },
  { name: "Aderaw",   role: "Backend Engineer",         avatar: "AD" },
  { name: "Yohannes", role: "Frontend Engineer",        avatar: "YO" },
];

// ── Image upload preview component ──────────────────────────────────────────
function ImageUploadField({
  label,
  previewUrl,
  onFileChange,
  onClear,
  accept = "image/*",
}: {
  label: string;
  previewUrl: string | null;
  onFileChange: (file: File | null) => void;
  onClear: () => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onFileChange(file);
  };

  return (
    <Field label={label}>
      {previewUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full max-h-56 object-contain"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 bg-rose-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-rose-700 transition shadow"
            aria-label="Remove image"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/30 py-6 transition text-slate-500 hover:text-blue-600"
        >
          <span className="text-3xl">📸</span>
          <span className="text-sm font-medium">Tap to attach screenshot</span>
          <span className="text-xs text-slate-400">PNG, JPG, WEBP · max 10 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleChange}
      />
    </Field>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function ErrorLoggerPage() {
  const [formData, setFormData] = useState<FormDataState>({
    projectName: "",
    errorTitle: "",
    topic: "",
    reportedBy: "",
    category: "Frontend",
    environment: "Production",
    priority: "Medium",
    difficultyLevel: "Moderate",
    assignedTo: "",
    description: "",
    solutionText: "",
    solutionVideoUrl: "",
    solutionCodeSnippet: "",
    solutionStatus: "proposed",
  });

  // Error image state
  const [errorImageFile, setErrorImageFile]         = useState<File | null>(null);
  const [errorImagePreview, setErrorImagePreview]   = useState<string | null>(null);

  // Solution image state
  const [solutionImageFile, setSolutionImageFile]         = useState<File | null>(null);
  const [solutionImagePreview, setSolutionImagePreview]   = useState<string | null>(null);

  const [loading, setLoading]         = useState(false);
  const [responseMsg, setResponseMsg] = useState<ResponseState>({ type: "", text: "", errorId: undefined });
  const [telegramUser, setTelegramUser] = useState<string>("");

  // Tab management
  const [activeTab, setActiveTab] = useState<"report" | "solution" | "view">("report");

  // Solution tracking form state
  const [solutionTrackerData, setSolutionTrackerData] = useState({
    errorId: "",
    topic: "",
    solutionText: "",
    solutionVideoUrl: "",
    solutionCodeSnippet: "",
    solutionStatus: "working" as "proposed" | "tried" | "working" | "verified",
  });
  const [solutionLoading, setSolutionLoading]   = useState(false);
  const [solutionResponse, setSolutionResponse] = useState<ResponseState>({ type: "", text: "" });

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user) {
        const parts: string[] = [];
        if (user.first_name) parts.push(user.first_name);
        if (user.last_name)  parts.push(user.last_name);
        const name = parts.join(" ").trim();
        const formatted = user.username
          ? `@${user.username}`
          : name || `tg_${user.id}`;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTelegramUser(formatted);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData((p) => ({ ...p, reportedBy: formatted }));
      }
    }
  }, []);

  // ── Image helpers ────────────────────────────────────────────────────────
  const handleErrorImageChange = (file: File | null) => {
    setErrorImageFile(file);
    if (file) {
      setErrorImagePreview(URL.createObjectURL(file));
    } else {
      setErrorImagePreview(null);
    }
  };

  const clearErrorImage = () => {
    setErrorImageFile(null);
    if (errorImagePreview) URL.revokeObjectURL(errorImagePreview);
    setErrorImagePreview(null);
  };

  const handleSolutionImageChange = (file: File | null) => {
    setSolutionImageFile(file);
    if (file) {
      setSolutionImagePreview(URL.createObjectURL(file));
    } else {
      setSolutionImagePreview(null);
    }
  };

  const clearSolutionImage = () => {
    setSolutionImageFile(null);
    if (solutionImagePreview) URL.revokeObjectURL(solutionImagePreview);
    setSolutionImagePreview(null);
  };

  // ── Form field handlers ──────────────────────────────────────────────────
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSolutionTrackerChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setSolutionTrackerData((p) => ({ ...p, [name]: value }));
  };

  // ── Solution submit ──────────────────────────────────────────────────────
  const handleSolutionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSolutionLoading(true);
    setSolutionResponse({ type: "", text: "" });
    try {
      const fd = new FormData();
      fd.append("errorId",             solutionTrackerData.errorId);
      fd.append("topic",               solutionTrackerData.topic);
      fd.append("solutionText",        solutionTrackerData.solutionText);
      fd.append("solutionVideoUrl",    solutionTrackerData.solutionVideoUrl);
      fd.append("solutionCodeSnippet", solutionTrackerData.solutionCodeSnippet);
      fd.append("solutionStatus",      solutionTrackerData.solutionStatus);
      fd.append("submittedBy",         telegramUser);
      if (solutionImageFile) fd.append("solutionImage", solutionImageFile);

      const res = await axios.post<{ success: boolean; message: string }>(
        "/api/solution",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setSolutionResponse({ type: "success", text: res.data.message });
      setSolutionTrackerData({
        errorId: "",
        topic: "",
        solutionText: "",
        solutionVideoUrl: "",
        solutionCodeSnippet: "",
        solutionStatus: "working",
      });
      clearSolutionImage();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setSolutionResponse({
        type: "error",
        text: axiosErr.response?.data?.message || "Failed to add solution. Please try again.",
      });
    } finally {
      setSolutionLoading(false);
    }
  };

  // ── Error report submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResponseMsg({ type: "", text: "", errorId: undefined });
    try {
      const fd = new FormData();
      // Append all text fields
      (Object.keys(formData) as (keyof FormDataState)[]).forEach((key) => {
        fd.append(key, formData[key] as string);
      });
      // Append image if provided
      if (errorImageFile) fd.append("errorImage", errorImageFile);

      const res = await axios.post<{ success: boolean; message: string; errorId: string }>(
        "/api/error-log",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResponseMsg({ type: "success", text: res.data.message, errorId: res.data.errorId });
      setFormData((p) => ({
        ...p,
        errorTitle: "",
        topic: "",
        assignedTo: "",
        description: "",
        solutionText: "",
        solutionVideoUrl: "",
        solutionCodeSnippet: "",
        solutionStatus: "proposed",
      }));
      clearErrorImage();
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
      <Script src="https://telegram.org/js/telegram-web-app.js" />

      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen">

          {/* ═══════════════════════════════════════════════════════════════
              LEFT SIDEBAR — desktop only (lg+)
          ═══════════════════════════════════════════════════════════════ */}
          <aside className="hidden lg:flex lg:w-[360px] xl:w-[400px] bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white flex-col justify-between sticky top-0 h-screen overflow-y-auto p-10">
            <div>
              {/* Logo */}
              <div className="flex items-center gap-3 mb-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
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

            <p className="text-xs text-blue-400 italic mt-8">&quot;Building tomorrow&apos;s solutions, today.&quot;</p>
          </aside>

          {/* ═══════════════════════════════════════════════════════════════
              MAIN — mobile + desktop form area
          ═══════════════════════════════════════════════════════════════ */}
          <main className="flex-1 flex flex-col min-w-0">

            {/* ── Mobile-only top bar ── */}
            <header className="lg:hidden bg-blue-800 text-white px-4 pt-safe-top pb-4 pt-4">
              {/* Logo row */}
              <div className="flex items-center gap-2.5 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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

                  {/* ── Mode Tabs — scrollable on mobile ── */}
                  <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
                    {(
                      [
                        { key: "report",   label: "🐛 Report",   labelFull: "🐛 Report Error"  },
                        { key: "solution", label: "💡 Solution",  labelFull: "💡 Add Solution"  },
                        { key: "view",     label: "📋 View",      labelFull: "📋 View Errors"   },
                      ] as const
                    ).map(({ key, label, labelFull }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`flex-1 min-w-[80px] px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition whitespace-nowrap border-b-2 ${
                          activeTab === key
                            ? "border-blue-600 text-blue-600 bg-blue-50/30"
                            : "border-transparent text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span className="sm:hidden">{label}</span>
                        <span className="hidden sm:inline">{labelFull}</span>
                      </button>
                    ))}
                  </div>

                  {/* Response banner */}
                  {(responseMsg.text || solutionResponse.text) && (
                    <div
                      role="alert"
                      className={`mx-4 mt-4 rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2 ${
                        (responseMsg.text ? responseMsg.type : solutionResponse.type) === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      <span>{(responseMsg.text ? responseMsg.type : solutionResponse.type) === "success" ? "✅" : "❌"}</span>
                      <div className="flex-1">
                        <span>{responseMsg.text || solutionResponse.text}</span>
                        {responseMsg.errorId && (
                          <div className="mt-2 pt-2 border-t border-emerald-200">
                            <p className="text-xs font-mono bg-white/50 rounded px-2 py-1 inline-block">
                              ID: {responseMsg.errorId}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ════════════════════════════════════════════════════════
                      ERROR REPORT FORM
                  ════════════════════════════════════════════════════════ */}
                  {activeTab === "report" && (
                    <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-5">

                      {/* Project & Reporter */}
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
                          {telegramUser ? (
                            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                              <span className="text-blue-500 text-base leading-none">✈️</span>
                              <span className="text-sm font-semibold text-blue-700">{telegramUser}</span>
                              <span className="ml-auto text-[10px] text-blue-400 bg-blue-100 rounded-full px-2 py-0.5 font-medium">Auto</span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              name="reportedBy"
                              required
                              value={formData.reportedBy}
                              onChange={handleChange}
                              placeholder="@username"
                              className={inputCls}
                            />
                          )}
                        </Field>
                      </div>

                      {/* Error Title & Topic */}
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
                        <Field label="Topic">
                          <input
                            type="text"
                            name="topic"
                            value={formData.topic}
                            onChange={handleChange}
                            placeholder="e.g. Payment Integration"
                            className={inputCls}
                          />
                        </Field>
                      </div>

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

                      {/* Error Screenshot */}
                      <ImageUploadField
                        label="Error Screenshot (optional)"
                        previewUrl={errorImagePreview}
                        onFileChange={handleErrorImageChange}
                        onClear={clearErrorImage}
                      />

                      <div className="border-t border-slate-100 pt-1" />

                      {/* Submit */}
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
                  )}

                  {/* ════════════════════════════════════════════════════════
                      SOLUTION TRACKING FORM
                  ════════════════════════════════════════════════════════ */}
                  {activeTab === "solution" && (
                    <form onSubmit={handleSolutionSubmit} className="px-4 sm:px-6 py-5 space-y-5">

                      {/* Error ID lookup */}
                      <Field label="Error ID" required>
                        <input
                          type="text"
                          name="errorId"
                          required
                          value={solutionTrackerData.errorId}
                          onChange={handleSolutionTrackerChange}
                          placeholder="e.g. ERR-ABCD123-XYZ789"
                          className={inputCls}
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Enter the Error ID from the success message when you logged the error
                        </p>
                      </Field>

                      <Field label="Topic">
                        <input
                          type="text"
                          name="topic"
                          value={solutionTrackerData.topic}
                          onChange={handleSolutionTrackerChange}
                          placeholder="e.g. Payment Integration"
                          className={inputCls}
                        />
                      </Field>

                      <div className="border-t border-slate-100" />

                      {/* Solution Status */}
                      <Field label="Solution Status">
                        <select
                          name="solutionStatus"
                          value={solutionTrackerData.solutionStatus}
                          onChange={handleSolutionTrackerChange}
                          className={selectCls}
                        >
                          {["proposed", "tried", "working", "verified"].map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                          💭 Proposed &nbsp;•&nbsp; 🧪 Tried &nbsp;•&nbsp; ✅ Working &nbsp;•&nbsp; 🎯 Verified
                        </p>
                      </Field>

                      {/* Solution text */}
                      <Field label="Solution Explanation (Text)">
                        <textarea
                          name="solutionText"
                          rows={4}
                          value={solutionTrackerData.solutionText}
                          onChange={handleSolutionTrackerChange}
                          placeholder="Explain the solution, steps to implement, or workarounds..."
                          className={inputCls}
                        />
                      </Field>

                      {/* Solution code snippet */}
                      <Field label="Code Snippet">
                        <textarea
                          name="solutionCodeSnippet"
                          rows={4}
                          value={solutionTrackerData.solutionCodeSnippet}
                          onChange={handleSolutionTrackerChange}
                          placeholder={"// Paste relevant code or configuration here\n// Example code..."}
                          className={`${inputCls} font-mono text-xs`}
                        />
                      </Field>

                      {/* Solution video */}
                      <Field label="Video Explanation URL">
                        <input
                          type="url"
                          name="solutionVideoUrl"
                          value={solutionTrackerData.solutionVideoUrl}
                          onChange={handleSolutionTrackerChange}
                          placeholder="https://loom.com/share/... or YouTube link"
                          className={inputCls}
                        />
                      </Field>

                      {/* Solution Screenshot */}
                      <ImageUploadField
                        label="Solution Screenshot (optional)"
                        previewUrl={solutionImagePreview}
                        onFileChange={handleSolutionImageChange}
                        onClear={clearSolutionImage}
                      />

                      <p className="text-[11px] text-slate-500 px-1">
                        ℹ️ At least one field (text, code, or video) is required
                      </p>

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={solutionLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all text-sm tracking-wide flex items-center justify-center gap-2 mt-2"
                      >
                        {solutionLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                            </svg>
                            Submitting Solution…
                          </>
                        ) : (
                          "Submit Solution"
                        )}
                      </button>
                    </form>
                  )}

                  {/* Errors List View */}
                  {activeTab === "view" && (
                    <div className="px-4 sm:px-6 py-5">
                      <ErrorsList />
                    </div>
                  )}
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
