function image(url, options = {}) {
  return {
    url,
    quality: 7,
    kind: "storefront",
    logoVisible: true,
    approved: true,
    ...options,
  };
}

function logo(options = {}) {
  return {
    enabled: false,
    mode: "none",
    placement: "top-center",
    scale: 0.68,
    maxHeight: 128,
    backdrop: "none",
    imageUrl: "",
    label: "",
    textColor: "#111827",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderColor: "rgba(15, 23, 42, 0.18)",
    ...options,
  };
}

export const brandVisuals = {
  DEFAULT: {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Shopping%20mall%20in%20Caloocan.jpg", {
        quality: 5,
        kind: "retail",
        logoVisible: false,
      }),
    ],
    logo: logo(),
  },
  SUBWAY: {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Subway-restaurant.jpg", {
        quality: 9,
        kind: "interior",
        logoVisible: true,
        keywords: ["menu", "sandwich", "promo", "footlong"],
      }),
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Subway%20restaurant%20storefront%2C%20Saratoga%20Shopping%20Center.jpg", {
        quality: 8,
        kind: "storefront",
        logoVisible: true,
        keywords: ["storefront", "logo"],
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "in-image-ok",
      label: "SUBWAY",
      textColor: "#1f5d34",
      backgroundColor: "rgba(255, 255, 255, 0.96)",
      borderColor: "rgba(255, 205, 0, 0.72)",
    }),
  },
  "SAM'S CLUB": {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Sam%27s%20Club%20store.jpg", {
        quality: 8,
        kind: "storefront",
        logoVisible: true,
      }),
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Sam%27s%20Club%20%2813140876243%29.jpg", {
        quality: 7,
        kind: "storefront",
        logoVisible: true,
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "in-image-ok",
      label: "SAM'S CLUB",
      textColor: "#115ea3",
      backgroundColor: "rgba(255, 255, 255, 0.96)",
      borderColor: "rgba(17, 94, 163, 0.35)",
    }),
  },
  TARGET: {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Target%20exterior.JPG", {
        quality: 9,
        kind: "storefront",
        logoVisible: true,
        keywords: ["storefront", "retail", "price"],
      }),
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Target%20Store%20%2850912426426%29.jpg", {
        quality: 8,
        kind: "storefront",
        logoVisible: true,
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "in-image-ok",
      label: "TARGET",
      textColor: "#cc0000",
      backgroundColor: "rgba(255, 255, 255, 0.97)",
      borderColor: "rgba(204, 0, 0, 0.25)",
    }),
  },
  "CHURCH'S": {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Church%27s%20Chicken%20%2826636805781%29.jpg", {
        quality: 8,
        kind: "storefront",
        logoVisible: true,
      }),
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Church%27s%20Chicken%20%2811701691893%29.jpg", {
        quality: 7,
        kind: "storefront",
        logoVisible: true,
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "conditional",
      label: "CHURCH'S",
      textColor: "#f8fafc",
      backgroundColor: "rgba(17, 24, 39, 0.86)",
      borderColor: "rgba(250, 204, 21, 0.42)",
    }),
  },
  ALDI: {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Aldi%20grocery%20store.jpg", {
        quality: 9,
        kind: "storefront",
        logoVisible: true,
        keywords: ["store", "weekly", "deals", "grocery"],
      }),
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Aldi%20Food%20Market%20Grocery%20Store%20%2816066155790%29.jpg", {
        quality: 8,
        kind: "storefront",
        logoVisible: true,
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "in-image-ok",
      label: "ALDI",
      textColor: "#0f3f84",
      backgroundColor: "rgba(255, 255, 255, 0.97)",
      borderColor: "rgba(255, 149, 0, 0.45)",
    }),
  },
  COSTCO: {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Costco%20Wholesale%20Store%20%2834635636926%29.jpg", {
        quality: 9,
        kind: "storefront",
        logoVisible: true,
        keywords: ["warehouse", "coupon", "bulk", "savings"],
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "conditional",
      label: "COSTCO",
      textColor: "#be123c",
      backgroundColor: "rgba(255, 255, 255, 0.97)",
      borderColor: "rgba(30, 64, 175, 0.3)",
    }),
  },
  POTBELLY: {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/11-16-06-EPMN-potbelly.jpg", {
        quality: 9,
        kind: "food",
        logoVisible: true,
        keywords: ["sandwich", "food", "bogo"],
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "overlay",
      imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/PotbellyLogo.jpg",
      label: "POTBELLY",
      scale: 0.72,
      maxHeight: 144,
      textColor: "#111827",
      backgroundColor: "rgba(245, 158, 11, 0.98)",
      borderColor: "rgba(17, 24, 39, 0.35)",
    }),
  },
  "MCDONALD'S": {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/McDonalds%20Times%20Square.JPG", {
        quality: 8,
        kind: "storefront",
        logoVisible: true,
        keywords: ["menu", "restaurant", "value", "breakfast"],
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "conditional",
      label: "MCDONALD'S",
      textColor: "#facc15",
      backgroundColor: "rgba(17, 24, 39, 0.86)",
      borderColor: "rgba(250, 204, 21, 0.3)",
    }),
  },
  "TRADER JOE'S": {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Trader%20Joe%27s%20in%20Amherst%20NY.jpg", {
        quality: 8,
        kind: "storefront",
        logoVisible: true,
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "conditional",
      label: "TRADER JOE'S",
      textColor: "#991b1b",
      backgroundColor: "rgba(255, 255, 255, 0.97)",
      borderColor: "rgba(153, 27, 27, 0.25)",
    }),
  },
  "HOME DEPOT": {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Home%20Depot%20Storefront%20%2848089754383%29.jpg", {
        quality: 8,
        kind: "storefront",
        logoVisible: true,
        keywords: ["store", "workshop", "kids"],
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "conditional",
      label: "HOME DEPOT",
      textColor: "#ffffff",
      backgroundColor: "rgba(234, 88, 12, 0.94)",
      borderColor: "rgba(255, 255, 255, 0.12)",
    }),
  },
  "LOWE'S": {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Lowe%27s%20%2814516184528%29.jpg", {
        quality: 8,
        kind: "storefront",
        logoVisible: true,
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "conditional",
      label: "LOWE'S",
      textColor: "#eff6ff",
      backgroundColor: "rgba(30, 64, 175, 0.92)",
      borderColor: "rgba(255, 255, 255, 0.15)",
    }),
  },
  WALMART: {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Walmart%20%2832936438182%29.jpg", {
        quality: 8,
        kind: "storefront",
        logoVisible: true,
        keywords: ["clearance", "sale", "retail"],
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "conditional",
      label: "WALMART",
      textColor: "#1d4ed8",
      backgroundColor: "rgba(255, 255, 255, 0.97)",
      borderColor: "rgba(250, 204, 21, 0.35)",
    }),
  },
  AMAZON: {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Amazon%20Locker%20-%20panoramio.jpg", {
        quality: 6,
        kind: "brand",
        logoVisible: true,
        keywords: ["amazon", "devices", "trade", "tech"],
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "conditional",
      label: "AMAZON",
      textColor: "#111827",
      backgroundColor: "rgba(255, 255, 255, 0.97)",
      borderColor: "rgba(249, 115, 22, 0.32)",
    }),
  },
  "BED BATH & BEYOND": {
    images: [
      image("https://commons.wikimedia.org/wiki/Special:FilePath/Bed%20Bath%20%26%20Beyond%20Panorama.jpg", {
        quality: 8,
        kind: "storefront",
        logoVisible: true,
      }),
    ],
    logo: logo({
      enabled: true,
      mode: "conditional",
      label: "BED BATH & BEYOND",
      textColor: "#ffffff",
      backgroundColor: "rgba(37, 99, 235, 0.92)",
      borderColor: "rgba(255, 255, 255, 0.15)",
    }),
  },
};
