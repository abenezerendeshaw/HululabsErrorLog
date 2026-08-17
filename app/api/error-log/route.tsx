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

// Define strict type contract for incoming payload
interface ErrorLogPayload {
  projectName: string;
  errorTitle: string;
  reportedBy: string;
  category?: string;
  environment?: string;
  priority?: string;
  difficultyLevel?: string;
  assignedTo?: string;
  description: string;
  solutionText?: string;
  solutionVideoUrl?: string;
  solutionCodeSnippet?: string;
  solutionStatus?: "proposed" | "tried" | "working" | "verified";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: ErrorLogPayload = await req.json();
    const {
      projectName,
      errorTitle,
      reportedBy,
      category,
      environment,
      priority,
      difficultyLevel,
      assignedTo,
      description,
      solutionText,
      solutionVideoUrl,
      solutionCodeSnippet,
      solutionStatus,
    } = body;

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
    const CHAT_ID: string | undefined = process.env.TELEGRAM_ERROR_CHAT_ID;

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

    // 2. Format Telegram Markdown Notification
    let errorMsg: string =
      `🚨 *አዲስ የስህተት መዝገብ (New Error Log)*\n` +
      `🆔 *Error ID:* \`${errorId}\`\n\n` +
      `📁 *Project:* ${projectName.trim()}\n` +
      `📌 *Title:* ${errorTitle.trim()}\n` +
      `👤 *Reported By:* ${reporterTag}\n` +
      `🖥️ *Environment:* ${environment || "Production"}\n` +
      `🏷️ *Category:* ${category || "General"}\n` +
      `🔥 *Priority:* ${priority || "Medium"}\n` +
      `⚙️ *Difficulty:* ${difficultyLevel || "Moderate"}\n` +
      `👤 *Assigned To:* ${assignedTo?.trim() ? assignedTo.trim() : "Unassigned"}\n` +
      `🕒 *Time:* ${timestamp}\n\n` +
      `📝 *Description:*\n${description.trim()}`;

    // Add solution section if provided
    if (solutionText || solutionVideoUrl || solutionCodeSnippet) {
      errorMsg += `\n\n💡 *Proposed Solution*`;
      if (solutionStatus) {
        const statusEmoji: Record<string, string> = {
          proposed: "💭",
          tried: "🧪",
          working: "✅",
          verified: "🎯",
        };
        errorMsg += ` [${statusEmoji[solutionStatus]} ${solutionStatus.toUpperCase()}]`;
      }
      errorMsg += `\n`;

      if (solutionText && solutionText.trim()) {
        errorMsg += `\n📄 *Text:*\n${solutionText.trim()}`;
      }

      if (solutionCodeSnippet && solutionCodeSnippet.trim()) {
        errorMsg += `\n\n\`\`\`\n${solutionCodeSnippet.trim()}\n\`\`\``;
      }

      if (solutionVideoUrl && solutionVideoUrl.trim()) {
        errorMsg += `\n\n🎥 *Video:* [Watch Video](${solutionVideoUrl.trim()})`;
      }
    }

    // 3. Dispatch to Telegram Channel
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: errorMsg,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    });

    // 4. Log error to Google Sheets
    try {
      await appendErrorToSheet({
        errorId,
        projectName: projectName.trim(),
        errorTitle: errorTitle.trim(),
        reportedBy: reporterTag,
        category: category || "General",
        environment: environment || "Production",
        priority: priority || "Medium",
        difficultyLevel: difficultyLevel || "Moderate",
        assignedTo: assignedTo?.trim() || "Unassigned",
        description: description.trim(),
        timestamp: timestamp,
        status: "open",
        solutionCount: (solutionText || solutionVideoUrl || solutionCodeSnippet) ? 1 : 0,
      });
    } catch (sheetsError) {
      console.warn("Warning: Could not save to Google Sheets:", sheetsError);
      // Continue anyway - Telegram logging is the priority
    }

    // 5. Log solution to Google Sheets if provided
    if (solutionText || solutionVideoUrl || solutionCodeSnippet) {
      try {
        await appendSolutionToSheet({
          errorId,
          solutionStatus: solutionStatus || "proposed",
          solutionText: solutionText || "",
          codeSnippet: solutionCodeSnippet || "",
          videoUrl: solutionVideoUrl || "",
          submittedBy: reporterTag,
          timestamp: timestamp,
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
        errorId: errorId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const axiosError = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const errorDetails = axiosError.response?.data || (error instanceof Error ? error.message : String(error));
    console.error("Error Log Submit API Error:", errorDetails);
    return NextResponse.json(
      { message: "መዝገቡን ማስገባት አልተቻለም።", error: typeof errorDetails === "object" ? JSON.stringify(errorDetails) : errorDetails },
      { status: 500 }
    );
  }
}