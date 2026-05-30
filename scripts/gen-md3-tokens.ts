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
  primary: string
  secondary: string
  tertiary: string
  neutralChroma: number
  neutralVariantChroma: number
}

const STD_ERROR = '#BA1A1A'

// Order here is the order shown in the picker. First entry is the default theme.
const THEME_SPECS: ThemeSpec[] = [
  // Warm terracotta market — Eggshell / Burnt Peach / Muted Teal / Twilight Indigo / Apricot.
  { id: 'mercado', name: 'Mercado', primary: '#E07A5F', secondary: '#3D405B', tertiary: '#81B29A', neutralChroma: 8, neutralVariantChroma: 12 },
  // Coastal blue + sunset — Sky / Blue Green / Deep Space Blue / Amber / Princeton Orange.
  { id: 'costa', name: 'Costa', primary: '#219EBC', secondary: '#023047', tertiary: '#FB8500', neutralChroma: 10, neutralVariantChroma: 16 },
  // Vineyard harvest — Hunter / Sage / Yellow Green / Floral White / Wine Plum.
  { id: 'vendange', name: 'Vendange', primary: '#386641', secondary: '#6A994E', tertiary: '#782832', neutralChroma: 8, neutralVariantChroma: 14 },
  // Desert earth — Dune / Apricot Dust / Sand Nougat / Cacao Husk / Midnight Soil.
  { id: 'sahara', name: 'Sahara', primary: '#E49C69', secondary: '#5C3B2E', tertiary: '#C98A3C', neutralChroma: 12, neutralVariantChroma: 18 },
  // Tropical coral — Linen / Light Coral / Cotton Rose / Muted Teal.
  { id: 'mango', name: 'Mango', primary: '#F28482', secondary: '#84A59D', tertiary: '#F6BD60', neutralChroma: 8, neutralVariantChroma: 12 },
  // Candy blossom — Baby Pink / Cotton Rose / Frosted Mint / Lemon Chiffon / Mauve.
  { id: 'sakura', name: 'Sakura', primary: '#FF99C8', secondary: '#E4C1F9', tertiary: '#7DCBA0', neutralChroma: 6, neutralVariantChroma: 10 },
  // Monochrome ink — black / white / greys.
  { id: 'sumi', name: 'Sumi', primary: '#3C3C3C', secondary: '#5A5A5A', tertiary: '#787878', neutralChroma: 0, neutralVariantChroma: 0 },
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
  const hue = Hct.fromInt(argbFromHex(spec.primary)).hue
  const pals: Record<PaletteKey, TonalPalette> = {
    P: TonalPalette.fromInt(argbFromHex(spec.primary)),
    S: TonalPalette.fromInt(argbFromHex(spec.secondary)),
    T: TonalPalette.fromInt(argbFromHex(spec.tertiary)),
    E: TonalPalette.fromInt(argbFromHex(STD_ERROR)),
    N: TonalPalette.fromHueAndChroma(hue, spec.neutralChroma),
    NV: TonalPalette.fromHueAndChroma(hue, spec.neutralVariantChroma),
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

export const THEME_META: ReadonlyArray<{ id: ThemeId; name: string }> = THEME_IDS.map((id) => ({
  id,
  name: THEMES[id].name,
}))

export const DEFAULT_THEME_ID: ThemeId = '${ids[0]}'
`

const out = join(process.cwd(), 'src/theme/tokens.ts')
writeFileSync(out, body)
console.log(`Wrote ${out}`)
console.log(`  ${THEME_SPECS.length} themes: ${ids.join(', ')}`)
