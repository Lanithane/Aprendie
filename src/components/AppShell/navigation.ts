import HomeIcon from '@mui/icons-material/Home'
import HistoryIcon from '@mui/icons-material/History'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import StyleIcon from '@mui/icons-material/Style'
import SettingsIcon from '@mui/icons-material/Settings'
import ShieldIcon from '@mui/icons-material/Shield'
import BangIcon from './BangIcon'

export const ADMIN_NAV_ITEM = {
  to: '/admin',
  labelKey: 'nav.admin',
  Icon: ShieldIcon,
} as const

const SETTINGS_NAV_ITEM = { to: '/settings', labelKey: 'nav.settings', Icon: SettingsIcon } as const
const TRANSLATOR_NAV_ITEM = {
  to: '/translator',
  labelKey: 'nav.translate',
  Icon: BangIcon,
} as const

// The four items that appear in the primary bar everywhere (bottom nav on mobile, top of sidebar on desktop).
export const PRIMARY_NAV_ITEMS = [
  { to: '/', labelKey: 'nav.practice', Icon: HomeIcon },
  { to: '/flashcards', labelKey: 'nav.flashcards', Icon: StyleIcon },
  { to: '/palabradex', labelKey: 'nav.palabradex', Icon: MenuBookIcon },
  { to: '/history', labelKey: 'nav.history', Icon: HistoryIcon },
] as const

// Items surfaced in the "More" drawer on mobile and below the divider on desktop sidebar.
// Admin is inserted before Settings when the user is an admin.
export function buildMoreItems(isAdmin: boolean) {
  return isAdmin
    ? ([TRANSLATOR_NAV_ITEM, ADMIN_NAV_ITEM, SETTINGS_NAV_ITEM] as const)
    : ([TRANSLATOR_NAV_ITEM, SETTINGS_NAV_ITEM] as const)
}

// Full flat list (sidebar rendering, active-path detection).
export function buildNavItems(isAdmin: boolean) {
  return [...PRIMARY_NAV_ITEMS, ...buildMoreItems(isAdmin)]
}

export function isActiveRoute(pathname: string, to: string) {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

// Returns true when the current path lives inside the "More" drawer (used to highlight the More button).
export function isMoreRoute(pathname: string, isAdmin: boolean) {
  return buildMoreItems(isAdmin).some(({ to }) => isActiveRoute(pathname, to))
}
