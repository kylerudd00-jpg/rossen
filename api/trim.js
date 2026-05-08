import { createRequire } from "module";
import { createReadStream, existsSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import ffmpeg from "fluent-ffmpeg";

const require = createRequire(import.meta.url);
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const ytdl = require("@distube/ytdl-core");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export const config = { maxDuration: 120 };

function toSeconds(ts) {
  if (!ts) return 0;
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(ts) || 0;
}

export default async function handler(req, res) {
  const params = new URL(req.url, "http://localhost").searchParams;
  const videoUrl = params.get("url");
  const start = params.get("start") || "0:00";
  const end = params.get("end");

  if (!videoUrl || !end) {
    return res.status(400).json({ error: "Missing url or end param" });
  }

  const startSec = toSeconds(start);
  const endSec = toSeconds(end);
  const duration = endSec - startSec;

  if (duration <= 0) {
    return res.status(400).json({ error: "End time must be after start time" });
  }

  let info;
  try {
    info = await ytdl.getInfo(videoUrl);
  } catch (e) {
    return res.status(400).json({ error: `Could not fetch video: ${e.message}` });
  }

  // Best combined (audio+video) format — progressive MP4 that ffmpeg can seek
  const format = ytdl.chooseFormat(info.formats, {
    quality: "highestvideo",
    filter: "audioandvideo",
  });

  if (!format) {
    return res.status(400).json({ error: "No suitable video format found" });
  }

  const title = (info.videoDetails.title || "clip")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .slice(0, 60);

  const startLabel = start.replace(/:/g, "-");
  const endLabel = end.replace(/:/g, "-");
  const filename = `${title}_${startLabel}_${endLabel}.mp4`;
  const tmpPath = join(tmpdir(), `trim-${Date.now()}.mp4`);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(format.url)
        .seekInput(startSec)
        .duration(duration)
        .outputOptions(["-c copy", "-avoid_negative_ts 1"])
        .on("error", reject)
        .on("end", resolve)
        .save(tmpPath);
    });

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const stream = createReadStream(tmpPath);
    stream.pipe(res);
    stream.on("end", () => { try { unlinkSync(tmpPath); } catch {} });
    stream.on("error", () => { try { unlinkSync(tmpPath); } catch {} });
  } catch (e) {
    try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch {}
    res.status(500).json({ error: `Trim failed: ${e.message}` });
  }
}
