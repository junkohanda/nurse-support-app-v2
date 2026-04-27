import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import NurseApp from './pages/NurseApp'
import PrivacyPolicy from './pages/PrivacyPolicy'

function App() {
  const { user, loading, signOut } = useAuth()
  const [showPrivacy, setShowPrivacy] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-indigo-700 text-lg">読み込み中...</p>
      </div>
    )
  }

  if (showPrivacy) {
    return <PrivacyPolicy onBack={() => setShowPrivacy(false)} />
  }

  if (!user) {
    return <AuthPage onShowPrivacy={() => setShowPrivacy(true)} />
  }

  return <NurseApp user={user} onSignOut={signOut} onShowPrivacy={() => setShowPrivacy(true)} />
}

export default App
