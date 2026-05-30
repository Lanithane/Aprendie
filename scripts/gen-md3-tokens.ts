/**
 * Build-time generator for the Material 3 color tokens — multi-theme.
 *
 * Run with `npm run gen:tokens`. It bundles through esbuild (the library ships
 * bundler-oriented ESM) and writes a fully static `src/theme/tokens.ts` — the app
 * runtime never imports `@material/material-color-utilities`, so there is zero
 * runtime dependency. Re-run this only when a theme spec below changes.
 *
 * Each theme is one palette (primary/secondary/tertiary seeds + a neutral tint
 * chroma). For every theme we build the six MD3 tonal palettes and apply the
 * documented tone->role tables to produce a light and a dark scheme. Names are
 * language/travel flavoured to fit a language-learning app.
 */
import { TonalPalette, Hct, argbFromHex, hexFromArgb } from '@material/material-color-utilities'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface ThemeSpec {
  id: string
  name: string
  // Three accent roles + the palette's light & dark members used as the light/dark surface seeds.
  // This way all five colours of each supplied palette are used: the cream/light becomes the
  // light canvas, the dark becomes the dark canvas (so on-surface text also carries that hue).
  primary: string
  secondary: string
  tertiary: string
  lightSurface: string
  darkSurface: string
}

const STD_ERROR = '#BA1A1A'

// Order here is the order shown in the picker. First entry is the default theme. Each comment
// lists the source palette; every one of its five swatches is mapped to a role below.
const THEME_SPECS: ThemeSpec[] = [
  // Mercado (market) — Eggshell / Burnt Peach / Muted Teal / Twilight Indigo / Apricot Cream.
  { id: 'mercado', name: 'Mercado', primary: '#E07A5F', secondary: '#81B29A', tertiary: '#F2CC8F', lightSurface: '#F4F1DE', darkSurface: '#3D405B' },
  // Costa (coast) — Sky Blue / Blue Green / Deep Space Blue / Amber Flame / Princeton Orange.
  { id: 'costa', name: 'Costa', primary: '#219EBC', secondary: '#FFB703', tertiary: '#FB8500', lightSurface: '#8ECAE6', darkSurface: '#023047' },
  // Viñedo (vineyard) — Hunter Green / Sage Green / Yellow Green / Floral White / Wine Plum.
  { id: 'vinedo', name: 'Viñedo', primary: '#6A994E', secondary: '#A7C957', tertiary: '#782832', lightSurface: '#FBF7EF', darkSurface: '#386641' },
  // Duna (dune) — Dune Beach / Apricot Dust / Sand Nougat / Cacao Husk / Midnight Soil.
  { id: 'duna', name: 'Duna', primary: '#E49C69', secondary: '#5C3B2E', tertiary: '#F2C299', lightSurface: '#FFD9A0', darkSurface: '#201A17' },
  // Mango (tropical) — Linen yellow / Linen cream / Light Coral / Cotton Rose / Muted Teal.
  { id: 'mango', name: 'Mango', primary: '#F28482', secondary: '#84A59D', tertiary: '#F6BD60', lightSurface: '#F7EDE2', darkSurface: '#F5CAC3' },
  // Cerezo (cherry blossom) — Baby Pink / Cotton Rose / Frosted Mint / Lemon Chiffon / Mauve.
  { id: 'cerezo', name: 'Cerezo', primary: '#FF99C8', secondary: '#E4C1F9', tertiary: '#D0F4DE', lightSurface: '#FCF6BD', darkSurface: '#FEC8C3' },
  // Lavanda (lavender twilight) — our own palette: amethyst / dusty rose / honey gold (violet's
  // complement) on a lilac-mist light canvas and a plum-night dark canvas. Fills the violet gap.
  { id: 'lavanda', name: 'Lavanda', primary: '#7A5EA6', secondary: '#C98BA4', tertiary: '#E3A857', lightSurface: '#F0EBF6', darkSurface: '#211A30' },
  // Tinta (ink) — monochrome black / white / greys.
  { id: 'tinta', name: 'Tinta', primary: '#3C3C3C', secondary: '#5A5A5A', tertiary: '#787878', lightSurface: '#F2F2F2', darkSurface: '#1A1A1A' },
]

