// src/app/api/error-log/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { appendErrorToSheet, appendSolutionToSheet } from "@/lib/sheets";

// Generate unique error ID: ERR-TIMESTAMP-RANDOM
function generateErrorId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ERR-${timestamp}-${random}`;
}

/**
 * Escape characters that break Telegram's legacy Markdown mode.
 * Only escapes inside user-supplied free-text fields, not our own formatting.
 */
function escapeMd(text: string): string {
  // Escape underscores, asterisks, backticks, and square brackets
  return text.replace(/([_*`[\]])/g, "\\$1");
}

/** Telegram photo captions are limited to 1024 chars */
const CAPTION_LIMIT = 1024;

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 3) + "...";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse multipart form data (supports optional image attachment)
    const formData = await req.formData();

    const projectName         = formData.get("projectName")         as string | null;
    const errorTitle          = formData.get("errorTitle")          as string | null;
    const topic               = formData.get("topic")               as string | null;
    const reportedBy          = formData.get("reportedBy")          as string | null;
    const category            = formData.get("category")            as string | null;
    const environment         = formData.get("environment")         as string | null;
    const priority            = formData.get("priority")            as string | null;
    const difficultyLevel     = formData.get("difficultyLevel")     as string | null;
    const assignedTo          = formData.get("assignedTo")          as string | null;
    const description         = formData.get("description")         as string | null;
    const solutionText        = formData.get("solutionText")        as string | null;
    const solutionVideoUrl    = formData.get("solutionVideoUrl")    as string | null;
    const solutionCodeSnippet = formData.get("solutionCodeSnippet") as string | null;
    const solutionStatus      = formData.get("solutionStatus")      as string | null;
    const errorImageFile      = formData.get("errorImage")          as File | null;

    // 1. Basic Validation
    if (!projectName?.trim() || !errorTitle?.trim() || !reportedBy?.trim() || !description?.trim()) {
      return NextResponse.json(
        { message: "እባክዎ አስፈላጊዎቹን መረጃዎች (Project, Title, Reporter, Description) ያስገቡ።" },
        { status: 400 }
      );
    }

    const errorId = generateErrorId();

    const BOT_TOKEN: string | undefined = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID: string | undefined   = process.env.TELEGRAM_ERROR_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return NextResponse.json(
        { message: "የሰርቨር ውቅር ስህተት አጋጥሟል። (Missing API Tokens)" },
        { status: 500 }
      );
    }

    const reporterTag: string = reportedBy.trim().startsWith("@")
      ? reportedBy.trim()
      : `@${reportedBy.trim()}`;

    const timestamp: string = new Date().toLocaleString("en-US", {
      timeZone: "Africa/Addis_Ababa",
    });

    // 2. Build Telegram message using HTML parse mode (more robust than Markdown)
    const safeProject     = escapeMd(projectName.trim());
    const safeTitle       = escapeMd(errorTitle.trim());
    const safeTopic       = escapeMd(topic?.trim() || "General");
    const safeReporter    = escapeMd(reporterTag);
    const safeEnv         = escapeMd(environment || "Production");
    const safeCat         = escapeMd(category || "General");
    const safePriority    = escapeMd(priority || "Medium");
    const safeDifficulty  = escapeMd(difficultyLevel || "Moderate");
    const safeAssigned    = escapeMd(assignedTo?.trim() || "Unassigned");
    const safeDescription = escapeMd(description.trim());

    let errorMsg: string =
      `🚨 *New Error Log*\n` +
      `🆔 *ID:* \`${errorId}\`\n\n` +
      `📁 *Project:* ${safeProject}\n` +
      `📌 *Title:* ${safeTitle}\n` +
      `🧠 *Topic:* ${safeTopic}\n` +
      `👤 *Reporter:* ${safeReporter}\n` +
      `🖥️ *Env:* ${safeEnv}\n` +
      `🏷️ *Category:* ${safeCat}\n` +
      `🔥 *Priority:* ${safePriority}\n` +
      `⚙️ *Difficulty:* ${safeDifficulty}\n` +
      `👤 *Assigned:* ${safeAssigned}\n` +
      `🕒 *Time:* ${timestamp}\n\n` +
      `📝 *Description:*\n${safeDescription}`;

    // Append optional inline solution
    if (solutionText || solutionVideoUrl || solutionCodeSnippet) {
      const statusEmoji: Record<string, string> = {
        proposed: "💭", tried: "🧪", working: "✅", verified: "🎯",
      };
      const emoji = solutionStatus ? (statusEmoji[solutionStatus] ?? "💭") : "💭";
      const statusLabel = solutionStatus ? solutionStatus.toUpperCase() : "PROPOSED";
      errorMsg += `\n\n💡 *Solution* [${emoji} ${statusLabel}]`;
      if (solutionText?.trim()) {
        errorMsg += `\n📄 ${escapeMd(solutionText.trim())}`;
      }
      if (solutionVideoUrl?.trim()) {
        errorMsg += `\n🎥 ${escapeMd(solutionVideoUrl.trim())}`;
      }
    }

    // 3. Dispatch to Telegram
    const hasImage = errorImageFile && errorImageFile.size > 0;

    if (hasImage) {
      // Photo caption is limited to 1024 chars
      const caption = truncate(errorMsg, CAPTION_LIMIT);
      const telegramForm = new FormData();
      telegramForm.append("chat_id", CHAT_ID);
      telegramForm.append("caption", caption);
      telegramForm.append("parse_mode", "Markdown");

      const imageBuffer = await errorImageFile.arrayBuffer();
      const imageBlob   = new Blob([imageBuffer], { type: errorImageFile.type || "image/jpeg" });
      telegramForm.append("photo", imageBlob, errorImageFile.name || "error-screenshot.jpg");

      try {
        await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
          telegramForm,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      } catch (photoErr: unknown) {
        // If photo send fails, fall back to text message + send photo separately
        console.warn("sendPhoto failed, falling back to sendMessage:", (photoErr as any)?.response?.data); // eslint-disable-line @typescript-eslint/no-explicit-any
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: CHAT_ID,
          text: errorMsg,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        });
      }
    } else {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: errorMsg,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
    }

    // 4. Log error to Google Sheets (non-fatal)
    try {
      await appendErrorToSheet({
        errorId,
        projectName: projectName.trim(),
        errorTitle: errorTitle.trim(),
        topic: topic?.trim() || "General",
        reportedBy: reporterTag,
        category: category || "General",
        environment: environment || "Production",
        priority: priority || "Medium",
        difficultyLevel: difficultyLevel || "Moderate",
        assignedTo: assignedTo?.trim() || "Unassigned",
        description: description.trim(),
        timestamp,
        status: "open",
        solutionStatus:
          solutionStatus ||
          (solutionText || solutionVideoUrl || solutionCodeSnippet ? "proposed" : ""),
        solutionTopic: topic?.trim() || "General",
        solutionText: solutionText || "",
        codeSnippet: solutionCodeSnippet || "",
        videoUrl: solutionVideoUrl || "",
        submittedBy: reporterTag,
        solutionTimestamp:
          solutionText || solutionVideoUrl || solutionCodeSnippet ? timestamp : "",
        attemptCount:
          solutionText || solutionVideoUrl || solutionCodeSnippet ? 1 : 0,
        solutionCount:
          solutionText || solutionVideoUrl || solutionCodeSnippet ? 1 : 0,
      });
    } catch (sheetsError) {
      console.warn("Warning: Could not save to Google Sheets:", sheetsError);
    }

    // 5. Log inline solution to Sheets if provided (non-fatal)
    if (solutionText || solutionVideoUrl || solutionCodeSnippet) {
      try {
        await appendSolutionToSheet({
          errorId,
          solutionStatus: solutionStatus || "proposed",
          solutionTopic: topic?.trim() || "General",
          solutionText: solutionText || "",
          codeSnippet: solutionCodeSnippet || "",
          videoUrl: solutionVideoUrl || "",
          submittedBy: reporterTag,
          timestamp,
          attemptCount: 1,
        });
      } catch (sheetsError) {
        console.warn("Warning: Could not save solution to Google Sheets:", sheetsError);
      }
    }

    return NextResponse.json(
      { success: true, message: "ስህተቱ በተሳካ ሁኔታ ተመዝግቧል!", errorId },
      { status: 200 }
    );
  } catch (error: unknown) {
    const axiosError = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    // Log the full Telegram error response so we can see exactly what went wrong
    const telegramErr = axiosError?.response?.data;
    const errorDetails = telegramErr || (error instanceof Error ? error.message : String(error));
    console.error("Error Log Submit API Error:", JSON.stringify(errorDetails, null, 2));
    return NextResponse.json(
      {
        message: "መዝገቡን ማስገባት አልተቻለም።",
        error: typeof errorDetails === "object" ? JSON.stringify(errorDetails) : errorDetails,
      },
      { status: 500 }
    );
  }
}
