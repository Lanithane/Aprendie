import { useState, type ReactNode } from 'react'
import { styled, useTheme } from '@mui/material/styles'
import { Box, useMediaQuery, AppBar, Toolbar, IconButton, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import Sidebar from '../Sidebar/Sidebar'

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
    padding: ${({ theme }) => theme.spacing(9, 2, 2, 2)};
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

export default function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  // Desktop sidebar defaults to the collapsed rail; users expand it on demand.
  const [collapsed, setCollapsed] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <ShellRoot>
      <SkipLink href='#main-content'>Skip to content</SkipLink>
      {isMobile && (
        <AppBar position='fixed'>
          <Toolbar>
            <IconButton edge='start' onClick={() => setMobileOpen(true)} aria-label='Open menu'>
              <MenuIcon />
            </IconButton>
            <Typography variant='h6' sx={{ ml: 1 }}>
              Aprendie
            </Typography>
          </Toolbar>
        </AppBar>
      )}
      <Sidebar
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        widthExpanded={SIDEBAR_WIDTH}
        widthCollapsed={SIDEBAR_COLLAPSED_WIDTH}
      />
      <Main id='main-content' tabIndex={-1}>
        <Content>{children}</Content>
      </Main>
    </ShellRoot>
  )
}
