# Google Sheets Integration Setup

## Overview
This error logger now integrates with Google Sheets for persistent data storage. Errors and solutions are automatically logged to your Google Sheet.

## Current Configuration

Your Google Sheet ID is already configured:
```
GOOGLE_SHEETS_ID=1STklgwVsBacLVLrnWvd3claNYNQDJUV9jl41bjOBstE
```

## Setting Up Google Sheets API

### Option 1: Using API Key (Read-Only, Recommended for Testing)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Sheets API
4. Create an API Key from Credentials
5. Add to `.env.local`:
   ```
   GOOGLE_SHEETS_API_KEY=your_api_key_here
   ```

### Option 2: Using Service Account (Full CRUD, Recommended for Production)

1. In Google Cloud Console, create a Service Account
2. Download the JSON key file
3. Extract these values:
   - `GOOGLE_CLIENT_EMAIL`: The service account email
   - `GOOGLE_PRIVATE_KEY`: The private key from the JSON (include the `-----BEGIN PRIVATE KEY-----` part)
   - `GOOGLE_PROJECT_ID`: Your project ID

4. Add to `.env.local`:
   ```
   GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_PROJECT_ID=your-project-id
   ```

5. **IMPORTANT**: Share your Google Sheet with the service account email

## Sheet Structure

### Sheet 1: ErrorLog
Columns:
- A: Error ID
- B: Project Name
- C: Error Title
- D: Reported By
- E: Category
- F: Environment
- G: Priority
- H: Difficulty Level
- I: Assigned To
- J: Description
- K: Timestamp
- L: Status

### Sheet 2: Solutions
Columns:
- A: Error ID
- B: Solution Status
- C: Solution Text
- D: Code Snippet
- E: Video URL
- F: Submitted By
- G: Timestamp
- H: Attempt Count

## Features

### ✅ Errors List (`/api/errors`)
- Fetch all logged errors from Google Sheets
- Filter by status, priority, or solutions available
- Click any error to view its solutions

### ✅ Solutions Modal
- View all solutions for a specific error
- See solution status (Proposed/Tried/Working/Verified)
- View code snippets and video links

### ✅ Dynamic Error Tracking
- Every error gets a unique ID (ERR-TIMESTAMP-RANDOM)
- Solutions can be added anytime using the error ID
- Track solution progress from proposal to verified

### ✅ Multi-Channel Logging
- Errors logged to Telegram channel
- Errors stored in Google Sheets
- Solutions tracked with status updates

## Usage

### Reporting an Error
1. Click "🐛 Report Error" tab
2. Fill in error details
3. Optionally expand "Proposed Solution" to add a fix
4. Submit - appears in Google Sheets + Telegram

### Adding a Solution
1. Click "💡 Add Solution" tab
2. Enter the Error ID from the success message
3. Set solution status (Proposed/Tried/Working/Verified)
4. Add solution details (text/code/video)
5. Submit - linked to the error in Google Sheets

### Viewing Errors
1. Click "📋 View Errors" tab
2. View all logged errors with filters
3. Click any error to see all solutions
4. Solutions show status, date, and details

## Troubleshooting

### "Missing API Key"
- Add `GOOGLE_SHEETS_API_KEY` to `.env.local`
- Restart the development server

### "Permission Denied"
- If using Service Account: Share the sheet with the service account email
- Check that the sheet ID is correct

### Sheet Not Updating
- Ensure sheets are named exactly: "ErrorLog" and "Solutions"
- Check API quotas in Google Cloud Console
- Verify the sheets exist and have header rows

## API Endpoints

```
POST /api/error-log
- Log a new error + optional solution
- Returns unique error ID

POST /api/solution
- Add/update solution for existing error
- Uses error ID to link solutions

GET /api/errors
- Fetch all errors from Google Sheets
- Returns array of errors with metadata

GET /api/errors/[id]/solutions
- Fetch all solutions for a specific error
- Returns array of solutions
```

## Testing

Start with the development server:
```bash
npm run dev
```

Then:
1. Report an error in the app
2. Check your Google Sheet - it should appear
3. Check the Telegram channel
4. View the error in the "View Errors" tab
5. Click to see solutions modal
6. Add a solution with the error ID
7. See solution appear linked to the error
