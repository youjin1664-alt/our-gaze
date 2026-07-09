import { ALL_COLORS, COOL_COLORS, PaletteColor, WARM_COLORS } from "./palette";
import { mulberry32, randRange } from "./random";

export interface LayerBall {
  position: [number, number, number];
  /** Ball radius, applied as uniform instance scale on a unit sphere. */
  scale: number;
  color: PaletteColor;
}

export interface LayerInfo {
  z: number;
  balls: LayerBall[];
}

export const LAYER_Z = [0, -500, -1000, -1500, -2000, -2500];
const LAYER_COUNTS = [36, 34, 33, 32, 32, 33];

// Flat 2D placement bounds for every layer (world units, centered at origin).
const BOUNDS = { minX: -850, maxX: 850, minY: -475, maxY: 475 };
const PADDING = 6;

// Same 45/40/15 small/medium/large split used for the Phase 1 scene
// (diameter 60-210px -> radius 30-105).
const SIZE_BUCKETS = [
  { min: 30, max: 50, weight: 0.45 },
  { min: 50, max: 80, weight: 0.4 },
  { min: 80, max: 105, weight: 0.15 },
];

function pickRadius(rng: () => number): number {
  const r = rng();
  let cumulative = 0;
  for (const bucket of SIZE_BUCKETS) {
    cumulative += bucket.weight;
    if (r <= cumulative) return randRange(rng, bucket.min, bucket.max);
  }
  const last = SIZE_BUCKETS[SIZE_BUCKETS.length - 1];
  return randRange(rng, last.min, last.max);
}

// Picks a color for a new ball: biases toward whichever of warm/cool is
// currently underrepresented among nearby balls in the same layer, and
// avoids a color already used 3+ times nearby (no dense same-color clusters).
function pickColor(rng: () => number, placed: LayerBall[], x: number, y: number): PaletteColor {
  const NEARBY_RADIUS = 320;
  const nearby = placed.filter(
    (b) => Math.hypot(b.position[0] - x, b.position[1] - y) < NEARBY_RADIUS,
  );

  const warmCount = nearby.filter((b) => (WARM_COLORS as string[]).includes(b.color)).length;
  const coolCount = nearby.length - warmCount;
  const pool = warmCount <= coolCount ? WARM_COLORS : COOL_COLORS;

  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = pool[Math.floor(rng() * pool.length)];
    if (nearby.filter((b) => b.color === candidate).length < 3) return candidate;
  }
  for (let attempt = 0; attempt < 24; attempt++) {
    const candidate = ALL_COLORS[Math.floor(rng() * ALL_COLORS.length)];
    if (nearby.filter((b) => b.color === candidate).length < 3) return candidate;
  }
  return ALL_COLORS[Math.floor(rng() * ALL_COLORS.length)];
}

function generateLayer(seed: number, count: number, z: number): LayerInfo {
  const rng = mulberry32(seed);
  const balls: LayerBall[] = [];
  const maxAttempts = count * 400;
  let attempts = 0;

  while (balls.length < count && attempts < maxAttempts) {
    attempts++;
    const radius = pickRadius(rng);
    const x = randRange(rng, BOUNDS.minX + radius, BOUNDS.maxX - radius);
    const y = randRange(rng, BOUNDS.minY + radius, BOUNDS.maxY - radius);

    const overlaps = balls.some((b) => {
      const dx = b.position[0] - x;
      const dy = b.position[1] - y;
      return Math.hypot(dx, dy) < b.scale + radius + PADDING;
    });
    if (overlaps) continue;

    const color = pickColor(rng, balls, x, y);
    balls.push({ position: [x, y, z], scale: radius, color });
  }

  return { z, balls };
}

// Generated once at module load: deterministic (seeded), so identical
// between server and client renders — no hydration mismatch risk.
export const LAYERS: LayerInfo[] = LAYER_Z.map((z, i) =>
  generateLayer(100 + i, LAYER_COUNTS[i], z),
);
