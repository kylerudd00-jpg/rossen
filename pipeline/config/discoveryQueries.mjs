const now = new Date();
const month = now.toLocaleString("en-US", { month: "long" });
const year = now.getFullYear();
const my = `${month} ${year}`;

const curatedDiscoveryQueries = [
  // ── New menu items & returning favorites ─────────────────────────────────────
  {
    id: "new-menu-launch",
    label: "New menu launches",
    query: `restaurant "new menu" OR "new item" OR "adds" OR "debuts" OR "launches" fast food chain ${my}`,
  },
  {
    id: "menu-returns",
    label: "Menu items returning",
    query: `"coming back" OR "returns to menu" OR "back on the menu" OR "back permanently" restaurant chain ${my}`,
  },
  {
    id: "limited-edition-collab",
    label: "Limited edition / collab menus",
    query: `restaurant "limited edition" OR "themed menu" OR "collaboration" OR "partnership" food launch ${my}`,
  },
  {
    id: "happy-meal-kids-menu",
    label: "Happy Meal / kids menu launches",
    query: `"Happy Meal" OR "kids meal" OR "new toy" OR "collectible" restaurant launch ${year}`,
  },

  // ── Free food & promos ───────────────────────────────────────────────────────
  {
    id: "free-food-promotion",
    label: "Free food promotions",
    query: `free food restaurant chain promotion deal "through" OR "until" OR "only" date ${my}`,
  },
  {
    id: "free-for-groups",
    label: "Free for names / professions",
    query: `free food "named" OR "name" OR "nurses" OR "teachers" OR "military" OR "veterans" OR "seniors" restaurant ${my}`,
  },
  {
    id: "national-day-food",
    label: "National food day freebies",
    query: `"national" day free food drink restaurant deal promotion date ${my}`,
  },
  {
    id: "free-taco-burger",
    label: "Free taco / burger / pizza",
    query: `"free taco" OR "free burger" OR "free pizza" OR "free sandwich" OR "free chicken" restaurant chain ${my}`,
  },
  {
    id: "free-coffee-drink",
    label: "Free coffee / drink",
    query: `"free coffee" OR "free drink" OR "free latte" OR "free donut" OR "free ice cream" chain promotion ${my}`,
  },

  // ── Price deals ──────────────────────────────────────────────────────────────
  {
    id: "dollar-meal-deals",
    label: "$1–$5 meal deals",
    query: `"$1" OR "$2" OR "$3" OR "$4" OR "$5" meal deal restaurant fast food chain ${my}`,
  },
  {
    id: "bogo-deals",
    label: "BOGO deals",
    query: `BOGO OR "buy one get one" restaurant fast food chain promotion ${my}`,
  },
  {
    id: "price-testing",
    label: "Brand testing new pricing",
    query: `restaurant chain "testing" OR "test" price deal new menu item location ${my}`,
  },

  // ── Brand-specific news ───────────────────────────────────────────────────────
  { id: "mcdonalds-news",   label: "McDonald's",   query: `McDonald's new deal promotion launch menu ${my}` },
  { id: "starbucks-news",   label: "Starbucks",    query: `Starbucks new deal BOGO promotion free drink ${my}` },
  { id: "costco-news",      label: "Costco",       query: `Costco deal new item savings members price change ${my}` },
  { id: "chipotle-news",    label: "Chipotle",     query: `Chipotle deal promotion testing free new menu ${my}` },
  { id: "chick-fil-a-news", label: "Chick-fil-A",  query: `"Chick-fil-A" deal promotion free new item ${my}` },
  { id: "dunkin-news",      label: "Dunkin'",      query: `Dunkin deal free promotion new drink menu ${my}` },
  { id: "taco-bell-news",   label: "Taco Bell",    query: `"Taco Bell" deal free promotion new menu item ${my}` },
  { id: "burger-king-news", label: "Burger King",  query: `"Burger King" new deal promotion free item menu ${my}` },
  { id: "wendys-news",      label: "Wendy's",      query: `Wendy's deal free frosty promotion new item ${my}` },
  { id: "shake-shack-news", label: "Shake Shack",  query: `"Shake Shack" deal free promotion new item ${my}` },
  { id: "popeyes-news",     label: "Popeyes",      query: `Popeyes new deal promotion free item menu returns ${my}` },
  { id: "subway-news",      label: "Subway",       query: `Subway deal free promotion footlong new menu ${my}` },
  { id: "dominos-news",     label: "Domino's",     query: `Domino's deal free pizza promotion offer ${my}` },
  { id: "pizza-hut-news",   label: "Pizza Hut",    query: `"Pizza Hut" deal free pizza promotion new item ${my}` },
  { id: "red-lobster-news", label: "Red Lobster",  query: `"Red Lobster" deal promo new menu returns ${my}` },
  { id: "olive-garden-news",label: "Olive Garden", query: `"Olive Garden" deal promo new menu endless ${my}` },

  // ── Consumer recalls & alerts ─────────────────────────────────────────────────
  {
    id: "consumer-recalls",
    label: "Consumer recalls",
    query: `recall warning FDA CPSC FSIS food product consumer safety ${my}`,
  },
  {
    id: "food-recall",
    label: "Food recalls",
    query: `food recall contamination salmonella listeria E. coli allergy warning store brand ${my}`,
  },
  {
    id: "product-recall",
    label: "Product safety recalls",
    query: `product recall injury fire burn choking hazard consumer CPSC ${my}`,
  },

  // ── Store & service news ─────────────────────────────────────────────────────
  {
    id: "store-closings",
    label: "Store closings",
    query: `"store closing" OR "closing locations" OR bankruptcy OR "going out of business" retail chain ${year}`,
  },
  {
    id: "price-membership-changes",
    label: "Price & membership changes",
    query: `"price increase" OR "membership fee" OR "annual fee" OR "now free" major brand consumer ${my}`,
  },
  {
    id: "delivery-partnerships",
    label: "New delivery / service partnerships",
    query: `"now available" OR "partners with" OR "launches delivery" brand store chain ${my}`,
  },
  {
    id: "free-store-events",
    label: "Free store events / classes",
    query: `free "class" OR "event" OR "workshop" OR "admission" store retail brand ${my}`,
  },

  // ── Seasonal / month-specific ─────────────────────────────────────────────────
  {
    id: "mothers-day-deals",
    label: "Mother's Day deals",
    query: `"Mother's Day" free food deal restaurant promotion gift ${year}`,
  },
  {
    id: "appreciation-deals",
    label: "Nurses / teachers / military appreciation",
    query: `"nurses week" OR "nurses day" OR "teacher appreciation" OR "memorial day" free deal restaurant ${year}`,
  },
  {
    id: "monthly-burger-promo",
    label: "Monthly food promos",
    query: `"burger month" OR "pizza month" OR "taco month" OR "hot dog" deal free promotion ${my}`,
  },

  // ── Consumer controversy ──────────────────────────────────────────────────────
  {
    id: "consumer-controversy",
    label: "Consumer controversy / lawsuits",
    query: `"hidden fees" OR "surveillance pricing" OR "data breach" OR "overcharged" OR "class action" consumer brand ${year}`,
  },
];

