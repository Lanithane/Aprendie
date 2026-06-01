import '@fontsource-variable/nunito'
import { createTheme, type Theme, type TypographyVariantsOptions } from '@mui/material/styles'
import { THEMES, type Md3Scheme, type ThemeId } from './tokens'
import { colorDistance, mostContrasting } from './contrast'
export { THEMES, THEME_META, THEME_IDS, DEFAULT_THEME_ID, type ThemeId } from './tokens'

// Material 3 type scale (px @ 16px root). Sizes in rem, line-height unitless, tracking in em.
const rem = (px: number) => `${px / 16}rem`
const em = (px: number, sizePx: number) => `${px / sizePx}em`

function md3Typography(): TypographyVariantsOptions {
  return {
    fontFamily: '"Nunito Variable", "Nunito", "Helvetica", "Arial", sans-serif',
    fontWeightMedium: 500,
    // display-small
    h3: {
      fontFamily: "'Lilita One', system-ui, sans-serif",
      fontSize: rem(36),
      lineHeight: 44 / 36,
      fontWeight: 400,
      letterSpacing: 0,
    },
    // headline-medium
    h4: {
      fontFamily: "'Lilita One', system-ui, sans-serif",
      fontSize: rem(28),
      lineHeight: 36 / 28,
      fontWeight: 400,
      letterSpacing: 0,
    },
    // headline-small
    h5: {
      fontFamily: "'Lilita One', system-ui, sans-serif",
      fontSize: rem(24),
      lineHeight: 32 / 24,
      fontWeight: 400,
      letterSpacing: 0,
    },
    // title-large
    h6: {
      fontFamily: "'Lilita One', system-ui, sans-serif",
      fontSize: rem(22),
      lineHeight: 28 / 22,
      fontWeight: 400,
      letterSpacing: 0,
    },
    // title-medium
    subtitle1: {
      fontSize: rem(16),
      lineHeight: 24 / 16,
      fontWeight: 500,
      letterSpacing: em(0.15, 16),
    },
    // title-small
    subtitle2: {
      fontSize: rem(16),
      lineHeight: 22 / 16,
      fontWeight: 500,
      letterSpacing: em(0.1, 16),
    },
    // body-large
    body1: { fontSize: rem(16), lineHeight: 24 / 16, fontWeight: 700, letterSpacing: em(0.5, 16) },
    // body-medium
    body2: { fontSize: rem(14), lineHeight: 20 / 14, fontWeight: 700, letterSpacing: em(0.25, 14) },
    // label-large (buttons) — MD3 has no all-caps
    button: {
      fontSize: rem(15),
      lineHeight: 20 / 15,
      fontWeight: 700,
      letterSpacing: em(0.1, 15),
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
      fontSize: rem(14),
      lineHeight: 20 / 14,
      fontWeight: 700,
      letterSpacing: em(0.4, 14),
    },
  }
}

