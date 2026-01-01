/**
 * Unit test for market analysis algorithm
 * Run with: npx esbuild src/expectedPrice.test.ts --bundle --platform=node --outfile=dist/test.js && node dist/test.js
 */

import { generateMarketAnalysis, MarketAnalysis } from "./analysis";
import { generateInsight } from "./insights";

// ============ Test Cases ============

const testCase1 = {
    name: "Standard case (floor = cluster min)",
    prices: [
        28, 28.9, 29.5, 29.9, 29.99, 29.99, 29.99, 30, 30, 30, 31.99, 32, 34, 34.9, 34.99, 34.99, 35, 35, 35, 35,
        35.44, 37.5, 39, 39.9, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 44, 45, 45, 45, 45, 55, 55, 58,
        58, 59, 59.99, 60, 65, 75, 78, 80, 89.99, 98, 105.01, 125,
    ],
};

const testCase2 = {
    name: "Outlier below cluster (aggressive undercut)",
    prices: [
        25, // ← Outlier below cluster!
        28, 28.9, 29.5, 29.9, 29.99, 29.99, 29.99, 30, 30, 30, 31.99, 32, 34, 34.9, 34.99, 34.99, 35, 35, 35, 35,
        35.44, 37.5, 39, 39.9, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 44, 45, 45, 45, 45, 55, 55, 58,
        58, 59, 59.99, 60, 65, 75, 78, 80, 89.99, 98, 105.01, 125,
    ],
};

const testCase3 = {
    name: "Multiple outliers below cluster",
    prices: [
        24,
        24.5,
        25, // ← 3 aggressive sellers below cluster
        28, 28.9, 29.5, 29.9, 29.99, 29.99, 29.99, 30, 30, 30, 31.99, 32, 34, 34.9, 34.99, 34.99, 35, 35, 35, 35,
        35.44, 37.5, 39, 39.9, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40,
    ],
};

// ============ Test Runner ============

function runTest(testCase: { name: string; prices: number[] }) {
    const { name, prices } = testCase;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`TEST: ${name}`);
    console.log("=".repeat(60));

    console.log(`\nTotal prices: ${prices.length}`);
    console.log(`Min: €${Math.min(...prices).toFixed(2)}`);
    console.log(`Max: €${Math.max(...prices).toFixed(2)}`);

    const analysis = generateMarketAnalysis(prices);

    console.log(`\nMedian: €${analysis.median.toFixed(2)}`);
    console.log(`Epsilon (2.5% of median): €${analysis.epsilon.toFixed(2)}`);

    console.log("\n--- Clusters Found ---");
    analysis.allClusters.slice(0, 5).forEach((cluster, i) => {
        const isLowest = cluster === analysis.primaryCluster;
        console.log(
            `${isLowest ? "→" : " "} Cluster ${i + 1}: €${cluster.min.toFixed(2)} - €${cluster.max.toFixed(2)} (${cluster.count} items)`
        );
    });
    if (analysis.allClusters.length > 5) {
        console.log(`  ... and ${analysis.allClusters.length - 5} more clusters`);
    }

    console.log("\n--- Market Structure ---");
    if (analysis.primaryCluster) {
        console.log(
            `Cluster: €${analysis.primaryCluster.min.toFixed(2)} - €${analysis.primaryCluster.max.toFixed(2)} (${analysis.primaryCluster.count} items)`
        );
        console.log(`Strong gap: ${analysis.hasStrongGap ? "YES" : "NO"}`);
    }

    if (analysis.floor) {
        const floorIcon = analysis.floor.count === 1 ? "⚠️" : analysis.floor.count >= 3 ? "✓" : "";
        const inCluster = analysis.primaryCluster && analysis.floor.price >= analysis.primaryCluster.min;
        console.log(`\nFloor: €${analysis.floor.price.toFixed(2)} ${inCluster ? "(in cluster)" : "(BELOW cluster)"}`);
        console.log(
            `  ${analysis.floor.count} seller(s) (${(analysis.floor.strength * 100).toFixed(0)}% of cluster) ${floorIcon}`
        );
        if (analysis.floor.count === 1) {
            console.log(`  Single undercut - less trustworthy`);
        } else if (analysis.floor.count >= 3) {
            console.log(`  Multiple aggressive sellers - stronger floor`);
        }
    }

    if (analysis.wall) {
        console.log(`\nWall: €${analysis.wall.price.toFixed(2)}`);
        console.log(`  ${analysis.wall.count} items (${(analysis.wall.strength * 100).toFixed(0)}% of cluster)`);
    } else {
        console.log(`\nWall: none`);
    }

    console.log(`\nBetween floor and wall: ${analysis.distanceBetweenFloorAndWall} seller(s)`);
    console.log(`Confidence: ${analysis.confidence.toUpperCase()}`);

    console.log("\n--- Result ---");
    console.log(`Fair Value: €${analysis.expectedPrice.toFixed(2)}`);

    if (analysis.primaryCluster && analysis.floor) {
        const diffFromFloor = analysis.expectedPrice - analysis.floor.price;
        const diffFromCluster = analysis.expectedPrice - analysis.primaryCluster.min;
        console.log(`  ${diffFromFloor >= 0 ? "+" : ""}€${diffFromFloor.toFixed(2)} from floor`);
        console.log(`  ${diffFromCluster >= 0 ? "+" : ""}€${diffFromCluster.toFixed(2)} from cluster min`);
    }
}

// ============ Run All Tests ============

// console.log("EXPECTED PRICE ALGORITHM - TEST SUITE");
// runTest(testCase1);
// runTest(testCase2);
// runTest(testCase3);
// console.log("\n" + "=".repeat(60));
// console.log("DONE");

test("sanity check", () => {
    let prices = [2.85, 2.9, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.99, 3.99, 4, 4, 4, 4, 4, 4, 4, 4, 4];
    const analysis = generateMarketAnalysis(prices);
    const insight = generateInsight(analysis);

    // Verify we get a valid insight
    expect(insight).toBeDefined();
    expect(insight.type).toBeDefined();
    expect(["price_dropping", "price_stable", "price_rising", "uncertain"]).toContain(insight.type);
});
