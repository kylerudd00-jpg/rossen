import { useEffect, useRef, useState } from "react";
import "./App.css";
import StoryResearch from "./StoryResearch.jsx";

const SEARCH_SOURCES = [
  "Brave Search", "Tavily", "Google News", "Hip2Save", "Slickdeals",
  "Clark Howard", "Brand Eating", "Chew Boom", "DealNews", "Eater",
  "The Penny Hoarder", "Good Housekeeping", "Fast Food Post", "Delish",
  "RetailMeNot", "Krazy Coupon Lady", "Today Food", "CPSC.gov",
  "FDA.gov", "FTC.gov", "NBC News Consumer", "AP News", "Brad's Deals",
  "ConsumerReports.org", "People Food", "NerdWallet", "USA Today",
];

function RadarPulse() {
  return (
    <div className="radar-wrap">
      <div className="radar-ring radar-ring--1" />
      <div className="radar-ring radar-ring--2" />
      <div className="radar-ring radar-ring--3" />
      <div className="radar-core" />
    </div>
  );
}

function SearchFeed() {
  const counterRef = useRef(0);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const tick = () => {
      const i = counterRef.current++;
      const source = SEARCH_SOURCES[i % SEARCH_SOURCES.length];
      const count = Math.floor(Math.random() * 26) + 4;
      setRows(prev => [...prev, { id: i, source, count }].slice(-6));
    };
    tick();
    const id = setInterval(tick, 680);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="search-feed">
      {rows.map((row, i) => {
        const active = i === rows.length - 1;
        return (
          <div key={row.id} className={`sfeed-row ${active ? "sfeed-row--active" : "sfeed-row--done"}`}>
            <span className={`sfeed-dot ${active ? "sfeed-dot--active" : "sfeed-dot--done"}`} />
            <span className="sfeed-source">{row.source}</span>
            <span className="sfeed-result">
              {active ? <span className="sfeed-scanning">scanning…</span> : `${row.count} results`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatTimeAgo(date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed: ${url}`));
    img.src = url;
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCrop(crop = {}) {
  return {
    x: clamp(Number(crop.x ?? 0.5), 0, 1),
    y: clamp(Number(crop.y ?? 0.5), 0, 1),
    zoom: clamp(Number(crop.zoom ?? 1), 1, 2.4),
  };
}

function drawCoverImage(ctx, img, w, h, crop = {}) {
  const { x, y, zoom } = normalizeCrop(crop);
  const scale = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const ox = (w - dw) * x;
  const oy = (h - dh) * y;
  ctx.drawImage(img, ox, oy, dw, dh);
}

async function renderPost(post, { width = 1080, height = 1350 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, width, height);

  const [bgResult, logoResult] = await Promise.allSettled([
    post.imageUrl ? loadImage(`/api/proxy?url=${encodeURIComponent(post.imageUrl)}`) : Promise.reject(),
    loadImage("/rossen-reports.png"),
  ]);

  if (bgResult.status === "fulfilled") drawCoverImage(ctx, bgResult.value, width, height, post.crop);

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0,    "rgba(0,0,0,0.04)");
  grad.addColorStop(0.40, "rgba(0,0,0,0.18)");
  grad.addColorStop(0.58, "rgba(0,0,0,0.60)");
  grad.addColorStop(0.72, "rgba(0,0,0,0.88)");
  grad.addColorStop(1,    "rgba(0,0,0,0.97)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const lines = (post.headline || "").split("\n").filter(Boolean).slice(0, 3);
  if (lines.length === 0) return canvas;

  const FONT = "Anton, Impact, Arial Black, sans-serif";
  const maxTextW = width * 0.86;

  // Find the largest font size where every line fits on a single line — no wrapping ever
  let fontSize = Math.round(width * 0.115);
  while (fontSize > 28) {
    ctx.font = `400 ${fontSize}px ${FONT}`;
    if (lines.every((l) => ctx.measureText(l).width <= maxTextW)) break;
    fontSize -= 2;
  }

  const lineH     = Math.round(fontSize * 1.13);
  const bottomPad = Math.round(height * 0.048);
  const totalTextH = lines.length * lineH;

  // ── Logo sizing ──────────────────────────────────────────────────────────────
  const logoImg = logoResult.status === "fulfilled" ? logoResult.value : null;
  const LOGO_H  = Math.round(width * 0.13);
  const LOGO_W  = logoImg
    ? Math.round(LOGO_H * (logoImg.naturalWidth / logoImg.naturalHeight))
    : Math.round(LOGO_H * 1.43);

  // ── Spacing algorithm (bottom-up) ───────────────────────────────────────────
  // Gap between Rossen logo bottom and first text line.
  // Tied to logo height so it scales correctly at any resolution.
  const LOGO_TEXT_GAP = Math.round(LOGO_H * 0.17);

  // 1. Text block anchors to bottom
  const textTop = height - bottomPad - totalTextH;
  // 2. Logo sits directly above text
  const logoY   = textTop - LOGO_TEXT_GAP - LOGO_H;
  const logoX   = (width - LOGO_W) / 2;
  // 3. Divider line runs through the vertical center of the logo
  const dividerY = Math.round(logoY + LOGO_H * 0.5);
  const lineGap  = Math.round(width * 0.026); // gap between logo edge and divider line ends

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.70)";
  ctx.lineWidth   = Math.max(2, width * 0.002);
  const lineL = Math.round(width * 0.065);
  const lineR = Math.round(width * 0.935);
  ctx.beginPath(); ctx.moveTo(lineL, dividerY); ctx.lineTo(logoX - lineGap, dividerY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(logoX + LOGO_W + lineGap, dividerY); ctx.lineTo(lineR, dividerY); ctx.stroke();
  ctx.restore();

  if (logoImg) ctx.drawImage(logoImg, logoX, logoY, LOGO_W, LOGO_H);

  ctx.textAlign    = "center";
  ctx.textBaseline = "top";
  ctx.font         = `400 ${fontSize}px ${FONT}`;

  const cx = width / 2;
  lines.forEach((line, i) => {
    const y = textTop + i * lineH;
    ctx.lineJoin    = "round";
    ctx.lineWidth   = fontSize * 0.07;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(line, cx, y);
    ctx.fillStyle   = "#ffffff";
    ctx.fillText(line, cx, y);
  });

  return canvas;
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({ post }) {
  const [imageIdx, setImageIdx] = useState(0);
  const [cropByImage, setCropByImage] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [rendering, setRendering] = useState(true);
  const renderIdRef = useRef(0);
  const [editableHeadline, setEditableHeadline] = useState(post.headline || "");
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [copied, setCopied] = useState(false);

  const candidates = post.imageCandidates || [];
  const activeImage = candidates[imageIdx] || post.imageUrl || null;
  const activeCrop = normalizeCrop(cropByImage[activeImage] || {});
  const cropX = activeCrop.x;
  const cropY = activeCrop.y;
  const cropZoom = activeCrop.zoom;

  function updateCrop(patch) {
    if (!activeImage) return;
    setCropByImage((prev) => ({
      ...prev,
      [activeImage]: normalizeCrop({ ...activeCrop, ...patch }),
    }));
  }

  function resetCrop() {
    if (!activeImage) return;
    setCropByImage((prev) => ({
      ...prev,
      [activeImage]: normalizeCrop(),
    }));
  }

  useEffect(() => {
    const id = ++renderIdRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRendering(true);
    const dpr = window.devicePixelRatio || 2;
    renderPost({ ...post, imageUrl: activeImage, headline: editableHeadline, crop: { x: cropX, y: cropY, zoom: cropZoom } }, { width: 540 * dpr, height: 675 * dpr })
      .then((canvas) => {
        if (renderIdRef.current !== id) return;
        setPreviewUrl(canvas.toDataURL("image/png"));
        setRendering(false);
      })
      .catch(() => {
        if (renderIdRef.current !== id) return;
        setPreviewUrl(null);
        setRendering(false);
      });
  }, [post, activeImage, editableHeadline, cropX, cropY, cropZoom]);

  async function handleDownload() {
    const canvas = await renderPost({ ...post, imageUrl: activeImage, headline: editableHeadline, crop: activeCrop }, { width: 1080, height: 1350 });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${post.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  async function handleCopy() {
    const canvas = await renderPost(
      { ...post, imageUrl: activeImage, headline: editableHeadline, crop: activeCrop },
      { width: 1080, height: 1350 }
    );
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${post.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    }, "image/png");
  }

  const headlineLines = (editableHeadline || "").split("\n").filter(Boolean);

  return (
    <div className="post-card">
      <div className="post-preview">
        {rendering && <div className="post-preview-loader"><span className="spinner" /></div>}
        {previewUrl && <img src={previewUrl} alt={post.brand} style={{ opacity: rendering ? 0 : 1 }} />}
        {!rendering && !previewUrl && <div className="post-preview-error">Preview unavailable</div>}
        {candidates.length > 0 && (
          <button
            className="photo-cycle-btn"
            onClick={() => setImageIdx((i) => (i + 1) % candidates.length)}
          >
            {imageIdx + 1} / {candidates.length} &nbsp;Next Photo
          </button>
        )}
      </div>
      <div className="post-footer">
        {editingHeadline ? (
          <textarea
            className="headline-editor"
            value={editableHeadline}
            onChange={e => setEditableHeadline(e.target.value)}
            onBlur={() => setEditingHeadline(false)}
            autoFocus
          />
        ) : (
          <div className="post-headline-lines" onClick={() => setEditingHeadline(true)}>
            {headlineLines.map((line, i) => (
              <span key={i} className={i === 0 ? "hl-brand" : "hl-line"}>{line}</span>
            ))}
            <span className="edit-hint">✎ edit</span>
          </div>
        )}
        {activeImage && (
          <div className="crop-tools">
            <div className="crop-row crop-row--head">
              <span>Crop</span>
              <button type="button" className="crop-reset-btn" onClick={resetCrop}>Reset</button>
            </div>
            <label className="crop-row">
              <span>Zoom</span>
              <input
                type="range"
                min="1"
                max="2.4"
                step="0.05"
                value={activeCrop.zoom}
                onChange={(e) => updateCrop({ zoom: Number(e.target.value) })}
              />
            </label>
            <label className="crop-row">
              <span>Left / Right</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={activeCrop.x}
                onChange={(e) => updateCrop({ x: Number(e.target.value) })}
              />
            </label>
            <label className="crop-row">
              <span>Up / Down</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={activeCrop.y}
                onChange={(e) => updateCrop({ y: Number(e.target.value) })}
              />
            </label>
          </div>
        )}
        <div className="post-actions">
          <button className={`btn-copy ${copied ? "btn-copy--copied" : ""}`} onClick={handleCopy}>{copied ? "✓ Copied!" : "Copy"}</button>
          <button className="btn-download" onClick={handleDownload}>↓ Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── StoryCard ────────────────────────────────────────────────────────────────

function StoryCard({ story, selected, onToggle, disabled, onUpdateHeadline }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [headlineOptions, setHeadlineOptions] = useState(null);

  async function handleRegenerate(e) {
    e.preventDefault();
    e.stopPropagation();
    if (regenerating) return;
    setRegenerating(true);
    setHeadlineOptions(null);
    try {
      const r = await fetch("/api/headline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brand: story.brand, title: story.title, summary: story.rawSummary }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.options?.length > 0) {
          setHeadlineOptions(data.options);
          onUpdateHeadline(data.options[0]);
        } else if (data.headline?.includes("\n")) {
          onUpdateHeadline(data.headline);
        }
      }
    } finally {
      setRegenerating(false);
    }
  }

  const headlineLines = (story.headline || "").split("\n").filter(Boolean);

  return (
    <div className={`story-card-wrap ${selected ? "story-card-wrap--selected" : ""} ${disabled ? "story-card-wrap--disabled" : ""}`}>
      <label className="story-card-main">
        <input className="visually-hidden" type="checkbox" checked={selected} onChange={onToggle} disabled={disabled} />
        <div className="story-card-body">
          {headlineLines.length > 0 ? (
            <div className="story-headline-display">
              {headlineLines.map((line, i) => (
                <span key={i} className={`story-headline-line${i === 0 ? " story-headline-brand" : ""}`}>{line}</span>
              ))}
              {story.headlineProvider === "fallback" && (
                <span className="headline-fallback-badge" title="Auto-generated headline (AI unavailable)">~</span>
              )}
            </div>
          ) : (
            <div className="story-title" title={story.title}>{story.title}</div>
          )}
          <div className="story-meta">
            <span>{story.sourceDomain}</span>
            <span className="meta-sep">·</span>
            <span>{story.publishedAt}</span>
          </div>
        </div>
        <div className={`story-check ${selected ? "story-check--on" : ""}`}>
          {selected && <svg viewBox="0 0 12 10" fill="none"><polyline points="1,5 4.5,9 11,1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
      </label>

      <div className="story-card-footer">
        <div className="story-source-title" title={story.title}>{story.title}</div>
        <button className="btn-regenerate" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? <span className="regen-spinner" /> : <><span className="regen-icon">↻</span> Regenerate</>}
        </button>
      </div>

      {headlineOptions && headlineOptions.length > 1 && (
        <div className="headline-options">
          <div className="headline-options-label">Pick a headline:</div>
          {headlineOptions.map((opt, i) => {
            const lines = opt.split("\n").filter(Boolean);
            const active = opt === story.headline;
            return (
              <button
                key={i}
                className={`headline-option-btn ${active ? "headline-option-btn--active" : ""}`}
                onClick={(e) => { e.stopPropagation(); onUpdateHeadline(opt); }}
              >
                {lines.map((line, j) => (
                  <span key={j} className={j === 0 ? "ho-brand" : j === 1 ? "ho-line2" : "ho-line3"}>{line}</span>
                ))}
              </button>
            );
          })}
        </div>
      )}

      {story.sourceUrl && (
        <>
          <button
            className={`story-preview-toggle ${previewOpen ? "story-preview-toggle--open" : ""}`}
            onClick={() => setPreviewOpen((v) => !v)}
            aria-expanded={previewOpen}
            aria-controls={`preview-${story.id}`}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6.5"/>
              <path d="M8 7v4M8 5.5v.5"/>
            </svg>
            Source preview
            <svg aria-hidden="true" className="chevron" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l4 4 4-4"/>
            </svg>
          </button>

          {previewOpen && (
            <div className="story-preview-box" id={`preview-${story.id}`}>
              {story.rawSummary && (
                <p className="preview-summary">{story.rawSummary}</p>
              )}
              <a
                href={story.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="preview-link"
              >
                {story.sourceDomain} ↗
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("app_auth") === "1");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  if (unlocked) return children;

  function attempt(e) {
    e.preventDefault();
    if (input === (import.meta.env.VITE_APP_PASSWORD || "")) {
      sessionStorage.setItem("app_auth", "1");
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
    }
  }

  return (
    <div className="password-gate">
      <form className="password-form" onSubmit={attempt}>
        <div className="password-logo">Rossen Reports</div>
        <input
          className={`password-input${error ? " password-input--error" : ""}`}
          type="password"
          placeholder="Password"
          value={input}
          autoFocus
          onChange={(e) => { setInput(e.target.value); setError(false); }}
        />
        {error && <div className="password-error">Incorrect password</div>}
        <button className="password-btn" type="submit">Enter</button>
      </form>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("instagram");
  const [phase, setPhase] = useState("idle");
  const [stories, setStories] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [fetchProgress, setFetchProgress] = useState({ message: "", percent: 0 });
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0, label: "" });
  const [lastFetched, setLastFetched] = useState(null);

  async function fetchStories({ force = false } = {}) {
    setPhase("loading");
    setError(null);
    setFetchProgress({ message: "Starting…", percent: 0 });
    try {
      const res = await fetch(force ? "/api/stories?force=1" : "/api/stories");
      if (!res.ok) throw new Error(`Stories fetch failed (${res.status})`);
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
            setFetchProgress({ message: event.message, percent: event.percent });
          } else if (event.type === "done") {
            setStories(event.stories);
            setSelected(new Set());
            setLastFetched(new Date());
            setPhase("selecting");
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (e) {
      setError(e.message);
      setPhase("idle");
    }
  }

  function toggleStory(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generatePosts() {
    const picks = stories.filter((s) => selected.has(s.id));
    setPhase("generating");
    setGenProgress({ current: 0, total: picks.length, label: "" });

    const results = [];
    for (let i = 0; i < picks.length; i++) {
      const story = picks[i];
      setGenProgress({ current: i + 1, total: picks.length, label: story.brand });

      let headline = story.headline || "";
      if (!headline || !headline.includes("\n")) {
        try {
          const r = await fetch("/api/headline", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ brand: story.brand, title: story.title, summary: story.rawSummary }),
          });
          if (r.ok) ({ headline } = await r.json());
        } catch { /* will use brand-only fallback below */ }
      }
      if (!headline || !headline.includes("\n")) {
        console.warn(`[generate] No valid headline for "${story.brand}", skipping`);
        setGenProgress({ current: i + 1, total: picks.length, label: story.brand });
        continue;
      }

      let candidates = [];
      try {
        const params = new URLSearchParams({
          q: story.brand,
          headline,
          title: story.title || "",
          summary: story.rawSummary || "",
          imageQuery: story.imageQuery || "",
          sourceUrl: story.sourceUrl || "",
        });
        const res = await fetch(`/api/images?${params}`);
        if (res.ok) candidates = await res.json();
      } catch { /* dark background fallback */ }

      results.push({ id: story.id, brand: story.brand, headline, imageUrl: candidates[0] || null, imageCandidates: candidates });
    }

    setPosts(results);
    setPhase("done");
  }

  function reset() {
    setPhase("idle");
    setStories([]);
    setSelected(new Set());
    setPosts([]);
    setError(null);
  }

  function updateStoryHeadline(id, headline) {
    setStories(prev => prev.map(s => s.id === id ? { ...s, headline } : s));
  }

  function goHome() {
    setError(null);
    setPosts([]);
    setPhase(stories.length > 0 ? "selecting" : "idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => { fetchStories({ force: true }); }, []);

  return (
    <PasswordGate>
    <div className="app">

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-left">
          <button
            type="button"
            className="header-logo-button"
            onClick={goHome}
            disabled={phase === "loading" || phase === "generating"}
            aria-label="Go to home"
          >
            <img src="/rossen-reports.png" alt="Rossen Reports" className="header-logo" />
          </button>
        </div>
        <nav className="header-tabs" aria-label="App sections">
          <button
            className={`header-tab${activeTab === "instagram" ? " header-tab--active" : ""}`}
            onClick={() => setActiveTab("instagram")}
          >
            Instagram Posts
          </button>
          <button
            className={`header-tab${activeTab === "research" ? " header-tab--active" : ""}`}
            onClick={() => setActiveTab("research")}
          >
            Story Research
          </button>
        </nav>
        <div className="header-right">
          {activeTab === "instagram" && lastFetched && (
            <div className="header-status">
              <span className="status-dot" />
              Last refreshed {formatTimeAgo(lastFetched)}
            </div>
          )}
          {activeTab === "instagram" && (phase === "selecting" || phase === "done") && (
            <button
              className="btn-fetch-header"
              onClick={() => fetchStories({ force: true })}
              disabled={phase === "loading" || phase === "generating"}
            >
              <span className="btn-text-full">↺ Find New Stories</span>
              <span className="btn-text-short">↺ Refresh</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Story Research Tab ── */}
      {activeTab === "research" && (
        <main className="app-main app-main--research">
          <StoryResearch />
        </main>
      )}

      {/* ── Instagram Posts Tab ── */}
      <main className="app-main" style={{ display: activeTab === "instagram" ? undefined : "none" }}>

        {/* ── IDLE ── */}
        {phase === "idle" && (
          <div className="phase-idle">
            <div className="idle-hero">
              {error && <div className="error-banner">{error}</div>}
              <h1 className="idle-title">Today's Post Builder</h1>
              <p className="idle-desc">Pulls today's deals, recalls, and consumer news from 40+ sources, picks the ones worth posting, and writes the headlines for you.</p>
              <button className="btn-fetch" onClick={() => fetchStories({ force: true })}>
                Get Today's Stories
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {phase === "loading" && (
          <div className="phase-center" aria-live="polite" aria-atomic="true">
            <RadarPulse />
            <p className="loading-title">Scanning sources…</p>
            <SearchFeed />
            <p className="loading-status">{fetchProgress.message || "Starting…"}</p>
            <div
              className="fetch-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={fetchProgress.percent}
              aria-label="Loading progress"
            >
              <div
                className="fetch-progress-fill"
                style={{ width: `${fetchProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* ── SELECTING ── */}
        {phase === "selecting" && (
          <div className="phase-selecting">
            <div className="selecting-bar">
              <div className="selecting-bar-left">
                <div className="selection-pill">
                  <span className="selection-pill-count">{selected.size}</span>
                  <span className="selection-pill-label">{selected.size === 1 ? "story" : "stories"} selected</span>
                </div>
                <span className="selecting-hint">
                  {selected.size === 0 && "Select any stories to turn into posts"}
                  {selected.size > 0 && `${selected.size} post${selected.size > 1 ? "s" : ""} will be generated`}
                </span>
              </div>
              <div className="selecting-bar-right">
                <button
                  className="btn-generate"
                  onClick={generatePosts}
                  disabled={selected.size === 0}
                >
                  Generate {selected.size > 0 ? `${selected.size} Post${selected.size > 1 ? "s" : ""}` : "Posts"} →
                </button>
              </div>
            </div>

            {(() => {
              const selectable = stories.filter((s) => s.headline?.includes("\n"));
              if (selectable.length === 0) {
                return (
                  <div className="empty-state">
                    <p>No stories found for today. The pipeline may still be warming up, or all results were filtered out.</p>
                    <button className="btn-fetch" onClick={() => fetchStories({ force: true })}>Try again</button>
                  </div>
                );
              }
              return (
                <div className="story-grid">
                  {selectable.map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      selected={selected.has(story.id)}
                      onToggle={() => toggleStory(story.id)}
                      disabled={false}
                      onUpdateHeadline={(h) => updateStoryHeadline(story.id, h)}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── GENERATING ── */}
        {phase === "generating" && (
          <div className="phase-center" aria-live="polite" aria-atomic="true">
            <div className="loading-ring" />
            <p className="loading-title">Building your posts…</p>
            <p className="loading-sub">
              Finding a photo for <strong>{genProgress.label}</strong>
              &nbsp;({genProgress.current} of {genProgress.total})
            </p>
            <div
              className="gen-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((genProgress.current / (genProgress.total || 1)) * 100)}
              aria-label="Generation progress"
            >
              <div
                className="gen-progress-fill"
                style={{ width: `${(genProgress.current / (genProgress.total || 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === "done" && (
          <div className="phase-done">
            <div className="done-bar">
              <div className="done-bar-left">
                <h2 className="done-title">{posts.length} posts ready</h2>
                <span className="done-sub">Use the button on each image to try a different photo. Download the ones you want.</span>
              </div>
              <div className="done-bar-right">
                <button className="btn-ghost" onClick={() => setPhase("selecting")}>← Back</button>
                <button className="btn-generate" onClick={reset}>New Batch</button>
              </div>
            </div>

            {posts.length === 0 ? (
              <div className="empty-state">
                <p>No posts could be generated from the selected stories.</p>
                <button className="btn-ghost" onClick={() => setPhase("selecting")}>← Back</button>
              </div>
            ) : (
              <div className="posts-grid">
                {posts.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
    </PasswordGate>
  );
}
