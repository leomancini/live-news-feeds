import express from "express";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3134;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  next();
});

const resolveCache = new Map();
const RESOLVE_TTL = 20 * 60 * 1000;

async function resolveManifest(videoId) {
  const cached = resolveCache.get(videoId);
  if (cached && cached.expires > Date.now()) return cached.url;

  const { stdout } = await execAsync(
    `yt-dlp -g --format "bestvideo[protocol=m3u8_native]/best[protocol=m3u8_native]" "https://www.youtube.com/watch?v=${videoId}"`,
    { maxBuffer: 4 * 1024 * 1024 }
  );
  const url = stdout.trim().split("\n").pop();
  resolveCache.set(videoId, { url, expires: Date.now() + RESOLVE_TTL });
  return url;
}

function rewritePlaylist(body, baseUrl) {
  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_, u) => {
          const absolute = new URL(u, baseUrl).toString();
          return `URI="/api/proxy?url=${encodeURIComponent(absolute)}"`;
        });
      }
      const absolute = new URL(trimmed, baseUrl).toString();
      return `/api/proxy?url=${encodeURIComponent(absolute)}`;
    })
    .join("\n");
}

app.get("/api/hls/:videoId/playlist.m3u8", async (req, res) => {
  try {
    const manifestUrl = await resolveManifest(req.params.videoId);
    const r = await fetch(manifestUrl);
    const text = await r.text();
    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.send(rewritePlaylist(text, manifestUrl));
  } catch (err) {
    console.error("playlist error:", err.message);
    res.status(500).send(err.message);
  }
});

app.get("/api/proxy", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send("missing url");

    const r = await fetch(url);
    const contentType = r.headers.get("content-type") || "";
    const isPlaylist =
      contentType.includes("mpegurl") || url.split("?")[0].endsWith(".m3u8");

    if (isPlaylist) {
      const text = await r.text();
      res.set("Content-Type", "application/vnd.apple.mpegurl");
      return res.send(rewritePlaylist(text, url));
    }

    res.set("Content-Type", contentType || "application/octet-stream");
    const len = r.headers.get("content-length");
    if (len) res.set("Content-Length", len);
    Readable.fromWeb(r.body).pipe(res);
  } catch (err) {
    console.error("proxy error:", err.message);
    res.status(500).send(err.message);
  }
});

app.use(express.static(join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Live News Feeds on http://localhost:${PORT}`);
});