const restaurantBrands = [
  "McDonald's", "Starbucks", "Chipotle", "Chick-fil-A", "Taco Bell",
  "Burger King", "Subway", "Wendy's", "Domino's", "Pizza Hut", "Popeyes",
  "Shake Shack", "Dunkin'", "Dairy Queen", "Krispy Kreme", "Panera",
  "Applebee's", "Olive Garden", "Red Lobster", "IHOP", "Denny's",
  "Sonic", "Jersey Mike's", "Papa John's", "Little Caesars", "Five Guys",
  "Wingstop", "Buffalo Wild Wings", "Cracker Barrel", "Raising Cane's",
  "Qdoba", "Potbelly",
];

const retailBrands = [
  "Costco", "Walmart", "Target", "Sam's Club", "Amazon", "Aldi",
  "Trader Joe's", "Kroger", "Publix", "Whole Foods", "CVS", "Walgreens",
  "Dollar Tree", "Dollar General", "Home Depot", "Lowe's", "Best Buy",
  "Bath & Body Works", "TJ Maxx", "Marshalls", "Kohl's", "Macy's",
  "Nordstrom", "Old Navy", "Gap", "Sephora", "Ulta", "Petco", "PetSmart",
  "Five Below", "IKEA", "Wayfair", "Academy Sports", "REI",
];

