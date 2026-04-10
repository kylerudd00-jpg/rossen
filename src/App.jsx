import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { brandVisuals } from "./data/brandVisuals";

// ─── Canvas export ────────────────────────────────────────────────────────────

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

function drawCoverImage(context, image, width, height) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (sourceRatio > targetRatio) {
    drawHeight = height;
    drawWidth = height * sourceRatio;
    offsetX = (width - drawWidth) / 2;
  } else {
    drawWidth = width;
    drawHeight = width / sourceRatio;
    offsetY = (height - drawHeight) / 2;
  }

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function triggerDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function createFilename(story) {
  return `${story.brand}-${story.text.replaceAll("\n", "-").replace(/[^A-Z0-9-]+/gi, "-").toLowerCase()}.png`;
}

function hasRenderableLogo(logo) {
  return Boolean(logo?.enabled && (logo.imageUrl || logo.label));
}

function resolveLogoVisibility(logo, headlineText) {
  if (!hasRenderableLogo(logo)) return false;
  const normalized = headlineText.toLowerCase();
  switch (logo.mode) {
    case "overlay":
      return true;
    case "conditional":
      return /(gift cards|coming back|recall|alert|trade in|limited time)/.test(normalized);
    case "in-image-ok":
      return true;
    default:
      return false;
  }
}

