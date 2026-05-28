import { useState, type ReactNode } from 'react'
import { styled } from '@mui/material/styles'
import { Box } from '@mui/material'
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
`

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <ShellRoot>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        widthExpanded={SIDEBAR_WIDTH}
        widthCollapsed={SIDEBAR_COLLAPSED_WIDTH}
      />
      <Main>{children}</Main>
    </ShellRoot>
  )
}
