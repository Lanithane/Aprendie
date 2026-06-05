/**
 * Build-time generator for the social share card and PWA PNG icons.
 *
 * Run with `npm run gen:og`. Renders branded SVGs to PNG via `@resvg/resvg-js`
 * (a devDependency — never imported at runtime). The outputs land in `public/`
 * and are committed, so this only needs re-running when the brand or copy
 * changes. Mirrors the `gen:tokens` pattern: generated assets are the source of
 * truth; the tool is build-time only.
 *
 * Outputs:
 *   public/og-image.png          1200×630  Open Graph / Twitter card
 *   public/icon-192.png          192×192   PWA "any" icon
 *   public/icon-512.png          512×512   PWA "any" icon
 *   public/icon-maskable-512.png 512×512   PWA maskable icon (safe-zone padded)
 *
 * Colours come from the default `abra` theme (light scheme); the wordmark mirrors
 * src/components/Brand/BrandWordmark.tsx — sage tertiary fill, terracotta stroke,
 * paint-order stroke so the outline sits behind the fill.
 */
import { Resvg } from '@resvg/resvg-js'
import { existsSync, writeFileSync } from 'node:fs'
import { get } from 'node:https'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const fontPath = join(root, 'scripts', '.assets', 'LilitaOne-Regular.ttf')
const FONT_URL = 'https://github.com/google/fonts/raw/main/ofl/lilitaone/LilitaOne-Regular.ttf'

// abra (default theme) light scheme
const CREAM = '#fdfae7'
const SAGE = '#81B29A' // tertiary — wordmark fill
const TERRACOTTA = '#E07A5F' // primary — wordmark stroke
const SAND = '#F2CC8F' // secondary — decorative
const INK = '#1c1c11' // onSurface
const SUBTLE = '#484830' // onSurfaceVariant — tagline

// The ¡! mark from the favicons, drawn inside a 64×64 box. Reused for the PWA icons.
const glyph = (fill: string) => `
  <g fill="${fill}">
    <g transform="translate(43.12 54.44) scale(-0.66)">
      <path d="M28.5 8 L35.5 8 Q39 8 38.6 11.5 L37 39 Q36.7 42 33.8 42 L30.2 42 Q27.3 42 27 39 L25.4 11.5 Q25 8 28.5 8 Z" />
      <rect x="25.5" y="47" width="13" height="13" rx="3.5" />
    </g>
    <g transform="translate(20.88 9.56) scale(0.66)">
      <path d="M28.5 8 L35.5 8 Q39 8 38.6 11.5 L37 39 Q36.7 42 33.8 42 L30.2 42 Q27.3 42 27 39 L25.4 11.5 Q25 8 28.5 8 Z" />
      <rect x="25.5" y="47" width="13" height="13" rx="3.5" />
    </g>
  </g>`

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${CREAM}" />
  <!-- faint oversized marks bleeding off the corners -->
  <g opacity="0.10">
    <g transform="translate(-60 -120) scale(7)">${glyph(SAGE)}</g>
    <g transform="translate(820 360) scale(7)">${glyph(TERRACOTTA)}</g>
  </g>
  <g text-anchor="middle" font-family="Lilita One">
    <text x="600" y="320" font-size="168" letter-spacing="4"
          fill="${SAGE}" stroke="${TERRACOTTA}" stroke-width="11"
          paint-order="stroke" stroke-linejoin="round">¡Aprendie!</text>
    <text x="600" y="410" font-size="40" letter-spacing="1" fill="${SUBTLE}">Read it. Translate it. Learn from every mistake.</text>
  </g>
</svg>`

// The ¡! marks sit centred in the 64×64 box (centre 32,32) and are ~34 units tall.
// `frac` is the share of the canvas height the marks should fill; we scale the box
// about the canvas centre so the marks stay centred with even padding.
const MARK_CENTER = 32
const MARK_HEIGHT = 34.4
const markGroup = (size: number, frac: number, fill: string) => {
  const k = ((frac * size) / MARK_HEIGHT).toFixed(4)
  return `<g transform="translate(${size / 2} ${size / 2}) scale(${k}) translate(${-MARK_CENTER} ${-MARK_CENTER})">${glyph(fill)}</g>`
}

const iconSvg = (size: number, frac: number) => {
  const r = Math.round(size * 0.22)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${CREAM}" />
  ${markGroup(size, frac, INK)}
</svg>`
}

// maskable: full-bleed background (no rounding), marks kept inside the ~50% safe zone
const maskableSvg = (
  size: number
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${SAND}" />
  ${markGroup(size, 0.5, INK)}
</svg>`

async function ensureFont(): Promise<void> {
  if (existsSync(fontPath)) return
  // One-time fetch so the generator is reproducible on a clean checkout.
  console.log('Lilita One TTF missing — downloading…')
  const buf = await new Promise<Buffer>((resolve, reject) => {
    const follow = (url: string) =>
      get(url, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          follow(res.headers.location)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`font download failed: HTTP ${res.statusCode}`))
          return
        }
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      }).on('error', reject)
    follow(FONT_URL)
  })
  writeFileSync(fontPath, buf)
}

function render(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    font: { fontFiles: [fontPath], loadSystemFonts: false, defaultFontFamily: 'Lilita One' },
  })
  return Buffer.from(resvg.render().asPng())
}

async function main() {
  await ensureFont()
  const out: Array<[string, string]> = [
    ['og-image.png', ogSvg],
    ['icon-192.png', iconSvg(192, 0.62)],
    ['icon-512.png', iconSvg(512, 0.62)],
    ['icon-maskable-512.png', maskableSvg(512)],
  ]
  for (const [name, svg] of out) {
    writeFileSync(join(publicDir, name), render(svg))
    console.log(`wrote public/${name}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
