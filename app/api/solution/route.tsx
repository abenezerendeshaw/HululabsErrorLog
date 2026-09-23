// src/app/api/solution/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { appendSolutionToSheet } from "@/lib/sheets";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse multipart form data (supports optional solution image)
    const formData = await req.formData();

    const errorId             = formData.get("errorId")             as string | null;
    const topic               = formData.get("topic")               as string | null;
    const solutionText        = formData.get("solutionText")        as string | null;
    const solutionVideoUrl    = formData.get("solutionVideoUrl")    as string | null;
    const solutionCodeSnippet = formData.get("solutionCodeSnippet") as string | null;
    const solutionStatus      = formData.get("solutionStatus")      as string | null;
    const submittedBy         = formData.get("submittedBy")         as string | null;
    const solutionImageFile   = formData.get("solutionImage")       as File | null;

    // 1. Basic Validation
    if (!errorId?.trim()) {
      return NextResponse.json(
        { message: "Error ID is required (እባክዎ Error ID ያስገቡ።)" },
        { status: 400 }
      );
    }

    if (
      !solutionText?.trim() &&
      !solutionVideoUrl?.trim() &&
      !solutionCodeSnippet?.trim()
    ) {
      return NextResponse.json(
        { message: "Please provide at least one solution method (text, code, or video)." },
        { status: 400 }
      );
    }

    const BOT_TOKEN: string | undefined = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID: string | undefined   = process.env.TELEGRAM_ERROR_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return NextResponse.json(
        { message: "Server configuration error. (Missing API Tokens)" },
        { status: 500 }
      );
    }

    const timestamp: string = new Date().toLocaleString("en-US", {
      timeZone: "Africa/Addis_Ababa",
    });

    // 2. Format Telegram message
    const statusEmoji: Record<string, string> = {
      proposed: "💭",
      tried: "🧪",
      working: "✅",
      verified: "🎯",
    };

    let solutionMsg: string =
      `💡 *Solution Update*\n` +
      `🆔 *Error ID:* \`${errorId}\`\n` +
      `🧠 *Topic:* ${topic?.trim() || "General"}\n`;

    if (solutionStatus) {
      solutionMsg += `📊 *Status:* ${statusEmoji[solutionStatus] ?? "💭"} ${solutionStatus.toUpperCase()}\n`;
    }

    if (submittedBy?.trim()) {
      solutionMsg += `👤 *Submitted By:* ${submittedBy}\n`;
    }

    solutionMsg += `🕒 *Time:* ${timestamp}\n`;

    if (solutionText?.trim()) {
      solutionMsg += `\n📄 *Solution Text:*\n${solutionText.trim()}`;
    }

    if (solutionCodeSnippet?.trim()) {
      solutionMsg += `\n\n\`\`\`\n${solutionCodeSnippet.trim()}\n\`\`\``;
    }

    if (solutionVideoUrl?.trim()) {
      solutionMsg += `\n\n🎥 *Video:* [Watch Video](${solutionVideoUrl.trim()})`;
    }

    // 3. Dispatch to Telegram — with photo if image provided
    if (solutionImageFile && solutionImageFile.size > 0) {
      const telegramForm = new FormData();
      telegramForm.append("chat_id", CHAT_ID);
      telegramForm.append("caption", solutionMsg);
      telegramForm.append("parse_mode", "Markdown");

      const imageBuffer = await solutionImageFile.arrayBuffer();
      const imageBlob   = new Blob([imageBuffer], {
        type: solutionImageFile.type || "image/jpeg",
      });
      telegramForm.append(
        "photo",
        imageBlob,
        solutionImageFile.name || "solution-screenshot.jpg"
      );

      await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
        telegramForm,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
    } else {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: solutionMsg,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      });
    }

    // 4. Log solution to Google Sheets
    try {
      await appendSolutionToSheet({
        errorId,
        solutionStatus: solutionStatus || "proposed",
        solutionTopic: topic?.trim() || "General",
        solutionText: solutionText || "",
        codeSnippet: solutionCodeSnippet || "",
        videoUrl: solutionVideoUrl || "",
        submittedBy: submittedBy || "Anonymous",
        timestamp,
        attemptCount: 1,
      });
    } catch (sheetsError) {
      console.warn("Warning: Could not save solution to Google Sheets:", sheetsError);
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Solution added successfully! (ስህተት በተሳካ ሁኔታ ተጠርጣሪ ስልት ተሰጥቷል!)",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const axiosError = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const errorDetails =
      axiosError.response?.data ||
      (error instanceof Error ? error.message : String(error));
    console.error("Solution Submit API Error:", errorDetails);
    return NextResponse.json(
      {
        message: "Failed to add solution.",
        error:
          typeof errorDetails === "object"
            ? JSON.stringify(errorDetails)
            : errorDetails,
      },
      { status: 500 }
    );
  }
}
