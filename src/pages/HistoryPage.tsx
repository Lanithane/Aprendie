import { useEffect, useState } from 'react'
import {
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  Chip,
  IconButton,
  Collapse,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { format } from 'date-fns'
import { useAuth } from '../auth/AuthContext'
import { useLocale } from '../locale/useLocale'
import { loadHistory, type HistoryEntry } from '../history'

export default function HistoryPage() {
  const { user } = useAuth()
  const { locale } = useLocale()
  const [items, setItems] = useState<HistoryEntry[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setItems(loadHistory(user.id, locale))
  }, [user, locale])

  if (!user) return null

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 2 }}>
        History
      </Typography>
      <Typography color='text.secondary' sx={{ mb: 3 }}>
        Stored locally for <code>{locale}</code>. {items.length} attempt
        {items.length === 1 ? '' : 's'}.
      </Typography>
      <Stack spacing={1}>
        {items.length === 0 && (
          <Typography color='text.secondary'>
            No history yet — finish a sentence to see it here.
          </Typography>
        )}
        {items.map((it, idx) => {
          const key = `${it.id}-${it.createdAt}-${idx}`
          const open = expanded === key
          return (
            <Card key={key} variant='outlined'>
              <CardContent sx={{ pb: '16px !important' }}>
                <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip
                    size='small'
                    label={it.score}
                    color={it.isCorrect ? 'success' : 'warning'}
                  />
                  <Typography lang='es' sx={{ flex: 1 }} noWrap>
                    {it.spanish}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {format(new Date(it.createdAt), 'MMM d, h:mm a')}
                  </Typography>
                  <IconButton
                    size='small'
                    onClick={() => setExpanded(open ? null : key)}
                    aria-expanded={open}
                    aria-label='Expand attempt'
                  >
                    <ExpandMoreIcon
                      sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
                    />
                  </IconButton>
                </Stack>
                <Collapse in={open}>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant='caption' color='text.secondary'>
                      Your answer
                    </Typography>
                    <Typography sx={{ mb: 1 }}>{it.userEnglish}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Corrected
                    </Typography>
                    <Typography>{it.correctedEnglish}</Typography>
                    {it.mistakes.length > 0 && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant='caption' color='text.secondary'>
                          Mistakes
                        </Typography>
                        {it.mistakes.map((m, i) => (
                          <Typography key={i} variant='body2' sx={{ mt: 0.5 }}>
                            <strong lang='es'>{m.spanishSource}</strong>: {m.explanation}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          )
        })}
      </Stack>
    </Box>
  )
}
