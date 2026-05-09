import { createRequire } from "module";
import { execFile } from "child_process";
import { createReadStream, existsSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import ffmpeg from "fluent-ffmpeg";

const require = createRequire(import.meta.url);
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export const config = { maxDuration: 300 };

function toSeconds(ts) {
  if (!ts) return 0;
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(ts) || 0;
}

// Use yt-dlp to resolve a direct stream URL + title for any supported platform
function getVideoInfo(videoUrl) {
  return new Promise((resolve, reject) => {
    execFile(
      "yt-dlp",
      [
        "-j",
        "--no-playlist",
        "--format", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[vcodec!=none]/best",
        "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        videoUrl,
      ],
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr.split("\n").find(Boolean) || err.message));
        try {
          const info = JSON.parse(stdout);
          const title = info.title || "clip";
          // For merged formats (bestvideo+bestaudio), yt-dlp puts each stream in requested_formats
          if (info.requested_formats && info.requested_formats.length >= 2) {
            const video = info.requested_formats.find((f) => f.vcodec && f.vcodec !== "none");
            const audio = info.requested_formats.find((f) => f.acodec && f.acodec !== "none" && (!f.vcodec || f.vcodec === "none"));
            resolve({ streamUrl: video?.url || info.url, audioUrl: audio?.url || null, title });
          } else {
            resolve({ streamUrl: info.url, audioUrl: null, title });
          }
        } catch {
          reject(new Error("Failed to parse yt-dlp output"));
        }
      }
    );
  });
}

// HLS streams (news sites, m3u8) need protocol_whitelist so ffmpeg can follow https/crypto segments
const HLS_INPUT_OPTS = ["-protocol_whitelist", "file,http,https,tcp,tls,crypto"];

function trimSegment(sourceUrl, startSec, duration, outPath, audioUrl = null) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(sourceUrl).inputOptions(HLS_INPUT_OPTS).seekInput(startSec).duration(duration);
    if (audioUrl) {
      cmd.input(audioUrl).inputOptions(HLS_INPUT_OPTS).seekInput(startSec).duration(duration);
      cmd.outputOptions(["-map 0:v:0", "-map 1:a:0", "-c:v libx264", "-preset fast", "-c:a aac", "-avoid_negative_ts 1"]);
    } else {
      cmd.outputOptions(["-c:v libx264", "-preset fast", "-c:a aac", "-avoid_negative_ts 1"]);
    }
    cmd.on("error", reject).on("end", resolve).save(outPath);
  });
}

function concatSegments(segPaths, outPath) {
  const listPath = outPath + ".txt";
  writeFileSync(listPath, segPaths.map((p) => `file '${p}'`).join("\n"));
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c copy"])
      .on("error", (err) => { try { unlinkSync(listPath); } catch {} reject(err); })
      .on("end", () => { try { unlinkSync(listPath); } catch {} resolve(); })
      .save(outPath);
  });
}

function cleanup(...paths) {
  for (const p of paths) {
    try { if (existsSync(p)) unlinkSync(p); } catch {}
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST required" });

  const { url: videoUrl, segments } = req.body || {};

  if (!videoUrl || !Array.isArray(segments) || segments.length === 0) {
    return res.status(400).json({ error: "Missing url or segments" });
  }

  for (const seg of segments) {
    if (toSeconds(seg.end) <= toSeconds(seg.start)) {
      return res.status(400).json({ error: `Segment ${seg.start}–${seg.end}: end must be after start` });
    }
  }

  let streamUrl, audioUrl, title;
  try {
    ({ streamUrl, audioUrl, title } = await getVideoInfo(videoUrl));
  } catch (e) {
    return res.status(400).json({ error: `Could not fetch video: ${e.message}` });
  }

  const safeTitle = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60);
  const stamp = Date.now();
  const segPaths = segments.map((_, i) => join(tmpdir(), `trim-${stamp}-seg${i}.mp4`));
  const finalPath = join(tmpdir(), `trim-${stamp}-final.mp4`);

  try {
    for (let i = 0; i < segments.length; i++) {
      const startSec = toSeconds(segments[i].start);
      const endSec = toSeconds(segments[i].end);
      await trimSegment(streamUrl, startSec, endSec - startSec, segPaths[i], audioUrl);
    }

    if (segments.length === 1) {
      const s = segments[0];
      const filename = `${safeTitle}_${s.start.replace(/:/g, "-")}_${s.end.replace(/:/g, "-")}.mp4`;
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      const stream = createReadStream(segPaths[0]);
      stream.pipe(res);
      stream.on("end", () => cleanup(...segPaths));
      stream.on("error", () => cleanup(...segPaths));
      return;
    }

    await concatSegments(segPaths, finalPath);
    cleanup(...segPaths);

    const filename = `${safeTitle}_${segments.length}clips.mp4`;
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    const stream = createReadStream(finalPath);
    stream.pipe(res);
    stream.on("end", () => cleanup(finalPath));
    stream.on("error", () => cleanup(finalPath));
  } catch (e) {
    cleanup(...segPaths, finalPath);
    res.status(500).json({ error: `Trim failed: ${e.message}` });
  }
}