function getLogoPlacementStyle(logo) {
  switch (logo?.placement) {
    case "top-left":
      return { top: "18px", left: "18px", right: "auto", transform: "none" };
    case "top-right":
      return { top: "18px", left: "auto", right: "18px", transform: "none" };
    default:
      return { top: "18px", left: "50%", right: "auto", transform: "translateX(-50%)" };
  }
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawLogoLabel(context, story, width) {
  const logo = story.logo;
  if (!logo?.label) return false;

  const paddingX = 44;
  const paddingY = 24;
  const badgeY = 68;
  const fontSize = Math.min(88, Math.max(54, Math.round(width * 0.03)));
  context.font = `900 ${fontSize}px Arial Black, Arial, sans-serif`;
  const textWidth = context.measureText(logo.label).width;
  const badgeWidth = Math.min(width * 0.86, textWidth + paddingX * 2);
  const badgeHeight = fontSize + paddingY * 2;
  const badgeX = (width - badgeWidth) / 2;

  drawRoundedRect(context, badgeX, badgeY, badgeWidth, badgeHeight, 36);
  context.fillStyle = logo.backgroundColor;
  context.fill();

  if (logo.borderColor) {
    context.lineWidth = 3;
    context.strokeStyle = logo.borderColor;
    context.stroke();
  }

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = logo.textColor;
  context.shadowColor = "rgba(0, 0, 0, 0)";
  context.fillText(logo.label, width / 2, badgeY + badgeHeight / 2 + 2);
  return true;
}

async function drawLogoLayer(context, story, width, showLogo) {
  if (!showLogo || !hasRenderableLogo(story.logo)) return;

  if (story.logo.imageUrl) {
    try {
      const logoImage = await loadImage(story.logo.imageUrl);
      const maxLogoWidth = width * story.logo.scale;
      const maxLogoHeight = story.logo.maxHeight * (width / 2160);
      const ratio = Math.min(maxLogoWidth / logoImage.width, maxLogoHeight / logoImage.height, 1);
      const logoWidth = logoImage.width * ratio;
      const logoHeight = logoImage.height * ratio;
      context.drawImage(logoImage, (width - logoWidth) / 2, 72, logoWidth, logoHeight);
      return;
    } catch (error) {
      console.warn("Logo export image failed, falling back to label.", error);
    }
  }

  drawLogoLabel(context, story, width);
}

async function downloadStoryImage(story, activeImage, showLogo, fontFamily, uploadedLogo) {
  const width = 2160;
  const height = 2700;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is unavailable.");

  context.fillStyle = "#111827";
  context.fillRect(0, 0, width, height);

  if (activeImage) {
    try {
      const background = await loadImage(activeImage);
      drawCoverImage(context, background, width, height);
    } catch {
      console.warn("Background image export fell back to a dark canvas.");
    }
  }

  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0.04)");
  gradient.addColorStop(0.36, "rgba(0, 0, 0, 0.14)");
  gradient.addColorStop(0.62, "rgba(0, 0, 0, 0.48)");
  gradient.addColorStop(0.78, "rgba(0, 0, 0, 0.84)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.97)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  await drawLogoLayer(context, story, width, showLogo);

  // Draw user-uploaded logo if present
  if (uploadedLogo?.dataUrl) {
    try {
      await document.fonts.ready;
      const logoImg = await loadImage(uploadedLogo.dataUrl);
      const maxW = width * uploadedLogo.scale;
      const ratio = Math.min(maxW / logoImg.width, (width * 0.3) / logoImg.height, 1);
      const lw = logoImg.width * ratio;
      const lh = logoImg.height * ratio;
      const pad = 80;
      const pos = uploadedLogo.position;
      const lx = pos.includes("left") ? pad : pos.includes("right") ? width - lw - pad : (width - lw) / 2;
      const ly = pos.includes("bottom") ? height - lh - pad : pad;
      context.drawImage(logoImg, lx, ly, lw, lh);
    } catch (e) {
      console.warn("Uploaded logo export failed:", e.message);
    }
  }

  const lines = story.text.split("\n").filter(Boolean);
  if (lines.length === 0) throw new Error("There is no headline text to export.");

  const resolvedFont = fontFamily || "Arial Black, Arial, sans-serif";
  await document.fonts.load(`900 100px "${resolvedFont.split(",")[0].trim()}"`).catch(() => {});

  const maxTextWidth = width - 180;
  let fontSize = 210;
  while (fontSize > 110) {
    context.font = `900 ${fontSize}px ${resolvedFont}`;
    const widestLine = Math.max(...lines.map((line) => context.measureText(line).width));
    if (widestLine <= maxTextWidth) break;
    fontSize -= 8;
  }

  const lineHeight = fontSize * 0.94;
  const totalTextHeight = lineHeight * lines.length;
  const textBottom = height - 96;
  const textTop = textBottom - totalTextHeight;
  const dividerY = textTop - 54;

  context.fillStyle = "rgba(255, 255, 255, 0.82)";
  context.fillRect(108, dividerY, width - 216, 3);

  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = "#ffffff";
  context.shadowColor = "rgba(0, 0, 0, 0.62)";
  context.shadowBlur = 28;
  context.shadowOffsetY = 8;
  context.font = `900 ${fontSize}px ${resolvedFont}`;

  lines.forEach((line, index) => {
    context.fillText(line, width / 2, textTop + index * lineHeight);
  });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("PNG export failed.");
  triggerDownload(blob, createFilename(story));
}

// ─── Rule-based headline formatter ───────────────────────────────────────────

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripBrand(text, brand) {
  const variants = [brand, brand.replace(/[^a-z0-9 ]/gi, " ").trim()].filter(Boolean);
  let out = text;
  for (const v of variants) {
    out = out.replace(new RegExp(`\\b${escRe(v)}\\b`, "gi"), "");
  }
  return out.replace(/\b(usa|inc|corp|llc|co)\b/gi, "").replace(/\s{2,}/g, " ").trim();
}

const VERB_FILLER =
  /\b(is offering|will offer|has announced|announced|introduces?|launches?|unveils?|reveals?|now offering|are offering|has launched|have launched|to offer|to launch|to introduce|gives?|provides?|says?|reports?|confirms?|plans? to|set to|looks to|aims? to)\b/gi;

const CONNECTOR_FILLER =
  /\b(customers?|shoppers?|members?|consumers?|you|people)\s+(can|will|may|might|should)\b/gi;

function stripFiller(text) {
  return text
    .replace(VERB_FILLER, "")
    .replace(CONNECTOR_FILLER, "")
    .replace(/\b(effective|beginning on|kicking off|limited time only|while supplies last|at participating locations?|via app|in(-|\s)store)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractPrice(text) {
  const m = text.match(/\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d+)?%\s*off|\bhalf\s+off\b/i);
  return m ? m[0].toUpperCase() : null;
}

function extractDeadline(text) {
  const m = text.match(
    /\b(through|until|thru|ends?\s+(?:on)?|starting|starts?\s+(?:on)?|on|by)\s+((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s*\d{4})?)/i
  );
  return m ? m[0].toUpperCase() : null;
}

function trimWords(text, n) {
  return text
    .replace(/[,;:–—]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, n)
    .join(" ")
    .trim();
}

function formatHeadlineText(title, brand) {
  const up = (s) => s.toUpperCase();
  const brandLine = up(brand);
  let core = stripFiller(stripBrand(title, brand));

  if (/\brecall\b/i.test(title)) {
    const item = trimWords(core.replace(/\brecall\w*/gi, ""), 3);
    return [brandLine, item ? `${up(item)} RECALLED` : "RECALL", "ALERT"].filter(Boolean).join("\n");
  }

  if (/buy one[,\s]+get one|bogo/i.test(title)) {
    const item = core.replace(/buy one[,\s]+get one(\s+free)?|bogo(\s+free)?/gi, "").trim();
    const line2 = item ? `BOGO ${up(trimWords(item, 2))}` : "BOGO DEAL";
    const line3 = extractDeadline(title) ?? extractPrice(title) ?? "";
    return [brandLine, line2, line3].filter(Boolean).join("\n");
  }

  if (/grand opening|opening soon|new stores?|coming soon/i.test(title)) {
    const countM = title.match(/(\d[\d,]*)\s+new\s+stores?/i);
    const line2 = countM ? `${countM[1]} NEW STORES` : "GRAND OPENING";
    const line3 = extractDeadline(title) ?? "";
    return [brandLine, line2, line3].filter(Boolean).join("\n");
  }

  if (/making a comeback|coming back|returns?|reopening/i.test(title)) {
    return [brandLine, "IS COMING BACK", extractDeadline(title) ?? ""].filter(Boolean).join("\n");
  }

  if (/\bclosing\b|\bshutting\b|\bbankruptcy\b/i.test(title)) {
    return [brandLine, "STORE CLOSING", extractDeadline(title) ?? ""].filter(Boolean).join("\n");
  }

  const itemCountM = title.match(/(\d[\d,]+)\s+(items?|products?|things?|styles?)/i);
  if (itemCountM && /price|cut|lower|reduc|cheaper|sale|off|discount/i.test(title)) {
    return [brandLine, `PRICES CUT ON`, `${itemCountM[1].toUpperCase()} ITEMS`].join("\n");
  }

  const pctM = title.match(/(\d+)\s*%\s*(?:to\s*\d+\s*%\s*)?off/i);
  if (pctM) {
    const pct = `${pctM[0].toUpperCase()}`;
    const subject = up(trimWords(core.replace(/\d+\s*%\s*(?:to\s*\d+\s*%)?\s*off/gi, ""), 3));
    return [brandLine, subject || "CLEARANCE SALE", pct].filter(Boolean).join("\n");
  }

  const price = extractPrice(title);
  if (price) {
    const subject = up(trimWords(core.replace(/\$[\d,.]+/g, ""), 3));
    const deadline = extractDeadline(title);
    return [brandLine, subject || "DEAL", `${price}${deadline ? `\n${deadline}` : ""}`]
      .filter(Boolean)
      .join("\n");
  }

  if (/\bfree\b/i.test(title)) {
    const item = up(trimWords(core.replace(/\bfree\b/gi, ""), 3));
    const deadline = extractDeadline(title) ?? "";
    return [brandLine, item ? `FREE ${item}` : "FREE DEAL", deadline].filter(Boolean).join("\n");
  }

  if (/gift\s+card/i.test(title)) {
    const action = /trade.?in/i.test(title) ? "TRADE IN FOR GIFT CARDS" : "GIFT CARD DEAL";
    return [brandLine, action, extractDeadline(title) ?? ""].filter(Boolean).join("\n");
  }

  const words = up(stripFiller(core)).split(/\s+/).filter(Boolean).slice(0, 7);
  const mid = Math.ceil(words.length / 2);
  const line2 = words.slice(0, mid).join(" ");
  const line3 = words.slice(mid).join(" ");
  return [brandLine, line2, line3].filter(Boolean).join("\n");
}

function imageQueryFor(brand) {
  const restaurants = new Set(["SUBWAY", "MCDONALD'S", "TACO BELL", "WENDY'S", "CHURCH'S", "POTBELLY"]);
  const type = restaurants.has(brand) ? "restaurant exterior" : "store exterior";
  const name = brand.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
  return `${name} ${type}`;
}

// ─── localStorage seen-ID cache ───────────────────────────────────────────────

const SEEN_KEY = "dp-seen-ids";

function loadSeenIds() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); }
  catch { return new Set(); }
}

