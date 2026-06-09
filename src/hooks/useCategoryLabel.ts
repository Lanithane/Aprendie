import { useTranslation } from 'react-i18next'

// Category ids from the shared registry ([shared/categories.ts]) are typed `string`, so they don't
// satisfy i18next's strict key union. This localizes the `id → categories.<id>` cast to one place
// and, being a hook over `useTranslation`, re-resolves when the active UI language changes. The
// assertion is load-bearing (tsc rejects the bare dynamic key); ESLint's no-unnecessary-type-
// assertion mis-reads it as redundant, hence the scoped disable.
export function useCategoryLabel() {
  const { t } = useTranslation()
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return (id: string) => t(`categories.${id}` as 'categories.animals')
}
