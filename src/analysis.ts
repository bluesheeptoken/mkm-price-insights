/**
 * Market Analysis Engine
 *
 * Central module that generates comprehensive market analysis.
 * Predictions and insights are derived from this analysis.
 */

// ============ Types ============

export interface Cluster {
    prices: number[];
    min: number;
    max: number;
    median: number;
    count: number;
}

export interface Floor {
    price: number;
    count: number;
    strength: number; // Ratio of floor sellers to cluster size (0-1)
}

export interface Wall {
    price: number;
    count: number;
    strength: number; // Ratio of wall size to cluster size (0-1)
}

export interface MarketAnalysis {
    // Raw data
    prices: number[];
    sortedPrices: number[];
    totalListings: number;

    // Clustering results
    allClusters: Cluster[];
    qualifyingClusters: Cluster[];
    primaryCluster: Cluster | null;

    // Market structure
    floor: Floor | null;
    wall: Wall | null;
    distanceBetweenFloorAndWall: number;
    hasStrongGap: boolean;

    // Calculated values
    expectedPrice: number;
    confidence: "high" | "medium" | "low";

    // Statistics
    median: number;
    epsilon: number;
}

// ============ Constants ============

const EPSILON_PERCENT = 0.025; // 2.5% of median for clustering tolerance
const MIN_CLUSTER_SIZE = 3;
const MIN_CLUSTER_PERCENT = 0.25; // 25% of total
const GAP_THRESHOLD = 0.12; // 12% gap is considered "strong"
const WALL_MIN_SIZE = 5; // Minimum items to be considered a wall

// Thresholds for insight analysis
export const STRONG_WALL_THRESHOLD = 0.4; // 40% of cluster = strong wall
export const MEDIUM_WALL_THRESHOLD = 0.25; // 25% of cluster = medium wall
export const STRONG_FLOOR_THRESHOLD = 0.3; // 30% at floor = strong

// ============ Main Function ============

/**
 * Generate comprehensive market analysis from a list of prices.
 * This is the single source of truth for all market metrics.
 */
export function generateMarketAnalysis(prices: number[]): MarketAnalysis {
    const emptyAnalysis: MarketAnalysis = {
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
        epsilon: 0,
    };

    if (prices.length === 0) {
        return emptyAnalysis;
    }

    const sortedPrices = [...prices].sort((a, b) => a - b);
    const median = calculateMedian(sortedPrices);
    const epsilon = median * EPSILON_PERCENT;

    // Edge case: very few listings → can't determine fair value
    if (sortedPrices.length < 3) {
        return {
            ...emptyAnalysis,
            sortedPrices,
            median,
            epsilon,
        };
    }

    // Step 1: Find all clusters
    const allClusters = findClusters(sortedPrices, epsilon);

    // Step 2: Filter to qualifying clusters (≥3 items OR ≥25% of total)
    const minCountForPercent = Math.ceil(sortedPrices.length * MIN_CLUSTER_PERCENT);
    const qualifyingClusters = allClusters
        .filter((c) => c.count >= MIN_CLUSTER_SIZE || c.count >= minCountForPercent)
        .sort((a, b) => a.min - b.min);

    // Step 3: Select primary cluster (lowest qualifying)
    const primaryCluster = qualifyingClusters.length > 0 ? qualifyingClusters[0]! : null;

    if (!primaryCluster) {
        return {
            ...emptyAnalysis,
            sortedPrices,
            allClusters,
            qualifyingClusters,
            median,
            epsilon,
        };
    }

    // Step 4: Analyze market structure
    const floor = findFloor(sortedPrices, primaryCluster);
    const wall = findFirstWall(qualifyingClusters, WALL_MIN_SIZE);
    const distanceBetweenFloorAndWall = computeDistanceBetweenFloorAndWall(sortedPrices, floor, wall);

    // Step 5: Detect gap after cluster
    const hasStrongGap = detectStrongGap(sortedPrices, primaryCluster, GAP_THRESHOLD);

    // Step 6: Calculate fair value
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
        epsilon,
    };
}

// ============ Fair Value Calculation ============

/**
 * Calculate fair value weighted by supply distribution.
 *
 * - Strong floor (many sellers) → fair value = floor (price is defended)
 * - Weak floor (few sellers) → fair value pulled toward wall (floor will sell out)
 * - No wall → fair value = floor
 *
 * Formula: fairValue = floor + (wall - floor) × wallPull × maxPull
 * Where wallPull = 1 - min(floorStrength / strongFloorThreshold, 1)
 */
