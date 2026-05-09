import { useState } from "react";

const emptySegment = () => ({ start: "", end: "" });

export default function VideoHub() {
  const [url, setUrl] = useState("");
  const [segments, setSegments] = useState([emptySegment()]);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);

  function updateSegment(i, key, val) {
    setSegments((prev) => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s));
  }

  function addSegment() {
    setSegments((prev) => [...prev, emptySegment()]);
  }

  function removeSegment(i) {
    setSegments((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleTrim() {
    if (!canTrim) return;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/trim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), segments }),
      });

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

  const allFilled = segments.every((s) => s.start.trim() && s.end.trim());
  const canTrim = url.trim() && allFilled && status !== "loading";

  return (
    <div className="video-hub">
      <div className="video-hub-hero">
        <h1 className="video-hub-title">Video Trimmer</h1>
        <p className="video-hub-desc">
          Paste a link and add timestamp ranges to extract and download clips.
        </p>
        <p className="video-hub-sources">
          YouTube · TikTok · Instagram · Facebook · Twitter / X · NBC · ABC · CBS · Fox News · Vimeo · Reddit · and 1,000+ more
        </p>
      </div>

      <div className="video-trim-form">
        <div className="vtf-field">
          <label className="vtf-label">Video URL</label>
          <input
            className="vtf-input"
            type="url"
            placeholder="Paste any video URL…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="vtf-segments">
          <label className="vtf-label">Segments</label>
          {segments.map((seg, i) => (
            <div key={i} className="vtf-segment-row">
              <span className="vtf-seg-num">{i + 1}</span>
              <div className="vtf-times vtf-times--inline">
                <input
                  className="vtf-input vtf-input--time"
                  type="text"
                  placeholder="0:30"
                  value={seg.start}
                  onChange={(e) => updateSegment(i, "start", e.target.value)}
                />
                <span className="vtf-arrow">→</span>
                <input
                  className="vtf-input vtf-input--time"
                  type="text"
                  placeholder="1:00"
                  value={seg.end}
                  onChange={(e) => updateSegment(i, "end", e.target.value)}
                />
              </div>
              {segments.length > 1 && (
                <button className="vtf-remove" onClick={() => removeSegment(i)} title="Remove">
                  ×
                </button>
              )}
            </div>
          ))}
          <button className="vtf-add" onClick={addSegment}>
            + Add segment
          </button>
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
