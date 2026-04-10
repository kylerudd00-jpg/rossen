export const discoveryQueries = [
  // ── Free food by item type ───────────────────────────────────────────────────
  {
    id: "free-cone-scoop",
    label: "Free ice cream events",
    query: '"free cone" OR "free scoop" OR "free ice cream" OR "free cone day" restaurant chain promotion 2026',
  },
  {
    id: "free-taco-burger",
    label: "Free taco / burger promos",
    query: '"free taco" OR "free burger" OR "free sandwich" OR "free chicken" restaurant chain promotion date 2026',
  },
  {
    id: "free-pizza-slice",
    label: "Free pizza promos",
    query: '"free pizza" OR "free slice" restaurant chain promotion 2026',
  },
  {
    id: "free-coffee-drink",
    label: "Free coffee / drink promos",
    query: '"free coffee" OR "free drink" OR "free latte" OR "free medium" restaurant chain promotion 2026',
  },
  {
    id: "free-fries-side",
    label: "Free fries / side promos",
    query: '"free fries" OR "free side" OR "free donut" OR "free bagel" OR "free cookie" restaurant chain 2026',
  },

  // ── Price-specific deals ─────────────────────────────────────────────────────
  {
    id: "cent-deals",
    label: "Cent / cheap price deals",
    query: 'restaurant "cents" OR "¢" deal "limited time" fast food chain 2026',
  },
  {
    id: "dollar-meal-deals",
    label: "$1–$5 meal deals",
    query: '"$1" OR "$2" OR "$3" OR "$4" OR "$5" meal deal restaurant fast food "limited time" 2026',
  },
  {
    id: "big-dollar-off",
    label: "Big $ off retail / warehouse",
    query: '"$100 off" OR "$75 off" OR "$50 off" OR "$25 off" Costco OR Target OR Walmart OR "Best Buy" deal 2026',
  },
  {
    id: "percent-off-major",
    label: "% off at major retailers",
    query: '"% off" OR "percent off" Costco OR "Sam\'s Club" OR Target OR Walmart OR "Home Depot" deal shopper 2026',
  },

  // ── BOGO & bundle deals ──────────────────────────────────────────────────────
  {
    id: "bogo-restaurant",
    label: "BOGO restaurant deals",
    query: 'BOGO OR "buy one get one" restaurant fast food "through" OR "until" OR "limited time" 2026',
  },
  {
    id: "bundle-keychain-deals",
    label: "Bundle / keychain deals",
    query: 'restaurant "keychain" OR "bundle" OR "kit" deal free "for a year" OR "free" 2026',
  },

  // ── Annual & calendar events ─────────────────────────────────────────────────
  {
    id: "national-food-days",
    label: "National food day freebies",
    query: '"national" "day" free food restaurant deal freebie date April May 2026',
  },
  {
    id: "tax-day-deals",
    label: "Tax Day deals",
    query: '"Tax Day" free food deal restaurant promotion April 2026',
  },
  {
    id: "holiday-deals",
    label: "Holiday food deals",
    query: '"Easter" OR "Mother\'s Day" OR "Cinco de Mayo" OR "Memorial Day" free food deal restaurant 2026',
  },

  // ── Brand-specific deal searches ─────────────────────────────────────────────
  {
    id: "mcdonalds-deals",
    label: "McDonald's deals",
    query: "McDonald's deal free promotion limited time offer 2026",
  },
  {
    id: "wendys-deals",
    label: "Wendy's deals",
    query: "Wendy's deal free frosty promotion limited time 2026",
  },
  {
    id: "taco-bell-deals",
    label: "Taco Bell deals",
    query: '"Taco Bell" deal free promotion limited time offer 2026',
  },
  {
    id: "starbucks-deals",
    label: "Starbucks deals",
    query: "Starbucks deal free BOGO promotion limited time 2026",
  },
  {
    id: "chick-fil-a-deals",
    label: "Chick-fil-A deals",
    query: '"Chick-fil-A" deal free promotion limited time offer 2026',
  },
  {
    id: "costco-deals",
    label: "Costco deals & finds",
    query: "Costco deal find savings off limited time members 2026",
  },
  {
    id: "dunkin-deals",
    label: "Dunkin' deals",
    query: "Dunkin' deal free promotion limited time offer 2026",
  },

  // ── Store news ───────────────────────────────────────────────────────────────
  {
    id: "store-closings",
    label: "Store closings & bankruptcy",
    query: '"store closing" OR "closing locations" OR bankruptcy OR "going out of business" retail 2026',
  },
  {
    id: "store-openings-comebacks",
    label: "Openings & specific product comebacks",
    query: '"grand opening" OR "new locations" OR "returning to menu" OR "back on the menu" OR "coming back to" specific item food restaurant 2026',
  },
  {
    id: "consumer-recalls",
    label: "Consumer recalls",
    query: "recall warning alert FDA CPSC FSIS food product consumer safety 2026",
  },
  {
    id: "gift-card-trade-in",
    label: "Gift card & trade-in deals",
    query: '"gift card" deal bonus OR "trade in" retail consumer major brand 2026',
  },
];
