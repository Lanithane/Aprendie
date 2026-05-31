import { useState, type ReactNode } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { styled, useTheme } from '@mui/material/styles'
import { Box, useMediaQuery, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import { useAuth } from '../../auth/AuthContext'
import Sidebar from '../Sidebar/Sidebar'
import { ADMIN_NAV_ITEM, isActiveRoute, NAV_ITEMS } from './navigation'

const SIDEBAR_WIDTH = 240
const SIDEBAR_COLLAPSED_WIDTH = 64

const ShellRoot = styled(Box)`
  display: flex;
  min-height: 100vh;
`

const Main = styled('main')`
  flex: 1;
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
  const { isAdmin } = useAuth()
  const loc = useLocation()
  // Desktop sidebar defaults to the collapsed rail; users expand it on demand.
  const [collapsed, setCollapsed] = useState(true)
  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS
  const activePath = navItems.find(({ to }) => isActiveRoute(loc.pathname, to))?.to ?? false

  return (
    <ShellRoot>
      <SkipLink href='#main-content'>Skip to content</SkipLink>
      {!isMobile && (
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          widthExpanded={SIDEBAR_WIDTH}
          widthCollapsed={SIDEBAR_COLLAPSED_WIDTH}
        />
      )}
      <Main id='main-content' tabIndex={-1}>
        <Content>{children}</Content>
      </Main>
      {isMobile && (
        <MobileNavSurface elevation={8}>
          <BottomNavigation showLabels value={activePath} aria-label='Primary navigation'>
            {navItems.map(({ to, label, Icon }) => (
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
