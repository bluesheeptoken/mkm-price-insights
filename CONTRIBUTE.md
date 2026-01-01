# MKM Price Tracker

A Firefox extension that analyzes Cardmarket listings to estimate fair market value.

## Features

- **Price clustering** - Groups similar prices to find market consensus
- **Wall detection** - Identifies supply concentrations that affect pricing
- **Fair value estimation** - Calculates expected price based on market structure
- **Price trend prediction** - Predicts if prices are likely to rise, fall, or stay stable
- **Visual histogram** - Shows price distribution with cluster highlighting

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

Output goes to `dist/` folder.

### Watch (auto-rebuild on changes)

```bash
npm run watch
```

### Test locally in Firefox

1. Go to `about:debugging` in Firefox
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `dist/manifest.json`
5. Navigate to a Cardmarket singles page

To reload after changes: click "Reload" in `about:debugging`

### Test locally with mock data

```bash
npm run dev
```

## Release

### 1. Bump version

Edit `src/manifest.json`:

```json
"version": "0.1.3",  // increment this
```

### 2. Build and package

```bash
npm run build
cd dist && zip -r ../mkm-price-tracker-v0.1.3.zip . && cd ..
```

### 3. Upload to Firefox Add-ons

1. Go to [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)
2. Sign in and find your extension
3. Click **"Upload New Version"**
4. Upload the zip file
5. Submit for review (or self-distribute if unlisted)

## Project Structure

```
src/
├── content.ts       # Entry point, orchestrates scraping and rendering
├── scraper.ts       # Extracts prices from Cardmarket page
├── expectedPrice.ts # Fair value algorithm (clustering, walls, floors)
├── insights.ts      # Price trend predictions
├── ui.ts            # Renders the histogram and UI
├── histogram.ts     # Histogram binning utilities
└── manifest.json    # Extension manifest

dist/                # Built files (don't edit directly)
```

## Algorithm Overview

1. **Cluster prices** with 2.5% tolerance
2. **Find qualifying clusters** (≥3 items or ≥25% of total)
3. **Analyze market structure**:
   - Floor: lowest price(s)
   - Wall: supply concentration (≥5 items at same price)
   - Between: sellers between floor and wall
4. **Calculate fair value** based on floor, wall, and cluster
5. **Generate insight** about price direction

