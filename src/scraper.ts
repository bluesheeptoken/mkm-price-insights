/**
 * Scraper module - Extracts prices from the cardmarket page
 */

const OFFER_SELECTOR = ".col-offer";
const PRICE_SELECTOR = ".price-container span";
const QUANTITY_SELECTOR = ".amount-container .item-count";
const MAX_OFFERS = 50;

export interface Offer {
  price: number;
  quantity: number;
}

/**
 * Scrape prices from the page, weighted by quantity.
 * Returns an array of prices where each price appears N times based on seller quantity.
 */
export function scrapePrices(): number[] {
  const offers = scrapeOffers();
  return expandOffers(offers);
}

function scrapeOffers(): Offer[] {
  const offerElements = document.querySelectorAll(OFFER_SELECTOR);
  const offers: Offer[] = [];

  for (const offerEl of offerElements) {
    if (offers.length >= MAX_OFFERS) break;

    const priceEl = offerEl.querySelector(PRICE_SELECTOR);
    const quantityEl = offerEl.querySelector(QUANTITY_SELECTOR);

    const priceText = priceEl?.textContent ?? "";
    const price = parsePrice(priceText);
    const quantity = parseInt(quantityEl?.textContent ?? "1", 10) || 1;

    if (price !== null && price > 0) {
      offers.push({ price, quantity });
    }
  }

  return offers;
}

function expandOffers(offers: Offer[]): number[] {
  const prices: number[] = [];
  for (const offer of offers) {
    for (let i = 0; i < offer.quantity; i++) {
      prices.push(offer.price);
    }
  }
  return prices;
}

/**
 * Parse a European price string like "1.500,00 €" to a number
 * European format: . = thousand separator, , = decimal separator
 */
function parsePrice(text: string): number | null {
  // Remove € symbol and spaces
  let cleaned = text.replace(/€/g, "").replace(/\s/g, "");

  // Remove thousand separators (dots), then convert decimal comma to dot
  // "1.500,00" → "1500,00" → "1500.00"
  cleaned = cleaned.replace(/\./g, "").replace(",", ".");

  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
}
