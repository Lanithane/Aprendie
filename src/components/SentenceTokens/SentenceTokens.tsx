import { useMemo, useState, type MouseEvent } from 'react'
import { styled } from '@mui/material/styles'
import type { LanguageCode, WordToken } from '../../../shared/languages'
import WordPopover from '../WordPopover/WordPopover'
import { tokenizeSentence } from './tokenize'

// Inline word button: inherits the surrounding typography, adds a dotted underline
// (Duolingo-style) to signal it's tappable, and lifts to the primary colour on hover/focus.
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
}: SentenceTokensProps) {
  const segments = useMemo(() => tokenizeSentence(text, breakdown), [text, breakdown])
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [active, setActive] = useState<WordToken | null>(null)

  const open = (e: MouseEvent<HTMLButtonElement>, token: WordToken) => {
    setAnchorEl(e.currentTarget)
    setActive(token)
  }
  const close = () => setAnchorEl(null)

  return (
    <span lang={learnLanguage}>
      {segments.map((seg, i) =>
        seg.token ? (
          <TokenButton
            key={i}
            type='button'
            onClick={(e) => open(e, seg.token as WordToken)}
            aria-label={`Show the dictionary form and grammar of ${seg.text}`}
          >
            {seg.text}
          </TokenButton>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
      <WordPopover
        anchorEl={anchorEl}
        token={active}
        learnLanguage={learnLanguage}
        guessLanguage={guessLanguage}
        onClose={close}
      />
    </span>
  )
}
