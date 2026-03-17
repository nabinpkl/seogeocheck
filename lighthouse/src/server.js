import http from "node:http";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { normalizeLighthouseResult } from "./normalize.js";

const PORT = Number(process.env.PORT ?? 3001);
const CHROME_PATH = process.env.CHROME_PATH;

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

async function runAudit(url) {
  const chrome = await launch({
    chromePath: CHROME_PATH,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const runnerResult = await lighthouse(
      url,
      {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      }
    );

    return normalizeLighthouseResult(runnerResult, url);
  } finally {
    await chrome.kill();
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { status: "UP" });
    return;
  }

  if (request.method === "POST" && request.url === "/audit") {
    try {
      const payload = await readJson(request);
      if (typeof payload.url !== "string" || payload.url.trim() === "") {
        sendJson(response, 400, { message: "A target URL is required." });
        return;
      }

      const result = await runAudit(payload.url);
      sendJson(response, 200, result);
      return;
    } catch (error) {
      sendJson(response, 502, {
        message: error instanceof Error ? error.message : "The Lighthouse sidecar could not complete the audit.",
      });
      return;
    }
  }

  sendJson(response, 404, { message: "Not found." });
});

server.listen(PORT, () => {
  // Keep the sidecar logs minimal to avoid drowning the backend logs in Docker.
  console.log(`seogeo lighthouse sidecar listening on ${PORT}`);
});
