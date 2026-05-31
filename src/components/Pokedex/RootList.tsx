import { useState } from 'react'
import { Divider, List, Paper } from '@mui/material'
import RootCard from './RootCard'
import type { LexemeStatsDto } from '../../api/pokedexApi'
import type { LanguageCode } from '../../../shared/languages'

interface RootListProps {
  entries: LexemeStatsDto[]
  learnLanguage: LanguageCode
}

export default function RootList({ entries, learnLanguage }: RootListProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <Paper variant='outlined' sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <List disablePadding>
        {entries.map((entry, idx) => {
          const open = expanded === entry.lemma
          return (
            <div key={entry.lemma}>
              <RootCard
                entry={entry}
                learnLanguage={learnLanguage}
                open={open}
                onToggle={() => setExpanded((cur) => (cur === entry.lemma ? null : entry.lemma))}
              />
              {(idx < entries.length - 1 || open) && <Divider />}
            </div>
          )
        })}
      </List>
    </Paper>
  )
}
