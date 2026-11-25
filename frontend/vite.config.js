import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveYouTubeChannel } from "./server/youtubeResolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerDir = path.resolve(__dirname, "..", "worker");
const workerScript = path.join(workerDir, "worker.py");

const syncState = {
  running: false,
  startedAt: null,
  finishedAt: null,
  lastExitCode: null,
  lastError: null,
  lastLog: [],
};

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 16384) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function attachTubeDigestMiddleware(middlewares) {
  middlewares.use("/api/resolve-channel", async (req, res) => {
    try {
      const reqUrl = new URL(req.url, "http://localhost");
      const input = reqUrl.searchParams.get("input") || "";
      if (!input.trim()) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Missing 'input' query parameter." }));
        return;
      }
      const resolved = await resolveYouTubeChannel(input);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(resolved));
    } catch (err) {
      res.statusCode = 422;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: err?.message || "Failed to resolve YouTube channel.",
        }),
      );
    }
  });

  middlewares.use("/api/sync-status", (req, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        supported: fs.existsSync(workerScript),
        ...syncState,
      }),
    );
  });

  middlewares.use("/api/sync-worker", async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    if (!fs.existsSync(workerScript)) {
      res.statusCode = 501;
      res.end(
        JSON.stringify({
          supported: false,
          error: "Local worker script not found.",
        }),
      );
      return;
    }

    if (syncState.running) {
      res.statusCode = 200;
      res.end(JSON.stringify({ status: "already_running", ...syncState }));
      return;
    }

    const body = await readJsonBody(req);
    const args = ["worker.py"];
    if (body?.channelId && /^UC[\w-]{22}$/.test(body.channelId)) {
      args.push("--channel", body.channelId);
    }
    if (body?.retryFailed) {
      args.push("--retry-failed");
    }

    syncState.running = true;
    syncState.startedAt = new Date().toISOString();
    syncState.finishedAt = null;
    syncState.lastError = null;
    syncState.lastLog = [];

    const pythonBin = process.platform === "win32" ? "python" : "python3";
    const child = spawn(pythonBin, args, {
      cwd: workerDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const pushLines = (buf) => {
      const lines = buf
        .toString("utf8")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      syncState.lastLog = [...syncState.lastLog, ...lines].slice(-40);
    };

    child.stdout.on("data", pushLines);
    child.stderr.on("data", pushLines);
    child.on("error", (err) => {
      syncState.running = false;
      syncState.finishedAt = new Date().toISOString();
      syncState.lastExitCode = 1;
      syncState.lastError = err.message;
    });
    child.on("close", (code) => {
      syncState.running = false;
      syncState.finishedAt = new Date().toISOString();
      syncState.lastExitCode = code;
      if (code !== 0) {
        syncState.lastError =
          syncState.lastLog.slice(-3).join(" | ") ||
          `Worker exited with code ${code}`;
      }
    });

    res.statusCode = 202;
    res.end(JSON.stringify({ status: "started", ...syncState }));
  });
}

function tubeDigestApiPlugin() {
  return {
    name: "tubedigest-local-api",
    configureServer(server) {
      attachTubeDigestMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachTubeDigestMiddleware(server.middlewares);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tubeDigestApiPlugin()],
});
