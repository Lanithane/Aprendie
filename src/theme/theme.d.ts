import '@mui/material/styles'

// MD3 color roles that MUI's palette doesn't model natively. Mapped flat (string hex) so
// styled-components can read e.g. `theme.palette.surfaceContainerHigh`. The structured roles
// (primary/secondary/error/background/text/divider) stay on MUI's own slots — see src/theme/index.ts.
declare module '@mui/material/styles' {
  interface Palette {
    primaryContainer: string
    onPrimaryContainer: string
    secondaryContainer: string
    onSecondaryContainer: string
    tertiary: string
    onTertiary: string
    tertiaryContainer: string
    onTertiaryContainer: string
    errorContainer: string
    onErrorContainer: string
    surface: string
    onSurface: string
    surfaceVariant: string
    onSurfaceVariant: string
    surfaceDim: string
    surfaceBright: string
    surfaceContainerLowest: string
    surfaceContainerLow: string
    surfaceContainer: string
    surfaceContainerHigh: string
    surfaceContainerHighest: string
    outline: string
    outlineVariant: string
    inverseSurface: string
    inverseOnSurface: string
    inversePrimary: string
    scrim: string
  }
  interface PaletteOptions {
    primaryContainer?: string
    onPrimaryContainer?: string
    secondaryContainer?: string
    onSecondaryContainer?: string
    tertiary?: string
    onTertiary?: string
    tertiaryContainer?: string
    onTertiaryContainer?: string
    errorContainer?: string
    onErrorContainer?: string
    surface?: string
    onSurface?: string
    surfaceVariant?: string
    onSurfaceVariant?: string
    surfaceDim?: string
    surfaceBright?: string
    surfaceContainerLowest?: string
    surfaceContainerLow?: string
    surfaceContainer?: string
    surfaceContainerHigh?: string
    surfaceContainerHighest?: string
    outline?: string
    outlineVariant?: string
    inverseSurface?: string
    inverseOnSurface?: string
    inversePrimary?: string
    scrim?: string
  }
}
