// Pure WCAG contrast helpers — no theme/React imports so they stay testable and reusable.
// Used to pick an outline/stroke colour that stands out against a given fill across ANY palette,
// instead of hard-coding a single theme role that only contrasts well on some themes.

// Parse #rgb / #rrggbb into [r, g, b] (0–255). Returns null for anything we can't read.
function parseHex(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, '')
  if (hex.length === 3) {
    const r = hex[0]
    const g = hex[1]
    const b = hex[2]
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)]
  }
  if (hex.length === 6) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]
  }
  return null
}

// WCAG relative luminance (0 = black, 1 = white).
function relativeLuminance(color: string): number {
  const rgb = parseHex(color)
  if (!rgb) return 0
  const [r, g, b] = rgb.map((c) => {
    const channel = c / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Straight-line RGB distance between two colours (0 = identical, ~441 = black↔white). Unlike
// contrastRatio (luminance only), this captures HUE difference too — two colours can have low
// luminance contrast yet still read as clearly different (e.g. teal vs orange). Use it to tell
// whether one colour visually "blends into" another regardless of relative lightness.
export function colorDistance(a: string, b: string): number {
  const ca = parseHex(a)
  const cb = parseHex(b)
  if (!ca || !cb) return 0
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2])
}

// Return the candidate whose WCAG contrast against `base` is closest to `target` — a "middle"
// contrast rather than the most or least. A moderate target (~4.5) yields a colour that clearly
// separates from the base (biasing to a DARKER candidate for a light base and a lighter one for a
// dark base) without the harsh, washed-out look of the max-contrast extreme (pure black/white).
// Falls back to `base` when there are no candidates.
export function closestContrasting(
  base: string,
  candidates: readonly string[],
  target = 4.5
): string {
  let best = base
  let bestDelta = Infinity
  for (const c of candidates) {
    const delta = Math.abs(contrastRatio(base, c) - target)
    if (delta < bestDelta) {
      bestDelta = delta
      best = c
    }
  }
  return best
}

// WCAG contrast ratio between two colours (1 = identical, 21 = black-on-white).
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

// From `candidates`, return the colour that stands out the MOST against `base` — i.e. has the
// highest contrast. `base` may be several colours (e.g. a fill AND the page background behind it);
// each candidate is then scored by its WORST (minimum) contrast across all of them, so the winner
// is the one that reads against every base at once and can't collapse into any single one (which is
// how a ring/outline goes invisible when its colour happens to match the surface behind it).
export function mostContrasting(
  base: string | readonly string[],
  candidates: readonly string[]
): string {
  const bases = typeof base === 'string' ? [base] : base
  let best = candidates[0] ?? bases[0]
  let bestScore = -1
  for (const candidate of candidates) {
    let score = Infinity
    for (const b of bases) score = Math.min(score, contrastRatio(b, candidate))
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best
}
