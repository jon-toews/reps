import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'email' | 'otp' | 'password'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [mode, setMode] = useState<Mode>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usePassword, setUsePassword] = useState(false)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (usePassword) {
      await handlePasswordSignIn()
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMode('otp')
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    }
  }

  const handlePasswordSignIn = async () => {
    setLoading(true)
    setError(null)
    // Try sign in first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      // If invalid credentials, try sign up
      if (signInError.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        setLoading(false)
        if (signUpError) {
          setError(signUpError.message)
        }
      } else {
        setLoading(false)
        setError(signInError.message)
      }
    } else {
      setLoading(false)
    }
  }

  const resetToEmail = () => {
    setMode('email')
    setOtp('')
    setPassword('')
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2">LiftTrack</h1>
        <p className="text-gray-400 text-center text-sm mb-8">Track your lifts, everywhere.</p>

        {mode === 'otp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center mb-3">
              <p className="text-lg font-medium mb-2">Check your email</p>
              <p className="text-gray-400 text-sm">
                We sent a code to <span className="text-white">{email}</span>
              </p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="8-digit code"
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:border-blue-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-3 text-sm font-semibold transition-colors"
            >
              {loading ? 'Verifying…' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={resetToEmail}
              className="w-full text-gray-400 text-sm py-2"
            >
              Use a different email
            </button>
          </form>
        ) : (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
            {usePassword && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              />
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email || (usePassword && !password)}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-3 text-sm font-semibold transition-colors"
            >
              {loading ? (usePassword ? 'Signing in…' : 'Sending…') : (usePassword ? 'Sign In' : 'Send Code')}
            </button>
            <button
              type="button"
              onClick={() => { setUsePassword(!usePassword); setError(null) }}
              className="w-full text-gray-400 text-sm py-2"
            >
              {usePassword ? 'Use email code instead' : 'Use password instead'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