function addSeenId(id) {
  try {
    const existing = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
    const updated = [...new Set([...existing, id])].slice(-500);
    localStorage.setItem(SEEN_KEY, JSON.stringify(updated));
  } catch {}
}

// ─── API ──────────────────────────────────────────────────────────────────────

function candidateToHeadline(candidate) {
  return {
    localId: `${candidate.id}-${Math.random().toString(36).slice(2)}`,
    storyId: candidate.id,
    brand: candidate.brand,
    status: "unreviewed",
    text: candidate.headline ?? formatHeadlineText(candidate.title, candidate.brand),
    sourceName: candidate.sourceDomain,
    sourceTitle: candidate.title,
    sourceUrl: candidate.sourceUrl,
    publishedAt: candidate.publishedAt,
    context: candidate.rawSummary,
  };
}

async function apiFetchStories() {
  const response = await fetch("/api/stories");
  if (!response.ok) throw new Error(`Stories fetch failed: ${response.status}`);
  const candidates = await response.json();
  return candidates.map(candidateToHeadline);
}

async function apiFetchImages(brand) {
  const q = encodeURIComponent(imageQueryFor(brand));
  const response = await fetch(`/api/images?q=${q}`);
  if (!response.ok) return [];
  return response.json();
}

function buildPost(headline, imageUrl, allImages) {
  const visual = brandVisuals[headline.brand] ?? brandVisuals.DEFAULT;
  const headlineText = `${headline.brand} ${headline.text}`.toLowerCase();
  const resolvedLogo = {
    ...(visual.logo ?? brandVisuals.DEFAULT.logo),
    canRender: hasRenderableLogo(visual.logo),
    initialVisible: resolveLogoVisibility(visual.logo, headlineText),
  };

  return {
    ...headline,
    imageUrl,
    imageCandidates: allImages,
    logo: resolvedLogo,
  };
}

