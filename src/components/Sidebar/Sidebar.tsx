import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  IconButton,
  Box,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined'
import { styled } from '@mui/material/styles'
import { useAuth } from '../../auth/AuthContext'
import { useFeedback } from '../Feedback/FeedbackProvider'
import { useViewportCenterY } from '../../hooks/useViewportCenterY'
import BrandWordmark from '../Brand/BrandWordmark'
import {
  SIDEBAR_PRIMARY_NAV_ITEMS,
  buildSidebarMoreItems,
  isActiveRoute,
} from '../AppShell/navigation'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  widthExpanded: number
  widthCollapsed: number
}

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== '$width' && prop !== '$reserveSpace',
})<{ $width: number; $reserveSpace: boolean }>`
  ${({ $reserveSpace, $width }) => ($reserveSpace ? `width: ${$width}px; flex-shrink: 0;` : '')}
  & .MuiDrawer-paper {
    width: ${({ $width }) => $width}px;
    transition: ${({ theme }) => theme.transitions.create('width')};
    overflow-x: hidden;
  }
`

const HeaderRow = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  padding: ${({ theme }) => theme.spacing(1)};
`

// The collapse/expand control straddles the sidebar's right edge at the divider above the bottom
// rail, sitting on the intersection of that seam and the separator. It is positioned `fixed` at
// the sidebar's width line so its overhanging half isn't clipped by the paper's scroll overflow.
const EdgeToggle = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== '$left' && prop !== '$top',
})<{ $left: number; $top: number | null }>`
  position: fixed;
  top: ${({ $top }) => ($top != null ? `${$top}px` : '50%')};
  left: ${({ $left }) => $left}px;
  transform: translate(-50%, -50%);
  z-index: ${({ theme }) => theme.zIndex.drawer + 1};
  width: 28px;
  height: 28px;
  transition: ${({ theme }) => theme.transitions.create('left')};
  background-color: ${({ theme }) => theme.palette.surfaceContainerHighest};
  border: 1px solid ${({ theme }) => theme.palette.outlineVariant};
  color: ${({ theme }) => theme.palette.onSurfaceVariant};
  &:hover {
    background-color: ${({ theme }) => theme.palette.surfaceContainerHighest};
  }
  & .MuiSvgIcon-root {
    font-size: 1.1rem;
  }
`

const BottomRail = styled(Box)`
  margin-top: auto;
`

// MD3 navigation item: an inset, pill-shaped target. The selected state
// (secondary-container fill + on-secondary-container content) comes from the theme override.
const navSx = (rail: boolean) => ({
  mx: 1,
  my: 0.5,
  minHeight: 48,
  borderRadius: '16px',
  justifyContent: rail ? 'center' : 'flex-start',
  '& .MuiListItemIcon-root': { minWidth: rail ? 0 : 40, justifyContent: 'center' },
})

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  widthExpanded,
  widthCollapsed,
}: SidebarProps) {
  const { t } = useTranslation()
  const { user, isAdmin } = useAuth()
  const { openFeedback } = useFeedback()
  const loc = useLocation()

  const bottomDividerRef = useRef<HTMLHRElement>(null)
  const toggleTop = useViewportCenterY(bottomDividerRef, [!!user, isAdmin])

  const moreItems = buildSidebarMoreItems(isAdmin)

  const width = collapsed ? widthCollapsed : widthExpanded
  const showLabels = !collapsed

  return (
    <StyledDrawer variant='permanent' open $width={width} $reserveSpace>
      <EdgeToggle
        $left={width}
        $top={toggleTop}
        onClick={onToggleCollapsed}
        aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
      >
        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </EdgeToggle>
      <HeaderRow>{showLabels && <BrandWordmark size='sidebar' />}</HeaderRow>
      <Divider />
      <List>
        {SIDEBAR_PRIMARY_NAV_ITEMS.map(({ to, labelKey, Icon }) => (
          <ListItem key={to} disablePadding>
            <Tooltip title={!showLabels ? t(labelKey) : ''} placement='right'>
              <ListItemButton
                sx={navSx(!showLabels)}
                component={RouterLink}
                to={to}
                selected={isActiveRoute(loc.pathname, to)}
              >
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>
                {showLabels && <ListItemText primary={t(labelKey)} />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <BottomRail>
        <Divider ref={bottomDividerRef} />
        <List>
          <ListItem disablePadding>
            <Tooltip title={!showLabels ? t('sidebar.sendFeedback') : ''} placement='right'>
              <ListItemButton
                sx={navSx(!showLabels)}
                onClick={openFeedback}
                aria-label={t('sidebar.sendFeedback')}
              >
                <ListItemIcon>
                  <FeedbackOutlinedIcon />
                </ListItemIcon>
                {showLabels && <ListItemText primary={t('sidebar.feedback')} />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
          {moreItems.map(({ to, labelKey, Icon }) => (
            <ListItem key={to} disablePadding>
              <Tooltip title={!showLabels ? t(labelKey) : ''} placement='right'>
                <ListItemButton
                  sx={navSx(!showLabels)}
                  component={RouterLink}
                  to={to}
                  selected={isActiveRoute(loc.pathname, to)}
                >
                  <ListItemIcon>
                    <Icon />
                  </ListItemIcon>
                  {showLabels && <ListItemText primary={t(labelKey)} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>
      </BottomRail>
    </StyledDrawer>
  )
}
