import { useState } from "react";

const MODES = [
  {
    id: "discover",
    label: "Discover Stories",
    desc: "Find Rossen-style video stories bubbling up now",
  },
  {
    id: "search",
    label: "Search by Headline",
    desc: "Enter a rough story idea to research",
  },
  {
    id: "inspire",
    label: "Rossen Inspiration",
    desc: "Generate ideas from past Rossen episode themes",
  },
];

function SegmentCard({ segment, onBundle }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="seg-card">
      <div className="seg-card-top">
        <div className="seg-theme">{segment.theme}</div>
        <div className="seg-headline">{segment.headline}</div>
      </div>

      <div className="seg-stories">
        {(segment.stories || []).map((s, i) => (
          <div key={i} className="seg-story">
            <div className="seg-story-title">{s.title}</div>
            {s.summary && <div className="seg-story-summary">{s.summary}</div>}
            {s.url && (
              <a className="seg-story-link" href={s.url} target="_blank" rel="noreferrer">
                {s.source || "Source"} ↗
              </a>
            )}
          </div>
        ))}
      </div>

      <button
        className="seg-expand-btn"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? "Hide details ▲" : "Show angles & structure ▼"}
      </button>

      {expanded && (
        <div className="seg-details">
          {segment.angles?.length > 0 && (
            <div className="seg-section">
              <div className="seg-section-label">Segment Angles</div>
              <ol className="seg-list">
                {segment.angles.map((a, i) => <li key={i}>{a}</li>)}
              </ol>
            </div>
          )}

          {segment.whyItWorks?.length > 0 && (
            <div className="seg-section">
              <div className="seg-section-label">Why It Works</div>
              <ul className="seg-list">
                {segment.whyItWorks.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {segment.segmentStructure?.length > 0 && (
            <div className="seg-section">
              <div className="seg-section-label">Suggested 10-Min Structure</div>
              <ol className="seg-list">
                {segment.segmentStructure.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}

      <button
        className="seg-bundle-btn"
        onClick={() => onBundle(segment.theme)}
        title="Find related stories to build a longer segment"
      >
        Bundle Related Stories →
      </button>
    </div>
  );
}

export default function StoryResearch() {
  const [mode, setMode] = useState("discover");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [progress, setProgress] = useState({ message: "", percent: 0 });
  const [segments, setSegments] = useState([]);
  const [error, setError] = useState(null);

  async function runSearch(overrideMode, overrideQuery) {
    const activeMode = overrideMode ?? mode;
    const activeQuery = overrideQuery ?? query;

    if (activeMode === "search" && !activeQuery.trim()) return;

    setStatus("loading");
    setError(null);
    setSegments([]);
    setProgress({ message: "Starting…", percent: 0 });

    try {
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: activeMode, query: activeQuery }),
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6));
          if (event.type === "progress") {
            setProgress({ message: event.message, percent: event.percent });
          } else if (event.type === "done") {
            setSegments(event.segments || []);
            setStatus("done");
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  function handleBundle(theme) {
    setMode("bundle");
    setQuery(theme);
    runSearch("bundle", theme);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="research-panel">

      {/* Mode selector */}
      <div className="research-modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`research-mode-btn${mode === m.id ? " research-mode-btn--active" : ""}`}
            onClick={() => {
              setMode(m.id);
              setSegments([]);
              setStatus("idle");
              setError(null);
            }}
          >
            <span className="rm-label">{m.label}</span>
            <span className="rm-desc">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Search input (search + bundle modes) */}
      {(mode === "search" || mode === "bundle") && (
        <div className="research-input-row">
          <input
            className="research-input"
            type="text"
            placeholder={
              mode === "search"
                ? "Enter a headline or rough story idea…"
                : "Story or theme to bundle…"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          <button
            className="research-go-btn"
            onClick={() => runSearch()}
            disabled={status === "loading" || !query.trim()}
          >
            {status === "loading" ? "Searching…" : "Search →"}
          </button>
        </div>
      )}

      {/* Discover / Inspire run button */}
      {(mode === "discover" || mode === "inspire") && (
        <div className="research-run-row">
          <button
            className="research-go-btn research-go-btn--full"
            onClick={() => runSearch()}
            disabled={status === "loading"}
          >
            {status === "loading"
              ? "Searching…"
              : mode === "discover"
              ? "Find Stories Now →"
              : "Generate Ideas →"}
          </button>
        </div>
      )}

      {/* Loading state */}
      {status === "loading" && (
        <div className="research-loading">
          <div className="research-progress-track">
            <div className="research-progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="research-progress-msg">{progress.message}</p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="research-error">{error}</div>
      )}

      {/* Results */}
      {status === "done" && segments.length === 0 && (
        <div className="research-empty">No segment ideas found. Try a different query or mode.</div>
      )}

      {segments.length > 0 && (
        <div className="seg-grid">
          {segments.map((seg, i) => (
            <SegmentCard key={i} segment={seg} onBundle={handleBundle} />
          ))}
        </div>
      )}

    </div>
  );
}
