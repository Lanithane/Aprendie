import { styled, useTheme } from '@mui/material/styles'
import { THEME_META } from '../../theme'
import { closestContrasting } from '../../theme/contrast'
import { useThemeMode } from '../../ThemeModeProvider'

type BrandWordmarkSize = 'login' | 'sidebar'

interface BrandWordmarkProps {
  size?: BrandWordmarkSize
  className?: string
}

// Flat Lilita One wordmark. The exclamations are the font's own glyphs (kept consistent with the
// favicon). The fill is the theme's tertiary role; the stroke is one of the theme's own five palette
// dots (the swatches shown in the Settings picker) — specifically the one whose contrast against the
// fill is closest to a moderate target. That keeps the outline a tasteful in-palette accent (a
// darker dot when the title is light, a lighter dot when it's dark) rather than a harsh, washed-out
// black/white extreme, while still separating clearly from the fill on every theme + light/dark.
const Root = styled('div', {
  shouldForwardProp: (prop) => prop !== '$size' && prop !== '$stroke',
})<{ $size: BrandWordmarkSize; $stroke: string }>`
  font-family: 'Lilita One', system-ui, sans-serif;
  font-weight: 400;
  letter-spacing: 0.05em;
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  color: ${({ theme }) => theme.palette.tertiary.main};
  font-size: ${({ $size }) => ($size === 'login' ? '3.5rem' : '2rem')};
  -webkit-text-stroke: ${({ $size }) => ($size === 'login' ? '6px' : '4.5px')}
    ${({ $stroke }) => $stroke};
  paint-order: stroke fill;

  ${({ theme }) => theme.breakpoints.down('sm')} {
    font-size: ${({ $size }) => ($size === 'login' ? '2.8rem' : '1.5rem')};
    -webkit-text-stroke-width: ${({ $size }) => ($size === 'login' ? '5px' : '4.5px')};
  }
`

export default function BrandWordmark({ size = 'sidebar', className }: BrandWordmarkProps) {
  const theme = useTheme()
  const { themeId } = useThemeMode()
  const fill = theme.palette.tertiary.main
  // Pick the moderate-contrast dot from the active theme's five swatches, excluding the fill
  // (tertiary) itself so the outline is always a different colour.
  const dots = THEME_META.find((t) => t.id === themeId)?.swatches ?? []
  const candidates = dots.filter((c) => c.toLowerCase() !== fill.toLowerCase())
  const stroke = closestContrasting(fill, candidates)
  return (
    <Root $size={size} $stroke={stroke} className={className} role='img' aria-label='¡Aprendie!'>
      ¡Aprendie!
    </Root>
  )
}