// ─── Components ───────────────────────────────────────────────────────────────

function HeadlineCard({ item, onTextChange, onStatusChange, onSubmitDecision, submitDisabled }) {
  return (
    <article className="headline-card">
      <div className="headline-card-top">
        <div className="headline-brand">{item.brand}</div>
        <div className={`headline-status status-${item.status}`}>{item.status}</div>
      </div>
      <textarea
        value={item.text}
        onChange={(event) => onTextChange(item.localId, event.target.value.toUpperCase())}
        rows={4}
      />
      <div className="headline-source">
        <div className="source-meta">
          <strong>{item.sourceName}</strong>
          <span>{item.publishedAt}</span>
        </div>
        <a href={item.sourceUrl} target="_blank" rel="noreferrer">
          {item.sourceTitle}
        </a>
        <p className="headline-context">{item.context}</p>
      </div>
      <div className="headline-actions">
        <div className="review-buttons">
          <button
            type="button"
            className={item.status === "approved" ? "selected-action" : ""}
            onClick={() => onStatusChange(item.localId, "approved")}
          >
            Approve
          </button>
          <button
            type="button"
            className={item.status === "held" ? "selected-action" : "secondary-button"}
            onClick={() => onStatusChange(item.localId, "held")}
          >
            Hold
          </button>
          <button
            type="button"
            className={item.status === "denied" ? "selected-action" : "secondary-button"}
            onClick={() => onStatusChange(item.localId, "denied")}
          >
            Deny
          </button>
        </div>
        <button
          type="button"
          className="submit-headline-button"
          onClick={() => onSubmitDecision(item.localId)}
          disabled={submitDisabled}
        >
          Submit
        </button>
      </div>
    </article>
  );
}

