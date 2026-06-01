import HomeIcon from '@mui/icons-material/Home'
import TranslateIcon from '@mui/icons-material/Translate'
import HistoryIcon from '@mui/icons-material/History'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import SettingsIcon from '@mui/icons-material/Settings'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'

export const NAV_ITEMS = [
  { to: '/', label: 'Practice', Icon: HomeIcon },
  { to: '/translator', label: 'Translate', Icon: TranslateIcon },
  { to: '/history', label: 'History', Icon: HistoryIcon },
  { to: '/pokedex', label: 'Words', Icon: MenuBookIcon },
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
