/**
 * Content Script - Entry point
 * Orchestrates scraping and rendering
 */

import { scrapePrices } from "./scraper";
import { renderHistogram, removeWidget } from "./ui";

function main(): void {
  console.log("[MKM Price Tracker] Loaded");

  removeWidget();

  if (typeof window !== "undefined" && (window as any).__MKM_DEV__) {
    // Dev mode: use test prices or default mock
    const testPrices = (window as any).__MKM_TEST_PRICES__ ?? [0.8, 1, 1, 1, 1, 1, 2, 3, 4, 1, 1, 10];

    console.log("[MKM DEV] Rendering with test prices:", testPrices.length);
    renderHistogram(testPrices);

    // Expose render function for test harness
    (window as any).__MKM_RENDER__ = (prices: number[]) => {
      removeWidget();
      renderHistogram(prices);
    };
  } else {
    const prices = scrapePrices();
    console.log(`[MKM Price Tracker] Found ${prices.length} prices`);
    renderHistogram(prices);
  }
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
