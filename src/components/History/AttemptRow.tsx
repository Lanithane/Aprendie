import {
  Box,
  Chip,
  Collapse,
  Divider,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { format } from 'date-fns'
import GradeChip from '../shared/GradeChip'
import AttemptDetail from './AttemptDetail'
import { languageName } from '../../../shared/languages'
import type { AttemptDto } from '../../api/historyApi'

interface AttemptRowProps {
  entry: AttemptDto
  open: boolean
  onToggle: () => void
  // Admin spans every language pair, so it surfaces a pair chip; the history page is scoped to a
  // selected pair and omits it.
  showLanguagePair?: boolean
  // Rendered inside a bordered List (history page) → square corners + a trailing divider. Left
  // off when the row stands alone in a spaced Stack (admin), which rounds the corners instead.
  inList?: boolean
  showDivider?: boolean
}

// A single expandable practice attempt: grade, prompt, optional language pair, timestamp, and an
// AttemptDetail panel in the collapse. Shared by the history page and the admin user-history view.
export default function AttemptRow({
  entry,
  open,
  onToggle,
  showLanguagePair = false,
  inList = false,
  showDivider = false,
}: AttemptRowProps) {
  const langLabel = `${languageName(entry.learnLanguage)} ⟶ ${languageName(entry.guessLanguage)}`
  return (
    <Box>
      <ListItemButton
        onClick={onToggle}
        aria-expanded={open}
        aria-label='Toggle attempt details'
        sx={{ gap: 1.5, py: 1.25, px: 2, borderRadius: inList ? 0 : 2 }}
      >
        <GradeChip grade={entry.grade} />
        <ListItemText
          primary={entry.promptText}
          slotProps={{
            primary: {
              lang: entry.learnLanguage,
              noWrap: true,
              sx: { flex: 1, minWidth: 0, wordSpacing: '-0.05em' },
            },
          }}
        />
        {/* The pair chip and timestamp drop out as the row narrows and reappear in the detail. */}
        {showLanguagePair && (
          <Chip
            size='small'
            variant='outlined'
            label={langLabel}
            sx={{ display: { xs: 'none', md: 'inline-flex' }, flexShrink: 0 }}
          />
        )}
        <Typography
          variant='caption'
          sx={{ flexShrink: 0, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
        >
          {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
        </Typography>
        <ExpandMoreIcon
          sx={{
            flexShrink: 0,
            color: 'action.active',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: '0.2s',
          }}
        />
      </ListItemButton>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
          <AttemptDetail
            entry={entry}
            leading={
              showLanguagePair ? (
                <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 1.5 }}>
                  <Chip size='small' variant='outlined' label={langLabel} />
                </Box>
              ) : undefined
            }
          />
        </Box>
      </Collapse>
      {showDivider && <Divider />}
    </Box>
  )
}
