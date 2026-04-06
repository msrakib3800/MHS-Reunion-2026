import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Google Sheets API Setup
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // API Route to sync registration data to Google Sheets
  app.post("/api/sync-to-sheet", async (req, res) => {
    const { registration } = req.body;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error("Google Sheets credentials or Spreadsheet ID missing.");
      return res.status(500).json({ error: "Google Sheets configuration missing." });
    }

    try {
      // 1. Check if headers exist by reading the first row
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Sheet1!A1:Q1",
      });

      const headers = [
        "Serial",
        "Registration ID",
        "Name",
        "Father's Name",
        "Address",
        "Gender",
        "SSC Batch",
        "Email",
        "Phone",
        "Facebook Link",
        "Blood Group",
        "Occupation",
        "Guests",
        "T-shirt Size",
        "Fee (BDT)",
        "Status",
        "Registration Date",
        "Photo URL",
      ];

      if (!response.data.values || response.data.values.length === 0) {
        // Add headers if sheet is empty
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: "Sheet1!A1",
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [headers],
          },
        });
      }

      // 2. Get current row count to determine Serial Number
      const sheetData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Sheet1!A:A",
      });
      
      const serialNumber = (sheetData.data.values ? sheetData.data.values.length : 1);

      // 3. Prepare values to append
      const values = [
        [
          serialNumber,
          registration.id,
          registration.name,
          registration.fatherName || "",
          registration.address || "",
          registration.gender || "",
          registration.sscBatch,
          registration.email,
          registration.phone,
          registration.facebookLink || "",
          registration.bloodGroup || "",
          registration.occupation || "",
          registration.guests || 0,
          registration.tshirtSize || "",
          registration.fee,
          registration.status,
          registration.createdAt,
          registration.photoUrl || "",
        ],
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A:R",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values,
        },
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error syncing to Google Sheets:", error);
      res.status(500).json({ error: "Failed to sync to Google Sheets." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
