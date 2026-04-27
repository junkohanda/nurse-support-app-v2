import { useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthPage = ({ onShowPrivacy }) => {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('確認メールを送りました。メールを確認してログインしてください。')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('メールアドレスまたはパスワードが間違っています。')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-indigo-900 mb-2">
          看護師サポートアプリ
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">
          {mode === 'login' ? 'アカウントにログイン' : '新規アカウント作成'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード（6文字以上）
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
          )}
          {message && (
            <p className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400"
          >
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'アカウントを作成'}
          </button>
        </form>

        <div className="mt-6 text-center">
          {mode === 'login' ? (
            <p className="text-sm text-gray-600">
              アカウントをお持ちでない方は{' '}
              <button
                onClick={() => { setMode('signup'); setError(''); setMessage('') }}
                className="text-indigo-600 font-semibold hover:underline"
              >
                新規登録
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              すでにアカウントをお持ちの方は{' '}
              <button
                onClick={() => { setMode('login'); setError(''); setMessage('') }}
                className="text-indigo-600 font-semibold hover:underline"
              >
                ログイン
              </button>
            </p>
          )}
        </div>

        <div className="mt-4 text-center">
          <button onClick={onShowPrivacy} className="text-xs text-gray-400 hover:underline">
            プライバシーポリシー
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
