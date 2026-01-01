"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/scraper.ts
  function scrapePrices() {
    const offers = scrapeOffers();
    return expandOffers(offers);
  }
  function scrapeOffers() {
    var _a, _b;
    const offerElements = document.querySelectorAll(OFFER_SELECTOR);
    const offers = [];
    for (const offerEl of offerElements) {
      if (offers.length >= MAX_OFFERS) break;
      const priceEl = offerEl.querySelector(PRICE_SELECTOR);
      const quantityEl = offerEl.querySelector(QUANTITY_SELECTOR);
      const priceText = (_a = priceEl == null ? void 0 : priceEl.textContent) != null ? _a : "";
      const price = parsePrice(priceText);
      const quantity = parseInt((_b = quantityEl == null ? void 0 : quantityEl.textContent) != null ? _b : "1", 10) || 1;
      if (price !== null && price > 0) {
        offers.push({ price, quantity });
      }
    }
    return offers;
  }
  function expandOffers(offers) {
    const prices = [];
    for (const offer of offers) {
      for (let i = 0; i < offer.quantity; i++) {
        prices.push(offer.price);
      }
    }
    return prices;
  }
  function parsePrice(text) {
    let cleaned = text.replace(/€/g, "").replace(/\s/g, "");
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    const price = parseFloat(cleaned);
    return isNaN(price) ? null : price;
  }
  var OFFER_SELECTOR, PRICE_SELECTOR, QUANTITY_SELECTOR, MAX_OFFERS;
  var init_scraper = __esm({
    "src/scraper.ts"() {
      "use strict";
      OFFER_SELECTOR = ".col-offer";
      PRICE_SELECTOR = ".price-container span";
      QUANTITY_SELECTOR = ".amount-container .item-count";
      MAX_OFFERS = 50;
    }
  });

  // src/analysis.ts
  function generateMarketAnalysis(prices) {
    const emptyAnalysis = {
      prices,
      sortedPrices: [],
      totalListings: prices.length,
      allClusters: [],
      qualifyingClusters: [],
      primaryCluster: null,
      floor: null,
      wall: null,
      distanceBetweenFloorAndWall: 0,
      hasStrongGap: false,
      expectedPrice: 0,
      confidence: "low",
      median: 0,
      epsilon: 0
    };
    if (prices.length === 0) {
      return emptyAnalysis;
    }
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const median = calculateMedian(sortedPrices);
    const epsilon = median * EPSILON_PERCENT;
    if (sortedPrices.length < 3) {
      return {
        ...emptyAnalysis,
        sortedPrices,
        median,
        epsilon
      };
    }
    const allClusters = findClusters(sortedPrices, epsilon);
    const minCountForPercent = Math.ceil(sortedPrices.length * MIN_CLUSTER_PERCENT);
    const qualifyingClusters = allClusters.filter((c) => c.count >= MIN_CLUSTER_SIZE || c.count >= minCountForPercent).sort((a, b) => a.min - b.min);
    const primaryCluster = qualifyingClusters.length > 0 ? qualifyingClusters[0] : null;
    if (!primaryCluster) {
      return {
        ...emptyAnalysis,
        sortedPrices,
        allClusters,
        qualifyingClusters,
        median,
        epsilon
      };
    }
    const floor = findFloor(sortedPrices, primaryCluster);
    const wall = findFirstWall(qualifyingClusters, WALL_MIN_SIZE);
    const distanceBetweenFloorAndWall = computeDistanceBetweenFloorAndWall(sortedPrices, floor, wall);
    const hasStrongGap = detectStrongGap(sortedPrices, primaryCluster, GAP_THRESHOLD);
    const { expectedPrice, confidence } = calculateFairValue(primaryCluster, floor, wall, hasStrongGap, epsilon);
    return {
      prices,
      sortedPrices,
      totalListings: prices.length,
      allClusters,
      qualifyingClusters,
      primaryCluster,
      floor,
      wall,
      distanceBetweenFloorAndWall,
      hasStrongGap,
      expectedPrice,
      confidence,
      median,
      epsilon
    };
  }
  function calculateFairValue(cluster, floor, wall, hasStrongGap, epsilon) {
    const wallNearFloor = wall && Math.abs(wall.price - floor.price) < epsilon;
    if (!wall) {
      const confidence2 = hasStrongGap ? "high" : floor.strength >= STRONG_FLOOR_THRESHOLD ? "high" : "medium";
      return { expectedPrice: floor.price, confidence: confidence2 };
    }
    if (wallNearFloor) {
      return {
        expectedPrice: floor.price,
        confidence: wall.strength >= STRONG_WALL_THRESHOLD ? "high" : "medium"
      };
    }
    const floorWeight = Math.min(floor.strength / STRONG_FLOOR_THRESHOLD, 1);
    const wallPull = 1 - floorWeight;
    const maxPull = 0.5;
    const expectedPrice = floor.price + (wall.price - floor.price) * wallPull * maxPull;
    const confidence = floorWeight >= 1 ? "high" : floorWeight >= 0.5 ? "medium" : "low";
    return { expectedPrice, confidence };
  }
  function findFloor(allPrices, cluster) {
    const minPrice = Math.min(...allPrices);
    const tolerance = minPrice * 0.01;
    const floorPrices = allPrices.filter((p) => p <= minPrice + tolerance);
    return {
      price: minPrice,
      count: floorPrices.length,
      strength: floorPrices.length / cluster.count
    };
  }
  function findFirstWall(clusters, minSize) {
    const sortedClusters = [...clusters].sort((a, b) => a.min - b.min);
    for (const cluster of sortedClusters) {
      if (cluster.prices.length === 0) continue;
      const sorted = [...cluster.prices].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        const basePrice = sorted[i];
        const tolerance = basePrice * 0.01;
        let count = 0;
        for (let j = i; j < sorted.length && sorted[j] <= basePrice + tolerance; j++) {
          count++;
        }
        if (count >= minSize) {
          return {
            price: basePrice,
            count,
            strength: count / cluster.count
          };
        }
      }
    }
    return null;
  }
  function computeDistanceBetweenFloorAndWall(allPrices, floor, wall) {
    if (!wall) return 0;
    const floorCeiling = floor.price * 1.01;
    const wallFloor = wall.price * 0.99;
    if (floorCeiling >= wallFloor) return 0;
    return allPrices.filter((p) => p > floorCeiling && p < wallFloor).length;
  }
  function calculateMedian(sorted) {
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }
  function findClusters(sortedPrices, epsilon) {
    const clusters = [];
    let currentCluster = [];
    for (const price of sortedPrices) {
      if (currentCluster.length === 0) {
        currentCluster.push(price);
      } else {
        const lastPrice = currentCluster[currentCluster.length - 1];
        if (price - lastPrice <= epsilon) {
          currentCluster.push(price);
        } else {
          clusters.push(createCluster(currentCluster));
          currentCluster = [price];
        }
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(createCluster(currentCluster));
    }
    return clusters;
  }
  function createCluster(prices) {
    const sorted = [...prices].sort((a, b) => a - b);
    return {
      prices: sorted,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: calculateMedian(sorted),
      count: sorted.length
    };
  }
  function detectStrongGap(sortedPrices, cluster, gapThreshold) {
    const clusterMaxIndex = sortedPrices.findIndex((p) => p > cluster.max);
    if (clusterMaxIndex === -1) {
      return true;
    }
    const nextPrice = sortedPrices[clusterMaxIndex];
    const gap = (nextPrice - cluster.max) / cluster.median;
    return gap >= gapThreshold;
  }
  var EPSILON_PERCENT, MIN_CLUSTER_SIZE, MIN_CLUSTER_PERCENT, GAP_THRESHOLD, WALL_MIN_SIZE, STRONG_WALL_THRESHOLD, MEDIUM_WALL_THRESHOLD, STRONG_FLOOR_THRESHOLD;
  var init_analysis = __esm({
    "src/analysis.ts"() {
      "use strict";
      EPSILON_PERCENT = 0.025;
      MIN_CLUSTER_SIZE = 3;
      MIN_CLUSTER_PERCENT = 0.25;
      GAP_THRESHOLD = 0.12;
      WALL_MIN_SIZE = 5;
      STRONG_WALL_THRESHOLD = 0.4;
      MEDIUM_WALL_THRESHOLD = 0.25;
      STRONG_FLOOR_THRESHOLD = 0.3;
    }
  });

  // src/feedback.ts
  function submitYesNo(answer, pageUrl, prices) {
    console.log(answer);
    const params = new URLSearchParams({
      "entry.1988403083": answer,
      "entry.1379742104": pageUrl,
      "entry.167110485": JSON.stringify(prices)
    });
    const url = `${FORM_BASE}&${params.toString()}`;
    fetch(url, {
      method: "POST",
      mode: "no-cors"
    });
  }
  function openCommentForm() {
    console.log("clicked");
    const base = "https://forms.gle/zvjVWNoD9BVL2FcS6";
    window.open(base, "_blank");
  }
  var FORM_BASE;
  var init_feedback = __esm({
    "src/feedback.ts"() {
      "use strict";
      FORM_BASE = "https://docs.google.com/forms/d/e/1FAIpQLSflz3d4dCzT6q5QtfKCNmgCF65EiNxxXsSbEw1XeZFoSWNtOg/formResponse?usp=pp_url";
    }
  });

  // src/insights.ts
  function generateInsight(analysis) {
    var _a;
    const { primaryCluster, floor, wall, hasStrongGap, qualifyingClusters, totalListings, distanceBetweenFloorAndWall } = analysis;
    if (!primaryCluster || !floor) {
      return {
        type: "uncertain",
        trend: "uncertain",
        emoji: "\u2753",
        headline: "Insufficient data",
        explanation: "Not enough listings to analyze market structure.",
        confidence: "low"
      };
    }
    const currentIndex = qualifyingClusters.findIndex((c) => c.min === primaryCluster.min);
    const nextCluster = currentIndex >= 0 && currentIndex < qualifyingClusters.length - 1 ? qualifyingClusters[currentIndex + 1] : null;
    const wallStrength = (_a = wall == null ? void 0 : wall.strength) != null ? _a : 0;
    const floorStrength = floor.strength;
    const strongFloor = floorStrength >= STRONG_FLOOR_THRESHOLD;
    const strongWall = wallStrength >= STRONG_WALL_THRESHOLD;
    const mediumWall = wallStrength >= MEDIUM_WALL_THRESHOLD;
    const wallNearFloor = wall && Math.abs(wall.price - floor.price) < primaryCluster.median * 0.025;
    const weakFloor = floor.count <= 2;
    const singleSellerFloor = floor.count === 1;
    const floorToWallGap = wall ? (wall.price - floor.price) / wall.price : 0;
    const isUndercut = floorToWallGap < UNDERCUT_GAP_THRESHOLD;
    const isDemandSignal = floorToWallGap >= UNDERCUT_GAP_THRESHOLD;
    if (wallNearFloor && strongWall) {
      return {
        type: "price_stable",
        trend: "stable",
        emoji: "\u{1F512}",
        headline: "Price locked",
        explanation: `${wall.count} sellers at \u20AC${wall.price.toFixed(2)}. Price appears stable.`,
        confidence: "high"
      };
    }
    if (strongFloor) {
      return {
        type: "price_stable",
        trend: "stable",
        emoji: "\u{1F6E1}\uFE0F",
        headline: "Price defended",
        explanation: `${floor.count} sellers at \u20AC${floor.price.toFixed(2)} hold this price level.`,
        confidence: "high"
      };
    }
    const fewItemsBetween = distanceBetweenFloorAndWall <= 2;
    if (weakFloor && wall && !wallNearFloor && isDemandSignal && fewItemsBetween) {
      const gapPercent = (floorToWallGap * 100).toFixed(0);
      return {
        type: "price_rising",
        trend: "up",
        emoji: "\u{1F4C8}",
        headline: "Low supply \u2014 price might jump",
        explanation: `Only ${floor.count} listing${floor.count === 1 ? "" : "s"} at \u20AC${floor.price.toFixed(2)}, ${gapPercent}% below main supply (\u20AC${wall.price.toFixed(2)}). If ${floor.count === 1 ? "it sells" : "they sell"}, price jumps.`,
        confidence: floor.count === 1 ? "medium" : "low"
      };
    }
    if (hasStrongGap && nextCluster && primaryCluster.count <= 3 && !wall) {
      return {
        type: "price_rising",
        trend: "up",
        emoji: "\u{1F4C8}",
        headline: "Low supply \u2014 price might jump",
        explanation: `Only ${primaryCluster.count} listing${primaryCluster.count === 1 ? "" : "s"} at \u20AC${primaryCluster.min.toFixed(2)}. Next available at \u20AC${nextCluster.min.toFixed(2)} (${nextCluster.count} listings).`,
        confidence: "low"
      };
    }
    if (weakFloor && wall && !wallNearFloor && isUndercut) {
      const gapPercent = (floorToWallGap * 100).toFixed(0);
      if (singleSellerFloor) {
        return {
          type: "price_dropping",
          trend: "down",
          emoji: "\u{1F4C9}",
          headline: "Slight undercut \u2014 prices might follow",
          explanation: `Single seller at \u20AC${floor.price.toFixed(2)}, ${gapPercent}% below main supply (${wall.count} sellers at \u20AC${wall.price.toFixed(2)}). Others might lower prices to compete.`,
          confidence: "medium"
        };
      }
      return {
        type: "price_dropping",
        trend: "down",
        emoji: "\u{1F4C9}",
        headline: "Prices might drop",
        explanation: `${floor.count} sellers at \u20AC${floor.price.toFixed(2)}, ${gapPercent}% below main supply (\u20AC${wall.price.toFixed(2)}). Other sellers might lower prices.`,
        confidence: "high"
      };
    }
    if (wall && distanceBetweenFloorAndWall >= 3) {
      return {
        type: "price_dropping",
        trend: "down",
        emoji: "\u2198\uFE0F",
        headline: "Competitive pressure",
        explanation: `${distanceBetweenFloorAndWall} sellers between \u20AC${floor.price.toFixed(2)} and \u20AC${wall.price.toFixed(2)}. Prices likely to drop as sellers compete.`,
        confidence: "medium"
      };
    }
    if (hasStrongGap && !wall) {
      return {
        type: "price_stable",
        trend: "stable",
        emoji: "\u27A1\uFE0F",
        headline: "Stable price tier",
        explanation: `Clear gap to higher prices. \u20AC${floor.price.toFixed(2)} appears established.`,
        confidence: "high"
      };
    }
    if (hasStrongGap && nextCluster) {
      return {
        type: "price_stable",
        trend: "stable",
        emoji: "\u26A0\uFE0F",
        headline: "Limited supply",
        explanation: `${primaryCluster.count} listings at \u20AC${primaryCluster.min.toFixed(2)}. Next available at \u20AC${nextCluster.min.toFixed(2)}.`,
        confidence: "medium"
      };
    }
    return {
      type: "uncertain",
      trend: "uncertain",
      emoji: "\u{1F504}",
      headline: "Mixed signals",
      explanation: `${totalListings} listings without clear price structure.`,
      confidence: "low"
    };
  }
  function getInsightColor(type) {
    switch (type) {
      case "price_dropping":
        return "#ef4444";
      // Red
      case "price_stable":
        return "#22c55e";
      // Green
      case "price_rising":
        return "#3b82f6";
      // Blue
      case "uncertain":
        return "#6b7280";
    }
  }
  var UNDERCUT_GAP_THRESHOLD;
  var init_insights = __esm({
    "src/insights.ts"() {
      "use strict";
      init_analysis();
      UNDERCUT_GAP_THRESHOLD = 0.25;
    }
  });

  // src/prediction.ts
  function buildPrediction(analysis, insight) {
    var _a;
    const { primaryCluster, floor, wall, qualifyingClusters } = analysis;
    if (!floor) return void 0;
    const floorPrice = floor.price;
    const wallPrice = (_a = wall == null ? void 0 : wall.price) != null ? _a : floorPrice;
    const currentIndex = primaryCluster ? qualifyingClusters.findIndex((c) => c.min === primaryCluster.min) : -1;
    const nextUp = currentIndex >= 0 && currentIndex < qualifyingClusters.length - 1 ? qualifyingClusters[currentIndex + 1] : null;
    if (insight.type === "price_dropping") {
      return {
        direction: "down",
        lowerBound: floorPrice,
        upperBound: wallPrice,
        target: floorPrice,
        rationale: `Sellers at \u20AC${wallPrice.toFixed(2)} might lower prices toward \u20AC${floorPrice.toFixed(2)}.`
      };
    }
    if (insight.type === "price_rising" && nextUp) {
      return {
        direction: "up",
        lowerBound: floorPrice,
        upperBound: nextUp.min,
        target: nextUp.min,
        rationale: `If cheap listings sell out, price might jump to \u20AC${nextUp.min.toFixed(2)}.`
      };
    }
    if (insight.type === "price_stable") {
      if (wall && wallPrice > floorPrice * 1.02) {
        return {
          direction: "stable",
          lowerBound: floorPrice,
          upperBound: wallPrice,
          target: floorPrice,
          rationale: `Price likely to remain around \u20AC${floorPrice.toFixed(2)}. ${wall.count} sellers at \u20AC${wallPrice.toFixed(2)} limit price increase.`
        };
      }
      return {
        direction: "stable",
        lowerBound: floorPrice,
        upperBound: floorPrice,
        target: floorPrice,
        rationale: `Price likely to remain around \u20AC${floorPrice.toFixed(2)}.`
      };
    }
    return {
      direction: "stable",
      lowerBound: floorPrice,
      upperBound: wallPrice,
      target: floorPrice,
      rationale: `Market unclear. Lowest price at \u20AC${floorPrice.toFixed(2)}.`
    };
  }
  var init_prediction = __esm({
    "src/prediction.ts"() {
      "use strict";
    }
  });

  // src/ui.ts
  function buildHistogramBins(prices, rangeMin, rangeMax, cluster, wall) {
    if (prices.length === 0 || rangeMax <= rangeMin) return [];
    const range = rangeMax - rangeMin;
    const binWidth = range / NUM_BINS;
    const bins = [];
    for (let i = 0; i < NUM_BINS; i++) {
      const minPrice = rangeMin + i * binWidth;
      const maxPrice = rangeMin + (i + 1) * binWidth;
      bins.push({
        minPrice,
        maxPrice,
        midPrice: (minPrice + maxPrice) / 2,
        count: 0,
        inCluster: cluster !== null && minPrice <= cluster.max && maxPrice >= cluster.min,
        hasWall: wall !== null && wall.price >= minPrice && wall.price < maxPrice
      });
    }
    for (const price of prices) {
      if (price < rangeMin || price > rangeMax) continue;
      const binIndex = Math.min(Math.floor((price - rangeMin) / binWidth), NUM_BINS - 1);
      if (bins[binIndex]) {
        bins[binIndex].count++;
      }
    }
    return bins;
  }
  function renderHistogram(prices) {
    var _a, _b;
    removeWidget();
    if (prices.length === 0) {
      console.warn("[MKM Price Tracker] No prices to display");
      return;
    }
    const tabNav = document.querySelector("#tabs .nav.nav-tabs");
    const tabContent = document.querySelector("#tabs .tab-content");
    if (!tabNav || !tabContent) {
      console.warn("[MKM Price Tracker] Could not find tab containers");
      return;
    }
    console.log(
      "[MKM Price Tracker] Prices found:",
      prices.length,
      prices.slice(0, 20),
      prices.length > 20 ? "..." : ""
    );
    const analysis = generateMarketAnalysis(prices);
    const insight = generateInsight(analysis);
    const prediction = buildPrediction(analysis, insight);
    console.log(
      "[MKM Price Tracker] Qualifying clusters:",
      analysis.qualifyingClusters.map((c) => `\u20AC${c.min.toFixed(2)}-\u20AC${c.max.toFixed(2)} (${c.count})`)
    );
    const firstTwoQualifying = analysis.qualifyingClusters.slice(0, 2);
    const histogramMin = Math.min((_a = analysis.sortedPrices[0]) != null ? _a : 0, analysis.expectedPrice);
    const histogramMax = firstTwoQualifying.length >= 2 ? firstTwoQualifying[1].max : firstTwoQualifying.length === 1 ? firstTwoQualifying[0].max * 1.1 : (_b = analysis.sortedPrices[analysis.sortedPrices.length - 1]) != null ? _b : 0;
    const filteredPrices = prices.filter((p) => p >= histogramMin && p <= histogramMax);
    const filteredCount = filteredPrices.length;
    const bins = buildHistogramBins(
      filteredPrices,
      histogramMin,
      histogramMax,
      analysis.primaryCluster,
      analysis.wall
    );
    const maxCount = Math.max(...bins.map((b) => b.count), 1);
    const barsHtml = bins.map((bin) => {
      const heightPercent = bin.count / maxCount * 100;
      const classes = [
        "mkm-bar",
        bin.inCluster ? "in-cluster" : "",
        bin.hasWall ? "is-wall" : "",
        bin.count === 0 ? "mkm-bar-empty" : ""
      ].filter(Boolean).join(" ");
      return `
      <div class="${classes}"
           style="height: ${bin.count > 0 ? Math.max(heightPercent, 8) : 0}%;"
           title="\u20AC${bin.minPrice.toFixed(2)} - \u20AC${bin.maxPrice.toFixed(2)}: ${bin.count} offers"
           data-price="${bin.midPrice.toFixed(2)}"
           data-range="\u20AC${bin.minPrice.toFixed(2)} - \u20AC${bin.maxPrice.toFixed(2)}"
           data-count="${bin.count}">
      </div>
    `;
    }).join("");
    const expectedLinePos = histogramMax > histogramMin ? (analysis.expectedPrice - histogramMin) / (histogramMax - histogramMin) * 100 : 50;
    const insightColor = getInsightColor(insight.type);
    if (!document.getElementById(`${TAB_ID}-styles`)) {
      const styleEl = document.createElement("style");
      styleEl.id = `${TAB_ID}-styles`;
      styleEl.textContent = STYLES;
      document.head.appendChild(styleEl);
    }
    const tabNavItem = document.createElement("li");
    tabNavItem.className = "nav-item tab-mkm-tracker";
    tabNavItem.id = TAB_ID;
    tabNavItem.setAttribute("role", "presentation");
    tabNavItem.innerHTML = `
    <a href="#${TAB_CONTENT_ID}" 
       data-bs-toggle="tab" 
       role="tab" 
       aria-controls="${TAB_CONTENT_ID}" 
       class="nav-link"
       tabindex="-1">
      <span>\u{1F4B0}</span>
      <span class="nav-link-title"><span>Fair Value</span></span>
    </a>
  `;
    const tabPane = document.createElement("div");
    tabPane.id = TAB_CONTENT_ID;
    tabPane.setAttribute("role", "tabpanel");
    tabPane.className = "tab-pane d-none h-100 px-3 pt-3";
    if (window.__MKM_DEV__) {
      tabPane.classList.remove("d-none");
      const tabLink = tabNavItem.querySelector("a");
      tabLink.classList.add("active");
      tabPane.classList.add("active", "show");
    }
    tabPane.innerHTML = `
    <div class="mkm-container">
      <!-- Market Insight Card -->
      <div class="mkm-insight" style="background: linear-gradient(135deg, ${insightColor} 0%, ${insightColor}dd 100%);">
        <div class="mkm-insight-header">
          <span class="mkm-insight-emoji">${insight.emoji}</span>
          <span class="mkm-insight-headline">${insight.headline}</span>
        </div>
        <div class="mkm-insight-explanation">${insight.explanation}</div>
      </div>

      <!-- Key Prices -->
      <div class="mkm-prices">
        <div class="mkm-price-card">
          <div class="mkm-price-label">
            Min Price
            <span class="mkm-help" title="Lowest listing available">?</span>
          </div>
          <div class="mkm-price-value">\u20AC${Math.min(...prices).toFixed(2)}</div>
        </div>
        <div class="mkm-price-card fair-value">
          <div class="mkm-price-label">
            Fair Value
            <span class="mkm-help" title="Estimated market value.">?</span>
          </div>
          <div class="mkm-price-value">\u20AC${analysis.expectedPrice.toFixed(2)}</div>
          <div class="mkm-price-note">${analysis.confidence} confidence</div>
        </div>
        <div class="mkm-price-card${analysis.wall ? " wall" : ""}">
          <div class="mkm-price-label">
            Main Supply
            <span class="mkm-help" title="Price where most sellers are concentrated. This often acts as a price ceiling.">?</span>
          </div>
          <div class="mkm-price-value">${analysis.wall ? `\u20AC${analysis.wall.price.toFixed(2)}` : "-"}</div>
          ${analysis.wall ? `<div class="mkm-price-note">${analysis.wall.count} sellers</div>` : ""}
        </div>
      </div>

      ${prediction ? `
      <!-- Prediction Card -->
      <div class="mkm-prediction">
        <div class="mkm-prediction-icon">${prediction.direction === "up" ? "\u{1F4C8}" : prediction.direction === "down" ? "\u{1F4C9}" : "\u2194\uFE0F"}</div>
        <div class="mkm-prediction-content">
          <div class="mkm-prediction-header">
            <span class="mkm-prediction-label">Prediction</span>
            <span class="mkm-prediction-direction ${prediction.direction}">
              ${prediction.direction === "up" ? `\u2191 toward \u20AC${prediction.target.toFixed(2)}` : prediction.direction === "down" ? `\u2193 toward \u20AC${prediction.target.toFixed(2)}` : prediction.lowerBound === prediction.upperBound ? `\u2192 stable at \u20AC${prediction.target.toFixed(2)}` : `\u2192 \u20AC${prediction.lowerBound.toFixed(2)} \u2013 \u20AC${prediction.upperBound.toFixed(2)}`}
            </span>
          </div>
          <div class="mkm-prediction-rationale">${prediction.rationale}</div>
        </div>
      </div>
      ` : ""}

      <!-- Histogram -->
      <div class="mkm-histogram">
        <div class="mkm-histogram-title">Price Distribution (${filteredCount} of ${prices.length} offers)</div>
        <div class="mkm-chart-container">
          <div class="mkm-chart">
            ${barsHtml}
            <div class="mkm-expected-line" 
                 style="left: ${expectedLinePos}%;"
                 data-label="Fair: \u20AC${analysis.expectedPrice.toFixed(2)}">
            </div>
          </div>
        </div>
        <div class="mkm-axis">
          <span>\u20AC${histogramMin.toFixed(2)}</span>
          <span>\u20AC${histogramMax.toFixed(2)}</span>
        </div>
        <div class="mkm-legend">
          <div class="mkm-legend-item">
            <div class="mkm-legend-color cluster"></div>
            <span>Price Range</span>
          </div>
          <div class="mkm-legend-item">
            <div class="mkm-legend-color wall"></div>
            <span>Main Supply</span>
          </div>
          <div class="mkm-legend-item">
            <div class="mkm-legend-color other"></div>
            <span>Other</span>
          </div>
          <div class="mkm-legend-item">
            <div class="mkm-legend-color expected"></div>
            <span>Fair Value</span>
          </div>
        </div>
      </div>

      <!-- Selection Display -->
      <div class="mkm-selection">Click a bar to see details</div>
      <div id="feedback" class="mkm-feedback">
        <span>Was this helpful?</span>
        <button data-answer="yes">\u{1F44D} Yes</button>
        <button data-answer="no">\u{1F44E} No</button>
      </div>

      <!-- Debug Panel -->
      <div class="mkm-debug">
        <button class="mkm-debug-toggle">
          <span>\u{1F527} Technical Details</span>
          <span class="mkm-debug-arrow">\u25BC</span>
        </button>
        <div class="mkm-debug-content">
          <div class="mkm-debug-section">
          <h4>Prices (click to copy)</h4>
          <pre
            class="mkm-copyable"
            data-copy="${prices}"
            title="Click to copy prices"
          >${prices}</pre>
        </div>
        </div>
      </div>
    </div>
  `;
    tabNav.appendChild(tabNavItem);
    tabContent.appendChild(tabPane);
    const selectionDisplay = tabPane.querySelector(".mkm-selection");
    tabPane.querySelectorAll(".mkm-bar").forEach((bar) => {
      bar.addEventListener("click", () => {
        const range = bar.getAttribute("data-range");
        const count = bar.getAttribute("data-count");
        if (selectionDisplay && range && count) {
          selectionDisplay.textContent = `${range}: ${count} offer${count === "1" ? "" : "s"}`;
        }
      });
    });
    const debugToggle = tabPane.querySelector(".mkm-debug-toggle");
    const debugContent = tabPane.querySelector(".mkm-debug-content");
    const debugArrow = tabPane.querySelector(".mkm-debug-arrow");
    debugToggle == null ? void 0 : debugToggle.addEventListener("click", () => {
      debugContent == null ? void 0 : debugContent.classList.toggle("open");
      if (debugArrow) {
        debugArrow.textContent = (debugContent == null ? void 0 : debugContent.classList.contains("open")) ? "\u25B2" : "\u25BC";
      }
    });
    const feedbackEl = tabPane.querySelector("#feedback");
    if (feedbackEl) {
      const buttons = feedbackEl.querySelectorAll("button");
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const answer = btn.dataset.answer;
          submitYesNo(answer, window.location.href, prices);
          feedbackEl.innerHTML = `
  <span>Thanks!</span>
  <button class="comment-btn" style="margin-left:8px">
    Feel free to leave a more complete feedback by clicking this button :)
  </button>
`;
          const commentBtn = feedbackEl.querySelector(".comment-btn");
          commentBtn == null ? void 0 : commentBtn.addEventListener("click", () => {
            openCommentForm();
          });
        });
      });
    }
    tabPane.querySelectorAll(".mkm-copyable").forEach((el) => {
      el.addEventListener("click", async () => {
        const text = el.dataset.copy;
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          el.textContent = "Copied \u2714";
          setTimeout(() => {
            el.textContent = text;
          }, 800);
        } catch {
        }
      });
    });
    console.log("[MKM Price Tracker] Rendered:", analysis);
  }
  function removeWidget() {
    var _a, _b, _c;
    (_a = document.getElementById(TAB_ID)) == null ? void 0 : _a.remove();
    (_b = document.getElementById(TAB_CONTENT_ID)) == null ? void 0 : _b.remove();
    (_c = document.getElementById(`${TAB_ID}-styles`)) == null ? void 0 : _c.remove();
  }
  var TAB_ID, TAB_CONTENT_ID, STYLES, NUM_BINS;
  var init_ui = __esm({
    "src/ui.ts"() {
      "use strict";
      init_analysis();
      init_feedback();
      init_insights();
      init_prediction();
      TAB_ID = "mkm-price-tracker";
      TAB_CONTENT_ID = "tabContent-mkm-tracker";
      STYLES = `
  #${TAB_CONTENT_ID} .mkm-container {
    max-width: 600px;
    margin: 0 auto;
  }

  /* Market Insight Card */
  #${TAB_CONTENT_ID} .mkm-insight {
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 16px;
    color: white;
    position: relative;
    overflow: hidden;
  }

  #${TAB_CONTENT_ID} .mkm-insight::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 100%);
    pointer-events: none;
  }

  #${TAB_CONTENT_ID} .mkm-insight-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  #${TAB_CONTENT_ID} .mkm-insight-emoji {
    font-size: 24px;
  }

  #${TAB_CONTENT_ID} .mkm-insight-headline {
    font-size: 18px;
    font-weight: 700;
  }

  #${TAB_CONTENT_ID} .mkm-insight-explanation {
    font-size: 13px;
    opacity: 0.95;
    line-height: 1.5;
    margin-bottom: 10px;
  }

  #${TAB_CONTENT_ID} .mkm-insight-price {
    font-size: 15px;
    font-weight: 600;
    font-family: 'SF Mono', 'Consolas', monospace;
    background: rgba(255,255,255,0.2);
    padding: 6px 12px;
    border-radius: 6px;
    display: inline-block;
  }

  /* Expected Price Card (smaller now) */
  #${TAB_CONTENT_ID} .mkm-expected-price {
    background: linear-gradient(135deg, #1e3a5f 0%, #0d253f 100%);
    border-radius: 12px;
    padding: 14px 20px;
    margin-bottom: 16px;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  #${TAB_CONTENT_ID} .mkm-expected-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.7;
  }

  #${TAB_CONTENT_ID} .mkm-expected-value {
    font-size: 22px;
    font-weight: 700;
    font-family: 'SF Mono', 'Consolas', monospace;
  }

  #${TAB_CONTENT_ID} .mkm-confidence {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }

  #${TAB_CONTENT_ID} .mkm-confidence.high { background: rgba(34, 197, 94, 0.9); }
  #${TAB_CONTENT_ID} .mkm-confidence.medium { background: rgba(234, 179, 8, 0.9); color: #000; }
  #${TAB_CONTENT_ID} .mkm-confidence.low { background: rgba(239, 68, 68, 0.9); }

  /* Key Prices Grid */
  #${TAB_CONTENT_ID} .mkm-prices {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 12px;
  }

  #${TAB_CONTENT_ID} .mkm-price-card {
    background: #f8fafc;
    border-radius: 10px;
    padding: 12px;
    text-align: center;
    border: 1px solid #e2e8f0;
  }

  #${TAB_CONTENT_ID} .mkm-price-card.fair-value {
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border-color: #22c55e;
  }

  #${TAB_CONTENT_ID} .mkm-price-card.wall {
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border-color: #f59e0b;
  }

  #${TAB_CONTENT_ID} .mkm-price-label {
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  #${TAB_CONTENT_ID} .mkm-price-label .mkm-help {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #cbd5e1;
    color: #475569;
    font-size: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: help;
    font-weight: 700;
  }

  #${TAB_CONTENT_ID} .mkm-price-value {
    font-size: 18px;
    font-weight: 700;
    font-family: 'SF Mono', 'Consolas', monospace;
    color: #1e293b;
  }

  #${TAB_CONTENT_ID} .mkm-price-card.fair-value .mkm-price-value {
    color: #16a34a;
  }

  #${TAB_CONTENT_ID} .mkm-price-card.wall .mkm-price-value {
    color: #d97706;
  }

  #${TAB_CONTENT_ID} .mkm-price-note {
    font-size: 10px;
    color: #94a3b8;
    margin-top: 2px;
  }

  /* Prediction Card (full width) */
  #${TAB_CONTENT_ID} .mkm-prediction {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  #${TAB_CONTENT_ID} .mkm-prediction-icon {
    font-size: 28px;
    flex-shrink: 0;
  }

  #${TAB_CONTENT_ID} .mkm-prediction-content {
    flex: 1;
    min-width: 0;
  }

  #${TAB_CONTENT_ID} .mkm-prediction-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  #${TAB_CONTENT_ID} .mkm-prediction-label {
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  #${TAB_CONTENT_ID} .mkm-prediction-direction {
    font-size: 14px;
    font-weight: 700;
    font-family: 'SF Mono', 'Consolas', monospace;
    color: #1e293b;
  }

  #${TAB_CONTENT_ID} .mkm-prediction-direction.up { color: #16a34a; }
  #${TAB_CONTENT_ID} .mkm-prediction-direction.down { color: #dc2626; }
  #${TAB_CONTENT_ID} .mkm-prediction-direction.stable { color: #2563eb; }

  #${TAB_CONTENT_ID} .mkm-prediction-rationale {
    font-size: 12px;
    color: #64748b;
    line-height: 1.4;
  }


  /* Histogram */
  #${TAB_CONTENT_ID} .mkm-histogram {
    background: #f8fafc;
    border-radius: 12px;
    padding: 20px 16px 12px;
    margin-bottom: 16px;
  }

  #${TAB_CONTENT_ID} .mkm-histogram-title {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  #${TAB_CONTENT_ID} .mkm-chart-container {
    position: relative;
    height: 160px;
    margin-bottom: 8px;
    padding-top: 35px;
  }

  #${TAB_CONTENT_ID} .mkm-chart {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 100%;
    position: relative;
  }

  #${TAB_CONTENT_ID} .mkm-bar {
    flex: 1;
    min-width: 4px;
    max-width: 24px;
    background: #cbd5e1;
    border-radius: 3px 3px 0 0;
    transition: all 0.15s ease;
    cursor: pointer;
    position: relative;
  }

  #${TAB_CONTENT_ID} .mkm-bar:hover {
    filter: brightness(0.9);
  }

  #${TAB_CONTENT_ID} .mkm-bar.in-cluster {
    background: linear-gradient(to top, #3b82f6, #60a5fa);
  }

  #${TAB_CONTENT_ID} .mkm-bar.is-wall {
    background: linear-gradient(to top, #f59e0b, #fbbf24);
    box-shadow: 0 0 0 2px #f59e0b;
  }

  #${TAB_CONTENT_ID} .mkm-bar.is-wall::after {
    content: '\u{1F9F1}';
    position: absolute;
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
  }

  #${TAB_CONTENT_ID} .mkm-bar-empty {
    background: transparent;
    min-height: 0 !important;
  }

  #${TAB_CONTENT_ID} .mkm-expected-line {
    position: absolute;
    bottom: 0;
    width: 2px;
    height: 100%;
    background: #ef4444;
    z-index: 10;
  }

  #${TAB_CONTENT_ID} .mkm-expected-line::before {
    content: '\u25BC';
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    color: #ef4444;
    font-size: 10px;
  }

  #${TAB_CONTENT_ID} .mkm-expected-line::after {
    content: attr(data-label);
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    background: #ef4444;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  /* X-Axis Labels */
  #${TAB_CONTENT_ID} .mkm-axis {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #64748b;
    padding-top: 4px;
    border-top: 1px solid #e2e8f0;
  }

  /* Legend */
  #${TAB_CONTENT_ID} .mkm-legend {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 12px;
    font-size: 11px;
    color: #64748b;
  }

  #${TAB_CONTENT_ID} .mkm-legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  #${TAB_CONTENT_ID} .mkm-legend-color {
    width: 14px;
    height: 10px;
    border-radius: 2px;
  }

  #${TAB_CONTENT_ID} .mkm-legend-color.cluster { background: linear-gradient(to top, #3b82f6, #60a5fa); }
  #${TAB_CONTENT_ID} .mkm-legend-color.wall { background: linear-gradient(to top, #f59e0b, #fbbf24); }
  #${TAB_CONTENT_ID} .mkm-legend-color.other { background: #cbd5e1; }
  #${TAB_CONTENT_ID} .mkm-legend-color.expected { background: #ef4444; width: 3px; height: 14px; }

  /* Selection Display */
  #${TAB_CONTENT_ID} .mkm-selection {
    text-align: center;
    padding: 10px;
    background: #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    color: #334155;
    margin-top: 12px;
  }

  /* Debug Panel */
  #${TAB_CONTENT_ID} .mkm-debug {
    margin-top: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  #${TAB_CONTENT_ID} .mkm-debug-toggle {
    width: 100%;
    padding: 10px 16px;
    background: #f1f5f9;
    border: none;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
  }

  #${TAB_CONTENT_ID} .mkm-debug-toggle:hover {
    background: #e2e8f0;
  }

  #${TAB_CONTENT_ID} .mkm-debug-content {
    display: none;
    padding: 12px 16px;
    background: #fafafa;
    font-family: 'SF Mono', 'Consolas', monospace;
    font-size: 11px;
    max-height: 300px;
    overflow-y: auto;
  }

  #${TAB_CONTENT_ID} .mkm-debug-content.open {
    display: block;
  }

  #${TAB_CONTENT_ID} .mkm-debug-section {
    margin-bottom: 12px;
  }

  #${TAB_CONTENT_ID} .mkm-debug-section h4 {
    font-size: 11px;
    color: #3b82f6;
    margin: 0 0 4px 0;
    font-weight: 600;
  }

  #${TAB_CONTENT_ID} .mkm-debug-section pre {
    margin: 0;
    white-space: pre-wrap;
    color: #334155;
    line-height: 1.4;
  }

  #${TAB_CONTENT_ID} .nav-item.tab-mkm-tracker .nav-link {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  #${TAB_CONTENT_ID} .mkm-feedback {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  #${TAB_CONTENT_ID} .mkm-feedback button {
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: transparent;
    cursor: pointer;
  }

  #${TAB_CONTENT_ID} .mkm-copyable {
      cursor: pointer;
      user-select: all;
    }

  #${TAB_CONTENT_ID} .mkm-copyable:hover {
    background: rgba(0, 0, 0, 0.05);
  }

   #${TAB_CONTENT_ID} .mkm-feedback .comment-btn {
    appearance: none;
    border: 1px solid rgba(0, 0, 0, 0.15);
    background: #ffffff;
    color: #111;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease;
  }

   #${TAB_CONTENT_ID} .mkm-feedback .comment-btn:hover {
    background: #f4f4f4;
  }

   #${TAB_CONTENT_ID} .mkm-feedback .comment-btn:active {
    background: #eaeaea;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
  }

   #${TAB_CONTENT_ID} .mkm-feedback .comment-btn:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.15);
  }

`;
      NUM_BINS = 20;
    }
  });

  // src/content.ts
  var require_content = __commonJS({
    "src/content.ts"() {
      init_scraper();
      init_ui();
      function main() {
        var _a;
        console.log("[MKM Price Tracker] Loaded");
        removeWidget();
        if (typeof window !== "undefined" && window.__MKM_DEV__) {
          const testPrices = (_a = window.__MKM_TEST_PRICES__) != null ? _a : [0.8, 1, 1, 1, 1, 1, 2, 3, 4, 1, 1, 10];
          console.log("[MKM DEV] Rendering with test prices:", testPrices.length);
          renderHistogram(testPrices);
          window.__MKM_RENDER__ = (prices) => {
            removeWidget();
            renderHistogram(prices);
          };
        } else {
          const prices = scrapePrices();
          console.log(`[MKM Price Tracker] Found ${prices.length} prices`);
          renderHistogram(prices);
        }
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", main);
      } else {
        main();
      }
    }
  });
  require_content();
})();
