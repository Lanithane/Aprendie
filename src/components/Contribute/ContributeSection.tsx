import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Tooltip,
} from '@mui/material'
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined'
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
  borderRadius: '16px',
  justifyContent: rail ? 'center' : 'flex-start',
  '& .MuiListItemIcon-root': { minWidth: rail ? 0 : 48, justifyContent: 'center' },
})

// Non-interactive readout geometry, reused by both usage stats so they line up in the rail.
// Tighter than itemSx (these are passive stats, not tap targets) so the pair reads as a compact
// group under the subheader.
const statSx = (rail: boolean) => ({
  ...itemSx(rail),
  my: 0,
  py: 0.25,
  pl: 1.5,
  minHeight: 32,
  cursor: 'default',
  '&:hover': { backgroundColor: 'transparent' },
  // Pull the icon flush-left so the stat rows line up under the "Usage" header text rather than
  // sitting indented inside a wide icon gutter.
  '& .MuiListItemIcon-root': {
    minWidth: rail ? 0 : 32,
    justifyContent: rail ? 'center' : 'flex-start',
  },
})

interface ContributeSectionProps {
  showback: Showback | null
  showLabels: boolean
}

// The sidebar "contribute" rail: a Usage subheader grouping the running cost + estimated water
// footprint (both informational, sharing one tooltip), an offset-your-water-usage link, and a
// support-the-developer link. The two links are config-gated via their URLs; nothing renders at
// all until showback has loaded.
export default function ContributeSection({ showback, showLabels }: ContributeSectionProps) {
  if (!showback) return null

  const rail = !showLabels
  const usd = formatUsd(showback.totalCostUsd)
  const water = formatWater(showback.estimate.waterMl)

  // Reassure that the cost is informational, not a bill. Collapsed, the tooltip also surfaces the
  // amounts (otherwise hidden) since the rail icons can't.
  const reassurance = "Don't worry, Aprendie is free! We appreciate any donations, though."
  const usageTooltip = rail ? `Usage so far: ${usd}, ~${water} water. ${reassurance}` : reassurance

  return (
    <List>
      {/* The usage group (subheader + the two stat rows) sits on a tinted surface-container fill so
          it reads as a distinct little panel, set off from the action links below it. One tooltip
          covers the whole panel; collapsed it hangs off to the right and carries the amounts,
          expanded it sits just above the panel. */}
      <Tooltip
        title={usageTooltip}
        placement={rail ? 'right' : 'top-start'}
        enterTouchDelay={0}
        slotProps={
          rail
            ? undefined
            : { popper: { modifiers: [{ name: 'offset', options: { offset: [-4, -6] } }] } }
        }
      >
        <Box
          sx={{ mx: 1, mb: 0.5, borderRadius: '16px', bgcolor: 'surfaceContainerHigh', py: 0.5 }}
        >
          {showLabels && (
            <ListSubheader
              component='div'
              disableSticky
              sx={{
                bgcolor: 'transparent',
                lineHeight: 1.5,
                pt: 0.5,
                pb: 0,
                pl: 3,
                fontWeight: 800,
                fontSize: '1rem',
                color: 'onSurface',
              }}
            >
              Usage
            </ListSubheader>
          )}

          <ListItem disablePadding>
            <ListItemButton component='div' disableRipple sx={statSx(rail)}>
              <ListItemIcon>
                <PaidOutlinedIcon />
              </ListItemIcon>
              {showLabels && <ListItemText primary={usd} />}
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton component='div' disableRipple sx={statSx(rail)}>
              <ListItemIcon>
                <WaterDropOutlinedIcon />
              </ListItemIcon>
              {showLabels && <ListItemText primary={`~${water} H₂O`} />}
            </ListItemButton>
          </ListItem>
        </Box>
      </Tooltip>

      <ListItem disablePadding>
        <Tooltip title={rail ? 'Offset water usage' : ''} placement='right'>
          <ListItemButton
            sx={itemSx(rail)}
            component='a'
            href={OFFSET_URL}
            target='_blank'
            rel='noopener noreferrer'
          >
            <ListItemIcon>
              <VolunteerActivismOutlinedIcon />
            </ListItemIcon>
            {showLabels && <ListItemText primary='Offset water usage' />}
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
