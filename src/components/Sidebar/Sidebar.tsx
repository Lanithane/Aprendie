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
import HomeIcon from '@mui/icons-material/Home'
import HistoryIcon from '@mui/icons-material/History'
import SettingsIcon from '@mui/icons-material/Settings'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import { styled } from '@mui/material/styles'
import { useAuth } from '../../auth/AuthContext'
import { useThemeMode, type ThemeMode } from '../../ThemeModeProvider'

interface SidebarProps {
  isMobile: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
  widthExpanded: number
  widthCollapsed: number
}

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== '$width' && prop !== '$reserveSpace',
})<{ $width: number; $reserveSpace: boolean }>`
  ${({ $reserveSpace, $width }) =>
    $reserveSpace ? `width: ${$width}px; flex-shrink: 0;` : ''}
  & .MuiDrawer-paper {
    width: ${({ $width }) => $width}px;
    transition: ${({ theme }) => theme.transitions.create('width')};
    overflow-x: hidden;
  }
`

const HeaderRow = styled(Box)`
  display: flex;
  justify-content: flex-end;
  padding: ${({ theme }) => theme.spacing(1)};
`

const BottomRail = styled(Box)`
  margin-top: auto;
`

const NAV_ITEMS = [
  { to: '/', label: 'Practice', Icon: HomeIcon },
  { to: '/history', label: 'History', Icon: HistoryIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
] as const

const MODE_META: Record<ThemeMode, { label: string; Icon: typeof LightModeIcon; short: string }> = {
  light: { label: 'Light mode (click to cycle)', Icon: LightModeIcon, short: 'Light' },
  dark: { label: 'Dark mode (click to cycle)', Icon: DarkModeIcon, short: 'Dark' },
  system: { label: 'System mode (click to cycle)', Icon: SettingsBrightnessIcon, short: 'System' },
}

export default function Sidebar({
  isMobile,
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapsed,
  widthExpanded,
  widthCollapsed,
}: SidebarProps) {
  const { user } = useAuth()
  const { mode, cycleMode } = useThemeMode()
  const loc = useLocation()

  // Mobile: always full width when open. Desktop: collapsed or expanded.
  const width = isMobile ? widthExpanded : collapsed ? widthCollapsed : widthExpanded
  const showLabels = !collapsed || isMobile
  const ModeIcon = MODE_META[mode].Icon
  const modeLabel = MODE_META[mode].label
  const variant = isMobile ? 'temporary' : 'permanent'

  // Close mobile drawer when navigating
  const handleNav = isMobile ? onCloseMobile : undefined

  return (
    <StyledDrawer
      variant={variant}
      open={isMobile ? mobileOpen : true}
      onClose={onCloseMobile}
      ModalProps={{ keepMounted: true }}
      $width={width}
      $reserveSpace={!isMobile}
    >
      <HeaderRow>
        {isMobile ? (
          <IconButton onClick={onCloseMobile} aria-label='Close menu'>
            <ChevronLeftIcon />
          </IconButton>
        ) : (
          <IconButton
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </HeaderRow>
      <Divider />
      <List>
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <ListItem key={to} disablePadding>
            <Tooltip title={!showLabels ? label : ''} placement='right'>
              <ListItemButton
                component={RouterLink}
                to={to}
                selected={loc.pathname === to}
                onClick={handleNav}
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
        <Divider />
        <List>
          <ListItem disablePadding>
            <Tooltip title={modeLabel} placement='right'>
              <ListItemButton onClick={cycleMode} aria-label={modeLabel}>
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
                <ListItemButton component='a' href='/api/auth/logout'>
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