function ImagePicker({ brand, headlineLines, images, selectedIndex, onSelect, onConfirm, onSkip, isLoading }) {
  const activeImage = images[selectedIndex];

  return (
    <article className="image-picker-card">
      <div className="headline-card-top">
        <div className="headline-brand">{brand}</div>
        <div className="headline-status status-unreviewed">pick image</div>
      </div>

      {isLoading ? (
        <div className="image-picker-loading">Searching for photos…</div>
      ) : images.length === 0 ? (
        <div className="image-picker-loading">No photos found.</div>
      ) : (
        <div className="image-picker-preview-wrap">
          <div className="picker-canvas">
            {activeImage ? (
              <img className="picker-canvas-bg" src={activeImage} alt={`Option ${selectedIndex + 1}`} />
            ) : (
              <div className="picker-canvas-bg picker-canvas-fallback" />
            )}
            <div className="picker-canvas-overlay" />
            <div className="picker-divider" />
            <div className="picker-headline">
              {headlineLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
          <div className="image-picker-nav">
            <button
              type="button"
              className="secondary-button"
              onClick={() => onSelect(Math.max(0, selectedIndex - 1))}
              disabled={selectedIndex === 0}
            >
              ‹ Prev
            </button>
            <span className="image-picker-count">
              {selectedIndex + 1} / {images.length}
            </span>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onSelect(Math.min(images.length - 1, selectedIndex + 1))}
              disabled={selectedIndex === images.length - 1}
            >
              Next ›
            </button>
          </div>
        </div>
      )}

      <div className="headline-actions" style={{ marginTop: "12px" }}>
        <button type="button" className="selected-action" onClick={() => onConfirm(activeImage ?? "")}>
          Use This Image
        </button>
        <button type="button" className="secondary-button" onClick={onSkip}>
          Skip Image
        </button>
      </div>
    </article>
  );
}

const FONTS = [
  { label: "Arial Black", value: "Arial Black, Arial, sans-serif" },
  { label: "Impact",      value: "Impact, Haettenschweiler, sans-serif" },
  { label: "Bebas Neue",  value: "'Bebas Neue', sans-serif" },
  { label: "Anton",       value: "'Anton', sans-serif" },
  { label: "Oswald",      value: "'Oswald', sans-serif" },
  { label: "Montserrat",  value: "'Montserrat', sans-serif" },
  { label: "Barlow",      value: "'Barlow Condensed', sans-serif" },
];

const LOGO_POSITIONS = [
  { id: "top-left",      label: "↖" },
  { id: "top-center",    label: "↑" },
  { id: "top-right",     label: "↗" },
  { id: "bottom-left",   label: "↙" },
  { id: "bottom-center", label: "↓" },
  { id: "bottom-right",  label: "↘" },
];

function getUploadedLogoStyle(position, scale) {
  const pad = "12px";
  const size = `${Math.round(scale * 100)}%`;
  const base = { position: "absolute", zIndex: 2, maxWidth: size, maxHeight: "22%", objectFit: "contain" };
  switch (position) {
    case "top-left":      return { ...base, top: pad, left: pad };
    case "top-right":     return { ...base, top: pad, right: pad };
    case "top-center":    return { ...base, top: pad, left: "50%", transform: "translateX(-50%)" };
    case "bottom-left":   return { ...base, bottom: pad, left: pad };
    case "bottom-right":  return { ...base, bottom: pad, right: pad };
    case "bottom-center": return { ...base, bottom: pad, left: "50%", transform: "translateX(-50%)" };
    default:              return { ...base, top: pad, left: "50%", transform: "translateX(-50%)" };
  }
}