export function createAprendieTheme(themeId: ThemeId, mode: 'light' | 'dark'): Theme {
  const s: Md3Scheme = THEMES[themeId][mode]

  // Promote the MD3 tertiary role to a full PaletteColor (light/dark/contrastText derived)
  // so `color='tertiary'` Buttons work — the third rung of the page action hierarchy.
  const tertiary = createTheme({ palette: { mode } }).palette.augmentColor({
    color: { main: s.tertiary, contrastText: s.onTertiary },
    name: 'tertiary',
  })

  return createTheme({
    palette: {
      mode,
      primary: { main: s.primary, contrastText: s.onPrimary },
      secondary: { main: s.secondary, contrastText: s.onSecondary },
      error: { main: s.error, contrastText: s.onError },
      // success/warning/error carry fixed semantic green/amber/red ramps (generated like error,
      // theme-independent) so they always read as a traffic-light regardless of the selected
      // palette — e.g. a 99 is always green, a 20 always red. info follows the theme's secondary.
      success: { main: s.success, contrastText: s.onSuccess },
      warning: { main: s.warning, contrastText: s.onWarning },
      info: { main: s.secondary, contrastText: s.onSecondary },
      // Opinionated, tinted environment with a wide page<->card gap: the page is a clearly tinted
      // canvas (dim in light, the palette's dark colour in dark) and cards float as a distinctly
      // brighter layer on top — never plain white or neutral grey.
      background: {
        default: mode === 'light' ? s.surfaceDim : s.surface,
        paper: mode === 'light' ? s.surfaceContainerLow : s.surfaceContainerHigh,
      },
      text: { primary: s.onSurface, secondary: s.onSurfaceVariant },
      divider: s.outlineVariant,
      // Flat MD3 roles (see theme.d.ts augmentation).
      primaryContainer: s.primaryContainer,
      onPrimaryContainer: s.onPrimaryContainer,
      secondaryContainer: s.secondaryContainer,
      onSecondaryContainer: s.onSecondaryContainer,
      tertiary,
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
            borderBottom: `2px solid ${s.outlineVariant}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ ownerState }: { ownerState: { variant?: string } }) => ({
            borderRadius: 16,
            ...(ownerState.variant === 'outlined' && {
              borderWidth: 2,
              borderColor: s.outline,
            }),
          }),
        },
      },
      // Buttons are contained by default site-wide (the standard action style); pages pick a
      // single `primary` main action and drop others to `secondary`/`tertiary`. The MUI ripple is
      // off in favour of an MD3 state layer (see root override) — a pulsing focus ripple looked
      // wrong on the auto-focused Next button before any hover.
      MuiButton: {
        defaultProps: { variant: 'contained', disableElevation: true, disableRipple: true },
        styleOverrides: {
          root: ({ ownerState, theme }) => {
            const c = ownerState.color
            const paletteColor =
              c && c !== 'inherit'
                ? (theme.palette[c as keyof typeof theme.palette] as
                    | { main?: string; dark?: string; light?: string }
                    | undefined)
                : undefined
            // Hold the contained fill steady on hover so the state layer (not a darkened fill)
            // carries the feedback — MD3 expresses states as a translucent on-color overlay.
            const restingFill = ownerState.variant === 'contained' ? paletteColor?.main : undefined
            // Focus ring. The primary button reuses the BrandWordmark's inner fill — tertiary — so
            // the title and the main CTA share the same accent. But on themes where tertiary is too
            // close to the primary fill (e.g. viñedo: green tertiary on a green button), the ring
            // blends in, so we only keep it when tertiary is perceptually distinct enough from the
            // fill; otherwise — and for every non-primary colour — we fall back to the theme colour
            // that stands out MOST against both the button's fill AND the surface behind it. Scoring
            // against the surfaces too is what stops the fallback ring (which sits offset on the page)
            // from picking `surface` and vanishing into the background — notably in dark mode.
            const fill = paletteColor?.main ?? theme.palette.primary.main
            const ringPool = [
              theme.palette.primary.main,
              theme.palette.secondary.main,
              theme.palette.tertiary.main,
              theme.palette.onSurface,
              theme.palette.surface,
              theme.palette.inverseSurface,
            ]
            // Below this RGB distance tertiary reads as the same colour as the fill and the ring
            // disappears; tuned so same-hue/low-chroma pairs (viñedo, tinta, cerezo) fall back while
            // distinct-hue pairs (lavanda, costa, …) keep the matched tertiary ring.
            const RING_BLEND_DISTANCE = 85
            const tertiaryReads =
              colorDistance(theme.palette.tertiary.main, fill) >= RING_BLEND_DISTANCE
            const isPrimary = c === 'primary' || c == null
            const ringBases = [
              fill,
              theme.palette.background.default,
              theme.palette.background.paper,
            ]
            const focusRing =
              isPrimary && tertiaryReads
                ? theme.palette.tertiary.main
                : mostContrasting(ringBases, ringPool)
            const focusOutline = { outline: `2.5px solid ${focusRing}`, outlineOffset: 2 }
            return {
              borderRadius: 999,
              paddingInline: 24,
              position: 'relative',
              overflow: 'hidden',
              // MD3 state layer: a steady currentColor wash that fades in on hover/focus/press,
              // replacing the ripple. currentColor resolves to each button's on-* tone, so it
              // adapts across primary/secondary/tertiary/error and the text/outlined variants.
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                backgroundColor: 'currentColor',
                opacity: 0,
                transition: 'opacity 120ms ease',
                pointerEvents: 'none',
              },
              '&:hover::after': { opacity: 0.12 },
              '&.Mui-focusVisible::after': { opacity: 0.12 },
              '&:active::after': { opacity: 0.16 },
              // Shaded outline: a semi-thick ring offset off the edge so a sliver of the page shows
              // through and the ring reads on every theme/mode. Shown on hover plus any focus (mouse
              // or keyboard) so it persists after a click, and forced on while aria-busy (loading)
              // so phone taps — which give no hover and unreliable focus — still see the ring.
              '&:hover, &:focus, &.Mui-focusVisible, &[aria-busy="true"]': focusOutline,
              ...(restingFill ? { '&:hover': { backgroundColor: restingFill } } : {}),
            }
          },
          sizeLarge: { fontSize: rem(17), fontWeight: 700 },
          sizeMedium: { fontWeight: 700 },
          sizeSmall: { fontWeight: 700 },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderWidth: 2,
            textTransform: 'none',
            '&.Mui-selected': {
              backgroundColor: s.secondary,
              color: s.onSecondary,
              '&:hover': { backgroundColor: s.secondary },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 8 },
          notchedOutline: { borderWidth: 2 },
        },
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
      // Tooltips read as a tinted theme surface (matching menus/popovers) rather than the MD3
      // inverse-surface box: in light mode the inverse tone is a near-neutral dark that reads as a
      // generic black box against the cream canvas, not "a shade of the theme". Using the highest
      // surface-container tone + an outline keeps them clearly themed and legible in both modes.
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: s.surfaceContainerHighest,
            color: s.onSurface,
            border: `1px solid ${s.outlineVariant}`,
            fontSize: rem(12),
          },
        },
      },
      // Captions use the MD3 on-surface-variant role (the proper secondary-text color), so hint text
      // stays legible across every theme + mode. Applies wherever a caption sets no explicit `color`.
      MuiTypography: {
        styleOverrides: { caption: { color: s.onSurfaceVariant } },
      },
      // MD3 navigation active-indicator: a pill-shaped secondary-container highlight.
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            '&.Mui-selected': {
              backgroundColor: s.secondary,
              color: s.onSecondary,
              '& .MuiListItemIcon-root': { color: s.onSecondary },
              '&:hover': { backgroundColor: s.secondary },
            },
          },
        },
      },
      // Tabs render as a pill segmented control rather than an underline: the default underline
      // indicator + faint onSurfaceVariant label washed out against the tinted page. The selected
      // tab gets the MD3 secondary-container active-indicator (same highlight as the nav drawer),
      // so it reads clearly without the heavier full-secondary fill looking awkward.
      MuiTabs: {
        styleOverrides: {
          // Space the pills apart so they aren't touching. MUI v7 renamed the flex container
          // slot to `list`; target both so the gap applies regardless.
          root: {
            minHeight: 40,
            '& .MuiTabs-list, & .MuiTabs-flexContainer': { gap: 8 },
          },
          indicator: { display: 'none' },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            paddingInline: 12,
            borderRadius: 999,
            // Transparent border so the box size stays put; only the active pill shows it.
            border: '2px solid transparent',
            textTransform: 'none',
            fontWeight: 700,
            color: s.onSurfaceVariant,
            opacity: 1,
            '&.Mui-selected': {
              backgroundColor: s.secondaryContainer,
              color: s.onSecondaryContainer,
              // Thick border only on the active pill, matching the app's framed controls.
              borderColor: s.secondary,
            },
            '&:hover': { backgroundColor: s.surfaceContainerHighest },
            '&.Mui-selected:hover': { backgroundColor: s.secondaryContainer },
          },
        },
      },
    },
  })
}
