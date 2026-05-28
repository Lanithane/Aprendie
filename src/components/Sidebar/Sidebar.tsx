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
import { styled } from '@mui/material/styles'
import { useAuth } from '../../auth/AuthContext'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  widthExpanded: number
  widthCollapsed: number
}

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== '$width',
})<{ $width: number }>`
  width: ${({ $width }) => $width}px;
  flex-shrink: 0;
  & .MuiDrawer-paper {
    width: ${({ $width }) => $width}px;
    transition: ${({ theme }) => theme.transitions.create('width')};
    overflow-x: hidden;
  }
`

const ToggleHeader = styled(Box)`
  display: flex;
  justify-content: flex-end;
  padding: ${({ theme }) => theme.spacing(1)};
`

const NAV_ITEMS = [
  { to: '/', label: 'Practice', Icon: HomeIcon },
  { to: '/history', label: 'History', Icon: HistoryIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
] as const

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  widthExpanded,
  widthCollapsed,
}: SidebarProps) {
  const { user } = useAuth()
  const loc = useLocation()
  const width = collapsed ? widthCollapsed : widthExpanded

  return (
    <StyledDrawer variant='permanent' $width={width}>
      <ToggleHeader>
        <IconButton
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </ToggleHeader>
      <Divider />
      <List>
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <ListItem key={to} disablePadding>
            <Tooltip title={collapsed ? label : ''} placement='right'>
              <ListItemButton component={RouterLink} to={to} selected={loc.pathname === to}>
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>
                {!collapsed && <ListItemText primary={label} />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
      <Divider />
      {user && (
        <List>
          <ListItem disablePadding>
            <Tooltip title={collapsed ? 'Sign out' : ''} placement='right'>
              <ListItemButton component='a' href='/api/auth/logout'>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                {!collapsed && <ListItemText primary='Sign out' />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        </List>
      )}
    </StyledDrawer>
  )
}
