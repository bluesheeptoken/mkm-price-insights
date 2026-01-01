/**
 * Price Prediction Engine
 *
 * Generates price predictions based on market analysis and insight.
 *
 * Predictions indicate WHERE the price might settle:
 * - Wall compression: wall sellers might undercut toward floor
 * - Stable: price likely stays at current level
 * - Rising: low supply might cause price jump to next cluster
 */

import { MarketAnalysis } from "./analysis";
import { MarketInsight } from "./insights";

export interface PricePrediction {
    direction: "up" | "down" | "stable";
    lowerBound: number;
    upperBound: number;
    target: number;
    rationale: string;
}

/**
 * Build a price prediction based on market analysis and generated insight
 */
export function buildPrediction(analysis: MarketAnalysis, insight: MarketInsight): PricePrediction | undefined {
    const { primaryCluster, floor, wall, qualifyingClusters } = analysis;

    if (!floor) return undefined;

    const floorPrice = floor.price;
    const wallPrice = wall?.price ?? floorPrice;

    // Find next cluster up for potential price jump scenarios
    const currentIndex = primaryCluster ? qualifyingClusters.findIndex((c) => c.min === primaryCluster.min) : -1;
    const nextUp =
        currentIndex >= 0 && currentIndex < qualifyingClusters.length - 1 ? qualifyingClusters[currentIndex + 1] : null;

    // ============ WALL COMPRESSION / PRICE DROPPING ============
    // Aggressive sellers below wall → wall might compress toward floor
    if (insight.type === "price_dropping") {
        return {
            direction: "down",
            lowerBound: floorPrice,
            upperBound: wallPrice,
            target: floorPrice,
            rationale: `Sellers at €${wallPrice.toFixed(2)} might lower prices toward €${floorPrice.toFixed(2)}.`,
        };
    }

    // ============ PRICE MAY RISE ============
    // Low supply at current tier, next tier is higher
    if (insight.type === "price_rising" && nextUp) {
        return {
            direction: "up",
            lowerBound: floorPrice,
            upperBound: nextUp.min,
            target: nextUp.min,
            rationale: `If cheap listings sell out, price might jump to €${nextUp.min.toFixed(2)}.`,
        };
    }

    // ============ STABLE FLOOR ============
    if (insight.type === "price_stable") {
        // If wall exists and is above floor, show the range
        if (wall && wallPrice > floorPrice * 1.02) {
            return {
                direction: "stable",
                lowerBound: floorPrice,
                upperBound: wallPrice,
                target: floorPrice,
                rationale: `Price likely to remain around €${floorPrice.toFixed(2)}. ${wall.count} sellers at €${wallPrice.toFixed(2)} limit price increase.`,
            };
        }

        // No wall or wall at floor = flat price
        return {
            direction: "stable",
            lowerBound: floorPrice,
            upperBound: floorPrice,
            target: floorPrice,
            rationale: `Price likely to remain around €${floorPrice.toFixed(2)}.`,
        };
    }

    // ============ UNCERTAIN / FALLBACK ============
    return {
        direction: "stable",
        lowerBound: floorPrice,
        upperBound: wallPrice,
        target: floorPrice,
        rationale: `Market unclear. Lowest price at €${floorPrice.toFixed(2)}.`,
    };
}
