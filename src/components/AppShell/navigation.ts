import HomeIcon from '@mui/icons-material/Home'
import HistoryIcon from '@mui/icons-material/History'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import StyleIcon from '@mui/icons-material/Style'
import SettingsIcon from '@mui/icons-material/Settings'
import ShieldIcon from '@mui/icons-material/Shield'
import BangIcon from './BangIcon'

// `labelKey` indexes the `nav.*` catalog group — the registry stays data-only and the label is
// translated where it's rendered (Sidebar, AppShell, the Settings admin button).
const SETTINGS_NAV_ITEM = { to: '/settings', labelKey: 'nav.settings', Icon: SettingsIcon } as const

export const ADMIN_NAV_ITEM = {
  to: '/admin',
  labelKey: 'nav.admin',
  Icon: ShieldIcon,
} as const

// Settings always sits last; Admin (when present) is inserted just before it.
export const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.practice', Icon: HomeIcon },
  { to: '/flashcards', labelKey: 'nav.flashcards', Icon: StyleIcon },
  { to: '/history', labelKey: 'nav.history', Icon: HistoryIcon },
  { to: '/palabradex', labelKey: 'nav.palabradex', Icon: MenuBookIcon },
  { to: '/translator', labelKey: 'nav.translate', Icon: BangIcon },
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