function ProductCard({ story }) {
  const logoInputRef = useRef(null);
  const [imageIndex, setImageIndex] = useState(() => {
    const idx = story.imageCandidates?.indexOf(story.imageUrl) ?? -1;
    return idx >= 0 ? idx : 0;
  });
  const [imageExhausted, setImageExhausted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showLogo, setShowLogo] = useState(Boolean(story.logo?.initialVisible));
  const [logoImageFailed, setLogoImageFailed] = useState(false);
  const [editedText, setEditedText] = useState(story.text);
  const [isEditing, setIsEditing] = useState(false);
  const [fontFamily, setFontFamily] = useState(FONTS[0].value);
  const [uploadedLogo, setUploadedLogo] = useState(null); // { dataUrl, position, scale }

  const lines = editedText.split("\n");
  const activeImage = imageExhausted ? "" : story.imageCandidates?.[imageIndex] ?? story.imageUrl;
  const logoPlacementStyle = getLogoPlacementStyle(story.logo);
  const shouldShowLogoImage = showLogo && story.logo?.imageUrl && !logoImageFailed;
  const shouldShowLogoLabel = showLogo && story.logo?.label && (!story.logo?.imageUrl || logoImageFailed);

  function handleImageError() {
    setImageIndex((current) => {
      const nextIndex = current + 1;
      if (nextIndex < (story.imageCandidates?.length ?? 0)) return nextIndex;
      setImageExhausted(true);
      return current;
    });
  }

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedLogo({ dataUrl: ev.target.result, position: "top-center", scale: 0.35 });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleDownload() {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadStoryImage({ ...story, text: editedText }, activeImage, showLogo, fontFamily, uploadedLogo);
    } finally {
      setIsDownloading(false);
    }
  }

  const headlineFont = fontFamily.startsWith("'") ? fontFamily.split("'")[1] : fontFamily.split(",")[0].trim();

  return (
    <article className="product-card">
      <div className="product-canvas">
        {activeImage ? (
          <img className="product-image" src={activeImage} alt={story.brand} onError={handleImageError} />
        ) : (
          <div className="product-image product-image-fallback" aria-hidden="true" />
        )}
        <div className="product-overlay" />
        {showLogo && story.logo?.canRender ? (
          <div
            className={`product-logo-shell ${shouldShowLogoLabel ? "logo-shell-badge" : ""}`}
            style={{
              ...logoPlacementStyle,
              background: shouldShowLogoLabel ? story.logo.backgroundColor : "transparent",
              borderColor: shouldShowLogoLabel ? story.logo.borderColor : "transparent",
              color: story.logo.textColor,
            }}
          >
            {shouldShowLogoImage ? (
              <img
                className="product-logo"
                src={story.logo.imageUrl}
                alt={`${story.brand} logo`}
                onError={() => setLogoImageFailed(true)}
              />
            ) : null}
            {shouldShowLogoLabel ? <div className="product-wordmark">{story.logo.label}</div> : null}
          </div>
        ) : null}
        {uploadedLogo ? (
          <img
            src={uploadedLogo.dataUrl}
            alt="custom logo"
            style={getUploadedLogoStyle(uploadedLogo.position, uploadedLogo.scale)}
          />
        ) : null}
        <div className="product-divider" />
        <div className="headline-stack" style={{ fontFamily }}>
          {lines.map((line, index) => (
            <div key={`${line}-${index}`}>{line}</div>
          ))}
        </div>
      </div>

      {isEditing ? (
        <textarea
          className="product-edit-textarea"
          value={editedText}
          onChange={(e) => setEditedText(e.target.value.toUpperCase())}
          rows={3}
        />
      ) : null}

      {/* Font picker */}
      <div className="product-section-label">Font</div>
      <div className="font-picker">
        {FONTS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`font-option${fontFamily === f.value ? " font-option-active" : ""}`}
            style={{ fontFamily: f.value }}
            onClick={() => setFontFamily(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Logo upload + controls */}
      <div className="product-section-label">Logo</div>
      <input ref={logoInputRef} type="file" accept="image/png,image/webp,image/gif" style={{ display: "none" }} onChange={handleLogoUpload} />
      {!uploadedLogo ? (
        <button type="button" className="download-post-button" onClick={() => logoInputRef.current?.click()}>
          Upload Logo (PNG)
        </button>
      ) : (
        <div className="logo-controls">
          <div className="logo-position-grid">
            {LOGO_POSITIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`logo-pos-btn${uploadedLogo.position === p.id ? " logo-pos-active" : ""}`}
                onClick={() => setUploadedLogo((c) => ({ ...c, position: p.id }))}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="logo-size-row">
            <span className="product-section-label" style={{ margin: 0 }}>Size</span>
            <input
              type="range"
              min="0.1"
              max="0.7"
              step="0.05"
              value={uploadedLogo.scale}
              onChange={(e) => setUploadedLogo((c) => ({ ...c, scale: parseFloat(e.target.value) }))}
              className="logo-size-slider"
            />
          </div>
          <button type="button" className="download-post-button" style={{ marginTop: 0 }} onClick={() => setUploadedLogo(null)}>
            Remove Logo
          </button>
        </div>
      )}

      <div className="product-controls">
        {story.logo?.canRender ? (
          <button type="button" className="download-post-button" onClick={() => setShowLogo((c) => !c)}>
            {showLogo ? "Hide Brand Logo" : "Show Brand Logo"}
          </button>
        ) : null}
        <button type="button" className="download-post-button" onClick={() => setIsEditing((c) => !c)}>
          {isEditing ? "Done Editing" : "Edit Text"}
        </button>
        <button type="button" className="download-post-button" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? "Preparing PNG…" : "Download High-Res PNG"}
        </button>
      </div>
    </article>
  );
}

