import { useRef } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  IconButton,
  Box,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined'
import { styled } from '@mui/material/styles'
import { useAuth } from '../../auth/AuthContext'
import { clearSessionMarker } from '../../auth/sessionMarker'
import { useThemeMode, type ThemeMode } from '../../ThemeModeProvider'
import { useFeedback } from '../Feedback/FeedbackProvider'
import { useViewportCenterY } from '../../hooks/useViewportCenterY'
import BrandWordmark from '../Brand/BrandWordmark'
import { buildNavItems, isActiveRoute } from '../AppShell/navigation'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  widthExpanded: number
  widthCollapsed: number
}

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== '$width' && prop !== '$reserveSpace',
})<{ $width: number; $reserveSpace: boolean }>`
  ${({ $reserveSpace, $width }) => ($reserveSpace ? `width: ${$width}px; flex-shrink: 0;` : '')}
  & .MuiDrawer-paper {
    width: ${({ $width }) => $width}px;
    transition: ${({ theme }) => theme.transitions.create('width')};
    overflow-x: hidden;
  }
`

const HeaderRow = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  padding: ${({ theme }) => theme.spacing(1)};
`

// The collapse/expand control straddles the sidebar's right edge at the divider above the bottom
// rail, sitting on the intersection of that seam and the theme-mode/sign-out separator. It is
// positioned `fixed` at the sidebar's width line (rather than inside the drawer paper) so its
// overhanging half isn't clipped by the paper's scroll overflow; the left offset transitions in
// step with the rail's width, and the top is the measured centre of that divider.
const EdgeToggle = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== '$left' && prop !== '$top',
})<{ $left: number; $top: number | null }>`
  position: fixed;
  top: ${({ $top }) => ($top != null ? `${$top}px` : '50%')};
  left: ${({ $left }) => $left}px;
  transform: translate(-50%, -50%);
  z-index: ${({ theme }) => theme.zIndex.drawer + 1};
  width: 28px;
  height: 28px;
  transition: ${({ theme }) => theme.transitions.create('left')};
  background-color: ${({ theme }) => theme.palette.surfaceContainerHighest};
  border: 1px solid ${({ theme }) => theme.palette.outlineVariant};
  color: ${({ theme }) => theme.palette.onSurfaceVariant};
  &:hover {
    background-color: ${({ theme }) => theme.palette.surfaceContainerHighest};
  }
  & .MuiSvgIcon-root {
    font-size: 1.1rem;
  }
`

const BottomRail = styled(Box)`
  margin-top: auto;
`

// MD3 navigation item: an inset, pill-shaped target. Applied via sx (not styled) so
// ListItemButton keeps its polymorphic `component`/`to` typing. The selected state
// (secondary-container fill + on-secondary-container content) comes from the theme override.
const navSx = (rail: boolean) => ({
  mx: 1,
  my: 0.5,
  minHeight: 48,
  borderRadius: 999,
  justifyContent: rail ? 'center' : 'flex-start',
  '& .MuiListItemIcon-root': { minWidth: rail ? 0 : 40, justifyContent: 'center' },
})

const MODE_META: Record<ThemeMode, { label: string; Icon: typeof LightModeIcon; short: string }> = {
  light: { label: 'Light mode (click to cycle)', Icon: LightModeIcon, short: 'Light' },
  dark: { label: 'Dark mode (click to cycle)', Icon: DarkModeIcon, short: 'Dark' },
  system: { label: 'System mode (click to cycle)', Icon: SettingsBrightnessIcon, short: 'System' },
}

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  widthExpanded,
  widthCollapsed,
}: SidebarProps) {
  const { user, isAdmin } = useAuth()
  const { mode, cycleMode } = useThemeMode()
  const { openFeedback } = useFeedback()
  const loc = useLocation()

  // Pin the edge toggle onto the divider above the bottom rail; remeasure when the sign-out item
  // appears/disappears (it shifts the divider) or the viewport resizes.
  const bottomDividerRef = useRef<HTMLHRElement>(null)
  const toggleTop = useViewportCenterY(bottomDividerRef, [!!user])

  const navItems = buildNavItems(isAdmin)

  const width = collapsed ? widthCollapsed : widthExpanded
  const showLabels = !collapsed
  const ModeIcon = MODE_META[mode].Icon
  const modeLabel = MODE_META[mode].label

  return (
    <StyledDrawer variant='permanent' open $width={width} $reserveSpace>
      <EdgeToggle
        $left={width}
        $top={toggleTop}
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </EdgeToggle>
      <HeaderRow>{showLabels && <BrandWordmark size='sidebar' />}</HeaderRow>
      <Divider />
      <List>
        {navItems.map(({ to, label, Icon }) => (
          <ListItem key={to} disablePadding>
            <Tooltip title={!showLabels ? label : ''} placement='right'>
              <ListItemButton
                sx={navSx(!showLabels)}
                component={RouterLink}
                to={to}
                selected={isActiveRoute(loc.pathname, to)}
              >
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>
                {showLabels && <ListItemText primary={label} />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <BottomRail>
        <Divider ref={bottomDividerRef} />
        <List>
          <ListItem disablePadding>
            <Tooltip title={!showLabels ? 'Send feedback' : ''} placement='right'>
              <ListItemButton
                sx={navSx(!showLabels)}
                onClick={openFeedback}
                aria-label='Send feedback'
              >
                <ListItemIcon>
                  <FeedbackOutlinedIcon />
                </ListItemIcon>
                {showLabels && <ListItemText primary='Feedback' />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
          <ListItem disablePadding>
            <Tooltip title={modeLabel} placement='right'>
              <ListItemButton sx={navSx(!showLabels)} onClick={cycleMode} aria-label={modeLabel}>
                <ListItemIcon>
                  <ModeIcon />
                </ListItemIcon>
                {showLabels && <ListItemText primary={MODE_META[mode].short} />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
          {user && (
            <ListItem disablePadding>
              <Tooltip title={!showLabels ? 'Sign out' : ''} placement='right'>
                <ListItemButton
                  sx={navSx(!showLabels)}
                  component='a'
                  href='/api/auth/logout'
                  onClick={clearSessionMarker}
                >
                  <ListItemIcon>
                    <LogoutIcon />
                  </ListItemIcon>
                  {showLabels && <ListItemText primary='Sign out' />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )}
        </List>
      </BottomRail>
    </StyledDrawer>
  )
}
