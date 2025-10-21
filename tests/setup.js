import { exec } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";
import { chromium } from "@playwright/test";

const execAsync = promisify(exec);
const BASE_URL = "http://localhost:3000";
const MAX_RETRIES = 30;
const RETRY_DELAY = 1000;

async function waitForServer(url, maxRetries = MAX_RETRIES) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        console.log("✓ Server is ready!");
        return true;
      }
    } catch (error) {
      console.log(`⏳ Waiting for server... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error(
    `Server did not start within ${(MAX_RETRIES * RETRY_DELAY) / 1000} seconds`
  );
}

async function isServerRunning(url) {
  try {
    const response = await fetch(url);
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

async function waitForPageToLoad(url) {
  console.log("🧭 Checking that the page fully loads...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    // Optionally wait for a known element to ensure app rendered
    await page.waitForSelector("body", { timeout: 10000 });
    console.log("✓ Page has loaded successfully!");
  } catch (err) {
    console.error("❌ Page did not load properly:", err);
  } finally {
    await browser.close();
  }
}

async function globalSetup() {
  console.log("🚀 Running global setup...");

  const serverRunning = await isServerRunning(BASE_URL);

  if (!serverRunning) {
    console.log("⚙️  Starting server...");
    const serverProcess = exec("npm run dev", {
      detached: true,
      stdio: "ignore",
    });

    serverProcess.unref();
    if (serverProcess.pid) {
      process.env.SERVER_PID = serverProcess.pid.toString();
    }

    await waitForServer(BASE_URL);
  } else {
    console.log("✓ Server already running");
  }

  await waitForPageToLoad(BASE_URL);
}
export default globalSetup;
