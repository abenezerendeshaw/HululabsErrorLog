// src/app/api/solution/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { appendSolutionToSheet } from "@/lib/sheets";

function escapeMd(text: string): string {
  return text.replace(/([_*`[\]])/g, "\\$1");
}

const CAPTION_LIMIT = 1024;
function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 3) + "...";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();

    const errorId             = formData.get("errorId")             as string | null;
    const topic               = formData.get("topic")               as string | null;
    const solutionText        = formData.get("solutionText")        as string | null;
    const solutionVideoUrl    = formData.get("solutionVideoUrl")    as string | null;
    const solutionCodeSnippet = formData.get("solutionCodeSnippet") as string | null;
    const solutionStatus      = formData.get("solutionStatus")      as string | null;
    const submittedBy         = formData.get("submittedBy")         as string | null;
    const solutionImageFile   = formData.get("solutionImage")       as File | null;

    // 1. Validation
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

    const statusEmoji: Record<string, string> = {
      proposed: "💭", tried: "🧪", working: "✅", verified: "🎯",
    };

    const safeId      = escapeMd(errorId.trim());
    const safeTopic   = escapeMd(topic?.trim() || "General");
    const safeBy      = escapeMd(submittedBy?.trim() || "Anonymous");
    const safeStatus  = solutionStatus || "proposed";
    const emoji       = statusEmoji[safeStatus] ?? "💭";

    let solutionMsg: string =
      `💡 *Solution Update*\n` +
      `🆔 *Error ID:* \`${safeId}\`\n` +
      `🧠 *Topic:* ${safeTopic}\n` +
      `📊 *Status:* ${emoji} ${safeStatus.toUpperCase()}\n` +
      `👤 *By:* ${safeBy}\n` +
      `🕒 *Time:* ${timestamp}\n`;

    if (solutionText?.trim()) {
      solutionMsg += `\n📄 *Solution:*\n${escapeMd(solutionText.trim())}`;
    }
    if (solutionVideoUrl?.trim()) {
      solutionMsg += `\n🎥 ${escapeMd(solutionVideoUrl.trim())}`;
    }

    // 2. Dispatch to Telegram
    const hasImage = solutionImageFile && solutionImageFile.size > 0;

    if (hasImage) {
      const caption = truncate(solutionMsg, CAPTION_LIMIT);
      const telegramForm = new FormData();
      telegramForm.append("chat_id", CHAT_ID);
      telegramForm.append("caption", caption);
      telegramForm.append("parse_mode", "Markdown");

      const imageBuffer = await solutionImageFile.arrayBuffer();
      const imageBlob   = new Blob([imageBuffer], { type: solutionImageFile.type || "image/jpeg" });
      telegramForm.append("photo", imageBlob, solutionImageFile.name || "solution-screenshot.jpg");

      try {
        await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
          telegramForm,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      } catch (photoErr: unknown) {
        console.warn("sendPhoto failed, falling back to sendMessage:", (photoErr as any)?.response?.data); // eslint-disable-line @typescript-eslint/no-explicit-any
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: CHAT_ID,
          text: solutionMsg,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        });
      }
    } else {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: solutionMsg,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
    }

    // 3. Log solution to Google Sheets (non-fatal)
    try {
      await appendSolutionToSheet({
        errorId,
        solutionStatus: safeStatus,
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
      { success: true, message: "Solution added successfully! (ስህተት በተሳካ ሁኔታ ተጠርጣሪ ስልት ተሰጥቷል!)" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const axiosError = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const telegramErr = axiosError?.response?.data;
    const errorDetails = telegramErr || (error instanceof Error ? error.message : String(error));
    console.error("Solution Submit API Error:", JSON.stringify(errorDetails, null, 2));
    return NextResponse.json(
      {
        message: "Failed to add solution.",
        error: typeof errorDetails === "object" ? JSON.stringify(errorDetails) : errorDetails,
      },
      { status: 500 }
    );
  }
}
