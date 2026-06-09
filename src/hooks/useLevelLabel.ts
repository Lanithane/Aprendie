import { useTranslation } from 'react-i18next'
import { levelByCode, type LevelCode } from '../../shared/levels'

// The localized counterpart of `levelLabel` from [shared/levels.ts]: the level *name* comes from
// the `levels.*` catalog (so it follows the UI language) while the CEFR code (A1…C2) stays as the
// international tag. A hook so the label re-renders on a language switch.
export function useLevelLabel() {
  const { t } = useTranslation()
  return (code: LevelCode) => {
    const def = levelByCode(code)
    if (!def) return code
    const name = t(`levels.${code}`)
    return def.cefr ? `${name} (${def.cefr})` : name
  }
}
