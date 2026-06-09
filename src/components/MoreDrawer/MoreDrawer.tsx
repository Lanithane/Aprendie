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
  Typography,
  Box,
} from '@mui/material'
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined'
import { styled } from '@mui/material/styles'
import { useAuth } from '../../auth/AuthContext'
import { useFeedback } from '../Feedback/FeedbackProvider'
import { buildMoreItems, isActiveRoute } from '../AppShell/navigation'

interface MoreDrawerProps {
  open: boolean
  onClose: () => void
}

const DrawerHeader = styled(Box)`
  padding: ${({ theme }) => theme.spacing(2, 2, 1)};
`

const StyledDrawer = styled(Drawer)`
  & .MuiDrawer-paper {
    border-radius: 16px 16px 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
`

const itemSx = {
  mx: 1,
  my: 0.5,
  borderRadius: '16px',
  '& .MuiListItemIcon-root': { minWidth: 40 },
}

export default function MoreDrawer({ open, onClose }: MoreDrawerProps) {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const { openFeedback } = useFeedback()
  const loc = useLocation()

  // Settings is always last; prefix items render above Feedback, Settings renders below it.
  const allItems = buildMoreItems(isAdmin)
  const settingsItem = allItems[allItems.length - 1]
  const prefixItems = allItems.slice(0, -1)

  function handleFeedback() {
    onClose()
    openFeedback()
  }

  return (
    <StyledDrawer anchor='bottom' open={open} onClose={onClose}>
      <DrawerHeader>
        <Typography variant='h6' color='text.secondary'>
          {t('nav.more')}
        </Typography>
      </DrawerHeader>
      <Divider />
      <List>
        {prefixItems.map(({ to, labelKey, Icon }) => (
          <ListItem key={to} disablePadding>
            <ListItemButton
              sx={itemSx}
              component={RouterLink}
              to={to}
              selected={isActiveRoute(loc.pathname, to)}
              onClick={onClose}
            >
              <ListItemIcon>
                <Icon />
              </ListItemIcon>
              <ListItemText primary={t(labelKey)} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton sx={itemSx} onClick={handleFeedback}>
            <ListItemIcon>
              <FeedbackOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary={t('sidebar.feedback')} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            sx={itemSx}
            component={RouterLink}
            to={settingsItem.to}
            selected={isActiveRoute(loc.pathname, settingsItem.to)}
            onClick={onClose}
          >
            <ListItemIcon>
              <settingsItem.Icon />
            </ListItemIcon>
            <ListItemText primary={t(settingsItem.labelKey)} />
          </ListItemButton>
        </ListItem>
      </List>
    </StyledDrawer>
  )
}
