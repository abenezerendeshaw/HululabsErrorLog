// src/app/api/error-log/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

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
    } = body;

    // 1. Basic Validation
    if (!projectName?.trim() || !errorTitle?.trim() || !reportedBy?.trim() || !description?.trim()) {
      return NextResponse.json(
        { message: "እባክዎ አስፈላጊዎቹን መረጃዎች (Project, Title, Reporter, Description) ያስገቡ።" },
        { status: 400 }
      );
    }

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
      `🚨 *አዲስ የስህተት መዝገብ (New Error Log)*\n\n` +
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

    if (solutionText && solutionText.trim()) {
      errorMsg += `\n\n💡 *Possible Solution (Text):*\n${solutionText.trim()}`;
    }

    if (solutionVideoUrl && solutionVideoUrl.trim()) {
      errorMsg += `\n\n🎥 *Video Explanation:* [Watch Video](${solutionVideoUrl.trim()})`;
    }

    // 3. Dispatch to Telegram Channel
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: errorMsg,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    });

    return NextResponse.json(
      { success: true, message: "ስህተቱ በተሳካ ሁኔታ ተመዝግቧል!" },
      { status: 200 }
    );
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    console.error("Error Log Submit API Error:", errorDetails);
    return NextResponse.json(
      { message: "መዝገቡን ማስገባት አልተቻለም።", error: typeof errorDetails === "object" ? JSON.stringify(errorDetails) : errorDetails },
      { status: 500 }
    );
  }
}