/**
 * List available generative models for the configured API key.
 *
 * Usage (PowerShell):
 *  $env:GEMINI_API_KEY = "YOUR_KEY"
 *  node scripts/listModels.js
 */

// Load .env so GEMINI_API_KEY set in Backend/.env is available when running this script
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Please set GEMINI_API_KEY environment variable and try again.');
    process.exit(1);
  }

  // Try SDK first (if the SDK exposes a listModels method)
  try {
    const client = new GoogleGenerativeAI(apiKey);
    if (typeof client.listModels === 'function') {
      console.log('Listing models via SDK...');
      const resp = await client.listModels();
      console.log(JSON.stringify(resp, null, 2));
      return;
    }
  } catch (sdkErr) {
    console.warn('SDK listModels failed (continuing to REST fallback):', sdkErr.message || sdkErr);
  }

  // Fallback: call REST endpoint directly
  try {
    console.log('Listing models via REST fallback...');
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to list models via REST fallback:', err.message || err);
    process.exit(1);
  }
}

listModels().catch((e) => {
  console.error('Unexpected error listing models:', e.message || e);
  process.exit(1);
});
