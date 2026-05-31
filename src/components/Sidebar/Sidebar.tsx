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
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import { styled } from '@mui/material/styles'
import { useAuth } from '../../auth/AuthContext'
import { useThemeMode, type ThemeMode } from '../../ThemeModeProvider'
import { ADMIN_NAV_ITEM, isActiveRoute, NAV_ITEMS } from '../AppShell/navigation'

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
  justify-content: flex-end;
  padding: ${({ theme }) => theme.spacing(1)};
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
  const loc = useLocation()

  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS

  const width = collapsed ? widthCollapsed : widthExpanded
  const showLabels = !collapsed
  const ModeIcon = MODE_META[mode].Icon
  const modeLabel = MODE_META[mode].label

  return (
    <StyledDrawer variant='permanent' open $width={width} $reserveSpace>
      <HeaderRow>
        <IconButton
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </HeaderRow>
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
        <Divider />
        <List>
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
                <ListItemButton sx={navSx(!showLabels)} component='a' href='/api/auth/logout'>
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
