// Appearance prefs shared by client + server. Theme ids live in the generated client registry
// (src/theme/tokens.ts) and are treated as opaque strings server-side — an unknown stored id
// falls back to the default on read. Mode is a small fixed set, so it's validated both ends.
export const THEME_MODES = ['light', 'dark', 'system'] as const
export type ThemeMode = (typeof THEME_MODES)[number]
