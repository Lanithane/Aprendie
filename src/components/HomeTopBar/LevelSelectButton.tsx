import { useState, type MouseEvent } from 'react'
import { Button, Menu, MenuItem, Divider } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTranslation } from 'react-i18next'
import { LEVELS } from '../../../shared/levels'
import { useLevelLabel } from '../../hooks/useLevelLabel'
import type { LevelPref } from '../../hooks/useLevelPreference'

interface LevelSelectButtonProps {
  level: LevelPref
  onLevelChange: (level: LevelPref) => void
}

// The difficulty (level) selector: a filled `secondary` button (the flash-card palette) that
// opens the level menu. Lives in two places on the home screen — the mobile top bar and, on md+,
// just above the practice card (see HomeTopBar / HomePage). Filled (not outlined) so it stays
// legible on the tinted page — a pale secondary outline washed out against the light canvas.
export default function LevelSelectButton({ level, onLevelChange }: LevelSelectButtonProps) {
  const { t } = useTranslation()
  const levelLabel = useLevelLabel()
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
        variant='contained'
        color='secondary'
        size='small'
        onClick={openMenu}
        endIcon={<ExpandMoreIcon />}
        aria-haspopup='menu'
        aria-expanded={open}
      >
        {level ? levelLabel(level) : t('home.levelAny')}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={closeMenu}>
        <MenuItem selected={level === null} onClick={() => pick(null)}>
          {t('common.anyLevel')}
        </MenuItem>
        <Divider />
        {LEVELS.map((l) => (
          <MenuItem key={l.code} selected={level === l.code} onClick={() => pick(l.code)}>
            {levelLabel(l.code)}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