const serviceBrands = [
  "Disney+", "Netflix", "Hulu", "Spotify", "YouTube Premium", "Verizon",
  "AT&T", "T-Mobile", "Boost Mobile",
];

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function brandQueries(brand, kind) {
  const quoted = `"${brand}"`;
  const common = [
    {
      intent: "consumer-alert",
      label: "consumer alerts",
      query: `${quoted} recall OR warning OR lawsuit OR "class action" OR "data breach" consumer ${year}`,
    },
    {
      intent: "price-policy",
      label: "price and policy changes",
      query: `${quoted} "price increase" OR "price drop" OR "membership fee" OR "new policy" OR "closing locations" ${my}`,
    },
  ];

  if (kind === "restaurant") {
    return [
      {
        intent: "food-deals",
        label: "food deals",
        query: `${quoted} deal OR promotion OR free OR BOGO OR coupon OR rewards restaurant ${my}`,
      },
      {
        intent: "menu-news",
        label: "menu news",
        query: `${quoted} "new menu" OR "new item" OR "limited time" OR returns OR launches restaurant ${my}`,
      },
      {
        intent: "app-rewards",
        label: "app and rewards offers",
        query: `${quoted} app OR rewards OR "loyalty" free OR deal OR offer ${my}`,
      },
      ...common,
    ];
  }

  if (kind === "service") {
    return [
      {
        intent: "subscription-deals",
        label: "subscription deals",
        query: `${quoted} deal OR free OR discount OR bundle OR price change subscription ${my}`,
      },
      {
        intent: "service-changes",
        label: "service changes",
        query: `${quoted} "price increase" OR "new plan" OR "policy change" OR "data breach" ${year}`,
      },
      ...common,
    ];
  }

  return [
    {
      intent: "retail-deals",
      label: "retail deals",
      query: `${quoted} sale OR deal OR discount OR coupon OR rewards OR free ${my}`,
    },
    {
      intent: "new-items",
      label: "new items and launches",
      query: `${quoted} "new item" OR "limited edition" OR collaboration OR launches OR returns ${my}`,
    },
    {
      intent: "store-events",
      label: "store events and perks",
      query: `${quoted} free class OR workshop OR event OR giveaway OR members ${my}`,
    },
    ...common,
  ];
}

const megaBrandQueries = [
  ...restaurantBrands.flatMap((brand) => brandQueries(brand, "restaurant")),
  ...retailBrands.flatMap((brand) => brandQueries(brand, "retail")),
  ...serviceBrands.flatMap((brand) => brandQueries(brand, "service")),
].map((item) => ({
  id: `mega-${slug(item.label)}-${slug(item.query.slice(0, 36))}`,
  label: `Mega: ${item.label}`,
  query: item.query,
}));

const broadMegaQueries = [
  {
    id: "mega-freebies-everywhere",
    label: "Mega: all major freebies",
    query: `"free" "deal" "promotion" "restaurant" OR "retail" OR "store" ${my}`,
  },
  {
    id: "mega-app-rewards",
    label: "Mega: app and rewards deals",
    query: `"app only" OR "rewards members" OR "loyalty members" free OR deal OR offer ${my}`,
  },
  {
    id: "mega-senior-teacher-military",
    label: "Mega: appreciation discounts",
    query: `"senior discount" OR "teacher appreciation" OR "nurses week" OR "military discount" brand deal ${year}`,
  },
  {
    id: "mega-retail-recalls",
    label: "Mega: retail recalls",
    query: `"sold at" Walmart OR Target OR Costco OR Amazon recall warning FDA CPSC ${my}`,
  },
  {
    id: "mega-food-recalls",
    label: "Mega: food recalls",
    query: `"food recall" salmonella OR listeria OR allergy OR contamination store brand ${my}`,
  },
  {
    id: "mega-store-closures",
    label: "Mega: store closures",
    query: `"closing stores" OR "closing locations" OR bankruptcy OR liquidation retail chain ${year}`,
  },
  {
    id: "mega-price-changes",
    label: "Mega: price changes",
    query: `"price increase" OR "prices going up" OR "membership fee" OR "subscription price" major brand ${my}`,
  },
  {
    id: "mega-class-actions",
    label: "Mega: class actions and settlements",
    query: `"class action" OR settlement OR "lawsuit claims" customer consumer brand ${year}`,
  },
  {
    id: "mega-data-breach",
    label: "Mega: data breaches",
    query: `"data breach" OR "customer data" OR "personal information" retail restaurant brand ${year}`,
  },
  {
    id: "mega-holiday-seasonal",
    label: "Mega: seasonal deals",
    query: `"limited time" OR "seasonal" OR holiday free deal restaurant retail brand ${my}`,
  },
];

const seenQueries = new Set();
export const discoveryQueries = [...curatedDiscoveryQueries, ...megaBrandQueries, ...broadMegaQueries]
  .filter((query) => {
    const key = query.query.toLowerCase();
    if (seenQueries.has(key)) return false;
    seenQueries.add(key);
    return true;
  });
