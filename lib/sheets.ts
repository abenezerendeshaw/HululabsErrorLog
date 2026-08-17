// lib/sheets.ts
import { readFileSync } from "fs";
import { google } from "googleapis";

interface ErrorRow {
  errorId: string;
  projectName: string;
  errorTitle: string;
  reportedBy: string;
  category?: string;
  environment?: string;
  priority?: string;
  difficultyLevel?: string;
  assignedTo?: string;
  description: string;
  timestamp: string;
  status?: string;
  solutionCount?: number;
}

interface SolutionRow {
  errorId: string;
  solutionStatus: string;
  solutionText?: string;
  codeSnippet?: string;
  videoUrl?: string;
  submittedBy?: string;
  timestamp: string;
  attemptCount?: number;
}

const SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;

function getServiceAccountCredentials() {
  const rawServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!rawServiceAccount) {
    return null;
  }

  try {
    const trimmed = rawServiceAccount.trim();

    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith("{")) {
      return JSON.parse(trimmed);
    }

    const fileContents = readFileSync(trimmed, "utf-8");
    return JSON.parse(fileContents);
  } catch (error) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON or a valid file path"
    );
  }
}

function getSheetsClient() {
  const serviceAccount = getServiceAccountCredentials();

  if (serviceAccount) {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    return google.sheets({
      version: "v4",
      auth,
    });
  }

  if (
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_PROJECT_ID
  ) {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      projectId: process.env.GOOGLE_PROJECT_ID,
    });

    return google.sheets({
      version: "v4",
      auth,
    });
  }

  if (!SHEETS_API_KEY) {
    throw new Error(
      "Missing Google Sheets auth configuration. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SHEETS_API_KEY."
    );
  }

  return google.sheets({
    version: "v4",
    auth: SHEETS_API_KEY,
  });
}

export async function appendErrorToSheet(error: ErrorRow): Promise<void> {
  try {
    if (!SHEETS_ID) {
      throw new Error("GOOGLE_SHEETS_ID is not configured");
    }

    const sheets = getSheetsClient();

    const values = [
      [
        error.errorId,
        error.projectName,
        error.errorTitle,
        error.reportedBy,
        error.category || "General",
        error.environment || "Production",
        error.priority || "Medium",
        error.difficultyLevel || "Moderate",
        error.assignedTo || "Unassigned",
        error.description,
        error.timestamp,
        error.status || "open",
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_ID,
      range: "ErrorLog!A:L",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });

    console.log(`✓ Error ${error.errorId} appended to Google Sheets`);
  } catch (error: unknown) {
    const err = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Error appending to Google Sheets:", err.message);
    throw error;
  }
}

export async function appendSolutionToSheet(solution: SolutionRow): Promise<void> {
  try {
    if (!SHEETS_ID) {
      throw new Error("GOOGLE_SHEETS_ID is not configured");
    }

    const sheets = getSheetsClient();

    const values = [
      [
        solution.errorId,
        solution.solutionStatus,
        solution.solutionText || "",
        solution.codeSnippet || "",
        solution.videoUrl || "",
        solution.submittedBy || "Anonymous",
        solution.timestamp,
        solution.attemptCount || 1,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_ID,
      range: "Solutions!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });

    console.log(`✓ Solution for ${solution.errorId} appended to Google Sheets`);
  } catch (error: unknown) {
    const err = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Error appending solution to Google Sheets:", err.message);
    throw error;
  }
}

export async function getErrorsFromSheet(): Promise<ErrorRow[]> {
  try {
    if (!SHEETS_ID) {
      throw new Error("GOOGLE_SHEETS_ID is not configured");
    }

    const sheets = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: "ErrorLog!A2:L1000",
    });

    const rows = response.data.values || [];

    return rows.map((row: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      return {
        errorId: row[0] || "",
        projectName: row[1] || "",
        errorTitle: row[2] || "",
        reportedBy: row[3] || "",
        category: row[4] || "General",
        environment: row[5] || "Production",
        priority: row[6] || "Medium",
        difficultyLevel: row[7] || "Moderate",
        assignedTo: row[8] || "Unassigned",
        description: row[9] || "",
        timestamp: row[10] || "",
        status: row[11] || "open",
      };
    });
  } catch (error: unknown) {
    const err = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Error reading from Google Sheets:", err.message);
    throw error;
  }
}

export async function getSolutionsForError(errorId: string): Promise<SolutionRow[]> {
  try {
    if (!SHEETS_ID) {
      throw new Error("GOOGLE_SHEETS_ID is not configured");
    }

    const sheets = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: "Solutions!A2:H1000",
    });

    const rows = response.data.values || [];

    return rows
      .filter((row: any) => row[0] === errorId) // eslint-disable-line @typescript-eslint/no-explicit-any
      .map((row: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        return {
          errorId: row[0] || "",
          solutionStatus: row[1] || "proposed",
          solutionText: row[2] || "",
          codeSnippet: row[3] || "",
          videoUrl: row[4] || "",
          submittedBy: row[5] || "Anonymous",
          timestamp: row[6] || "",
          attemptCount: row[7] || 1,
        };
      });
  } catch (error: unknown) {
    const err = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Error reading solutions from Google Sheets:", err.message);
    throw error;
  }
}

export async function updateErrorStatusInSheet(
  errorId: string,
  status: string
): Promise<void> {
  try {
    if (!SHEETS_ID) {
      throw new Error("GOOGLE_SHEETS_ID is not configured");
    }

    const sheets = getSheetsClient();

    // Get all errors to find the row number
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: "ErrorLog!A2:A1000",
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row: any) => row[0] === errorId); // eslint-disable-line @typescript-eslint/no-explicit-any

    if (rowIndex === -1) {
      throw new Error(`Error ${errorId} not found`);
    }

    // Update status in column L (12th column, row index + 2)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEETS_ID,
      range: `ErrorLog!L${rowIndex + 2}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[status]],
      },
    });

    console.log(`✓ Error ${errorId} status updated to ${status}`);
  } catch (error: unknown) {
    const err = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Error updating error status in Google Sheets:", err.message);
    throw error;
  }
}
