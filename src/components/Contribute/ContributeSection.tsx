import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material'
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import type { Showback } from '../../api/showbackApi'
import { OFFSET_URL, SUPPORT_URL, formatUsd, formatWater } from './contribute'

// Same inset pill geometry as the sidebar nav items (kept in sync with Sidebar's navSx), but
// tighter vertical padding and a touch more room between the icon and the label.
const itemSx = (rail: boolean) => ({
  mx: 1,
  my: 0.5,
  py: 0.5,
  minHeight: 40,
  borderRadius: 999,
  justifyContent: rail ? 'center' : 'flex-start',
  '& .MuiListItemIcon-root': { minWidth: rail ? 0 : 48, justifyContent: 'center' },
})

interface ContributeSectionProps {
  showback: Showback | null
  showLabels: boolean
}

// The sidebar "contribute" rail: current usage cost, an offset-your-water-footprint link, and a
// support-the-developer link. The two links are config-gated (hidden until their URL is set);
// nothing renders at all until showback has loaded.
export default function ContributeSection({ showback, showLabels }: ContributeSectionProps) {
  if (!showback) return null

  const rail = !showLabels
  const usd = formatUsd(showback.totalCostUsd)
  const water = formatWater(showback.estimate.waterMl)

  // Reassure that the cost is informational, not a bill. Collapsed, prepend the amount so the
  // rail icon still surfaces it.
  const reassurance = "Don't worry, Aprendie is free! We appreciate any donations, though."

  return (
    <List>
      {/* A non-interactive row built from the same ListItemButton geometry as the links below, so
          the icon lines up in the rail. Collapsed, the tooltip hangs off the icon to the right
          (and carries the amount, otherwise hidden); expanded, it sits just above the row,
          left-aligned over the $ icon. */}
      <ListItem disablePadding>
        <Tooltip
          title={rail ? `Usage so far: ${usd}. ${reassurance}` : reassurance}
          placement={rail ? 'right' : 'top-start'}
          enterTouchDelay={0}
          slotProps={
            rail
              ? undefined
              : { popper: { modifiers: [{ name: 'offset', options: { offset: [20, -10] } }] } }
          }
        >
          <ListItemButton
            component='div'
            disableRipple
            sx={{
              ...itemSx(rail),
              cursor: 'default',
              '&:hover': { backgroundColor: 'transparent' },
            }}
          >
            <ListItemIcon>
              <PaidOutlinedIcon />
            </ListItemIcon>
            {showLabels && <ListItemText primary='Usage so far' secondary={usd} />}
          </ListItemButton>
        </Tooltip>
      </ListItem>

      <ListItem disablePadding>
        <Tooltip title={rail ? `Offset your water footprint (~${water})` : ''} placement='right'>
          <ListItemButton
            sx={itemSx(rail)}
            component='a'
            href={OFFSET_URL}
            target='_blank'
            rel='noopener noreferrer'
          >
            <ListItemIcon>
              <WaterDropOutlinedIcon />
            </ListItemIcon>
            {showLabels && (
              <ListItemText primary='Offset water' secondary={`~${water} estimated`} />
            )}
          </ListItemButton>
        </Tooltip>
      </ListItem>

      <ListItem disablePadding>
        <Tooltip title={rail ? 'Support the developer' : ''} placement='right'>
          <ListItemButton
            sx={itemSx(rail)}
            component='a'
            href={SUPPORT_URL}
            target='_blank'
            rel='noopener noreferrer'
          >
            <ListItemIcon>
              <FavoriteBorderIcon />
            </ListItemIcon>
            {showLabels && <ListItemText primary='Support the developer' />}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    </List>
  )
}
