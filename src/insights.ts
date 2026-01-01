/**
 * Market Insights Engine
 *
 * Generates predictive insights about price direction based on market analysis.
 *
 * Key concepts:
 * - Floor: lowest price point (set by most aggressive seller)
 * - Wall: supply concentration at a price point (creates resistance)
 * - Aggressive seller: someone listing below the wall to capture sales
 *
 * Market dynamics:
 * - Strong gap between floor and wall → demand ate supply → price might rise
 * - Small gap between floor and wall → undercut signal → price might drop
 * - Strong floor (many sellers) = defended price, stable
 */

import {
    MarketAnalysis,
    STRONG_FLOOR_THRESHOLD,
    STRONG_WALL_THRESHOLD,
    MEDIUM_WALL_THRESHOLD,
} from "./analysis";

export type InsightType =
    | "price_dropping" // Signals prices might decrease
    | "price_stable" // Prices likely to stay where they are
    | "price_rising" // Signals prices might increase
    | "uncertain"; // Mixed signals

export type PriceTrend = "down" | "stable" | "up" | "uncertain";

export interface MarketInsight {
    type: InsightType;
    trend: PriceTrend;
    emoji: string;
    headline: string;
    explanation: string;
    confidence: "high" | "medium" | "low";
}

// Gap threshold to distinguish undercut vs demand signal
const UNDERCUT_GAP_THRESHOLD = 0.25; // 25% - below this is undercut, above is demand signal

/**
 * Generate market insight with price direction prediction
 */