// role -> [palette key, lightTone, darkTone]. Surface-container ladder mapped from neutral.
type PaletteKey = 'P' | 'S' | 'T' | 'E' | 'N' | 'NV'
const ROLE_TONES: Record<string, [PaletteKey, number, number]> = {
  primary: ['P', 40, 80],
  onPrimary: ['P', 100, 20],
  primaryContainer: ['P', 90, 30],
  onPrimaryContainer: ['P', 10, 90],
  secondary: ['S', 40, 80],
  onSecondary: ['S', 100, 20],
  secondaryContainer: ['S', 90, 30],
  onSecondaryContainer: ['S', 10, 90],
  tertiary: ['T', 40, 80],
  onTertiary: ['T', 100, 20],
  tertiaryContainer: ['T', 90, 30],
  onTertiaryContainer: ['T', 10, 90],
  error: ['E', 40, 80],
  onError: ['E', 100, 20],
  errorContainer: ['E', 90, 30],
  onErrorContainer: ['E', 10, 90],
  background: ['N', 98, 6],
  onBackground: ['N', 10, 90],
  surface: ['N', 98, 6],
  onSurface: ['N', 10, 90],
  surfaceVariant: ['NV', 90, 30],
  onSurfaceVariant: ['NV', 30, 80],
  surfaceDim: ['N', 87, 6],
  surfaceBright: ['N', 98, 24],
  surfaceContainerLowest: ['N', 100, 4],
  surfaceContainerLow: ['N', 96, 10],
  surfaceContainer: ['N', 94, 12],
  surfaceContainerHigh: ['N', 92, 17],
  surfaceContainerHighest: ['N', 90, 22],
  outline: ['NV', 50, 60],
  outlineVariant: ['NV', 80, 30],
  shadow: ['N', 0, 0],
  scrim: ['N', 0, 0],
  inverseSurface: ['N', 20, 90],
  inverseOnSurface: ['N', 95, 20],
  inversePrimary: ['P', 80, 40],
}

const ROLES = Object.keys(ROLE_TONES)

function buildScheme(spec: ThemeSpec, which: 'light' | 'dark'): Record<string, string> {
  // The neutral (surface) ramp is seeded from the palette's own light/dark member, so light mode
  // surfaces ARE the cream and dark mode surfaces ARE the dark colour — and on-surface text picks
  // up that hue. neutral-variant adds a touch of chroma for outlines.
  const surfaceSeed = which === 'light' ? spec.lightSurface : spec.darkSurface
  const seedHct = Hct.fromInt(argbFromHex(surfaceSeed))
  const nvChroma = seedHct.chroma < 2 ? 0 : seedHct.chroma + 6
  const pals: Record<PaletteKey, TonalPalette> = {
    P: TonalPalette.fromInt(argbFromHex(spec.primary)),
    S: TonalPalette.fromInt(argbFromHex(spec.secondary)),
    T: TonalPalette.fromInt(argbFromHex(spec.tertiary)),
    E: TonalPalette.fromInt(argbFromHex(STD_ERROR)),
    N: TonalPalette.fromInt(argbFromHex(surfaceSeed)),
    NV: TonalPalette.fromHueAndChroma(seedHct.hue, nvChroma),
  }
  const idx = which === 'light' ? 1 : 2
  const out: Record<string, string> = {}
  for (const role of ROLES) {
    const [pal, ...tones] = ROLE_TONES[role]
    out[role] = hexFromArgb(pals[pal].tone(tones[idx - 1]))
  }
  return out
}

const fmt = (s: Record<string, string>, indent: string) =>
  ROLES.map((r) => `${indent}${r}: '${s[r]}',`).join('\n')

const themeBlocks = THEME_SPECS.map((spec) => {
  const light = buildScheme(spec, 'light')
  const dark = buildScheme(spec, 'dark')
  return `  ${spec.id}: {
    name: '${spec.name}',
    light: {
${fmt(light, '      ')}
    },
    dark: {
${fmt(dark, '      ')}
    },
  },`
}).join('\n')

const ids = THEME_SPECS.map((t) => t.id)

// Raw 5-colour palette per theme (primary, secondary, tertiary, light surface, dark surface) —
// shown as swatch dots in the picker so all five supplied colours are visible.
const metaBlock = THEME_SPECS.map(
  (t) =>
    `  { id: '${t.id}', name: '${t.name}', swatches: ['${t.primary}', '${t.secondary}', '${t.tertiary}', '${t.lightSurface}', '${t.darkSurface}'] },`
).join('\n')

const body = `// AUTO-GENERATED by scripts/gen-md3-tokens.ts — do not edit by hand.
// Regenerate with \`npm run gen:tokens\`. ${THEME_SPECS.length} themes, each with a light + dark scheme.

export interface Md3Scheme {
${ROLES.map((r) => `  ${r}: string`).join('\n')}
}

export type ThemeId = ${ids.map((id) => `'${id}'`).join(' | ')}

export interface ThemeTokens {
  name: string
  light: Md3Scheme
  dark: Md3Scheme
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
${themeBlocks}
}

export const THEME_IDS: ThemeId[] = [${ids.map((id) => `'${id}'`).join(', ')}]

export const THEME_META: ReadonlyArray<{ id: ThemeId; name: string; swatches: string[] }> = [
${metaBlock}
]

export const DEFAULT_THEME_ID: ThemeId = '${ids[0]}'
`

const out = join(process.cwd(), 'src/theme/tokens.ts')
writeFileSync(out, body)
console.log(`Wrote ${out}`)
console.log(`  ${THEME_SPECS.length} themes: ${ids.join(', ')}`)
