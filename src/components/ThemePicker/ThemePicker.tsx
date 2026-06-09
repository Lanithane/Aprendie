import { styled } from '@mui/material/styles'
import CheckIcon from '@mui/icons-material/Check'
import { useTranslation } from 'react-i18next'
import { THEME_META, THEMES } from '../../theme'
import { useThemeMode } from '../../ThemeModeProvider'

// Fixed column counts that divide the theme count evenly, so the grid never leaves a dangling
// tile: 2 columns on mobile (a 2x4 block) and 4 on desktop (a 4x2 block).
const Grid = styled('div')`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing(1.5)};
  ${({ theme }) => theme.breakpoints.up('sm')} {
    grid-template-columns: repeat(4, 1fr);
  }
`

// Each option previews itself in its own palette for the active light/dark mode, so the picker
// reads like a set of swatches rather than a list of words. Colors are inline (per-option) since
// they come from each theme's tokens, not the active theme.
const Option = styled('button')`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(1.5)};
  border-radius: 16px;
  border: 2px solid transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease;
  &:hover {
    transform: translateY(-2px);
  }
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`

const Dots = styled('div')`
  display: flex;
  gap: ${({ theme }) => theme.spacing(0.5)};
`

const Label = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(0.5)};
  font-weight: 500;
`

const Dot = styled('span')`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
`

export default function ThemePicker() {
  const { t } = useTranslation()
  const { themeId, setThemeId, resolvedMode } = useThemeMode()

  return (
    <Grid role='radiogroup' aria-label={t('settings.colorTheme')}>
      {THEME_META.map(({ id, name, swatches }) => {
        const s = THEMES[id][resolvedMode]
        const selected = id === themeId
        const bg = resolvedMode === 'light' ? s.surfaceContainerHighest : s.surface
        return (
          <Option
            key={id}
            type='button'
            role='radio'
            aria-checked={selected}
            aria-label={name}
            onClick={() => setThemeId(id)}
            style={{
              background: bg,
              color: s.onSurface,
              borderColor: selected ? s.primary : s.outlineVariant,
            }}
          >
            <Dots>
              {swatches.map((c, i) => (
                <Dot key={i} style={{ background: c }} />
              ))}
            </Dots>
            <Label>
              <span>{name}</span>
              {selected && <CheckIcon fontSize='small' style={{ color: s.primary }} />}
            </Label>
          </Option>
        )
      })}
    </Grid>
  )
}
