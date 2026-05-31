import HomeIcon from '@mui/icons-material/Home'
import HistoryIcon from '@mui/icons-material/History'
import SettingsIcon from '@mui/icons-material/Settings'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'

export const NAV_ITEMS = [
  { to: '/', label: 'Practice', Icon: HomeIcon },
  { to: '/history', label: 'History', Icon: HistoryIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
] as const

export const ADMIN_NAV_ITEM = {
  to: '/admin',
  label: 'Admin',
  Icon: AdminPanelSettingsIcon,
} as const

export function isActiveRoute(pathname: string, to: string) {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}
