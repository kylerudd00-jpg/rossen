import { useEffect, useState } from "react";

const MODES = [
  {
    id: "discover",
    label: "What's Hot Now",
    desc: "Stories breaking right now",
  },
  {
    id: "search",
    label: "Search a Topic",
    desc: "Type any idea to research it",
  },
  {
    id: "inspire",
    label: "Classic Angles",
    desc: "Ideas from past Rossen episodes",
  },
];

function asList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function StoryPacketCard({ packet, index, onBundle, onMakePost }) {
  const [showMore, setShowMore] = useState(false);
  const sources = asList(packet.stories);
  const proofPoints = asList(packet.proofPoints);
  const angles = asList(packet.angles);
  const productionPlan = asList(packet.productionPlan).length > 0
    ? asList(packet.productionPlan)
    : asList(packet.segmentStructure);
  const pitchHeadline = packet.pitchHeadline || packet.headline || packet.theme || "Story Packet";
  const pitch = packet.pitch || sources[0]?.summary || "A Rossen-style consumer story.";
  const hook = packet.hook || sources[0]?.title || "Start with the clearest viewer-facing proof.";
  const viewerTakeaway = packet.viewerTakeaway || angles[2] || "Give viewers one clear action step.";
  const sourceCount = Number(packet.sourceCount || sources.length || 0);

  return (
    <article className="packet-card packet-card--flat">
      {/* Always-visible content */}
      <div className="packet-flat-head">
        <span className="packet-kicker">Story {index + 1}</span>
        <h3 className="packet-flat-title">{pitchHeadline}</h3>
        <p className="packet-flat-pitch">{pitch}</p>

        <div className="packet-flat-hook">
          <span className="packet-flat-label">Cold open</span>
          <span>{hook}</span>
        </div>

        <div className="packet-flat-takeaway">
          <span className="packet-flat-label">Viewer walks away knowing</span>
          <span>{viewerTakeaway}</span>
        </div>

        {sources.length > 0 && (
          <div className="packet-flat-sources">
            {sources.map((s, i) => (
              s.url
                ? <a key={i} href={s.url} target="_blank" rel="noreferrer" className="packet-flat-source-link">{s.source || s.title} ↗</a>
                : <span key={i} className="packet-flat-source-link">{s.title}</span>
            ))}
          </div>
        )}
      </div>

      {/* More details toggle */}
      {(angles.length > 0 || proofPoints.length > 0 || productionPlan.length > 0) && (
        <button
          type="button"
          className="packet-more-toggle"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? "Hide details ↑" : "More details ↓"}
        </button>
      )}

      {showMore && (
        <div className="packet-body">
          {angles.length > 0 && (
            <section className="packet-section">
              <div className="packet-section-label">Story angles</div>
              <ol className="packet-list">
                {angles.map((angle, i) => <li key={i}>{angle}</li>)}
              </ol>
            </section>
          )}

          {proofPoints.length > 0 && (
            <section className="packet-section">
              <div className="packet-section-label">Proof points</div>
              <ul className="packet-list">
                {proofPoints.map((point, i) => <li key={i}>{point}</li>)}
              </ul>
            </section>
          )}

          {productionPlan.length > 0 && (
            <section className="packet-section">
              <div className="packet-section-label">How to film it</div>
              <ol className="packet-list">
                {productionPlan.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            </section>
          )}
        </div>
      )}

      <div className="packet-actions">
        <button
          type="button"
          className="packet-related-btn"
          onClick={() => onBundle(packet.pitchHeadline || packet.theme || packet.headline)}
        >
          Build Related Packet →
        </button>
        {onMakePost && (
          <button
            type="button"
            className="packet-make-post-btn"
            onClick={() => onMakePost(packet)}
          >
            Make Post →
          </button>
        )}
      </div>
    </article>
  );
}

export default function StoryResearch({ onMakePost }) {
  const [mode, setMode] = useState("discover");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState({ message: "", percent: 0 });
  const [packets, setPackets] = useState([]);
  const [error, setError] = useState(null);

  async function runSearch(overrideMode, overrideQuery) {
    const activeMode = overrideMode ?? mode;
    const activeQuery = overrideQuery ?? query;

    if (activeMode === "search" && !activeQuery.trim()) return;

    setStatus("loading");
    setError(null);
    setPackets([]);
    setProgress({ message: "Starting…", percent: 0 });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 70000);

    try {
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ mode: activeMode, query: activeQuery }),
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      if (!res.body) throw new Error("No response stream returned");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      function handleEvent(event) {
        if (event.type === "progress") {
          setProgress({ message: event.message, percent: event.percent });
        } else if (event.type === "done") {
          completed = true;
          setPackets(event.segments || []);
          setStatus("done");
        } else if (event.type === "error") {
          completed = true;
          throw new Error(event.message);
        }
      }

      function processBuffer(flush = false) {
        const events = buffer.split("\n\n");
        buffer = flush ? "" : events.pop();
        for (const rawEvent of events) {
          const dataLines = rawEvent
            .split("\n")
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.slice(6));
          if (dataLines.length === 0) continue;
          handleEvent(JSON.parse(dataLines.join("\n")));
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        processBuffer();
      }

      buffer += decoder.decode();
      processBuffer(true);

      if (!completed) {
        throw new Error("Story packet search ended before results were returned. Try again.");
      }
    } catch (e) {
      setError(e.name === "AbortError" ? "Search timed out. Try again." : e.message);
      setStatus("error");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  // Auto-run discover on first load
  useEffect(() => {
    runSearch("discover", "");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleBundle(theme) {
    setMode("search");
    setQuery(theme);
    runSearch("bundle", theme);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleModeChange(newMode) {
    setMode(newMode);
    setPackets([]);
    setStatus("idle");
    setError(null);
    setQuery("");
    if (newMode === "discover" || newMode === "inspire") {
      runSearch(newMode, "");
    }
  }

  const isLoading = status === "loading";

  return (
    <div className="research-panel">

      {/* Mode selector */}
      <div className="research-modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`research-mode-btn${mode === m.id ? " research-mode-btn--active" : ""}`}
            onClick={() => handleModeChange(m.id)}
            disabled={isLoading}
          >
            <span className="rm-label">{m.label}</span>
            <span className="rm-desc">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Search input */}
      {mode === "search" && (
        <div className="research-input-row">
          <input
            className="research-input"
            type="text"
            placeholder="Enter a headline or rough story idea…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          <button
            className="research-go-btn"
            onClick={() => runSearch()}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? "Searching…" : "Search →"}
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="research-loading">
          <div className="research-progress-track">
            <div className="research-progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="research-progress-msg">{progress.message}</p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="research-error">
          {error}
          <button className="research-retry-btn" onClick={() => runSearch()}>Try again →</button>
        </div>
      )}

      {/* Results header with refresh */}
      {status === "done" && packets.length > 0 && (
        <div className="research-results-header">
          <span>{packets.length} stories found</span>
          <button className="research-refresh-btn" onClick={() => runSearch()} disabled={isLoading}>
            Refresh ↻
          </button>
        </div>
      )}

      {status === "done" && packets.length === 0 && (
        <div className="research-empty">No story packets found. Try a different topic.</div>
      )}

      {packets.length > 0 && (
        <div className="packet-grid">
          {packets.map((packet, i) => (
            <StoryPacketCard key={i} packet={packet} index={i} onBundle={handleBundle} onMakePost={onMakePost} />
          ))}
        </div>
      )}

    </div>
  );
}
