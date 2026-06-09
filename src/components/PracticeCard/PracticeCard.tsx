import { useState, type MouseEvent } from 'react'
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Button,
  Stack,
  Chip,
  Menu,
  MenuItem,
  MenuList,
  Divider,
  Drawer,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
import ShuffleIcon from '@mui/icons-material/Shuffle'
import { useTranslation } from 'react-i18next'
import { type LanguageCode, type LocaleCode, type WordToken } from '../../../shared/languages'
import { type LevelCode } from '../../../shared/levels'
import { CATEGORIES, categoryById, categoryByDomain } from '../../../shared/categories'
import type { CategoryPref } from '../../hooks/useCategoryPreference'
import SentenceTokens from '../SentenceTokens/SentenceTokens'
import StreakIndicator from '../StreakIndicator/StreakIndicator'
import ListenControls from '../shared/ListenControls'
import { useCategoryLabel } from '../../hooks/useCategoryLabel'
import { useAutoFocus } from '../../hooks/useAutoFocus'
import { useSpeech } from '../../hooks/useSpeech'
import { useSpeechRate } from '../../hooks/useSpeechRate'
import { useAutoSpeak } from '../../hooks/useAutoSpeak'
import { useAutoSpeakPreference } from '../../hooks/useAutoSpeakPreference'

const SentenceCenter = styled('div')`
  text-align: center;
  font-size: 2.1rem;
  line-height: 1.35;
  font-weight: 800;
  padding: ${({ theme }) => theme.spacing(5, 2)};
  ${({ theme }) => theme.breakpoints.down('sm')} {
    font-size: 1.65rem;
    padding: ${({ theme }) => theme.spacing(3, 1)};
  }
`

interface PracticeCardProps {
  promptText: string
  wordBreakdown: WordToken[]
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  sentenceLevel?: LevelCode | null
  // The pinned practice topic (null = shuffle all) and the current sentence's own topic (its stored
  // domain), so the chip shows the pin when set, else whatever this sentence is about.
  category: CategoryPref
  sentenceTheme?: string | null
  onCategoryChange: (category: CategoryPref) => void
  onSubmit: (answer: string) => void
  submitting?: boolean
  disabled?: boolean
}

