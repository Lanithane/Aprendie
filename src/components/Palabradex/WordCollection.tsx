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
import { usePalabradex } from '../../hooks/usePalabradex'
import { usePalabradexLanguages } from '../../hooks/usePalabradexLanguages'
import LoadingSpinner from '../shared/LoadingSpinner'
import RootList from './RootList'
import { LANGUAGES, type LanguageCode, type LanguagePair } from '../../../shared/languages'
import type { LexemeSort } from '../../api/palabradexApi'

const SORT_LABELS: Record<LexemeSort, string> = {
  seen: 'Most seen',
  incorrect: 'Most mistakes',
  alpha: 'A–Z',
}

interface WordCollectionProps {
  userId: string
  pair: LanguagePair
}

// The Palabradex "Your words" mode: the per-user root collection, with language tabs (the languages
// the learner has actually met words in) and a sort toggle. This is the personal data source —
// deliberately distinct from the language-scoped grammar reference shown in "Language" mode.
export default function WordCollection({ userId, pair }: WordCollectionProps) {
  const { languages, loading: langsLoading } = usePalabradexLanguages(userId)
  const [selectedLang, setSelectedLang] = useState<LanguageCode | null>(null)
  const [sort, setSort] = useState<LexemeSort>('seen')

  // Effective language: explicit selection > active pair's learn language > first available.
  const effectiveLang = useMemo<LanguageCode | null>(() => {
    if (languages.length === 0) return null
    if (selectedLang && languages.includes(selectedLang)) return selectedLang
    return languages.includes(pair.learnLanguage) ? pair.learnLanguage : languages[0]
  }, [languages, selectedLang, pair.learnLanguage])

  const { entries, loading, error, reload } = usePalabradex(
    effectiveLang ? userId : undefined,
    effectiveLang ?? undefined,
    sort
  )

  if (langsLoading) return <LoadingSpinner />

  if (languages.length === 0) {
    return (
      <Typography color='text.secondary'>
        No words yet. Finish a sentence to start your collection.
      </Typography>
    )
  }

  if (!effectiveLang) return null

  return (
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
        <Typography variant='caption' color='text.secondary' sx={{ mb: 0.75, display: 'block' }}>
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
          <RootList
            entries={entries}
            learnLanguage={effectiveLang}
            guessLanguage={pair.guessLanguage}
          />
          <Typography variant='caption' color='text.secondary'>
            {entries.length} root word{entries.length === 1 ? '' : 's'}
          </Typography>
        </Stack>
      )}
    </>
  )
}
