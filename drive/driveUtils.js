import { google } from "googleapis";

export function getDriveClient(
  accessToken,
  clientId,
  clientSecret,
  redirectUri
) {
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function getStartPageToken(drive) {
  try {
    const response = await drive.changes.getStartPageToken({
      supportsAllDrives: true,
    });
    return response.data.startPageToken;
  } catch (error) {
    console.error("Error getting start page token:", error.message);
    throw error;
  }
}

export async function listChanges(drive, pageToken) {
  try {
    const response = await drive.changes.list({
      pageToken,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      fields: "*",
    });
    return {
      changes: response.data.changes || [],
      newStartPageToken: response.data.newStartPageToken,
    };
  } catch (error) {
    console.error("Error listing changes:", error.message);
    throw error;
  }
}
