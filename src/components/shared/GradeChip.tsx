import { useMemo, type CSSProperties } from 'react'
import { Avatar } from '@mui/material'

interface GradeChipProps {
  grade: string
  size?: 'small' | 'medium'
}

function gradeColor(grade: string): 'success' | 'warning' | 'error' {
  if (grade === 'A+' || grade === 'A') return 'success'
  if (grade === 'B' || grade === 'C') return 'warning'
  return 'error'
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export default function GradeChip({ grade, size = 'small' }: GradeChipProps) {
  const diameter = size === 'medium' ? 40 : 32
  const color = gradeColor(grade)
  const isPerfect = grade === 'A+'
  const sparkleStyles = useMemo<CSSProperties[]>(() => {
    const baseSize = size === 'medium' ? 8 : 6
    const edgeInset = size === 'medium' ? 4 : 3
    const timing = () => ({
      animationDelay: `${randomBetween(-2.4, -0.1).toFixed(2)}s`,
      animationDuration: `${randomBetween(1.45, 2.8).toFixed(2)}s`,
    })

    const topEdge = (starSize: number) => -(starSize * 0.25) + randomBetween(-0.5, 1)
    const sideEdge = (starSize: number) => -(starSize * 0.25) + randomBetween(-0.5, 0.5)

    const topRight = baseSize + randomBetween(1, 3)
    const topLeft = baseSize + randomBetween(-1, 1)
    const bottomLeft = baseSize + randomBetween(0, 2)
    const bottomRight = baseSize + randomBetween(-2, 0)

    return [
      {
        width: topRight,
        height: topRight,
        top: topEdge(topRight),
        right: edgeInset + randomBetween(-1, 3),
        ...timing(),
      },
      {
        width: topLeft,
        height: topLeft,
        top: edgeInset + randomBetween(-1, 2),
        left: sideEdge(topLeft),
        ...timing(),
      },
      {
        width: bottomLeft,
        height: bottomLeft,
        bottom: edgeInset + randomBetween(-1, 2),
        left: sideEdge(bottomLeft),
        ...timing(),
      },
      {
        width: bottomRight,
        height: bottomRight,
        bottom: topEdge(bottomRight),
        right: edgeInset + randomBetween(-1, 3),
        ...timing(),
      },
    ]
  }, [size])

  return (
    <Avatar
      aria-label={`Grade ${grade}`}
      sx={{
        width: diameter,
        height: diameter,
        bgcolor: `${color}.main`,
        color: `${color}.contrastText`,
        flexShrink: 0,
        fontSize: size === 'medium' ? '0.95rem' : '0.8rem',
        fontWeight: 700,
        position: 'relative',
        overflow: 'visible',
        '& .GradeChip-letter': {
          position: 'relative',
          zIndex: 2,
        },
        '& .GradeChip-sparkle': {
          position: 'absolute',
          zIndex: 1,
          bgcolor: '#ffd84d',
          color: '#ffd84d',
          clipPath:
            'polygon(50% 0%, 61% 36%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 36%)',
          filter:
            'drop-shadow(0 0 4px rgba(255, 216, 77, 0.95)) drop-shadow(0 0 1px rgba(80, 55, 0, 0.75))',
          transform: 'translate3d(0, 0, 0) rotate(0deg) scale(0.75)',
          animation: 'GradeChip-sparkle 1.65s ease-in-out infinite',
          '@keyframes GradeChip-sparkle': {
            '0%, 100%': {
              opacity: 0.35,
              transform: 'translate3d(0, 0, 0) rotate(-18deg) scale(0.65)',
            },
            '42%': {
              opacity: 1,
              transform: 'translate3d(1px, -1px, 0) rotate(24deg) scale(1.35)',
            },
            '68%': {
              opacity: 0.65,
              transform: 'translate3d(-1px, 1px, 0) rotate(54deg) scale(0.95)',
            },
          },
        },
      }}
    >
      {isPerfect ? (
        <>
          <span className='GradeChip-letter'>A</span>
          {sparkleStyles.map((style, index) => (
            <span key={index} className='GradeChip-sparkle' style={style} aria-hidden='true' />
          ))}
        </>
      ) : (
        grade
      )}
    </Avatar>
  )
}
