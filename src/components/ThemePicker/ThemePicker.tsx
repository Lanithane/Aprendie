import { styled } from '@mui/material/styles'
import CheckIcon from '@mui/icons-material/Check'
import { THEME_META, THEMES } from '../../theme'
import { useThemeMode } from '../../ThemeModeProvider'

const Grid = styled('div')`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing(1.5)};
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
  gap: ${({ theme }) => theme.spacing(0.75)};
`

const Dot = styled('span')`
  width: 22px;
  height: 22px;
  border-radius: 50%;
`

export default function ThemePicker() {
  const { themeId, setThemeId, resolvedMode } = useThemeMode()

  return (
    <Grid role='radiogroup' aria-label='Color theme'>
      {THEME_META.map(({ id, name }) => {
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
              <Dot style={{ background: s.primary }} />
              <Dot style={{ background: s.secondary }} />
              <Dot style={{ background: s.tertiary }} />
            </Dots>
            <span style={{ fontWeight: 500 }}>{name}</span>
            {selected && (
              <CheckIcon
                fontSize='small'
                style={{ position: 'absolute', top: 8, right: 8, color: s.primary }}
              />
            )}
          </Option>
        )
      })}
    </Grid>
  )
}
