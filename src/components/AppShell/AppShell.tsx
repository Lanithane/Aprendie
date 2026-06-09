import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { styled, useTheme } from '@mui/material/styles'
import { Box, useMediaQuery, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuth } from '../../auth/AuthContext'
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed'
import { useScrollToTop } from '../../hooks/useScrollToTop'
import { useKeyboardOpen } from '../../hooks/useKeyboardOpen'
import Sidebar from '../Sidebar/Sidebar'
import DailyCapBanner from '../DailyCapBanner/DailyCapBanner'
import MoreDrawer from '../MoreDrawer/MoreDrawer'
import { PRIMARY_NAV_ITEMS, buildNavItems, isActiveRoute, isMoreRoute } from './navigation'

const SIDEBAR_WIDTH = 240
const SIDEBAR_COLLAPSED_WIDTH = 64

// Sentinel value used as BottomNavigation `value` when the More drawer is active.
const MORE_VALUE = '__more__'

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
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const keyboardOpen = useKeyboardOpen()
  const { isAdmin } = useAuth()
  const loc = useLocation()
  useScrollToTop()
  const { collapsed, toggleCollapsed } = useSidebarCollapsed()
  const [moreOpen, setMoreOpen] = useState(false)

  const navItems = buildNavItems(isAdmin)
  const activeMoreRoute = isMoreRoute(loc.pathname, isAdmin)
  const activePath = navItems.find(({ to }) => isActiveRoute(loc.pathname, to))?.to ?? false
  // Bottom nav shows primary items plus the More button.
  const bottomNavValue = activeMoreRoute ? MORE_VALUE : activePath || false

  const isPracticeRoute = loc.pathname === '/' || loc.pathname === '/flashcards'

  return (
    <ShellRoot>
      <SkipLink href='#main-content'>{t('appShell.skipToContent')}</SkipLink>
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
        <>
          <MobileNavSurface elevation={8}>
            <BottomNavigation
              value={bottomNavValue}
              aria-label={t('appShell.primaryNavigation')}
              sx={{ '& .MuiBottomNavigationAction-label': { display: 'none' } }}
            >
              {PRIMARY_NAV_ITEMS.map(({ to, labelKey, Icon }) => (
                <BottomNavigationAction
                  key={to}
                  aria-label={t(labelKey)}
                  value={to}
                  icon={<Icon />}
                  component={RouterLink}
                  to={to}
                />
              ))}
              <BottomNavigationAction
                aria-label={t('nav.more')}
                value={MORE_VALUE}
                icon={<MenuIcon />}
                onClick={() => setMoreOpen(true)}
              />
            </BottomNavigation>
          </MobileNavSurface>
          <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
        </>
      )}
    </ShellRoot>
  )
}
