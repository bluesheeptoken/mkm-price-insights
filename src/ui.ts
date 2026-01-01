/**
 * UI module - Price histogram with wall detection
 */

import { generateMarketAnalysis, MarketAnalysis, Cluster, Wall } from "./analysis";
import { openCommentForm, submitYesNo } from "./feedback";
import { generateInsight, getInsightColor } from "./insights";
import { buildPrediction } from "./prediction";

const TAB_ID = "mkm-price-tracker";
const TAB_CONTENT_ID = "tabContent-mkm-tracker";

const STYLES = `
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
    content: '🧱';
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
    content: '▼';
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

interface HistogramBin {
  minPrice: number;
  maxPrice: number;
  midPrice: number;
  count: number;
  inCluster: boolean;
  hasWall: boolean;
}

const NUM_BINS = 20; // Target number of bars in histogram

function buildHistogramBins(
  prices: number[],
  rangeMin: number,
  rangeMax: number,
  cluster: Cluster | null,
  wall: Wall | null
): HistogramBin[] {
  if (prices.length === 0 || rangeMax <= rangeMin) return [];

  // Calculate bin width
  const range = rangeMax - rangeMin;
  const binWidth = range / NUM_BINS;

  // Initialize bins
  const bins: HistogramBin[] = [];
  for (let i = 0; i < NUM_BINS; i++) {
    const minPrice = rangeMin + i * binWidth;
    const maxPrice = rangeMin + (i + 1) * binWidth;
    bins.push({
      minPrice,
      maxPrice,
      midPrice: (minPrice + maxPrice) / 2,
      count: 0,
      inCluster: cluster !== null && minPrice <= cluster.max && maxPrice >= cluster.min,
      hasWall: wall !== null && wall.price >= minPrice && wall.price < maxPrice,
    });
  }

  // Count prices into bins
  for (const price of prices) {
    if (price < rangeMin || price > rangeMax) continue;
    const binIndex = Math.min(Math.floor((price - rangeMin) / binWidth), NUM_BINS - 1);
    if (bins[binIndex]) {
      bins[binIndex].count++;
    }
  }

  return bins;
}

export function renderHistogram(prices: number[]): void {
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

  // ============ SINGLE ANALYSIS ENTRY POINT ============
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
    analysis.qualifyingClusters.map((c) => `€${c.min.toFixed(2)}-€${c.max.toFixed(2)} (${c.count})`)
  );

  // ============ HISTOGRAM RANGE ============
  const firstTwoQualifying = analysis.qualifyingClusters.slice(0, 2);
  const histogramMin = Math.min(analysis.sortedPrices[0] ?? 0, analysis.expectedPrice);
  const histogramMax =
    firstTwoQualifying.length >= 2
      ? firstTwoQualifying[1]!.max
      : firstTwoQualifying.length === 1
        ? firstTwoQualifying[0]!.max * 1.1 // Add 10% buffer if only 1 cluster
        : (analysis.sortedPrices[analysis.sortedPrices.length - 1] ?? 0);

  // Filter prices to histogram range
  const filteredPrices = prices.filter((p) => p >= histogramMin && p <= histogramMax);
  const filteredCount = filteredPrices.length;

  // Build histogram bins
  const bins = buildHistogramBins(
    filteredPrices,
    histogramMin,
    histogramMax,
    analysis.primaryCluster,
    analysis.wall
  );

  const maxCount = Math.max(...bins.map((b) => b.count), 1);

  // Build bars HTML
  const barsHtml = bins
    .map((bin) => {
      const heightPercent = (bin.count / maxCount) * 100;
      const classes = [
        "mkm-bar",
        bin.inCluster ? "in-cluster" : "",
        bin.hasWall ? "is-wall" : "",
        bin.count === 0 ? "mkm-bar-empty" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
      <div class="${classes}"
           style="height: ${bin.count > 0 ? Math.max(heightPercent, 8) : 0}%;"
           title="€${bin.minPrice.toFixed(2)} - €${bin.maxPrice.toFixed(2)}: ${bin.count} offers"
           data-price="${bin.midPrice.toFixed(2)}"
           data-range="€${bin.minPrice.toFixed(2)} - €${bin.maxPrice.toFixed(2)}"
           data-count="${bin.count}">
      </div>
    `;
    })
    .join("");

  // Expected price line position
  const expectedLinePos =
    histogramMax > histogramMin
      ? ((analysis.expectedPrice - histogramMin) / (histogramMax - histogramMin)) * 100
      : 50;

  // Get insight color
  const insightColor = getInsightColor(insight.type);

  // Inject styles
  if (!document.getElementById(`${TAB_ID}-styles`)) {
    const styleEl = document.createElement("style");
    styleEl.id = `${TAB_ID}-styles`;
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  // Create tab nav item
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
      <span>💰</span>
      <span class="nav-link-title"><span>Fair Value</span></span>
    </a>
  `;

  // Create tab content
  const tabPane = document.createElement("div");
  tabPane.id = TAB_CONTENT_ID;
  tabPane.setAttribute("role", "tabpanel");
  tabPane.className = "tab-pane d-none h-100 px-3 pt-3";
  if ((window as any).__MKM_DEV__) {
    tabPane.classList.remove("d-none");
    const tabLink = tabNavItem.querySelector("a") as HTMLElement;
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
          <div class="mkm-price-value">€${Math.min(...prices).toFixed(2)}</div>
        </div>
        <div class="mkm-price-card fair-value">
          <div class="mkm-price-label">
            Fair Value
            <span class="mkm-help" title="Estimated market value.">?</span>
          </div>
          <div class="mkm-price-value">€${analysis.expectedPrice.toFixed(2)}</div>
          <div class="mkm-price-note">${analysis.confidence} confidence</div>
        </div>
        <div class="mkm-price-card${analysis.wall ? " wall" : ""}">
          <div class="mkm-price-label">
            Main Supply
            <span class="mkm-help" title="Price where most sellers are concentrated. This often acts as a price ceiling.">?</span>
          </div>
          <div class="mkm-price-value">${analysis.wall ? `€${analysis.wall.price.toFixed(2)}` : "-"}</div>
          ${analysis.wall ? `<div class="mkm-price-note">${analysis.wall.count} sellers</div>` : ""}
        </div>
      </div>

      ${prediction
      ? `
      <!-- Prediction Card -->
      <div class="mkm-prediction">
        <div class="mkm-prediction-icon">${prediction.direction === "up" ? "📈" : prediction.direction === "down" ? "📉" : "↔️"}</div>
        <div class="mkm-prediction-content">
          <div class="mkm-prediction-header">
            <span class="mkm-prediction-label">Prediction</span>
            <span class="mkm-prediction-direction ${prediction.direction}">
              ${prediction.direction === "up"
        ? `↑ toward €${prediction.target.toFixed(2)}`
        : prediction.direction === "down"
          ? `↓ toward €${prediction.target.toFixed(2)}`
          : prediction.lowerBound === prediction.upperBound
            ? `→ stable at €${prediction.target.toFixed(2)}`
            : `→ €${prediction.lowerBound.toFixed(2)} – €${prediction.upperBound.toFixed(2)}`
      }
            </span>
          </div>
          <div class="mkm-prediction-rationale">${prediction.rationale}</div>
        </div>
      </div>
      `
      : ""
    }

      <!-- Histogram -->
      <div class="mkm-histogram">
        <div class="mkm-histogram-title">Price Distribution (${filteredCount} of ${prices.length} offers)</div>
        <div class="mkm-chart-container">
          <div class="mkm-chart">
            ${barsHtml}
            <div class="mkm-expected-line" 
                 style="left: ${expectedLinePos}%;"
                 data-label="Fair: €${analysis.expectedPrice.toFixed(2)}">
            </div>
          </div>
        </div>
        <div class="mkm-axis">
          <span>€${histogramMin.toFixed(2)}</span>
          <span>€${histogramMax.toFixed(2)}</span>
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
        <button data-answer="yes">👍 Yes</button>
        <button data-answer="no">👎 No</button>
      </div>

      <!-- Debug Panel -->
      <div class="mkm-debug">
        <button class="mkm-debug-toggle">
          <span>🔧 Technical Details</span>
          <span class="mkm-debug-arrow">▼</span>
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

  // Append to DOM
  tabNav.appendChild(tabNavItem);
  tabContent.appendChild(tabPane);

  // Event: Bar click
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

  // Event: Debug toggle
  const debugToggle = tabPane.querySelector(".mkm-debug-toggle");
  const debugContent = tabPane.querySelector(".mkm-debug-content");
  const debugArrow = tabPane.querySelector(".mkm-debug-arrow");
  debugToggle?.addEventListener("click", () => {
    debugContent?.classList.toggle("open");
    if (debugArrow) {
      debugArrow.textContent = debugContent?.classList.contains("open") ? "▲" : "▼";
    }
  });

  
  const feedbackEl = tabPane.querySelector<HTMLDivElement>("#feedback");

  if (feedbackEl) {
    const buttons = feedbackEl.querySelectorAll<HTMLButtonElement>("button");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const answer = btn.dataset.answer as "yes" | "no";
        submitYesNo(answer, window.location.href, prices);

        // UX: prevent double submit
        feedbackEl.innerHTML = `
  <span>Thanks!</span>
  <button class="comment-btn" style="margin-left:8px">
    Feel free to leave a more complete feedback by clicking this button :)
  </button>
`;

const commentBtn =
  feedbackEl.querySelector<HTMLButtonElement>(".comment-btn");

commentBtn?.addEventListener("click", () => {
  openCommentForm();
});
      });
    });
  }

  tabPane
  .querySelectorAll<HTMLElement>(".mkm-copyable")
  .forEach((el) => {
    el.addEventListener("click", async () => {
      const text = el.dataset.copy;
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        el.textContent = "Copied ✔";
        setTimeout(() => {
          el.textContent = text;
        }, 800);
      } catch {
        // ignore
      }
    });
  });

  console.log("[MKM Price Tracker] Rendered:", analysis);
}

export function removeWidget(): void {
  document.getElementById(TAB_ID)?.remove();
  document.getElementById(TAB_CONTENT_ID)?.remove();
  document.getElementById(`${TAB_ID}-styles`)?.remove();
}
