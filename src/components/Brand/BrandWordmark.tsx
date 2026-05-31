import { styled } from '@mui/material/styles'

type BrandWordmarkSize = 'login' | 'sidebar'

interface BrandWordmarkProps {
  size?: BrandWordmarkSize
  className?: string
}

// Flat Lilita One wordmark. The exclamations are the font's own glyphs (kept consistent with the
// favicon). Color comes from the theme so it adapts across all MD3 themes + light/dark.
const Root = styled('div', {
  shouldForwardProp: (prop) => prop !== '$size',
})<{ $size: BrandWordmarkSize }>`
  font-family: 'Lilita One', system-ui, sans-serif;
  font-weight: 400;
  letter-spacing: 0.05em;
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  color: ${({ theme }) => theme.palette.tertiary.main};
  font-size: ${({ $size }) => ($size === 'login' ? '3.5rem' : '2rem')};
  -webkit-text-stroke: ${({ $size }) => ($size === 'login' ? '6px' : '4.5px')}
    ${({ theme }) => theme.palette.secondary.main};
  paint-order: stroke fill;

  ${({ theme }) => theme.breakpoints.down('sm')} {
    font-size: ${({ $size }) => ($size === 'login' ? '2.8rem' : '1.5rem')};
    -webkit-text-stroke-width: ${({ $size }) => ($size === 'login' ? '5px' : '4.5px')};
  }
`

export default function BrandWordmark({ size = 'sidebar', className }: BrandWordmarkProps) {
  return (
    <Root $size={size} className={className} role='img' aria-label='¡Aprendie!'>
      ¡Aprendie!
    </Root>
  )
}
