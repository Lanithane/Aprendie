import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useAuth } from '../auth/AuthContext'
import { useLanguagePair } from '../hooks/useLanguagePair'
import { usePalabradex } from '../hooks/usePalabradex'
import { usePalabradexLanguages } from '../hooks/usePalabradexLanguages'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import RootList from '../components/Palabradex/RootList'
import { LANGUAGES, type LanguageCode } from '../../shared/languages'
import type { LexemeSort } from '../api/palabradexApi'

const SORT_LABELS: Record<LexemeSort, string> = {
  seen: 'Most seen',
  incorrect: 'Most mistakes',
  alpha: 'A–Z',
}

export default function PalabradexPage() {
  const { user } = useAuth()
  const { pair } = useLanguagePair()
  const { languages, loading: langsLoading } = usePalabradexLanguages(user?.id)
  const [selectedLang, setSelectedLang] = useState<LanguageCode | null>(null)
  const [sort, setSort] = useState<LexemeSort>('seen')

  // Effective language: explicit selection > active pair's learn language > first available.
  const effectiveLang = useMemo<LanguageCode | null>(() => {
    if (languages.length === 0) return null
    if (selectedLang && languages.includes(selectedLang)) return selectedLang
    return languages.includes(pair.learnLanguage) ? pair.learnLanguage : languages[0]
  }, [languages, selectedLang, pair.learnLanguage])

  const { entries, loading, error, reload } = usePalabradex(
    effectiveLang ? user?.id : undefined,
    effectiveLang ?? undefined,
    sort
  )

  if (!user) return null

  return (
    <Box>
      <Typography variant='h3' sx={{ mb: 0.5 }}>
        Word collection
      </Typography>
      <Typography color='text.secondary' variant='body2' sx={{ mb: 2 }}>
        Every root word you&apos;ve met, with how often you got it right.
      </Typography>

      {langsLoading && <LoadingSpinner />}

      {!langsLoading && languages.length === 0 && (
        <Typography color='text.secondary'>
          No words yet. Finish a sentence to start your collection.
        </Typography>
      )}

      {!langsLoading && effectiveLang && (
        <>
          <Tabs
            value={effectiveLang}
            onChange={(_, v: LanguageCode) => setSelectedLang(v)}
            variant='scrollable'
            scrollButtons='auto'
            sx={{ mt: 1, mb: 2.5 }}
          >
            {languages.map((code) => (
              <Tab key={code} value={code} label={LANGUAGES[code]?.name ?? code} />
            ))}
          </Tabs>

          <Box sx={{ mb: 2.5 }}>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mb: 0.75, display: 'block' }}
            >
              Sort
            </Typography>
            <ToggleButtonGroup
              value={sort}
              exclusive
              size='small'
              onChange={(_, v: LexemeSort | null) => {
                if (v !== null) setSort(v)
              }}
            >
              {(Object.keys(SORT_LABELS) as LexemeSort[]).map((s) => (
                <ToggleButton key={s} value={s}>
                  {SORT_LABELS[s]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

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
          ) : entries.length === 0 ? (
            <Typography color='text.secondary'>No words for this language yet.</Typography>
          ) : (
            <Stack spacing={2}>
              <RootList entries={entries} learnLanguage={effectiveLang} />
              <Typography variant='caption' color='text.secondary'>
                {entries.length} root word{entries.length === 1 ? '' : 's'}
              </Typography>
            </Stack>
          )}
        </>
      )}
    </Box>
  )
}
