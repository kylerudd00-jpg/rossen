import { useEffect, useRef, useState } from "react";
import "./App.css";

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

function drawCoverImage(ctx, img, w, h) {
  const srcRatio = img.width / img.height;
  const dstRatio = w / h;
  let dw = w, dh = h, ox = 0, oy = 0;
  if (srcRatio > dstRatio) {
    dh = h; dw = h * srcRatio; ox = (w - dw) / 2;
  } else {
    dw = w; dh = w / srcRatio; oy = (h - dh) / 2;
  }
  ctx.drawImage(img, ox, oy, dw, dh);
}

function wrapText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(" ");
  const out = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      out.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) out.push(current);
  return out.length ? out : [text];
}

async function renderPost(post, { width = 1080, height = 1350 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, width, height);

  const [bgResult, logoResult] = await Promise.allSettled([
    post.imageUrl ? loadImage(`/api/proxy?url=${encodeURIComponent(post.imageUrl)}`) : Promise.reject(),
    loadImage("/rossen-reports.png"),
  ]);

  if (bgResult.status === "fulfilled") drawCoverImage(ctx, bgResult.value, width, height);

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0,    "rgba(0,0,0,0.04)");
  grad.addColorStop(0.40, "rgba(0,0,0,0.18)");
  grad.addColorStop(0.58, "rgba(0,0,0,0.60)");
  grad.addColorStop(0.72, "rgba(0,0,0,0.88)");
  grad.addColorStop(1,    "rgba(0,0,0,0.97)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const rawLines = (post.headline || "").split("\n").filter(Boolean);
  if (rawLines.length === 0) return canvas;

  const FONT = "Anton, Impact, Arial Black, sans-serif";
  const maxTextW = width - Math.round(width * 0.11);

  let brandSize = Math.round(width * 0.065);
  ctx.font = `400 ${brandSize}px ${FONT}`;
  while (brandSize > 36 && ctx.measureText(rawLines[0]).width > maxTextW) {
    brandSize -= 2;
    ctx.font = `400 ${brandSize}px ${FONT}`;
  }

  let dealSize = Math.round(width * 0.085);
  const rawDealLines = rawLines.slice(1);
  if (rawDealLines.length > 0) {
    while (dealSize > 40) {
      ctx.font = `400 ${dealSize}px ${FONT}`;
      const allWrapped = rawDealLines.flatMap((l) => wrapText(ctx, l, maxTextW));
      if (allWrapped.every((l) => ctx.measureText(l).width <= maxTextW)) break;
      dealSize -= 3;
    }
  }
  ctx.font = `400 ${dealSize}px ${FONT}`;
  const dealLines = rawDealLines.flatMap((l) => wrapText(ctx, l, maxTextW));

  const brandLineH = brandSize * 1.1;
  const dealLineH  = dealSize  * 1.08;
  const bottomPad  = Math.round(height * 0.048);
  const totalTextH = brandLineH + dealLines.length * dealLineH;
  const textTop    = height - bottomPad - totalTextH;

  const dividerPad = Math.round(height * 0.042);
  const dividerY   = textTop - dividerPad;

  const logoImg  = logoResult.status === "fulfilled" ? logoResult.value : null;
  const LOGO_H   = Math.round(width * 0.088);
  const LOGO_W   = logoImg
    ? Math.round(LOGO_H * (logoImg.naturalWidth / logoImg.naturalHeight))
    : Math.round(LOGO_H * 1.43);
  const logoX    = (width - LOGO_W) / 2;
  const logoY    = dividerY - LOGO_H * 0.5;
  const lineGap  = Math.round(width * 0.022);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth   = Math.max(2, width * 0.0022);
  ctx.beginPath(); ctx.moveTo(Math.round(width * 0.065), dividerY); ctx.lineTo(logoX - lineGap, dividerY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(logoX + LOGO_W + lineGap, dividerY); ctx.lineTo(Math.round(width * 0.935), dividerY); ctx.stroke();
  ctx.restore();

  if (logoImg) ctx.drawImage(logoImg, logoX, logoY, LOGO_W, LOGO_H);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  function drawLine(text, x, y, size) {
    ctx.font        = `400 ${size}px ${FONT}`;
    ctx.lineJoin    = "round";
    ctx.lineWidth   = size * 0.075;
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.strokeText(text, x, y);
    ctx.fillStyle   = "#ffffff";
    ctx.fillText(text, x, y);
  }

  const cx = width / 2;
  drawLine(rawLines[0], cx, textTop, brandSize);
  dealLines.forEach((line, i) => drawLine(line, cx, textTop + brandLineH + i * dealLineH, dealSize));

  return canvas;
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({ post }) {
  const [imageIdx, setImageIdx] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [rendering, setRendering] = useState(true);
  const cancelRef = useRef(false);

  const candidates = post.imageCandidates || [];
  const activeImage = candidates[imageIdx] || post.imageUrl || null;

  useEffect(() => {
    cancelRef.current = false;
    setRendering(true);
    renderPost({ ...post, imageUrl: activeImage }, { width: 540, height: 675 }).then((canvas) => {
      if (!cancelRef.current) {
        setPreviewUrl(canvas.toDataURL("image/jpeg", 0.88));
        setRendering(false);
      }
    });
    return () => { cancelRef.current = true; };
  }, [post, activeImage]);

  async function handleDownload() {
    const canvas = await renderPost({ ...post, imageUrl: activeImage }, { width: 1080, height: 1350 });
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

  const headlineLines = (post.headline || "").split("\n").filter(Boolean);

  return (
    <div className="post-card">
      <div className="post-preview">
        {rendering && <div className="post-preview-loader"><span className="spinner" /></div>}
        {previewUrl && <img src={previewUrl} alt={post.brand} style={{ opacity: rendering ? 0 : 1 }} />}
        {candidates.length > 1 && (
          <button
            className="photo-cycle-btn"
            onClick={() => setImageIdx((i) => (i + 1) % candidates.length)}
          >
            {imageIdx + 1} / {candidates.length}  Next Photo
          </button>
        )}
      </div>
      <div className="post-footer">
        <div className="post-headline-lines">
          {headlineLines.map((line, i) => (
            <span key={i} className={i === 0 ? "hl-brand" : "hl-line"}>{line}</span>
          ))}
        </div>
        <button className="btn-download" onClick={handleDownload}>↓ Download</button>
      </div>
    </div>
  );
}

// ─── StoryCard ────────────────────────────────────────────────────────────────

function StoryCard({ story, selected, onToggle, disabled }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className={`story-card-wrap ${selected ? "story-card-wrap--selected" : ""} ${disabled ? "story-card-wrap--disabled" : ""}`}>
      <label className="story-card-main">
        <input type="checkbox" checked={selected} onChange={onToggle} disabled={disabled} />
        <div className="story-card-body">
          <div className="story-brand">{story.brand}</div>
          <div className="story-title">{story.title}</div>
          <div className="story-meta">
            <span>{story.sourceDomain}</span>
            <span>{story.publishedAt}</span>
          </div>
        </div>
        <div className={`story-check ${selected ? "story-check--on" : ""}`}>
          {selected && <svg viewBox="0 0 12 10" fill="none"><polyline points="1,5 4.5,9 11,1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
      </label>

      {story.sourceUrl && (
        <>
          <button
            className={`story-preview-toggle ${previewOpen ? "story-preview-toggle--open" : ""}`}
            onClick={() => setPreviewOpen((v) => !v)}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6.5"/>
              <path d="M8 7v4M8 5.5v.5"/>
            </svg>
            Source preview
            <svg className="chevron" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l4 4 4-4"/>
            </svg>
          </button>

          {previewOpen && (
            <div className="story-preview-box">
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

export default function App() {
  const [phase, setPhase] = useState("idle");
  const [stories, setStories] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0, label: "" });
  const [lastFetched, setLastFetched] = useState(null);

  async function fetchStories() {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/stories");
      if (!res.ok) throw new Error(`Stories fetch failed (${res.status})`);
      const data = await res.json();
      setStories(data);
      setSelected(new Set());
      setLastFetched(new Date());
      setPhase("selecting");
    } catch (e) {
      setError(e.message);
      setPhase("idle");
    }
  }

  function toggleStory(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else if (next.size < 5) { next.add(id); }
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

      const headline = story.headline || story.title.toUpperCase();

      let candidates = [];
      try {
        const params = new URLSearchParams({ q: story.brand, headline });
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

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-left">
          <img src="/rossen-reports.png" alt="Rossen Reports" className="header-logo" />
        </div>
        <div className="header-right">
          {lastFetched && (
            <div className="header-status">
              <span className="status-dot" />
              Last refreshed {formatTimeAgo(lastFetched)}
            </div>
          )}
          {(phase === "selecting" || phase === "done") && (
            <button
              className="btn-fetch-header"
              onClick={fetchStories}
              disabled={phase === "loading" || phase === "generating"}
            >
              ↺ Fetch Today's Stories
            </button>
          )}
        </div>
      </header>

      <main className="app-main">

        {/* ── IDLE ── */}
        {phase === "idle" && (
          <div className="phase-idle">
            {error && <div className="error-banner">{error}</div>}
            <div className="idle-hero">
              <div className="idle-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <h1 className="idle-title">Daily Post Builder</h1>
              <p className="idle-desc">Scans 40+ sources, filters for your audience, and writes ready-to-post headlines.</p>
              <button className="btn-fetch" onClick={fetchStories}>
                Fetch Today's Stories
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {phase === "loading" && (
          <div className="phase-center">
            <div className="loading-ring" />
            <p className="loading-title">Scanning sources…</p>
            <p className="loading-sub">Checking 40+ feeds and filtering for your audience. Takes about 30 seconds.</p>
          </div>
        )}

        {/* ── SELECTING ── */}
        {phase === "selecting" && (
          <div className="phase-selecting">
            <div className="selecting-bar">
              <div className="selecting-bar-left">
                <div className="selection-pill">
                  <span className="selection-pill-count">{selected.size}</span>
                  <span className="selection-pill-label">/ 5 selected</span>
                </div>
                <span className="selecting-hint">
                  {selected.size === 0 && "Pick up to 5 stories to post today"}
                  {selected.size > 0 && selected.size < 5 && `${5 - selected.size} more to go`}
                  {selected.size === 5 && "Ready to generate!"}
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

            <div className="story-grid">
              {stories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  selected={selected.has(story.id)}
                  onToggle={() => toggleStory(story.id)}
                  disabled={!selected.has(story.id) && selected.size >= 5}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── GENERATING ── */}
        {phase === "generating" && (
          <div className="phase-center">
            <div className="loading-ring" />
            <p className="loading-title">Building posts…</p>
            <p className="loading-sub">
              Finding the best photo for <strong>{genProgress.label}</strong>
              &nbsp;({genProgress.current} of {genProgress.total})
            </p>
            <div className="gen-progress-track">
              <div
                className="gen-progress-fill"
                style={{ width: `${(genProgress.current / genProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === "done" && (
          <div className="phase-done">
            <div className="done-bar">
              <div className="done-bar-left">
                <h2 className="done-title">{posts.length} Posts Ready</h2>
                <span className="done-sub">Click any image to cycle photos. Download when happy.</span>
              </div>
              <div className="done-bar-right">
                <button className="btn-ghost" onClick={() => setPhase("selecting")}>← Back</button>
                <button className="btn-generate" onClick={reset}>New Batch</button>
              </div>
            </div>

            <div className="posts-grid">
              {posts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
