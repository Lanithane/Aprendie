import AccessGate from '../components/AccessGate/AccessGate'
import TranslatorWidget from '../components/Translator/TranslatorWidget'
import { useAuth } from '../auth/AuthContext'
import { useLanguagePair } from '../hooks/useLanguagePair'

export default function TranslatorPage() {
  const { user, isApproved } = useAuth()
  const { pair } = useLanguagePair()

  // A pending/blocked account can't spend the operator key (mirrors HomePage).
  if (user && !isApproved) {
    return <AccessGate access={user.access} email={user.email} />
  }

  return <TranslatorWidget pair={pair} />
}