// ─── Loading progress ─────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { pct: 4,  msg: "Connecting to news sources…" },
  { pct: 12, msg: "Scanning Slickdeals, DealNews, Brad's Deals…" },
  { pct: 22, msg: "Reading Hip2Save, Krazy Coupon Lady, Freebie Guy…" },
  { pct: 32, msg: "Checking Hunt4Freebies, FreebieSHARK, Freeflys…" },
  { pct: 42, msg: "Browsing Reddit: r/deals, r/freebies, r/coupons…" },
  { pct: 52, msg: "Scanning QSR Magazine, Restaurant Business, NRN…" },
  { pct: 61, msg: "Checking Retail Dive, Grocery Dive, Supermarket News…" },
  { pct: 70, msg: "Running Google News deal searches…" },
  { pct: 78, msg: "Reading Lord of Savings, Clark Howard, Penny Hoarder…" },
  { pct: 85, msg: "Filtering and ranking by relevance…" },
  { pct: 92, msg: "Rewriting headlines with AI…" },
  { pct: 97, msg: "Almost done…" },
];

function LoadingProgress({ pct, msg }) {
  return (
    <div className="loading-progress">
      <div className="loading-progress-bar">
        <div className="loading-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="loading-progress-msg">{msg}</div>
    </div>
  );
}

