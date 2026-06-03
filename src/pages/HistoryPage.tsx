import { useState, useMemo } from 'react'
import {
  Typography,
  Box,
  Stack,
  Button,
  Alert,
  List,
  Paper,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import { useAuth } from '../auth/AuthContext'
import { useLanguagePair } from '../hooks/useLanguagePair'
import { useHistory } from '../hooks/useHistory'
import { useHistoryLanguages } from '../hooks/useHistoryLanguages'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import AttemptRow from '../components/History/AttemptRow'
import UserMetrics from '../components/Metrics/UserMetrics'
import { LANGUAGES } from '../../shared/languages'
import { LEVELS } from '../../shared/levels'
import type { LanguagePair } from '../../shared/languages'
import type { LevelCode } from '../../shared/levels'

function pairKey(p: LanguagePair) {
  return `${p.learnLanguage}|${p.locale}`
}

function pairTabLabel(p: LanguagePair): string {
  const lang = LANGUAGES[p.learnLanguage]
  if (lang && lang.locales.length > 1) {
    const locale = lang.locales.find((l) => l.code === p.locale)
    return `${lang.name} · ${locale?.label ?? p.locale}`
  }
  return lang?.name ?? p.learnLanguage
}

export default function HistoryPage() {
  const { user } = useAuth()
  const { pair: activePair } = useLanguagePair()
  const [selectedPairKey, setSelectedPairKey] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<LevelCode | null>(null)
  const [sort, setSort] = useState<'newest' | 'worst'>('newest')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { pairs, loading: pairsLoading } = useHistoryLanguages(user?.id)

  // Derive effective pair: explicit selection > active pair > first available.
  const effectivePair = useMemo<LanguagePair | null>(() => {
    if (pairs.length === 0) return null
    if (selectedPairKey) {
      const found = pairs.find((p) => pairKey(p) === selectedPairKey)
      if (found) return found
    }
    return pairs.find((p) => pairKey(p) === pairKey(activePair)) ?? pairs[0]
  }, [pairs, selectedPairKey, activePair])

  const { items, loading, loadingMore, error, hasMore, loadMore, reload } = useHistory(
    effectivePair ? user?.id : undefined,
    effectivePair ?? activePair,
    { level: selectedLevel, sort }
  )

  const attemptCountLabel = `${items.length} attempt${items.length === 1 ? '' : 's'} ${
    hasMore ? 'shown' : 'total'
  }`

  if (!user) return null

  return (
    <Box>
      <Typography variant='h3' sx={{ mb: 2 }}>
        History
      </Typography>

      <Box sx={{ mb: 3 }}>
        <UserMetrics source={{ kind: 'me' }} title='Your metrics' />
      </Box>

      {pairsLoading && <LoadingSpinner />}

      {!pairsLoading && pairs.length === 0 && (
        <Typography color='text.secondary'>
          No history yet. Finish a sentence to see it here.
        </Typography>
      )}

      {!pairsLoading && pairs.length > 0 && effectivePair && (
        <>
          <Tabs
            value={pairKey(effectivePair)}
            onChange={(_, v: string) => {
              setSelectedPairKey(v)
              setExpanded(null)
            }}
            variant='scrollable'
            scrollButtons='auto'
            sx={{ mt: 2, mb: 2.5 }}
          >
            {pairs.map((p) => (
              <Tab key={pairKey(p)} value={pairKey(p)} label={pairTabLabel(p)} />
            ))}
          </Tabs>

          <HistoryFilters
            selectedLevel={selectedLevel}
            sort={sort}
            onLevelChange={(l) => {
              setSelectedLevel(l)
              setExpanded(null)
            }}
            onSortChange={(s) => {
              setSort(s)
              setExpanded(null)
            }}
          />

          {error && (
            <Stack spacing={2} sx={{ mb: 2, alignItems: 'flex-start' }}>
              <Alert severity='error' sx={{ width: '100%' }}>
                {error}
              </Alert>
              <Button color='secondary' size='small' onClick={() => void reload()}>
                Try again
              </Button>
            </Stack>
          )}

          {loading ? (
            <LoadingSpinner />
          ) : (
            <Stack spacing={2}>
              {items.length === 0 && (
                <Typography color='text.secondary'>No history for this selection.</Typography>
              )}
              {items.length > 0 && (
                <Paper variant='outlined' sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <List disablePadding>
                    {items.map((it, idx) => (
                      <AttemptRow
                        key={it.id}
                        entry={it}
                        open={expanded === it.id}
                        onToggle={() => setExpanded((cur) => (cur === it.id ? null : it.id))}
                        inList
                        showDivider={idx < items.length - 1 || expanded === it.id}
                      />
                    ))}
                  </List>
                </Paper>
              )}
              {hasMore && (
                <Button
                  color='tertiary'
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  sx={{ alignSelf: 'center' }}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Button>
              )}
              {items.length > 0 && !loading && (
                <Typography variant='caption' color='text.secondary' sx={{ textAlign: 'left' }}>
                  {attemptCountLabel}
                </Typography>
              )}
            </Stack>
          )}
        </>
      )}
    </Box>
  )
}

interface HistoryFiltersProps {
  selectedLevel: LevelCode | null
  sort: 'newest' | 'worst'
  onLevelChange: (level: LevelCode | null) => void
  onSortChange: (sort: 'newest' | 'worst') => void
}

function HistoryFilters({ selectedLevel, sort, onLevelChange, onSortChange }: HistoryFiltersProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, mb: 2.5 }}>
      <Box>
        <Typography variant='caption' color='text.secondary' sx={{ mb: 0.75, display: 'block' }}>
          Level
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <ToggleButtonGroup
            value={selectedLevel ?? 'all'}
            exclusive
            size='small'
            onChange={(_, v: string | null) => {
              if (v !== null) onLevelChange(v === 'all' ? null : (v as LevelCode))
            }}
          >
            <ToggleButton value='all'>All</ToggleButton>
            {LEVELS.map((l) => (
              <ToggleButton key={l.code} value={l.code}>
                {l.cefr ?? l.name.split(' ')[0]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Box>
      <Box>
        <Typography variant='caption' color='text.secondary' sx={{ mb: 0.75, display: 'block' }}>
          Sort
        </Typography>
        <ToggleButtonGroup
          value={sort}
          exclusive
          size='small'
          onChange={(_, v: 'newest' | 'worst' | null) => {
            if (v !== null) onSortChange(v)
          }}
        >
          <ToggleButton value='newest'>Newest first</ToggleButton>
          <ToggleButton value='worst'>Most mistakes first</ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  )
}
