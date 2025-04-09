import express from "express";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import {
  getDriveClient,
  getStartPageToken,
  listChanges,
} from "./drive/driveUtils.js";

dotenv.config();

const { ACCESS_TOKEN, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, NGROK_WEBHOOK } =
  process.env;

const app = express();
app.use(bodyParser.json());

const drive = getDriveClient(
  ACCESS_TOKEN,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
let startPageToken = "";

app.use((req, res, next) => {
  console.log(`\n🔵 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.post("/", async (req, res) => {
  try {
    const resourceState = req.headers["x-goog-resource-state"];
    const channelId = req.headers["x-goog-channel-id"];
    const resourceId = req.headers["x-goog-resource-id"];

    console.log(
      `📨 Notification - Channel ID: ${channelId}, Resource ID: ${resourceId}, State: ${resourceState}`
    );

    if (resourceState === "sync") {
      console.log("🔁 Sync notification received, no file change.");
      return res.status(200).end();
    }

    const changes = await listChanges(drive, startPageToken);

    console.log("🔄 Detected Changes:");
    changes.changes.forEach((change, index) => {
      const file = change.file;
      if (file) {
        console.log(
          `📄 [${index + 1}] File Name: ${file.name}, ID: ${file.id}, Type: ${
            file.mimeType
          }`
        );
      }
    });

    if (changes.newStartPageToken) {
      startPageToken = changes.newStartPageToken;
      console.log("📌 Updated startPageToken:", startPageToken);
    }

    res.status(200).send("Notification processed.");
  } catch (error) {
    console.error("❌ Error handling notification:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3000, async () => {
  console.log("✅ Server running at http://localhost:3000/");
  console.log("📌 Waiting for Google Drive notifications...");

  try {
    startPageToken = await getStartPageToken(drive);
    console.log("📌 Initial Start Page Token:", startPageToken);

    const channelId = uuidv4();
    const watchRes = await drive.changes.watch({
      pageToken: startPageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: NGROK_WEBHOOK,
      },
    });

    console.log(
      "🔔 Webhook registered. Resource ID:",
      watchRes.data.resourceId
    );
    console.log(
      "🔔 Channel expiration:",
      new Date(parseInt(watchRes.data.expiration)).toLocaleString()
    );
  } catch (err) {
    console.error("❌ Failed to set up watch:", err.message);
  }
});