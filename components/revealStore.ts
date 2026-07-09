// Tracks which balls have been fully press-revealed at least once. Once a
// ball is in this set it permanently shows its photo instead of its flat
// color — no more pressing needed. A tiny pub/sub store (not React state)
// so PressReveal can mark a ball revealed from inside a useFrame loop
// without forcing a re-render there; RevealedBalls subscribes to re-render
// only when the set actually changes (rare — once per ball, ever).
export type BallKey = string;

const revealed = new Set<BallKey>();
const listeners = new Set<() => void>();

export function keyFor(layerIndex: number, ballIndex: number): BallKey {
  return `${layerIndex}-${ballIndex}`;
}

export function isRevealed(key: BallKey): boolean {
  return revealed.has(key);
}

export function markRevealed(key: BallKey): void {
  if (revealed.has(key)) return;
  revealed.add(key);
  listeners.forEach((listener) => listener());
}

export function getRevealedKeys(): BallKey[] {
  return Array.from(revealed);
}

export function subscribeRevealed(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
