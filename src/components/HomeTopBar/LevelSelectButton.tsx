import { useState, type MouseEvent } from 'react'
import { Button, Menu, MenuItem, Divider } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { LEVELS, levelLabel } from '../../../shared/levels'
import type { LevelPref } from '../../hooks/useLevelPreference'

interface LevelSelectButtonProps {
  level: LevelPref
  onLevelChange: (level: LevelPref) => void
}

// The difficulty (level) selector: an outlined `secondary` button (the flash-card palette) that
// opens the level menu. Lives in two places on the home screen — the mobile top bar and, on md+,
// just above the practice card (see HomeTopBar / HomePage).
export default function LevelSelectButton({ level, onLevelChange }: LevelSelectButtonProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const openMenu = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const closeMenu = () => setAnchorEl(null)
  const pick = (next: LevelPref) => {
    onLevelChange(next)
    closeMenu()
  }

  return (
    <>
      <Button
        variant='outlined'
        color='secondary'
        size='small'
        onClick={openMenu}
        endIcon={<ExpandMoreIcon />}
        aria-haspopup='menu'
        aria-expanded={open}
      >
        {level ? levelLabel(level) : 'Level: any'}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={closeMenu}>
        <MenuItem selected={level === null} onClick={() => pick(null)}>
          Any level
        </MenuItem>
        <Divider />
        {LEVELS.map((l) => (
          <MenuItem key={l.code} selected={level === l.code} onClick={() => pick(l.code)}>
            {l.cefr ? `${l.name} (${l.cefr})` : l.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
