import { Box } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

// All grade colors are fixed — theme-invariant semantic indicators like traffic-light ramps.
const GRADE_COLORS: Record<string, { main: string; dark: string }> = {
  'A+': { main: '#C9980A', dark: '#7A5400' }, // goldenrod
  A: { main: '#388E3C', dark: '#1B5E20' }, // green
  B: { main: '#1976D2', dark: '#0D47A1' }, // blue
  C: { main: '#F9A825', dark: '#E65100' }, // yellow
  D: { main: '#F9A825', dark: '#E65100' }, // yellow
  F: { main: '#D32F2F', dark: '#7F0000' }, // red
}

interface GradeChipProps {
  grade: string
  size?: 'small' | 'medium'
}

export default function GradeChip({ grade, size = 'small' }: GradeChipProps) {
  const theme = useTheme()
  const isPerfect = grade === 'A+'
  const diameter = size === 'medium' ? 48 : 36
  const badgeSize = size === 'medium' ? 14 : 11
  const color = GRADE_COLORS[grade] ?? GRADE_COLORS['F']
  const textColor = theme.palette.mode === 'dark' ? color.main : color.dark

  return (
    <Box
      aria-label={`Grade ${grade}`}
      sx={{
        width: diameter,
        height: diameter,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        bgcolor: alpha(color.main, 0.12),
        border: `2.5px solid ${color.main}`,
        color: textColor,
        fontSize: size === 'medium' ? '1.15rem' : '1rem',
        fontWeight: 900,
        fontFamily: 'inherit',
        letterSpacing: 0,
        userSelect: 'none',
      }}
    >
      {isPerfect ? (
        <>
          A
          <AutoAwesomeIcon
            aria-hidden='true'
            sx={{
              position: 'absolute',
              top: -badgeSize * 0.45,
              right: -badgeSize * 0.35,
              fontSize: badgeSize,
              color: color.main,
              filter: `drop-shadow(0 0 1.5px ${alpha(color.main, 0.35)})`,
            }}
          />
        </>
      ) : (
        grade
      )}
    </Box>
  )
}