export default function PracticeCard({
  promptText,
  wordBreakdown,
  learnLanguage,
  guessLanguage,
  locale,
  sentenceLevel,
  category,
  sentenceTheme,
  onCategoryChange,
  onSubmit,
  submitting,
  disabled,
}: PracticeCardProps) {
  const { t } = useTranslation()
  const categoryLabel = useCategoryLabel()
  const [guess, setGuess] = useState('')
  // Refocus the answer field each time a new sentence loads, so the flow stays keyboard-driven.
  const inputRef = useAutoFocus<HTMLInputElement>(promptText)
  const [categoryAnchorEl, setCategoryAnchorEl] = useState<HTMLElement | null>(null)
  const categoryMenuOpen = Boolean(categoryAnchorEl)
  const theme = useTheme()
  // Below the app's mobile breakpoint (where the bottom nav takes over) the long topic list is a
  // bottom sheet instead of a popover; on larger screens it stays a popover anchored under the chip.
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { speak, cancel, speaking, supported: speechSupported, voices } = useSpeech()
  const { rate, setRate } = useSpeechRate()
  const { autoSpeak, delayMs } = useAutoSpeakPreference()
  // Opt-in auto-playback: read each new sentence aloud after the configured delay (Epic 15).
  // `ready` (voices loaded) lets auto-speak retry once the async voice list arrives — on mobile it
  // is empty on cold load, which is why playback sometimes didn't fire (see useAutoSpeak).
  useAutoSpeak({
    text: promptText,
    locale,
    rate,
    enabled: autoSpeak && speechSupported,
    delayMs,
    ready: voices.length > 0,
    speak,
  })

  const submit = () => {
    const trimmed = guess.trim()
    if (!trimmed || submitting || disabled) return
    onSubmit(trimmed)
  }

  const openCategoryMenu = (e: MouseEvent<HTMLElement>) => setCategoryAnchorEl(e.currentTarget)
  const closeCategoryMenu = () => setCategoryAnchorEl(null)
  const pickCategory = (next: CategoryPref) => {
    onCategoryChange(next)
    closeCategoryMenu()
  }

  const guessName = t(`languages.${guessLanguage}`)
  // The chip shows the pinned topic when set, otherwise the current sentence's own topic; falling
  // back to "Shuffle" only before any sentence has a known category.
  const pinnedCategory = category ? categoryById(category) : undefined
  const sentenceCategory = sentenceTheme ? categoryByDomain(sentenceTheme) : undefined
  const activeCategoryId = pinnedCategory?.id ?? sentenceCategory?.id
  const categoryChipLabel = activeCategoryId
    ? categoryLabel(activeCategoryId)
    : t('practice.shuffle')

  // The same option rows render inside the desktop popover and the mobile bottom sheet.
  const categoryOptions = (
    <>
      <MenuItem selected={category === null} onClick={() => pickCategory(null)}>
        {t('practice.shuffleAll')}
      </MenuItem>
      <Divider />
      {CATEGORIES.map((c) => (
        <MenuItem key={c.id} selected={category === c.id} onClick={() => pickCategory(c.id)}>
          {categoryLabel(c.id)}
        </MenuItem>
      ))}
    </>
  )

  return (
    <Card>
      {/* Drop CardContent's default 24px last-child bottom padding to the 16px side padding so the
          streak pill sits the same distance from the card's left and bottom edges. */}
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack
          direction='row'
          spacing={1}
          sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Stack
            direction='row'
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap', alignItems: 'center' }}
          >
            <Chip
              size='small'
              icon={<ShuffleIcon />}
              label={categoryChipLabel}
              color={pinnedCategory ? 'primary' : 'default'}
              onClick={openCategoryMenu}
              clickable
              aria-haspopup='menu'
              aria-expanded={categoryMenuOpen}
            />
          </Stack>
          {speechSupported && (
            <ListenControls
              text={promptText}
              locale={locale}
              speak={speak}
              cancel={cancel}
              speaking={speaking}
              rate={rate}
              setRate={setRate}
            />
          )}
        </Stack>
        {isMobile ? (
          <Drawer
            anchor='bottom'
            open={categoryMenuOpen}
            onClose={closeCategoryMenu}
            slotProps={{
              paper: {
                sx: (t) => ({
                  maxHeight: '70vh',
                  borderTopLeftRadius: t.spacing(2),
                  borderTopRightRadius: t.spacing(2),
                }),
              },
            }}
          >
            {/* Grab handle + title for the bottom sheet; the list below scrolls within the sheet. */}
            <Box
              sx={{
                width: 32,
                height: 4,
                borderRadius: 1,
                bgcolor: 'outlineVariant',
                mx: 'auto',
                mt: 1.5,
              }}
            />
            <Typography
              variant='overline'
              sx={{
                display: 'block',
                textAlign: 'center',
                py: 1,
                fontSize: 'medium',
                fontWeight: 'bolder',
              }}
            >
              {t('practice.topic')}
            </Typography>
            <MenuList sx={{ overflowY: 'auto', pb: 1 }}>{categoryOptions}</MenuList>
          </Drawer>
        ) : (
          <Menu
            anchorEl={categoryAnchorEl}
            open={categoryMenuOpen}
            onClose={closeCategoryMenu}
            // Always drop below the chip rather than flipping over it, and cap the height so the long
            // list scrolls within the popover instead of running off-screen.
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{ paper: { sx: { maxHeight: 360 } } }}
          >
            {categoryOptions}
          </Menu>
        )}
        <SentenceCenter>
          <SentenceTokens
            text={promptText}
            breakdown={wordBreakdown}
            learnLanguage={learnLanguage}
            guessLanguage={guessLanguage}
            sentenceLevel={sentenceLevel}
          />
        </SentenceCenter>

        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={3}
          placeholder={t('practice.translateTo', { language: guessName })}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          disabled={disabled || submitting}
          aria-label={t('practice.answerAria', { language: guessName })}
        />
        <Stack direction='row' sx={{ mt: 2, alignItems: 'center' }}>
          {/* Streak pill tucked bottom-left, its left edge flush with the answer field — mirroring
              the submit button pinned right via ml:auto, so the two carry the same inset. */}
          <StreakIndicator />
          <Button
            color='primary'
            sx={{ ml: 'auto' }}
            onClick={submit}
            // Stay enabled while checking (re-entry is guarded in submit()) so the button keeps its
            // resting look and the aria-busy ring stays lit — disabling would blur it and grey it out.
            disabled={!guess.trim() || disabled}
            aria-busy={submitting}
          >
            {/* Hold the resting "Submit" width with a hidden copy and center the spinner over it,
                so the button doesn't resize when it flips into the loading state. */}
            <Box component='span' sx={{ visibility: submitting ? 'hidden' : 'visible' }}>
              {t('practice.submit')}
            </Box>
            {submitting && (
              <CircularProgress
                size={18}
                color='inherit'
                aria-label={t('practice.checking')}
                sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-9px', ml: '-9px' }}
              />
            )}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
