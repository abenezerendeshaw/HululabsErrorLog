// src/app/api/errors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getErrorsFromSheet } from "@/lib/sheets";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const errors = await getErrorsFromSheet();
    
    return NextResponse.json(
      { 
        success: true,
        data: errors,
        count: errors.length,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Error fetching errors from Google Sheets:", err.message);
    return NextResponse.json(
      { 
        success: false,
        message: "Failed to fetch errors",
        error: err.message 
      },
      { status: 500 }
    );
  }
}
