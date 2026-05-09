import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

const VERDICT_CONFIG = {
  "great deal": { emoji: "🔥", label: "Great Deal", cls: "verdict--great" },
  "fair price": { emoji: "✓", label: "Fair Price", cls: "verdict--fair" },
  "overpriced": { emoji: "⚠️", label: "Overpriced", cls: "verdict--over" },
  "unknown": { emoji: "?", label: "Price Unknown", cls: "verdict--unknown" },
};

function VerdictBadge({ verdict }) {
  const cfg = VERDICT_CONFIG[verdict?.label] || VERDICT_CONFIG["unknown"];
  return (
    <div className={`scan-verdict ${cfg.cls}`}>
      <span className="scan-verdict-emoji">{cfg.emoji}</span>
      <span className="scan-verdict-label">{cfg.label}</span>
    </div>
  );
}

function ResultCard({ result, onReset }) {
  const { product, prices, avgPrice, verdict } = result;
  return (
    <div className="scan-result">
      <div className="scan-result-header">
        {product.imageUrl && (
          <img className="scan-product-img" src={product.imageUrl} alt={product.name} />
        )}
        <div className="scan-product-info">
          {product.brand && <div className="scan-product-brand">{product.brand}</div>}
          <div className="scan-product-name">{product.name}</div>
          {product.quantity && <div className="scan-product-qty">{product.quantity}</div>}
        </div>
      </div>

      <VerdictBadge verdict={verdict} />
      {verdict?.reason && <p className="scan-verdict-reason">{verdict.reason}</p>}

      {prices.length > 0 && (
        <div className="scan-prices">
          <div className="scan-prices-title">Prices Found</div>
          {prices.map((p, i) => (
            <div key={i} className="scan-price-row">
              <span className="scan-price-store">{p.store}</span>
              <span className="scan-price-amount">${Number(p.price).toFixed(2)}</span>
              {p.note && <span className="scan-price-note">{p.note}</span>}
            </div>
          ))}
          {avgPrice && (
            <div className="scan-avg">Avg: ${Number(avgPrice).toFixed(2)}</div>
          )}
        </div>
      )}

      {prices.length === 0 && (
        <p className="scan-no-prices">No store prices found. Try searching for this product online.</p>
      )}

      <button className="scan-reset-btn" onClick={onReset}>
        ← Scan Another
      </button>
    </div>
  );
}

export default function BarcodeScanner() {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const pendingLookupRef = useRef(false);
  const cameraRunRef = useRef(0);
  const [mode, setMode] = useState("camera"); // camera | manual
  const [scanning, setScanning] = useState(false);
  const [manualUpc, setManualUpc] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const lookup = useCallback(async (upc) => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/barcode?upc=${encodeURIComponent(upc)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setResult(data);
      setStatus("done");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraRunRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (controlsRef.current) return;

    const runId = cameraRunRef.current + 1;
    cameraRunRef.current = runId;
    setCameraError(null);
    setScanning(false);
    pendingLookupRef.current = false;

    try {
      const reader = new BrowserMultiFormatReader();
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (!devices.length) throw new Error("No camera found");
      const deviceId = devices[devices.length - 1]?.deviceId; // prefer rear camera
      const controls = await reader.decodeFromVideoDevice(deviceId, videoRef.current, (res, _err, activeControls) => {
        if (cameraRunRef.current !== runId) return;
        if (res) {
          if (pendingLookupRef.current) return;
          pendingLookupRef.current = true;
          cameraRunRef.current += 1;
          activeControls?.stop();
          controlsRef.current = null;
          setScanning(false);
          lookup(res.getText());
        }
        // Scan errors ("no barcode yet") are normal.
      });

      if (cameraRunRef.current !== runId || pendingLookupRef.current) {
        controls.stop();
        return;
      }

      controlsRef.current = controls;
      setScanning(true);
    } catch (e) {
      controlsRef.current = null;
      setScanning(false);
      setCameraError(e.message || "Camera unavailable");
    }
  }, [lookup]);

  useEffect(() => {
    if (mode !== "camera" || status !== "idle") {
      stopCamera();
      return undefined;
    }

    startCamera();
    return () => stopCamera();
  }, [mode, status, startCamera, stopCamera]);

  function handleManualSubmit(e) {
    e.preventDefault();
    const upc = manualUpc.replace(/\D/g, "");
    if (upc.length < 8) return;
    lookup(upc);
  }

  function reset() {
    pendingLookupRef.current = false;
    setStatus("idle");
    setResult(null);
    setError(null);
    setManualUpc("");
  }

  if (status === "done" && result) {
    return (
      <div className="scan-wrap">
        <ResultCard result={result} onReset={reset} />
      </div>
    );
  }

  return (
    <div className="scan-wrap">
      <div className="scan-hero">
        <h1 className="scan-title">Price Scanner</h1>
        <p className="scan-desc">Scan a barcode to compare grocery prices and get a deal verdict.</p>
      </div>

      <div className="scan-mode-tabs">
        <button
          className={`scan-mode-tab${mode === "camera" ? " scan-mode-tab--active" : ""}`}
          onClick={() => { setMode("camera"); reset(); }}
        >
          Camera
        </button>
        <button
          className={`scan-mode-tab${mode === "manual" ? " scan-mode-tab--active" : ""}`}
          onClick={() => { stopCamera(); setMode("manual"); reset(); }}
        >
          Enter UPC
        </button>
      </div>

      {mode === "camera" && (
        <div className="scan-camera-wrap">
          <video ref={videoRef} className="scan-video" muted playsInline />
          {scanning && <div className="scan-crosshair" />}
          {cameraError && (
            <div className="scan-camera-error">
              {cameraError}. <button onClick={() => setMode("manual")}>Enter UPC instead →</button>
            </div>
          )}
          {!scanning && !cameraError && (
            <div className="scan-camera-loading">Starting camera…</div>
          )}
        </div>
      )}

      {mode === "manual" && (
        <form className="scan-manual-form" onSubmit={handleManualSubmit}>
          <input
            className="scan-upc-input"
            type="text"
            inputMode="numeric"
            placeholder="Enter UPC barcode number"
            value={manualUpc}
            onChange={e => setManualUpc(e.target.value)}
            autoFocus
          />
          <button
            className="scan-lookup-btn"
            type="submit"
            disabled={manualUpc.replace(/\D/g, "").length < 8 || status === "loading"}
          >
            {status === "loading" ? "Looking up…" : "Look Up →"}
          </button>
        </form>
      )}

      {status === "loading" && (
        <div className="scan-loading">
          <span className="spinner" /> Searching prices…
        </div>
      )}

      {status === "error" && (
        <div className="scan-error">
          {error}
          <button className="scan-retry" onClick={reset}>Try again →</button>
        </div>
      )}
    </div>
  );
}
