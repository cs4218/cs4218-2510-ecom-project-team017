import { exec } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";

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

async function globalSetup() {
  console.log("🚀 Running global setup...");

  const serverRunning = await isServerRunning(BASE_URL);

  if (serverRunning) {
    console.log("✓ Server is already running");
    return;
  }

  console.log("⚙️  Starting server...");

  // Start your server - adjust the command based on your package.json
  // For Next.js: 'npm run dev' or 'npm start'
  // For React: 'npm start'
  // For Express: 'npm run server' or similar
  const serverProcess = exec("npm run dev", {
    detached: true,
    stdio: "ignore",
  });

  serverProcess.unref();

  // Save process ID for cleanup if needed
  if (serverProcess.pid) {
    process.env.SERVER_PID = serverProcess.pid.toString();
  }

  // Wait for server to be ready
  await waitForServer(BASE_URL);
}

export default globalSetup;
