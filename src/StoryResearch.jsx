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

function asList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function StoryPacketCard({ packet, index, onBundle }) {
  const [expanded, setExpanded] = useState(false);
  const sources = asList(packet.stories);
  const proofPoints = asList(packet.proofPoints);
  const sourceQuestions = asList(packet.sourceQuestions);
  const angles = asList(packet.angles);
  const whyItWorks = asList(packet.whyItWorks);
  const productionPlan = asList(packet.productionPlan).length > 0
    ? asList(packet.productionPlan)
    : asList(packet.segmentStructure);
  const pitchHeadline = packet.pitchHeadline || packet.headline || packet.theme || "Story Packet";
  const pitch = packet.pitch || sources[0]?.summary || "A Rossen-style consumer story packet with source material and production angles.";
  const hook = packet.hook || sources[0]?.title || "Start with the clearest viewer-facing proof.";
  const viewerTakeaway = packet.viewerTakeaway || angles[2] || "Give viewers one clear action step.";
  const sourceCount = Number(packet.sourceCount || sources.length || 0);

  return (
    <article className={`packet-card${expanded ? " packet-card--open" : ""}`}>
      <button
        type="button"
        className="packet-summary"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="packet-kicker">Story Packet {index + 1}</span>
        {packet.theme && <span className="packet-theme">{packet.theme}</span>}
        <span className="packet-title">{pitchHeadline}</span>
        <span className="packet-pitch">{pitch}</span>
        <span className="packet-meta">
          <span>{sourceCount} sources</span>
          <span>{packet.headline || "Pitch ready"}</span>
          <span>{expanded ? "Close packet" : "Open packet"}</span>
        </span>
      </button>

      {expanded && (
        <div className="packet-body">
          <div className="packet-frame">
            <div className="packet-frame-item">
              <div className="packet-section-label">Cold Open</div>
              <p>{hook}</p>
            </div>
            <div className="packet-frame-item">
              <div className="packet-section-label">Viewer Takeaway</div>
              <p>{viewerTakeaway}</p>
            </div>
          </div>

          {sources.length > 0 && (
            <section className="packet-section">
              <div className="packet-section-label">Sources</div>
              <div className="packet-sources">
                {sources.map((source, i) => (
                  <div key={`${source.url || source.title || "source"}-${i}`} className="packet-source">
                    <div className="packet-source-title">{source.title}</div>
                    {source.summary && <p>{source.summary}</p>}
                    {source.url && (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.source || "Open source"} ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {proofPoints.length > 0 && (
            <section className="packet-section">
              <div className="packet-section-label">Proof Points</div>
              <ul className="packet-list">
                {proofPoints.map((point, i) => <li key={i}>{point}</li>)}
              </ul>
            </section>
          )}

          {sourceQuestions.length > 0 && (
            <section className="packet-section">
              <div className="packet-section-label">Before Producing</div>
              <ul className="packet-list">
                {sourceQuestions.map((question, i) => <li key={i}>{question}</li>)}
              </ul>
            </section>
          )}

          {whyItWorks.length > 0 && (
            <section className="packet-section">
              <div className="packet-section-label">Why It Works</div>
              <ul className="packet-list">
                {whyItWorks.map((reason, i) => <li key={i}>{reason}</li>)}
              </ul>
            </section>
          )}

          {angles.length > 0 && (
            <section className="packet-section">
              <div className="packet-section-label">Angles</div>
              <ol className="packet-list">
                {angles.map((angle, i) => <li key={i}>{angle}</li>)}
              </ol>
            </section>
          )}

          {productionPlan.length > 0 && (
            <section className="packet-section">
              <div className="packet-section-label">Production Plan</div>
              <ol className="packet-list">
                {productionPlan.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            </section>
          )}
        </div>
      )}

      <button
        type="button"
        className="packet-related-btn"
        onClick={() => onBundle(packet.pitchHeadline || packet.theme || packet.headline)}
      >
        Build Related Packet →
      </button>
    </article>
  );
}

export default function StoryResearch() {
  const [mode, setMode] = useState("discover");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
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
            setPackets(event.segments || []);
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
              setPackets([]);
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
              ? "Generate Story Packets →"
              : "Generate Packet Ideas →"}
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
      {status === "done" && packets.length === 0 && (
        <div className="research-empty">No story packets found. Try a different query or mode.</div>
      )}

      {packets.length > 0 && (
        <div className="packet-grid">
          {packets.map((packet, i) => (
            <StoryPacketCard key={i} packet={packet} index={i} onBundle={handleBundle} />
          ))}
        </div>
      )}

    </div>
  );
}