export function generateInsight(analysis: MarketAnalysis): MarketInsight {
    const { primaryCluster, floor, wall, hasStrongGap, qualifyingClusters, totalListings, distanceBetweenFloorAndWall } =
        analysis;

    if (!primaryCluster || !floor) {
        return {
            type: "uncertain",
            trend: "uncertain",
            emoji: "❓",
            headline: "Insufficient data",
            explanation: "Not enough listings to analyze market structure.",
            confidence: "low",
        };
    }

    const currentIndex = qualifyingClusters.findIndex((c) => c.min === primaryCluster.min);
    const nextCluster =
        currentIndex >= 0 && currentIndex < qualifyingClusters.length - 1 ? qualifyingClusters[currentIndex + 1] : null;

    const wallStrength = wall?.strength ?? 0;
    const floorStrength = floor.strength;

    const strongFloor = floorStrength >= STRONG_FLOOR_THRESHOLD;
    const strongWall = wallStrength >= STRONG_WALL_THRESHOLD;
    const mediumWall = wallStrength >= MEDIUM_WALL_THRESHOLD;
    const wallNearFloor = wall && Math.abs(wall.price - floor.price) < primaryCluster.median * 0.025;
    const weakFloor = floor.count <= 2;
    const singleSellerFloor = floor.count === 1;

    // Gap between floor and wall - distinguishes undercut vs demand signal
    const floorToWallGap = wall ? (wall.price - floor.price) / wall.price : 0;
    const isUndercut = floorToWallGap < UNDERCUT_GAP_THRESHOLD; // Small gap = undercut
    const isDemandSignal = floorToWallGap >= UNDERCUT_GAP_THRESHOLD; // Large gap = demand ate supply

    // ============ STRONG STABLE SIGNALS ============

    // Wall at floor = strong support, price locked
    if (wallNearFloor && strongWall) {
        return {
            type: "price_stable",
            trend: "stable",
            emoji: "🔒",
            headline: "Price locked",
            explanation: `${wall!.count} sellers at €${wall!.price.toFixed(2)}. Price appears stable.`,
            confidence: "high",
        };
    }

    // Strong floor = defended price level
    if (strongFloor) {
        return {
            type: "price_stable",
            trend: "stable",
            emoji: "🛡️",
            headline: "Price defended",
            explanation: `${floor.count} sellers at €${floor.price.toFixed(2)} hold this price level.`,
            confidence: "high",
        };
    }

    // ============ PRICE RISING SIGNALS (demand ate supply) ============

    // Few listings with LARGE gap to wall AND few items between → demand signal
    // If there's lots of supply between, it's competitive pressure, not demand
    const fewItemsBetween = distanceBetweenFloorAndWall <= 2;

    if (weakFloor && wall && !wallNearFloor && isDemandSignal && fewItemsBetween) {
        const gapPercent = (floorToWallGap * 100).toFixed(0);

        return {
            type: "price_rising",
            trend: "up",
            emoji: "📈",
            headline: "Low supply — price might jump",
            explanation: `Only ${floor.count} listing${floor.count === 1 ? "" : "s"} at €${floor.price.toFixed(2)}, ${gapPercent}% below main supply (€${wall.price.toFixed(2)}). If ${floor.count === 1 ? "it sells" : "they sell"}, price jumps.`,
            confidence: floor.count === 1 ? "medium" : "low",
        };
    }

    // Few listings with strong gap to next cluster (no wall case)
    if (hasStrongGap && nextCluster && primaryCluster.count <= 3 && !wall) {
        return {
            type: "price_rising",
            trend: "up",
            emoji: "📈",
            headline: "Low supply — price might jump",
            explanation: `Only ${primaryCluster.count} listing${primaryCluster.count === 1 ? "" : "s"} at €${primaryCluster.min.toFixed(2)}. Next available at €${nextCluster.min.toFixed(2)} (${nextCluster.count} listings).`,
            confidence: "low",
        };
    }

    // ============ PRICE DROPPING SIGNALS (undercut) ============  

    // Few listings with SMALL gap to wall → undercut signal, prices might drop
    if (weakFloor && wall && !wallNearFloor && isUndercut) {
        const gapPercent = (floorToWallGap * 100).toFixed(0);

        if (singleSellerFloor) {
            return {
                type: "price_dropping",
                trend: "down",
                emoji: "📉",
                headline: "Slight undercut — prices might follow",
                explanation: `Single seller at €${floor.price.toFixed(2)}, ${gapPercent}% below main supply (${wall.count} sellers at €${wall.price.toFixed(2)}). Others might lower prices to compete.`,
                confidence: "medium",
            };
        }

        return {
            type: "price_dropping",
            trend: "down",
            emoji: "📉",
            headline: "Prices might drop",
            explanation: `${floor.count} sellers at €${floor.price.toFixed(2)}, ${gapPercent}% below main supply (€${wall.price.toFixed(2)}). Other sellers might lower prices.`,
            confidence: "high",
        };
    }

    // Multiple sellers between floor and wall = competitive, prices will drop toward floor
    // This also catches "large gap with lots of supply" - NOT a demand signal
    if (wall && distanceBetweenFloorAndWall >= 3) {
        return {
            type: "price_dropping",
            trend: "down",
            emoji: "↘️",
            headline: "Competitive pressure",
            explanation: `${distanceBetweenFloorAndWall} sellers between €${floor.price.toFixed(2)} and €${wall.price.toFixed(2)}. Prices likely to drop as sellers compete.`,
            confidence: "medium",
        };
    }

    // ============ ISOLATED / STABLE TIER ============

    if (hasStrongGap && !wall) {
        return {
            type: "price_stable",
            trend: "stable",
            emoji: "➡️",
            headline: "Stable price tier",
            explanation: `Clear gap to higher prices. €${floor.price.toFixed(2)} appears established.`,
            confidence: "high",
        };
    }

    // Limited supply without strong structure
    if (hasStrongGap && nextCluster) {
        return {
            type: "price_stable",
            trend: "stable",
            emoji: "⚠️",
            headline: "Limited supply",
            explanation: `${primaryCluster.count} listings at €${primaryCluster.min.toFixed(2)}. Next available at €${nextCluster.min.toFixed(2)}.`,
            confidence: "medium",
        };
    }

    // ============ FALLBACK ============

    return {
        type: "uncertain",
        trend: "uncertain",
        emoji: "🔄",
        headline: "Mixed signals",
        explanation: `${totalListings} listings without clear price structure.`,
        confidence: "low",
    };
}

/**
 * Get color for insight type
 */
export function getInsightColor(type: InsightType): string {
    switch (type) {
        case "price_dropping":
            return "#ef4444"; // Red
        case "price_stable":
            return "#22c55e"; // Green
        case "price_rising":
            return "#3b82f6"; // Blue
        case "uncertain":
            return "#6b7280"; // Gray
    }
}
