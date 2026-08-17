// src/app/api/errors/[id]/solutions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSolutionsForError } from "@/lib/sheets";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Error ID is required" },
        { status: 400 }
      );
    }

    const solutions = await getSolutionsForError(id);
    
    return NextResponse.json(
      { 
        success: true,
        errorId: id,
        data: solutions,
        count: solutions.length,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Error fetching solutions from Google Sheets:", err.message);
    return NextResponse.json(
      { 
        success: false,
        message: "Failed to fetch solutions",
        error: err.message 
      },
      { status: 500 }
    );
  }
}
