#!/usr/bin/env node
// One-time script to get a Google Calendar OAuth2 refresh token.
//
// Setup:
//   1. In GCP Console → APIs & Services → Credentials → your OAuth client,
//      add http://localhost:9876/callback as an authorized redirect URI.
//   2. Enable the Google Calendar API for your project.
//   3. Run: node scripts/google_auth.js
//   4. Copy the printed GOOGLE_REFRESH_TOKEN into your .env.
//
// Requires GCP_CLIENT_ID and GCP_CLIENT_SECRET in the environment or .env.

const fs = require('fs');
const http = require('http');
const url = require('url');
const path = require('path');

// Simple .env loader (no dotenv dependency needed)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const { google } = require('googleapis');

const REDIRECT_URI = 'http://localhost:9876/callback';

const oauth2Client = new google.auth.OAuth2(
  process.env.GCP_CLIENT_ID,
  process.env.GCP_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar'],
  prompt: 'consent',
});

console.log('\nOpen this URL in your browser:\n');
console.log(authUrl);
console.log('\nWaiting for callback on http://localhost:9876/callback ...\n');

const server = http.createServer(async (req, res) => {
  const { query } = url.parse(req.url, true);
  if (!query.code) {
    res.end('No code found.');
    return;
  }
  try {
    const { tokens } = await oauth2Client.getToken(query.code);
    res.end('<h1>Done! You can close this tab.</h1>');
    console.log('\nAdd this to your .env:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log();
  } catch (err) {
    res.end(`Error: ${err.message}`);
    console.error('Token exchange failed:', err.message);
  } finally {
    server.close();
  }
});

server.listen(9876);
