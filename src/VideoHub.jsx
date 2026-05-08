import { useState } from "react";

export default function VideoHub() {
  const [url, setUrl] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);

  async function handleTrim() {
    if (!url.trim() || !start.trim() || !end.trim()) return;
    setStatus("loading");
    setError(null);

    try {
      const params = new URLSearchParams({
        url: url.trim(),
        start: start.trim(),
        end: end.trim(),
      });
      const res = await fetch(`/api/trim?${params}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "clip.mp4";
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(objUrl), 2000);

      setStatus("done");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  const canTrim = url.trim() && start.trim() && end.trim() && status !== "loading";

  return (
    <div className="video-hub">
      <div className="video-hub-hero">
        <h1 className="video-hub-title">Video Trimmer</h1>
        <p className="video-hub-desc">
          Paste a YouTube link, set the timestamps, download the clip.
        </p>
      </div>

      <div className="video-trim-form">
        <div className="vtf-field">
          <label className="vtf-label">YouTube URL</label>
          <input
            className="vtf-input"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canTrim && handleTrim()}
          />
        </div>

        <div className="vtf-times">
          <div className="vtf-field">
            <label className="vtf-label">Start</label>
            <input
              className="vtf-input vtf-input--time"
              type="text"
              placeholder="0:30"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <span className="vtf-arrow">→</span>
          <div className="vtf-field">
            <label className="vtf-label">End</label>
            <input
              className="vtf-input vtf-input--time"
              type="text"
              placeholder="1:15"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>

        <button className="btn-trim" onClick={handleTrim} disabled={!canTrim}>
          {status === "loading" ? (
            <><span className="spinner" /> Trimming…</>
          ) : (
            "Trim & Download →"
          )}
        </button>

        {status === "done" && (
          <div className="vtf-success">✓ Download started</div>
        )}

        {status === "error" && (
          <div className="vtf-error">
            {error}
            <button className="vtf-retry" onClick={() => setStatus("idle")}>Try again →</button>
          </div>
        )}
      </div>
    </div>
  );
}
