const researchedStories = [
  {
    id: "subway-bogo-april",
    brand: "SUBWAY",
    publishedAt: "March 30, 2026",
    sourceName: "Subway Newsroom",
    sourceTitle: "Subway Offers BOGO Footlongs Through April 28",
    sourceUrl:
      "https://newsroom.subway.com/2026-03-30-Subway-R-Offers-BOGO-Footlongs-to-Help-Fuel-Americans-Struggling-with-Rising-Gas-Prices",
    context: "Buy one Footlong in the Subway app and get another free through April 28 at participating U.S. restaurants.",
    headlineOptions: [
      ["SUBWAY", "BOGO FOOTLONGS", "THROUGH APRIL 28"],
      ["SUBWAY", "BUY ONE FOOTLONG", "GET ONE FREE"],
    ],
  },
  {
    id: "mcd-under-3",
    brand: "MCDONALD'S",
    publishedAt: "April 2, 2026",
    sourceName: "McDonald's Corporate",
    sourceTitle: "McDonald’s USA Introduces New Under $3 Menu and $4 Breakfast Meal Deal",
    sourceUrl: "https://corporate.mcdonalds.com/corpmcd/our-stories/article/mcdolands-usa-introduces-mcvalue.html",
    context:
      "McDonald's says at least 10 menu items will be under $3, and a $4 breakfast meal deal starts April 21 at participating restaurants.",
    headlineOptions: [
      ["MCDONALD'S", "10 ITEMS", "UNDER $3"],
      ["MCDONALD'S", "$4 BREAKFAST", "STARTS APRIL 21"],
    ],
  },
  {
    id: "aldi-weekly-ad",
    brand: "ALDI",
    publishedAt: "April 2, 2026",
    sourceName: "Aldi Reviewer",
    sourceTitle: "This Week at Aldi: The Aldi Weekly Ad for April 8, 2026",
    sourceUrl: "https://www.aldireviewer.com/this-week-at-aldi-the-aldi-weekly-ad-for-april-8-2026/",
    context:
      "This week's Aldi Finds include limited-time kitchen, patio, garden, pet, and travel items that hit stores starting April 8.",
    headlineOptions: [
      ["ALDI", "PATIO UMBRELLA", "JUST $39.99"],
      ["ALDI", "CERAMIC BRAISER", "JUST $16.99"],
    ],
  },
  {
    id: "target-price-cuts",
    brand: "TARGET",
    publishedAt: "March 11, 2026",
    sourceName: "Target Press Release",
    sourceTitle: "Target Lowers Prices on 3,000 Spring Products",
    sourceUrl:
      "https://corporate.target.com/press/release/2026/03/target-lowers-prices-on-3%2C000-spring-products%2C-including-everyday-essentials-and-on-trend-apparel-an",
    context:
      "Target says it lowered prices on about 3,000 spring products across essentials, apparel, and home, with more cuts planned through summer.",
    headlineOptions: [
      ["TARGET", "SPRING ITEMS", "5% TO 20% OFF"],
      ["TARGET", "BABY HOME & FOOD", "PRICES CUT"],
    ],
  },
  {
    id: "target-deal-days",
    brand: "TARGET",
    publishedAt: "March 16, 2026",
    sourceName: "Target Press Release",
    sourceTitle: "Target Circle Deal Days Highlights Top Seasonal Trends at Big Discounts",
    sourceUrl: "https://corporate.target.com/press/release/2026/03/target-circle-deal-days-highlights-top-seasonal-trends-at-big-discounts",
    context:
      "Target's recent Circle Deal Days event pushed up to 50% off thousands of items and shows the current spring discount direction consumers are seeing now.",
    headlineOptions: [
      ["TARGET", "UP TO 50%", "OFF SPRING FINDS"],
      ["TARGET", "SPRING DEAL DAYS", "UP TO 50% OFF"],
    ],
  },
  {
    id: "costco-april-coupons",
    brand: "COSTCO",
    publishedAt: "March 26, 2026",
    sourceName: "Costco Insider",
    sourceTitle: "Costco April 2026 Coupon Book",
    sourceUrl: "https://www.costcoinsider.com/costco-april-2026-coupon-book/",
    context:
      "Costco's April savings book is live with warehouse and online coupon deals running into early May.",
    headlineOptions: [
      ["COSTCO", "ORGAIN PROTEIN", "$8 OFF"],
      ["COSTCO", "APRIL BOOK", "ORGAIN $8 OFF"],
    ],
  },
  {
    id: "walmart-easter-clearance",
    brand: "WALMART",
    publishedAt: "April 4, 2026",
    sourceName: "TheStreet",
    sourceTitle: "Walmart Easter Items Marked Down 50% to 90% Starting April 6",
    sourceUrl: "https://www.thestreet.com/retail/is-walmart-open-on-easter",
    context:
      "TheStreet reports Walmart Easter candy, baskets, decor, and toys are hitting 50% to 90% off clearance starting April 6.",
    headlineOptions: [
      ["WALMART", "EASTER ITEMS", "UP TO 90% OFF"],
      ["WALMART", "EASTER CLEARANCE", "STARTED APRIL 6"],
    ],
  },
  {
    id: "home-depot-workshop",
    brand: "HOME DEPOT",
    publishedAt: "April 9, 2026",
    sourceName: "The Home Depot",
    sourceTitle: "Free In-Store Kids Workshops the First Saturday of Every Month",
    sourceUrl: "https://www.homedepot.com/c/kids-workshop",
    context:
      "Home Depot's next free in-store kids workshop is coming up Saturday, with project kits and kid-size aprons available while supplies last.",
    headlineOptions: [
      ["HOME DEPOT", "FREE KIDS", "WORKSHOP SATURDAY"],
      ["HOME DEPOT", "FREE STORE", "WORKSHOP"],
    ],
  },
  {
    id: "amazon-trade-in",
    brand: "AMAZON",
    publishedAt: "Current program",
    sourceName: "About Amazon",
    sourceTitle: "Amazon Trade-In Gives Gift Cards for Eligible Old Devices",
    sourceUrl: "https://www.aboutamazon.com/news/devices/amazon-trade-in-program",
    context:
      "Amazon's trade-in program still lets shoppers send in eligible old devices for Amazon gift cards, plus a discount on a new qualifying device.",
    headlineOptions: [
      ["AMAZON", "GET GIFT CARDS", "FOR OLD TECH"],
      ["AMAZON", "TRADE IN DEVICES", "FOR CREDIT"],
    ],
  },
  {
    id: "bed-bath-beyond-comeback",
    brand: "BED BATH & BEYOND",
    publishedAt: "April 2, 2026",
    sourceName: "Axios",
    sourceTitle: "Exclusive: Bed Bath & Beyond charts comeback with stores, coupons",
    sourceUrl: "https://www.axios.com/2026/04/02/bed-bath-beyond-container-store-coupons/",
    context:
      "Axios reports Bed Bath & Beyond is planning a comeback that includes physical stores and the return of the brand's coupon.",
    headlineOptions: [
      ["BED BATH & BEYOND", "STORES ARE", "COMING BACK"],
      ["BED BATH & BEYOND", "COUPONS ARE", "COMING BACK"],
    ],
  },
];

function createSeededRandom(seed) {
  let value = seed * 9301 + 49297;

  return function next() {
    value = (value * 233280 + 49297) % 233280;
    return value / 233280;
  };
}

function shuffleWithSeed(items, random) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

export function buildHeadlineBatch(seed, options = {}) {
  const { count = 5, excludeStoryIds = [] } = options;
  const random = createSeededRandom(seed);
  const shuffledStories = shuffleWithSeed(researchedStories, random);
  const excludedIds = new Set(excludeStoryIds);
  const freshStories = shuffledStories.filter((story) => !excludedIds.has(story.id));
  const fallbackStories = shuffledStories.filter((story) => excludedIds.has(story.id));
  const selectedStories = [...freshStories, ...fallbackStories].slice(0, count);

  return selectedStories.map((story, index) => {
    const lines = pick(random, story.headlineOptions);

    return {
      localId: `${story.id}-${seed}-${index + 1}`,
      storyId: story.id,
      brand: story.brand,
      status: "unreviewed",
      text: lines.join("\n"),
      sourceName: story.sourceName,
      sourceTitle: story.sourceTitle,
      sourceUrl: story.sourceUrl,
      publishedAt: story.publishedAt,
      context: story.context,
    };
  });
}
