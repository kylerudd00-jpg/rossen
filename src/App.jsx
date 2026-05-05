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

  if (bgResult.status === "fulfilled") drawCoverImage(ctx, bgResult.value, width, height);

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
  const textTop    = height - bottomPad - totalTextH;

  // Divider + logo — build layout bottom-up so nothing overlaps
  const logoImg = logoResult.status === "fulfilled" ? logoResult.value : null;
  const LOGO_H  = Math.round(width * 0.13);
  const LOGO_W  = logoImg
    ? Math.round(LOGO_H * (logoImg.naturalWidth / logoImg.naturalHeight))
    : Math.round(LOGO_H * 1.43);

  // Logo sits just above the text with a small breathing gap
  const belowLogoGap = Math.round(width * 0.022);
  const logoY   = textTop - belowLogoGap - LOGO_H;
  const logoX   = (width - LOGO_W) / 2;
  const dividerY = Math.round(logoY + LOGO_H * 0.5); // line through center of logo
  const lineGap = Math.round(width * 0.026);

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
  const [previewUrl, setPreviewUrl] = useState(null);
  const [rendering, setRendering] = useState(true);
  const renderIdRef = useRef(0);
  const [editableHeadline, setEditableHeadline] = useState(post.headline || "");
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [copied, setCopied] = useState(false);

  const candidates = post.imageCandidates || [];
  const activeImage = candidates[imageIdx] || post.imageUrl || null;

  useEffect(() => {
    const id = ++renderIdRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRendering(true);
    const dpr = window.devicePixelRatio || 2;
    renderPost({ ...post, imageUrl: activeImage, headline: editableHeadline }, { width: 540 * dpr, height: 675 * dpr })
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
  }, [post, activeImage, editableHeadline]);

  async function handleDownload() {
    const canvas = await renderPost({ ...post, imageUrl: activeImage, headline: editableHeadline }, { width: 1080, height: 1350 });
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
      { ...post, imageUrl: activeImage, headline: editableHeadline },
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
  const [thumbnail, setThumbnail] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerate(e) {
    e.preventDefault();
    e.stopPropagation();
    if (regenerating) return;
    setRegenerating(true);
    try {
      const r = await fetch("/api/headline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brand: story.brand, title: story.title, summary: story.rawSummary }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.headline?.includes("\n")) onUpdateHeadline(data.headline);
      }
    } finally {
      setRegenerating(false);
    }
  }

  useEffect(() => {
    // Use search generator so "MCDONALD'S" finds "McDonald's", etc.
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: story.brand,
      gsrlimit: "1",
      prop: "pageimages",
      pithumbsize: "200",
      format: "json",
      origin: "*",
    });
    fetch(`https://en.wikipedia.org/w/api.php?${params}`)
      .then(r => r.json())
      .then(data => {
        const src = Object.values(data.query?.pages || {})[0]?.thumbnail?.source;
        if (src) setThumbnail(src);
      })
      .catch(() => {});
  }, [story.brand]);

  return (
    <div className={`story-card-wrap ${selected ? "story-card-wrap--selected" : ""} ${disabled ? "story-card-wrap--disabled" : ""}`}>
      <label className="story-card-main">
        <input className="visually-hidden" type="checkbox" checked={selected} onChange={onToggle} disabled={disabled} />
        {thumbnail ? (
          <div className="story-thumb">
            <img src={thumbnail} alt="" draggable="false" />
          </div>
        ) : (
          <div className="story-thumb story-thumb--placeholder">
            {story.brand.charAt(0)}
          </div>
        )}
        <div className="story-card-body">
          <div className="story-brand">{story.brand}</div>
          <div className="story-title" title={story.title}>{story.title}</div>
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

      {story.headline && (
        <div className="headline-preview-row">
          <div className="headline-preview-lines">
            {story.headline.split("\n").filter(Boolean).map((line, i) => (
              <span key={i} className={i === 0 ? "hl-preview-brand" : "hl-preview-line"}>{line}</span>
            ))}
          </div>
          <button className="btn-regenerate" onClick={handleRegenerate} disabled={regenerating} title="Regenerate headline">
            {regenerating ? <span className="regen-spinner" /> : "↻"}
          </button>
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

export default function App() {
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

  useEffect(() => { fetchStories({ force: true }); }, []);

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
              onClick={() => fetchStories({ force: true })}
              disabled={phase === "loading" || phase === "generating"}
            >
              <span className="btn-text-full">↺ Fetch Stories</span>
              <span className="btn-text-short">↺ Refresh</span>
            </button>
          )}
        </div>
      </header>

      <main className="app-main">

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
            <div className="loading-ring" />
            <p className="loading-title">{fetchProgress.message || "Starting…"}</p>
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
            <p className="loading-sub">{fetchProgress.percent}%</p>
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
                  {selected.size === 0 && "Check up to 5 stories to turn into posts"}
                  {selected.size > 0 && selected.size < 5 && `${5 - selected.size} more`}
                  {selected.size === 5 && "Good to go"}
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
                      disabled={!selected.has(story.id) && selected.size >= 5}
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
  );
}
