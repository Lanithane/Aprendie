import { useMemo, useState, type MouseEvent } from 'react'
import { styled } from '@mui/material/styles'
import type { LanguageCode, WordToken } from '../../../shared/languages'
import type { LevelCode } from '../../../shared/levels'
import WordPopover from '../WordPopover/WordPopover'
import { tokenizeSentence } from './tokenize'

// Inline word button: inherits the surrounding typography, adds a dotted underline
// (Duolingo-style) to signal it's tappable, and lifts to the primary colour on hover/focus.
// Sentence wrapper: tightens the gap between words a touch sitewide for a more cohesive line.
const SentenceText = styled('span')`
  word-spacing: -0.05em;
`

const TokenButton = styled('button')`
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  vertical-align: baseline;
  text-decoration: underline dotted;
  text-underline-offset: 0.18em;
  text-decoration-thickness: 1.5px;
  text-decoration-color: ${({ theme }) => theme.palette.text.disabled};
  border-radius: 4px;
  transition:
    color 120ms ease,
    text-decoration-color 120ms ease;
  &:hover {
    color: ${({ theme }) => theme.palette.primary.main};
    text-decoration-color: ${({ theme }) => theme.palette.primary.main};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: 2px;
  }
`

interface SentenceTokensProps {
  text: string
  breakdown: WordToken[]
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  sentenceLevel?: LevelCode | null
  // Reveal each word's gloss regardless of level (results screen). Defaults off for immersive
  // practice, where the gloss only shows at Starter.
  alwaysShowGloss?: boolean
}

// Renders a learn-language sentence with each meaningful word clickable; clicking opens a
// WordPopover with the word's dictionary form, part of speech, and morphology breakdown.
// Punctuation and whitespace render verbatim. Reusable wherever a sentence + its breakdown
// are available.
export default function SentenceTokens({
  text,
  breakdown,
  learnLanguage,
  guessLanguage,
  sentenceLevel,
  alwaysShowGloss,
}: SentenceTokensProps) {
  const segments = useMemo(() => tokenizeSentence(text, breakdown), [text, breakdown])
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [active, setActive] = useState<WordToken | null>(null)

  const open = (e: MouseEvent<HTMLButtonElement>, token: WordToken) => {
    setAnchorEl(e.currentTarget)
    setActive(token)
  }
  const close = () => setAnchorEl(null)

  // Group consecutive segments that contain no whitespace into nowrap clusters so
  // punctuation never wraps to a new line detached from its adjacent word.
  const clusters: (typeof segments)[] = []
  for (const seg of segments) {
    const lastCluster = clusters[clusters.length - 1]
    const lastSeg = lastCluster?.[lastCluster.length - 1]
    if (!lastCluster || /\s/.test(seg.text) || /\s/.test(lastSeg?.text ?? '')) {
      clusters.push([seg])
    } else {
      lastCluster.push(seg)
    }
  }

  const renderSeg = (seg: (typeof segments)[number], key: string) =>
    seg.token ? (
      <TokenButton
        key={key}
        type='button'
        onClick={(e) => open(e, seg.token as WordToken)}
        aria-label={`Show the dictionary form and grammar of ${seg.text}`}
      >
        {seg.text}
      </TokenButton>
    ) : (
      <span key={key}>{seg.text}</span>
    )

  return (
    <SentenceText lang={learnLanguage}>
      {clusters.map((cluster, ci) =>
        cluster.length === 1 ? (
          renderSeg(cluster[0], `c${ci}`)
        ) : (
          <span key={ci} style={{ whiteSpace: 'nowrap' }}>
            {cluster.map((seg, si) => renderSeg(seg, `c${ci}s${si}`))}
          </span>
        )
      )}
      <WordPopover
        anchorEl={anchorEl}
        token={active}
        learnLanguage={learnLanguage}
        guessLanguage={guessLanguage}
        sentenceLevel={sentenceLevel}
        alwaysShowGloss={alwaysShowGloss}
        onClose={close}
      />
    </SentenceText>
  )
}
