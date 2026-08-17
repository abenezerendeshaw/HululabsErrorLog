// src/app/api/solution/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { appendSolutionToSheet } from "@/lib/sheets";

interface SolutionPayload {
  errorId: string;
  solutionText?: string;
  solutionVideoUrl?: string;
  solutionCodeSnippet?: string;
  solutionStatus?: "proposed" | "tried" | "working" | "verified";
  submittedBy?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: SolutionPayload = await req.json();
    const {
      errorId,
      solutionText,
      solutionVideoUrl,
      solutionCodeSnippet,
      solutionStatus,
      submittedBy,
    } = body;

    // 1. Basic Validation
    if (!errorId?.trim()) {
      return NextResponse.json(
        { message: "Error ID is required (እባክዎ Error ID ያስገቡ።)" },
        { status: 400 }
      );
    }

    if (!solutionText?.trim() && !solutionVideoUrl?.trim() && !solutionCodeSnippet?.trim()) {
      return NextResponse.json(
        { message: "Please provide at least one solution method (text, code, or video)." },
        { status: 400 }
      );
    }

    const BOT_TOKEN: string | undefined = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID: string | undefined = process.env.TELEGRAM_ERROR_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return NextResponse.json(
        { message: "Server configuration error. (Missing API Tokens)" },
        { status: 500 }
      );
    }

    const timestamp: string = new Date().toLocaleString("en-US", {
      timeZone: "Africa/Addis_Ababa",
    });

    // 2. Format Telegram Markdown Notification for solution update
    const statusEmoji: Record<string, string> = {
      proposed: "💭",
      tried: "🧪",
      working: "✅",
      verified: "🎯",
    };

    let solutionMsg: string =
      `💡 *Solution Update*\n` +
      `🆔 *Error ID:* \`${errorId}\`\n`;

    if (solutionStatus) {
      solutionMsg += `📊 *Status:* ${statusEmoji[solutionStatus]} ${solutionStatus.toUpperCase()}\n`;
    }

    if (submittedBy?.trim()) {
      solutionMsg += `👤 *Submitted By:* ${submittedBy}\n`;
    }

    solutionMsg += `🕒 *Time:* ${timestamp}\n`;

    if (solutionText && solutionText.trim()) {
      solutionMsg += `\n📄 *Solution Text:*\n${solutionText.trim()}`;
    }

    if (solutionCodeSnippet && solutionCodeSnippet.trim()) {
      solutionMsg += `\n\n\`\`\`\n${solutionCodeSnippet.trim()}\n\`\`\``;
    }

    if (solutionVideoUrl && solutionVideoUrl.trim()) {
      solutionMsg += `\n\n🎥 *Video:* [Watch Video](${solutionVideoUrl.trim()})`;
    }

    // 3. Dispatch to Telegram Channel
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: solutionMsg,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    });

    // 4. Log solution to Google Sheets
    try {
      await appendSolutionToSheet({
        errorId,
        solutionStatus: solutionStatus || "proposed",
        solutionText: solutionText || "",
        codeSnippet: solutionCodeSnippet || "",
        videoUrl: solutionVideoUrl || "",
        submittedBy: submittedBy || "Anonymous",
        timestamp: timestamp,
        attemptCount: 1,
      });
    } catch (sheetsError) {
      console.warn("Warning: Could not save solution to Google Sheets:", sheetsError);
      // Continue anyway - Telegram logging is the priority
    }

    return NextResponse.json(
      { 
        success: true, 
        message: "Solution added successfully! (ስህተት በተሳካ ሁኔታ ተጠርጣሪ ስልት ተሰጥቷል!)",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const axiosError = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const errorDetails = axiosError.response?.data || (error instanceof Error ? error.message : String(error));
    console.error("Solution Submit API Error:", errorDetails);
    return NextResponse.json(
      { message: "Failed to add solution.", error: typeof errorDetails === "object" ? JSON.stringify(errorDetails) : errorDetails },
      { status: 500 }
    );
  }
}
