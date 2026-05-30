import { createTheme, type Theme, type TypographyVariantsOptions } from '@mui/material/styles'
import { THEMES, type Md3Scheme, type ThemeId } from './tokens'
export { THEMES, THEME_META, THEME_IDS, DEFAULT_THEME_ID, type ThemeId } from './tokens'

// Material 3 type scale (px @ 16px root). Sizes in rem, line-height unitless, tracking in em.
const rem = (px: number) => `${px / 16}rem`
const em = (px: number, sizePx: number) => `${px / sizePx}em`

function md3Typography(): TypographyVariantsOptions {
  return {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontWeightMedium: 500,
    // display-small
    h3: { fontSize: rem(36), lineHeight: 44 / 36, fontWeight: 400, letterSpacing: 0 },
    // headline-medium
    h4: { fontSize: rem(28), lineHeight: 36 / 28, fontWeight: 400, letterSpacing: 0 },
    // headline-small
    h5: { fontSize: rem(24), lineHeight: 32 / 24, fontWeight: 400, letterSpacing: 0 },
    // title-large
    h6: { fontSize: rem(22), lineHeight: 28 / 22, fontWeight: 400, letterSpacing: 0 },
    // title-medium
    subtitle1: {
      fontSize: rem(16),
      lineHeight: 24 / 16,
      fontWeight: 500,
      letterSpacing: em(0.15, 16),
    },
    // title-small
    subtitle2: {
      fontSize: rem(14),
      lineHeight: 20 / 14,
      fontWeight: 500,
      letterSpacing: em(0.1, 14),
    },
    // body-large
    body1: { fontSize: rem(16), lineHeight: 24 / 16, fontWeight: 400, letterSpacing: em(0.5, 16) },
    // body-medium
    body2: { fontSize: rem(14), lineHeight: 20 / 14, fontWeight: 400, letterSpacing: em(0.25, 14) },
    // label-large (buttons) — MD3 has no all-caps
    button: {
      fontSize: rem(14),
      lineHeight: 20 / 14,
      fontWeight: 500,
      letterSpacing: em(0.1, 14),
      textTransform: 'none',
    },
    // label-medium (eyebrow labels)
    overline: {
      fontSize: rem(12),
      lineHeight: 16 / 12,
      fontWeight: 500,
      letterSpacing: em(0.5, 12),
    },
    // body-small
    caption: {
      fontSize: rem(12),
      lineHeight: 16 / 12,
      fontWeight: 400,
      letterSpacing: em(0.4, 12),
    },
  }
}

export function createGacTheme(themeId: ThemeId, mode: 'light' | 'dark'): Theme {
  const s: Md3Scheme = THEMES[themeId][mode]

  return createTheme({
    palette: {
      mode,
      primary: { main: s.primary, contrastText: s.onPrimary },
      secondary: { main: s.secondary, contrastText: s.onSecondary },
      error: { main: s.error, contrastText: s.onError },
      // Route MUI's semantic colors through MD3 tokens so nothing falls back to stock MUI hues.
      success: { main: s.primary, contrastText: s.onPrimary },
      warning: { main: s.tertiary, contrastText: s.onTertiary },
      info: { main: s.secondary, contrastText: s.onSecondary },
      // Opinionated, tinted environment: the page is a clearly teal canvas and cards float as a
      // lighter layer on top (in both modes) — never plain white or neutral grey.
      background: {
        default: mode === 'light' ? s.surfaceContainerHighest : s.surface,
        paper: mode === 'light' ? s.surface : s.surfaceContainer,
      },
      text: { primary: s.onSurface, secondary: s.onSurfaceVariant },
      divider: s.outlineVariant,
      // Flat MD3 roles (see theme.d.ts augmentation).
      primaryContainer: s.primaryContainer,
      onPrimaryContainer: s.onPrimaryContainer,
      secondaryContainer: s.secondaryContainer,
      onSecondaryContainer: s.onSecondaryContainer,
      tertiary: s.tertiary,
      onTertiary: s.onTertiary,
      tertiaryContainer: s.tertiaryContainer,
      onTertiaryContainer: s.onTertiaryContainer,
      errorContainer: s.errorContainer,
      onErrorContainer: s.onErrorContainer,
      surface: s.surface,
      onSurface: s.onSurface,
      surfaceVariant: s.surfaceVariant,
      onSurfaceVariant: s.onSurfaceVariant,
      surfaceDim: s.surfaceDim,
      surfaceBright: s.surfaceBright,
      surfaceContainerLowest: s.surfaceContainerLowest,
      surfaceContainerLow: s.surfaceContainerLow,
      surfaceContainer: s.surfaceContainer,
      surfaceContainerHigh: s.surfaceContainerHigh,
      surfaceContainerHighest: s.surfaceContainerHighest,
      outline: s.outline,
      outlineVariant: s.outlineVariant,
      inverseSurface: s.inverseSurface,
      inverseOnSurface: s.inverseOnSurface,
      inversePrimary: s.inversePrimary,
      scrim: s.scrim,
    },
    shape: { borderRadius: 12 },
    typography: md3Typography(),
    components: {
      // MD3 expresses elevation through surface-container tones, not a translucent white overlay.
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'default' },
        styleOverrides: {
          root: {
            backgroundColor: s.surface,
            color: s.onSurface,
            borderBottom: `1px solid ${s.outlineVariant}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: { root: { borderRadius: 16 } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 999, paddingInline: 24 } },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            '&.Mui-selected': {
              backgroundColor: s.secondaryContainer,
              color: s.onSecondaryContainer,
              '&:hover': { backgroundColor: s.secondaryContainer },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { borderRadius: 8, backgroundColor: s.surfaceContainer, backgroundImage: 'none' },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: { borderRadius: 12, backgroundColor: s.surfaceContainer, backgroundImage: 'none' },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: s.inverseSurface,
            color: s.inverseOnSurface,
            fontSize: rem(12),
          },
        },
      },
      // Captions read as a silvery blue (the secondary/Payne's-grey ramp) rather than plain grey.
      // Applies wherever a caption doesn't set an explicit `color` prop.
      MuiTypography: {
        styleOverrides: { caption: { color: s.secondary } },
      },
      // MD3 navigation active-indicator: a pill-shaped secondary-container highlight.
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            '&.Mui-selected': {
              backgroundColor: s.secondaryContainer,
              color: s.onSecondaryContainer,
              '& .MuiListItemIcon-root': { color: s.onSecondaryContainer },
              '&:hover': { backgroundColor: s.secondaryContainer },
            },
          },
        },
      },
    },
  })
}
