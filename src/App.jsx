import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import NurseApp from './pages/NurseApp'

function App() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-indigo-700 text-lg">読み込み中...</p>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return <NurseApp user={user} onSignOut={signOut} />
}

export default App
