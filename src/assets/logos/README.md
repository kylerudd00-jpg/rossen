Drop transparent brand logos here as PNG or SVG files when you are ready to replace
the current remote/logo-badge fallbacks.

Suggested naming:
- subway.png
- target.svg
- costco.png
- walmart.svg
- potbelly.png

Then update `src/data/brandVisuals.js` to point each brand's `logo.imageUrl`
to the local imported asset instead of a remote URL or label fallback.
