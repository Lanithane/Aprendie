import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Stack,
  Typography,
  Tooltip,
} from '@mui/material'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import { useSpeech } from '../../hooks/useSpeech'
import { useSpeechVoice } from '../../hooks/useSpeechVoice'
import { useLanguagePair } from '../../hooks/useLanguagePair'
import { languageName, type LanguageCode, type LocaleCode } from '../../../shared/languages'

interface VoicePickerProps {
  // Override the language/locale to pick voices for. Defaults to the saved pair; the onboarding
  // wizard passes its *staged* (not-yet-committed) choice so the list tracks the language being set
  // up rather than the account's current pair.
  locale?: LocaleCode
  learnLanguage?: LanguageCode
  size?: 'small' | 'medium'
}

// A short greeting per learn language so the preview shows off the voice, not just a beep.
const SAMPLES: Record<string, string> = {
  es: 'Hola, ¿qué tal? Vamos a practicar.',
  en: "Hello there. Let's practice.",
  fr: 'Bonjour, allons-nous entraîner.',
  de: 'Hallo, lass uns üben.',
  it: 'Ciao, facciamo pratica.',
  pt: 'Olá, vamos praticar.',
}

// Lets the user pin a specific synthesized voice for the language they're learning. Voices come
// from the browser/OS (Web Speech API), so the list varies per device; we only surface voices
// that speak the active learn language. "Automatic" defers to locale-based selection.
export default function VoicePicker({ locale, learnLanguage, size = 'small' }: VoicePickerProps) {
  const { pair } = useLanguagePair()
  const { voices, speak, supported } = useSpeech()
  const { voiceURI, setVoiceURI } = useSpeechVoice()

  const effectiveLocale = locale ?? pair.locale
  const learnName = languageName(learnLanguage ?? pair.learnLanguage)

  if (!supported) {
    return (
      <Typography variant='body2' color='text.secondary'>
        Your browser doesn’t support speech synthesis, so voices aren’t available here.
      </Typography>
    )
  }

  const base = effectiveLocale.toLowerCase().split('-')[0]
  const available = voices
    .filter((v) => v.lang.toLowerCase().split('-')[0] === base)
    .sort((a, b) => a.name.localeCompare(b.name))

  if (available.length === 0) {
    return (
      <Typography variant='body2' color='text.secondary'>
        No {learnName} voices are installed on this device. Your system’s voice settings control
        which ones are available.
      </Typography>
    )
  }

  // If the saved voice isn't among the current language's voices (e.g. after switching
  // languages), show "Automatic" rather than letting MUI warn about an out-of-range value.
  const selectValue = available.some((v) => v.voiceURI === voiceURI) ? voiceURI : ''
  const sample = SAMPLES[base] ?? SAMPLES.en

  return (
    <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
      <FormControl size={size} sx={{ minWidth: 240, flex: 1 }}>
        <InputLabel id='voice-picker-label'>{learnName} voice</InputLabel>
        <Select
          labelId='voice-picker-label'
          label={`${learnName} voice`}
          value={selectValue}
          onChange={(e) => setVoiceURI(e.target.value || null)}
        >
          <MenuItem value=''>Automatic</MenuItem>
          {available.map((v) => (
            <MenuItem key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Tooltip title='Preview voice'>
        <IconButton
          color='primary'
          onClick={() => speak(sample, effectiveLocale)}
          aria-label={`Preview the ${learnName} voice`}
        >
          <PlayArrowRoundedIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
