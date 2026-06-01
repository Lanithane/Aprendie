// Rough environmental footprint of LLM inference, expressed per token processed. This is an
// ESTIMATE and labeled as such everywhere it surfaces — there is no per-request meter; we
// derive it from published order-of-magnitude figures and the user's own token totals.
//
// Methodology (all knobs are tunable via the optional env overrides below):
//   - Energy: hosted transformer inference lands around ~0.4 Wh per 1k tokens once datacenter
//     overhead (PUE) is folded in. Treated uniformly across token classes — cache reads are
//     cheaper in dollars but we don't claim that resolution for energy.
//   - Water: datacenter water-usage effectiveness is commonly cited near ~1.8 L per kWh of
//     on-site + upstream cooling, i.e. ~1.8 mL per Wh.
//   - Carbon: global average grid intensity is ~0.4 kg CO2 per kWh, i.e. ~0.4 g per Wh.
//
// These are deliberately conservative, single-source-of-truth constants. Edit them here (or
// set the env overrides) — nothing else hardcodes a footprint factor.

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw == null || raw.trim() === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

const WH_PER_1K_TOKENS = envNumber('SUSTAINABILITY_WH_PER_1K_TOKENS', 0.4)
const WATER_ML_PER_WH = envNumber('SUSTAINABILITY_WATER_ML_PER_WH', 1.8)
const CO2_G_PER_WH = envNumber('SUSTAINABILITY_CO2_G_PER_WH', 0.4)

export interface SustainabilityEstimate {
  energyWh: number
  co2Grams: number
  waterMl: number
}

// Footprint for a number of tokens processed. Linear in token count; clamps negatives to 0.
export function estimateSustainability(totalTokens: number): SustainabilityEstimate {
  const tokens = Math.max(0, totalTokens)
  const energyWh = (tokens / 1000) * WH_PER_1K_TOKENS
  return {
    energyWh,
    co2Grams: energyWh * CO2_G_PER_WH,
    waterMl: energyWh * WATER_ML_PER_WH,
  }
}
