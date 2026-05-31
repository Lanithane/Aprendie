import { Box, FormControlLabel, Slider, Stack, Switch, Typography } from '@mui/material'
import { useAutoSpeakPreference } from '../../hooks/useAutoSpeakPreference'
import { AUTO_SPEAK_DELAY_MIN_MS, AUTO_SPEAK_DELAY_MAX_MS } from '../../../shared/speech'

// Auto-speak controls for Settings → Pronunciation: an opt-in toggle that reads each new sentence
// aloud, plus how long to wait before it plays. The delay only matters while auto-speak is on, so
// its slider dims and disables when the toggle is off.
export default function AutoSpeakControls() {
  const { autoSpeak, setAutoSpeak, delayMs, setDelayMs } = useAutoSpeakPreference()

  return (
    <Stack spacing={1}>
      <FormControlLabel
        control={<Switch checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} />}
        label='Read each new sentence aloud automatically'
      />
      <Box sx={{ px: 1, opacity: autoSpeak ? 1 : 0.5 }}>
        <Typography variant='caption' color='text.secondary' id='auto-speak-delay-label'>
          Delay before playing: {(delayMs / 1000).toFixed(1)} s
        </Typography>
        <Slider
          size='small'
          value={delayMs}
          min={AUTO_SPEAK_DELAY_MIN_MS}
          max={AUTO_SPEAK_DELAY_MAX_MS}
          step={250}
          marks={[
            { value: 0, label: 'None' },
            { value: 1000, label: '1 s' },
            { value: 2000, label: '2 s' },
            { value: 3000, label: '3 s' },
          ]}
          valueLabelDisplay='auto'
          valueLabelFormat={(v) => `${(v / 1000).toFixed(1)} s`}
          onChange={(_, v) => setDelayMs(v)}
          disabled={!autoSpeak}
          aria-labelledby='auto-speak-delay-label'
          sx={{
            '& .MuiSlider-markLabel[data-index="0"]': { transform: 'translateX(0%)' },
            '& .MuiSlider-markLabel[data-index="3"]': { transform: 'translateX(-100%)' },
          }}
        />
      </Box>
    </Stack>
  )
}
