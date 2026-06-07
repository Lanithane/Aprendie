import HomeIcon from '@mui/icons-material/Home'
import HistoryIcon from '@mui/icons-material/History'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import StyleIcon from '@mui/icons-material/Style'
import SettingsIcon from '@mui/icons-material/Settings'
import ShieldIcon from '@mui/icons-material/Shield'
import BangIcon from './BangIcon'

const SETTINGS_NAV_ITEM = { to: '/settings', label: 'Settings', Icon: SettingsIcon } as const

export const ADMIN_NAV_ITEM = {
  to: '/admin',
  label: 'Admin',
  Icon: ShieldIcon,
} as const

// Settings always sits last; Admin (when present) is inserted just before it.
export const NAV_ITEMS = [
  { to: '/', label: 'Practice', Icon: HomeIcon },
  { to: '/flashcards', label: 'Flash cards', Icon: StyleIcon },
  { to: '/history', label: 'History', Icon: HistoryIcon },
  { to: '/palabradex', label: 'Palabradex', Icon: MenuBookIcon },
  { to: '/translator', label: 'Translate', Icon: BangIcon },
  SETTINGS_NAV_ITEM,
] as const

export function buildNavItems(isAdmin: boolean) {
  if (!isAdmin) return NAV_ITEMS
  return [
    ...NAV_ITEMS.filter((item) => item !== SETTINGS_NAV_ITEM),
    ADMIN_NAV_ITEM,
    SETTINGS_NAV_ITEM,
  ]
}

export function isActiveRoute(pathname: string, to: string) {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}
