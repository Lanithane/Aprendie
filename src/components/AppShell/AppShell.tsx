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
  padding: ${({ theme }) => theme.spacing(3)};
  ${({ theme }) => theme.breakpoints.down('md')} {
    padding: ${({ theme }) => theme.spacing(9, 2, 2, 2)};
  }
`

export default function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <ShellRoot>
      {isMobile && (
        <AppBar position='fixed' color='default' elevation={1}>
          <Toolbar>
            <IconButton edge='start' onClick={() => setMobileOpen(true)} aria-label='Open menu'>
              <MenuIcon />
            </IconButton>
            <Typography variant='h6' sx={{ ml: 1 }}>
              Guess &amp; Correct
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
      <Main>{children}</Main>
    </ShellRoot>
  )
}
