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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse multipart form data (supports optional image attachment)
    const formData = await req.formData();

    const projectName        = formData.get("projectName")        as string | null;
    const errorTitle         = formData.get("errorTitle")         as string | null;
    const topic              = formData.get("topic")              as string | null;
    const reportedBy         = formData.get("reportedBy")         as string | null;
    const category           = formData.get("category")           as string | null;
    const environment        = formData.get("environment")        as string | null;
    const priority           = formData.get("priority")           as string | null;
    const difficultyLevel    = formData.get("difficultyLevel")    as string | null;
    const assignedTo         = formData.get("assignedTo")         as string | null;
    const description        = formData.get("description")        as string | null;
    const solutionText       = formData.get("solutionText")       as string | null;
    const solutionVideoUrl   = formData.get("solutionVideoUrl")   as string | null;
    const solutionCodeSnippet= formData.get("solutionCodeSnippet")as string | null;
    const solutionStatus     = formData.get("solutionStatus")     as string | null;
    const errorImageFile     = formData.get("errorImage")         as File | null;

    // 1. Basic Validation
    if (!projectName?.trim() || !errorTitle?.trim() || !reportedBy?.trim() || !description?.trim()) {
      return NextResponse.json(
        { message: "እባክዎ አስፈላጊዎቹን መረጃዎች (Project, Title, Reporter, Description) ያስገቡ።" },
        { status: 400 }
      );
    }

    // Generate unique error ID
    const errorId = generateErrorId();

    const BOT_TOKEN: string | undefined = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID: string | undefined   = process.env.TELEGRAM_ERROR_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return NextResponse.json(
        { message: "የሰርቨር ውቅር ስህተት አጋጥሟል። (Missing API Tokens)" },
        { status: 500 }
      );
    }

    // Format username tag so it's directly clickable in Telegram
    const reporterTag: string = reportedBy.trim().startsWith("@")
      ? reportedBy.trim()
      : `@${reportedBy.trim()}`;

    const timestamp: string = new Date().toLocaleString("en-US", {
      timeZone: "Africa/Addis_Ababa",
    });

    // 2. Build Telegram Markdown message
    let errorMsg: string =
      `🚨 *አዲስ የስህተት መዝገብ (New Error Log)*\n` +
      `🆔 *Error ID:* \`${errorId}\`\n\n` +
      `📁 *Project:* ${projectName.trim()}\n` +
      `📌 *Title:* ${errorTitle.trim()}\n` +
      `🧠 *Topic:* ${topic?.trim() || "General"}\n` +
      `👤 *Reported By:* ${reporterTag}\n` +
      `🖥️ *Environment:* ${environment || "Production"}\n` +
      `🏷️ *Category:* ${category || "General"}\n` +
      `🔥 *Priority:* ${priority || "Medium"}\n` +
      `⚙️ *Difficulty:* ${difficultyLevel || "Moderate"}\n` +
      `👤 *Assigned To:* ${assignedTo?.trim() ? assignedTo.trim() : "Unassigned"}\n` +
      `🕒 *Time:* ${timestamp}\n\n` +
      `📝 *Description:*\n${description.trim()}`;

    // Append optional inline solution
    if (solutionText || solutionVideoUrl || solutionCodeSnippet) {
      errorMsg += `\n\n💡 *Proposed Solution*`;
      if (solutionStatus) {
        const statusEmoji: Record<string, string> = {
          proposed: "💭",
          tried: "🧪",
          working: "✅",
          verified: "🎯",
        };
        errorMsg += ` [${statusEmoji[solutionStatus] ?? "💭"} ${solutionStatus.toUpperCase()}]`;
      }
      if (solutionText?.trim()) {
        errorMsg += `\n\n📄 *Text:*\n${solutionText.trim()}`;
      }
      if (solutionCodeSnippet?.trim()) {
        errorMsg += `\n\n\`\`\`\n${solutionCodeSnippet.trim()}\n\`\`\``;
      }
      if (solutionVideoUrl?.trim()) {
        errorMsg += `\n\n🎥 *Video:* [Watch Video](${solutionVideoUrl.trim()})`;
      }
    }

    // 3. Dispatch to Telegram — send photo if image attached, otherwise text only
    if (errorImageFile && errorImageFile.size > 0) {
      // Send the image with the full caption
      const telegramForm = new FormData();
      telegramForm.append("chat_id", CHAT_ID);
      telegramForm.append("caption", errorMsg);
      telegramForm.append("parse_mode", "Markdown");

      const imageBuffer = await errorImageFile.arrayBuffer();
      const imageBlob   = new Blob([imageBuffer], { type: errorImageFile.type || "image/jpeg" });
      telegramForm.append("photo", imageBlob, errorImageFile.name || "error-screenshot.jpg");

      await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
        telegramForm,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
    } else {
      // No image — plain text message
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: errorMsg,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      });
    }

    // 4. Log error to Google Sheets
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

    // 5. Log inline solution to Sheets if provided
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
      {
        success: true,
        message: "ስህተቱ በተሳካ ሁኔታ ተመዝግቧል!",
        errorId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const axiosError = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const errorDetails =
      axiosError.response?.data ||
      (error instanceof Error ? error.message : String(error));
    console.error("Error Log Submit API Error:", errorDetails);
    return NextResponse.json(
      {
        message: "መዝገቡን ማስገባት አልተቻለም።",
        error:
          typeof errorDetails === "object"
            ? JSON.stringify(errorDetails)
            : errorDetails,
      },
      { status: 500 }
    );
  }
}
