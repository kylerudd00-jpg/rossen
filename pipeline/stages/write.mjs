function buildHeadline(candidate) {
  const title = candidate.title.toUpperCase();
  const brand = candidate.brand.toUpperCase();
  const text = `${candidate.title} ${candidate.rawSummary}`.toUpperCase();

  if (text.includes("BUY ONE") && text.includes("GET ONE FREE")) {
    return `${brand}\nBUY ONE\nGET ONE FREE`;
  }

  if (text.includes("BOGO")) {
    return `${brand}\nBOGO DEAL\nLIVE NOW`;
  }

  if (text.includes("RECALL")) {
    return `${brand}\nRECALL\nALERT`;
  }

  if (text.includes("REOPEN")) {
    return `${brand}\nIS REOPENING\nIN THE U.S.`;
  }

  if (text.includes("PRICE DROP") || text.includes("PRICES CUT")) {
    return `${brand}\nPRICE DROP\nALERT`;
  }

  if (text.includes("GIFT CARD")) {
    return `${brand}\nGET GIFT CARDS\nFOR OLD TECH`;
  }

  if (text.includes("HOT BUY")) {
    return `${brand}\nHOT BUYS\nLIVE NOW`;
  }

  if (text.includes("DEAL") || text.includes("DISCOUNT") || text.includes("SAVE")) {
    return `${brand}\nDEAL ALERT\nSAVE NOW`;
  }

  return `${brand}\nDEAL ALERT\nAVAILABLE NOW`;
}

function buildSubtext(candidate) {
  const text = `${candidate.title} ${candidate.rawSummary}`.toLowerCase();

  if (text.includes("april")) {
    const match = text.match(/april\s+\d{1,2}/i);
    return match ? match[0].toUpperCase() : "";
  }

  if (text.includes("week")) {
    return "THIS WEEK";
  }

  if (text.includes("weekend")) {
    return "THROUGH WEEKEND";
  }

  return "";
}

function buildImageQuery(candidate) {
  const brand = candidate.brand;
  const category = candidate.category.toLowerCase();
  const text = `${candidate.title} ${candidate.rawSummary}`.toLowerCase();

  if (category.includes("fast food")) {
    return `${brand} food promo logo sandwich`;
  }

  if (category.includes("warehouse") || brand === "Costco" || brand === "Sam's Club") {
    return `${brand} store product display logo`;
  }

  if (category.includes("recall")) {
    return `${brand} product package logo`;
  }

  if (text.includes("gift card") || text.includes("electronics")) {
    return `${brand} electronics trade in logo`;
  }

  return `${brand} logo storefront product`;
}

function buildImageDirection(candidate) {
  const brand = candidate.brand.toUpperCase();
  const category = candidate.category.toLowerCase();

  if (category.includes("fast food")) {
    return `Use a food-forward image with a large visible ${brand} logo if possible. Prioritize sandwiches or menu hero shots that still crop cleanly to 5:4.`;
  }

  if (category.includes("warehouse")) {
    return `Use a warehouse or in-store product image with a visible ${brand} sign or branding. Keep enough negative space for text and crop safely to 5:4.`;
  }

  if (category.includes("recall")) {
    return `Use the recalled product or packaging with a large visible brand mark if available. Avoid generic news imagery and keep the crop clean for a 5:4 warning post.`;
  }

  return `Use a clean brand-led image with a large visible ${brand} logo if possible. The image must crop well to 5:4 and leave room for the stacked headline overlay.`;
}

function buildPreferredImageType(candidate) {
  const category = candidate.category.toLowerCase();

  if (category.includes("fast food")) {
    return "food hero shot";
  }

  if (category.includes("warehouse")) {
    return "store product shot";
  }

  if (category.includes("recall")) {
    return "product packaging";
  }

  return "storefront or branded product";
}

function buildLogoTreatment(candidate) {
  const category = candidate.category.toLowerCase();

  if (category.includes("fast food")) {
    return "Use a large brand logo lockup at the top if the background logo is weak.";
  }

  if (category.includes("warehouse")) {
    return "Prefer an in-frame store sign. If it is not prominent enough, overlay a large brand logo.";
  }

  if (category.includes("recall")) {
    return "Use packaging branding first. Add a clean logo overlay only if the product mark is not readable.";
  }

  return "Use a large visible brand logo in-frame or overlay it cleanly at the top.";
}

export function writeSelectedStories(candidates) {
  return candidates.map((candidate) => ({
    ...candidate,
    summary1Sentence: candidate.rawSummary,
    finalHeadline: buildHeadline(candidate),
    finalSubtext: buildSubtext(candidate),
    automatedImageQuery: buildImageQuery(candidate),
    imageDirection: buildImageDirection(candidate),
    preferredImageType: buildPreferredImageType(candidate),
    preferredImageSource: "official brand imagery first, then trusted web image results",
    backgroundImagePlan: `Auto-select a ${buildPreferredImageType(candidate)} for ${candidate.brand} that supports a strong 5:4 crop.`,
    logoTreatment: buildLogoTreatment(candidate),
    imageSelectionStatus: "ready for automated fetch",
    logoRequired: "yes",
    cropTarget: "5:4",
    whySelected: `High one-slide potential with a strong consumer-facing angle for ${candidate.brand}.`,
  }));
}
