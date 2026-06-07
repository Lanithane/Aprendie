import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import StyleIcon from '@mui/icons-material/Style'
import LevelSelectButton from './LevelSelectButton'
import type { LevelPref } from '../../hooks/useLevelPreference'

interface HomeTopBarProps {
  level: LevelPref
  onLevelChange: (level: LevelPref) => void
}

// Mobile-only (xs–sm) top row: difficulty (level) selector on the left, Flash cards shortcut on the
// right. md+ renders nothing here — it shows the level selector just above the card instead (see
// HomePage) and reaches Flash cards from the sidebar. Flash cards is dropped from the bottom nav
// across the whole mobile range (see AppShell), which is why it lives here.
export default function HomeTopBar({ level, onLevelChange }: HomeTopBarProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  if (!isMobile) return null

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
      <LevelSelectButton level={level} onLevelChange={onLevelChange} />
      <Button
        component={RouterLink}
        to='/flashcards'
        variant='outlined'
        color='secondary'
        size='small'
        startIcon={<StyleIcon fontSize='small' />}
      >
        Flash cards
      </Button>
    </Box>
  )
}