// ─── Password gate ────────────────────────────────────────────────────────────

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [headlines, setHeadlines] = useState([]);
  const [allFetched, setAllFetched] = useState([]);
  const [posts, setPosts] = useState([]);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [storiesError, setStoriesError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const wasLoadingRef = useRef(false);

  // imagePicker: null | { localId, headline, brand, images, selectedIndex, isLoading }
  const [imagePicker, setImagePicker] = useState(null);

  const approvedCount = useMemo(() => headlines.filter((h) => h.status === "approved").length, [headlines]);
  const heldCount = useMemo(() => headlines.filter((h) => h.status === "held").length, [headlines]);
  const unreviewedCount = useMemo(() => headlines.filter((h) => h.status === "unreviewed").length, [headlines]);

  const canLoadMore = useMemo(() => {
    const shownIds = new Set(headlines.map((h) => h.storyId));
    return allFetched.some((h) => !shownIds.has(h.storyId));
  }, [allFetched, headlines]);

  // Advance loading step on a timer while fetching
  useEffect(() => {
    if (!isLoadingStories) { setLoadingStep(0); return; }
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 3200);
    return () => clearInterval(interval);
  }, [isLoadingStories]);

  // Flash 100% completion for 800ms when loading finishes
  useEffect(() => {
    if (wasLoadingRef.current && !isLoadingStories) {
      setLoadingComplete(true);
      const t = setTimeout(() => setLoadingComplete(false), 800);
      return () => clearTimeout(t);
    }
    wasLoadingRef.current = isLoadingStories;
  }, [isLoadingStories]);

  async function loadStories() {
    setIsLoadingStories(true);
    setStoriesError("");
    try {
      const held = headlines.filter((h) => h.status === "held");

      // Mark every currently-displayed non-held story as seen so it won't come back on refresh
      for (const h of headlines) {
        if (h.status !== "held") addSeenId(h.storyId);
      }

      const usedIds = new Set([...held.map((h) => h.storyId), ...posts.map((p) => p.storyId)]);
      const seenIds = loadSeenIds(); // includes the IDs we just added
      const fresh = await apiFetchStories();
      const available = fresh.filter((h) => !usedIds.has(h.storyId) && !seenIds.has(h.storyId));
      setAllFetched(available);
      const needed = Math.max(0, 8 - held.length);
      setHeadlines([...held, ...available.slice(0, needed)]);
    } catch {
      setStoriesError("Could not load stories — make sure the dev server is running.");
    } finally {
      setIsLoadingStories(false);
    }
  }

  useEffect(() => {
    loadStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLoadMore() {
    const shownIds = new Set(headlines.map((h) => h.storyId));
    const more = allFetched.filter((h) => !shownIds.has(h.storyId)).slice(0, 5);
    setHeadlines((current) => [...current, ...more]);
  }

  function handleHeadlineTextChange(localId, value) {
    setHeadlines((current) => current.map((h) => (h.localId === localId ? { ...h, text: value } : h)));
  }

  function handleHeadlineStatusChange(localId, status) {
    setHeadlines((current) => current.map((h) => (h.localId === localId ? { ...h, status } : h)));
  }

  async function handleSubmitDecision(localId) {
    const headline = headlines.find((h) => h.localId === localId);
    if (!headline || headline.status === "unreviewed" || headline.status === "held") return;

    setHeadlines((current) => current.filter((h) => h.localId !== localId));
    addSeenId(headline.storyId);

    if (headline.status === "denied") return;

    if (headline.status === "approved") {
      setImagePicker({ localId, headline, brand: headline.brand, images: [], selectedIndex: 0, isLoading: true });

      const images = await apiFetchImages(headline.brand).catch(() => []);
      setImagePicker((current) =>
        current?.localId === localId ? { ...current, images, isLoading: false } : current
      );
    }
  }

  function handleImageConfirm(imageUrl) {
    if (!imagePicker) return;
    const post = buildPost(imagePicker.headline, imageUrl, imagePicker.images);
    setPosts((current) => [post, ...current]);
    setImagePicker(null);
  }

  function handleImageSkip() {
    if (!imagePicker) return;
    const post = buildPost(imagePicker.headline, "", []);
    setPosts((current) => [post, ...current]);
    setImagePicker(null);
  }

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const showLoadingBar = isLoadingStories || loadingComplete;

  return (
    <div className="generator-shell">
      <header className="generator-header">
        <div>
          <p className="eyebrow">Deal Pipeline</p>
          <h1>Headline Review &amp; Post Generation</h1>
          <p className="subtitle">
            Live consumer news pulled from the web. Edit the headline, approve it, pick a photo, and download your Instagram post.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={loadStories} disabled={isLoadingStories}>
            {isLoadingStories ? "Loading…" : "Refresh Headlines"}
          </button>
        </div>
      </header>

      <section className="stats-row">
        <article className="stat-card">
          <div className="stat-label">Date</div>
          <div className="stat-value">{today}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Headlines</div>
          <div className="stat-value">{headlines.length}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Unreviewed</div>
          <div className="stat-value">{unreviewedCount}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value">{approvedCount}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Held</div>
          <div className="stat-value">{heldCount}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Posts</div>
          <div className="stat-value">{posts.length}</div>
        </article>
      </section>

      {storiesError ? <div className="error-banner">{storiesError}</div> : null}

      <section className="workflow-grid">
        <div className="column-block">
          <div className="section-header">
            <h2>1. Review Headlines</h2>
            <p>Edit copy, approve, hold, or deny. Submit when ready — approved ones move to image selection.</p>
          </div>
          <div className="headline-grid">
            {showLoadingBar ? (
              <LoadingProgress
                pct={loadingComplete ? 100 : LOADING_STEPS[loadingStep].pct}
                msg={loadingComplete ? "Stories ready!" : LOADING_STEPS[loadingStep].msg}
              />
            ) : headlines.length > 0 ? (
              <>
                {headlines.map((headline) => (
                  <HeadlineCard
                    key={headline.localId}
                    item={headline}
                    onTextChange={handleHeadlineTextChange}
                    onStatusChange={handleHeadlineStatusChange}
                    onSubmitDecision={handleSubmitDecision}
                    submitDisabled={headline.status === "unreviewed" || headline.status === "held"}
                  />
                ))}
                {canLoadMore ? (
                  <button type="button" className="secondary-button load-more-button" onClick={handleLoadMore}>
                    Load More Headlines
                  </button>
                ) : null}
              </>
            ) : (
              <div className="empty-state">No headlines. Click Refresh Headlines to pull in more stories.</div>
            )}
          </div>
        </div>

        <div className="column-block">
          <div className="section-header">
            <h2>2. Pick Image &amp; Generate Post</h2>
            <p>Choose a background photo for each approved headline. Your finished post will appear below.</p>
          </div>

          {imagePicker ? (
            <ImagePicker
              brand={imagePicker.brand}
              headlineLines={imagePicker.headline.text.split("\n").filter(Boolean)}
              images={imagePicker.images}
              selectedIndex={imagePicker.selectedIndex}
              onSelect={(index) =>
                setImagePicker((current) => (current ? { ...current, selectedIndex: index } : current))
              }
              onConfirm={handleImageConfirm}
              onSkip={handleImageSkip}
              isLoading={imagePicker.isLoading}
            />
          ) : null}

          <div className="products-grid">
            {posts.length > 0 ? (
              posts.map((story) => <ProductCard key={story.localId} story={story} />)
            ) : !imagePicker ? (
              <div className="empty-state">Approve a headline and pick an image to generate your first post.</div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