function calculateFairValue(
    cluster: Cluster,
    floor: Floor,
    wall: Wall | null,
    hasStrongGap: boolean,
    epsilon: number
): { expectedPrice: number; confidence: "high" | "medium" | "low" } {
    const wallNearFloor = wall && Math.abs(wall.price - floor.price) < epsilon;

    // Case 1: No wall → fair value is floor
    if (!wall) {
        const confidence = hasStrongGap ? "high" : floor.strength >= STRONG_FLOOR_THRESHOLD ? "high" : "medium";
        return { expectedPrice: floor.price, confidence };
    }

    // Case 2: Wall at floor → price is locked
    if (wallNearFloor) {
        return {
            expectedPrice: floor.price,
            confidence: wall.strength >= STRONG_WALL_THRESHOLD ? "high" : "medium",
        };
    }

    // Case 3: Wall above floor → weighted by floor strength
    // Strong floor = stays at floor, weak floor = pulled toward wall
    const floorWeight = Math.min(floor.strength / STRONG_FLOOR_THRESHOLD, 1); // 0 to 1
    const wallPull = 1 - floorWeight; // 1 = weak floor (full pull), 0 = strong floor (no pull)
    const maxPull = 0.5; // Cap at midpoint - you can still buy at floor if quick

    const expectedPrice = floor.price + (wall.price - floor.price) * wallPull * maxPull;

    // Confidence based on floor strength
    const confidence: "high" | "medium" | "low" =
        floorWeight >= 1 ? "high" : floorWeight >= 0.5 ? "medium" : "low";

    return { expectedPrice, confidence };
}

// ============ Market Structure Functions ============

/**
 * Find the floor: aggressive sellers near the minimum price
 * Computed on ALL prices - anyone at the minimum affects the floor
 */
function findFloor(allPrices: number[], cluster: Cluster): Floor {
    const minPrice = Math.min(...allPrices);
    const tolerance = minPrice * 0.01; // 1% tolerance
    const floorPrices = allPrices.filter((p) => p <= minPrice + tolerance);

    return {
        price: minPrice,
        count: floorPrices.length,
        strength: floorPrices.length / cluster.count,
    };
}

/**
 * Find the first wall: supply concentration at a price point
 * Wall = ≥5 items within 1% of each other
 * Searches ALL qualifying clusters to find the first wall (might be in a higher tier)
 */
function findFirstWall(clusters: Cluster[], minSize: number): Wall | null {
    // Search all clusters from lowest to highest for a wall
    const sortedClusters = [...clusters].sort((a, b) => a.min - b.min);

    for (const cluster of sortedClusters) {
        if (cluster.prices.length === 0) continue;

        const sorted = [...cluster.prices].sort((a, b) => a - b);

        // Scan through prices looking for concentrations
        for (let i = 0; i < sorted.length; i++) {
            const basePrice = sorted[i]!;
            const tolerance = basePrice * 0.01; // 1% tolerance

            // Count items within tolerance of this price
            let count = 0;
            for (let j = i; j < sorted.length && sorted[j]! <= basePrice + tolerance; j++) {
                count++;
            }

            if (count >= minSize) {
                // Use total cluster count for strength (the cluster where wall was found)
                return {
                    price: basePrice,
                    count,
                    strength: count / cluster.count,
                };
            }
        }
    }

    return null;
}

/**
 * Count sellers between floor and wall
 * Computed on ALL prices - captures all available supply in the "squeeze" zone
 */
function computeDistanceBetweenFloorAndWall(allPrices: number[], floor: Floor, wall: Wall | null): number {
    if (!wall) return 0;

    const floorCeiling = floor.price * 1.01; // 1% above floor
    const wallFloor = wall.price * 0.99; // 1% below wall

    // If floor and wall overlap, no "between"
    if (floorCeiling >= wallFloor) return 0;

    return allPrices.filter((p) => p > floorCeiling && p < wallFloor).length;
}

// ============ Clustering Functions ============

function calculateMedian(sorted: number[]): number {
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function findClusters(sortedPrices: number[], epsilon: number): Cluster[] {
    const clusters: Cluster[] = [];
    let currentCluster: number[] = [];

    for (const price of sortedPrices) {
        if (currentCluster.length === 0) {
            currentCluster.push(price);
        } else {
            const lastPrice = currentCluster[currentCluster.length - 1]!;
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

function createCluster(prices: number[]): Cluster {
    const sorted = [...prices].sort((a, b) => a - b);
    return {
        prices: sorted,
        min: sorted[0]!,
        max: sorted[sorted.length - 1]!,
        median: calculateMedian(sorted),
        count: sorted.length,
    };
}

function detectStrongGap(sortedPrices: number[], cluster: Cluster, gapThreshold: number): boolean {
    const clusterMaxIndex = sortedPrices.findIndex((p) => p > cluster.max);

    if (clusterMaxIndex === -1) {
        return true; // No prices after cluster = isolated
    }

    const nextPrice = sortedPrices[clusterMaxIndex]!;
    const gap = (nextPrice - cluster.max) / cluster.median;

    return gap >= gapThreshold;
}

