import { useState } from 'react'
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useLanguagePair } from '../hooks/useLanguagePair'
import WordCollection from '../components/Palabradex/WordCollection'
import GrammarReference from '../components/Palabradex/Grammar/GrammarReference'

// Two modes of the Palabradex: "Your words" (the per-user root collection) and "Language" (the
// language's own grammar reference). Different data sources — the page just owns the mode switch
// and delegates the body to a component for each (CLAUDE.md: pages stay thin).
type PalabradexMode = 'words' | 'language'

export default function PalabradexPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { pair } = useLanguagePair()
  const [mode, setMode] = useState<PalabradexMode>('words')

  if (!user) return null

  const grammar = mode === 'language'

  return (
    <Box>
      <Typography variant='h3' sx={{ mb: 0.5 }}>
        Palabradex
      </Typography>

      <ToggleButtonGroup
        value={mode}
        exclusive
        size='small'
        onChange={(_, v: PalabradexMode | null) => {
          if (v !== null) setMode(v)
        }}
        sx={{ mb: 2.5 }}
      >
        <ToggleButton value='words'>{t('palabradex.yourWords')}</ToggleButton>
        <ToggleButton value='language'>{t('palabradex.language')}</ToggleButton>
      </ToggleButtonGroup>

      {grammar ? <GrammarReference pair={pair} /> : <WordCollection userId={user.id} pair={pair} />}
    </Box>
  )
}
