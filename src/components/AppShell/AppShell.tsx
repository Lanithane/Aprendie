import { type ReactNode } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { styled, useTheme } from '@mui/material/styles'
import { Box, useMediaQuery, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import { useAuth } from '../../auth/AuthContext'
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed'
import { useScrollToTop } from '../../hooks/useScrollToTop'
import { useKeyboardOpen } from '../../hooks/useKeyboardOpen'
import Sidebar from '../Sidebar/Sidebar'
import DailyCapBanner from '../DailyCapBanner/DailyCapBanner'
import { ADMIN_NAV_ITEM, buildNavItems, isActiveRoute } from './navigation'

const SIDEBAR_WIDTH = 240
const SIDEBAR_COLLAPSED_WIDTH = 64

const ShellRoot = styled(Box)`
  display: flex;
  min-height: 100vh;
`

const Main = styled('main')`
  flex: 1;
  /* min-width: 0 lets this flex child shrink below its content's intrinsic width — without it
     recharts' ResponsiveContainer keeps the column wider than the viewport on phones (horizontal
     scroll / pinch-to-zoom-out). */
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing(3)};
  ${({ theme }) => theme.breakpoints.down('md')} {
    padding: ${({ theme }) => theme.spacing(2, 2, 10, 2)};
  }
`

// Centered, readable column — the "Google homepage" container. Pages that want to float their
// content vertically (HomePage) add auto top/bottom margins to their own root.
const Content = styled('div')`
  flex: 1;
  width: 100%;
  max-width: 760px;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
`

// Keyboard/screen-reader affordance: hidden until focused, then jumps past the
// nav into the main content. First Tab on any page reveals it.
const SkipLink = styled('a')`
  position: absolute;
  left: ${({ theme }) => theme.spacing(1)};
  top: -100%;
  z-index: ${({ theme }) => theme.zIndex.appBar + 1};
  padding: ${({ theme }) => theme.spacing(1, 2)};
  border-radius: 4px;
  background: ${({ theme }) => theme.palette.background.paper};
  color: ${({ theme }) => theme.palette.primary.main};
  &:focus-visible {
    top: ${({ theme }) => theme.spacing(1)};
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: 2px;
  }
`

const MobileNavSurface = styled(Paper)`
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: ${({ theme }) => theme.zIndex.appBar};
  border-radius: 0;
  border-top: 1px solid ${({ theme }) => theme.palette.divider};
  background-image: none;
  padding-bottom: env(safe-area-inset-bottom);
`

export default function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isXs = useMediaQuery(theme.breakpoints.only('xs'))
  // While the soft keyboard is up the fixed bottom nav is hidden behind it anyway, and on iOS its
  // `position: fixed` anchoring fights the keyboard and jitters the page scroll as you type — so we
  // drop it from the layout entirely until the keyboard closes. It's out of flow, so this reflows
  // nothing.
  const keyboardOpen = useKeyboardOpen()
  const { isAdmin } = useAuth()
  const loc = useLocation()
  // Reset to the top of the page on every navigation — React Router otherwise
  // keeps the previous view's scroll offset.
  useScrollToTop()
  // Desktop sidebar defaults to the collapsed rail; users expand it on demand. The choice is
  // persisted to localStorage so it survives reloads.
  const { collapsed, toggleCollapsed } = useSidebarCollapsed()
  const navItems = buildNavItems(isAdmin)
  // Flash cards is dropped from the bottom bar across the whole mobile range — it gets a pill
  // shortcut on the home screen (HomeTopBar) instead. Admin additionally drops on the narrowest
  // phones (xs), where six items won't fit; admins reach it from Settings there.
  const mobileNavItems = navItems.filter(
    ({ to }) => to !== '/flashcards' && !(isXs && to === ADMIN_NAV_ITEM.to)
  )
  const activePath = navItems.find(({ to }) => isActiveRoute(loc.pathname, to))?.to ?? false
  // The near-cap banner belongs to the spend surfaces — sentence practice and flash cards, which
  // share the one daily cap. Elsewhere (history, settings, admin) there's nothing to warn about.
  const isPracticeRoute = loc.pathname === '/' || loc.pathname === '/flashcards'

  return (
    <ShellRoot>
      <SkipLink href='#main-content'>Skip to content</SkipLink>
      {!isMobile && (
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          widthExpanded={SIDEBAR_WIDTH}
          widthCollapsed={SIDEBAR_COLLAPSED_WIDTH}
        />
      )}
      <Main id='main-content' tabIndex={-1}>
        <Content>
          {isPracticeRoute && <DailyCapBanner />}
          {children}
        </Content>
      </Main>
      {isMobile && !keyboardOpen && (
        <MobileNavSurface elevation={8}>
          <BottomNavigation showLabels value={activePath} aria-label='Primary navigation'>
            {mobileNavItems.map(({ to, label, Icon }) => (
              <BottomNavigationAction
                key={to}
                label={label}
                value={to}
                icon={<Icon />}
                component={RouterLink}
                to={to}
              />
            ))}
          </BottomNavigation>
        </MobileNavSurface>
      )}
    </ShellRoot>
  )
}
