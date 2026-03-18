import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'

export function AppShell() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(null), 5000)
    }
    window.addEventListener('lifttrack:error', handler)
    return () => window.removeEventListener('lifttrack:error', handler)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
      if (!data.user) navigate('/login')
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) navigate('/login')
    })
    return () => listener.subscription.unsubscribe()
  }, [navigate])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-tight text-white">
            LiftTrack
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              Home
            </Link>
            <Link to="/exercises" className="text-gray-400 hover:text-white transition-colors">
              Exercises
            </Link>
            <Link to="/programs" className="text-gray-400 hover:text-white transition-colors">
              Programs
            </Link>
            <Link to="/history" className="text-gray-400 hover:text-white transition-colors">
              History
            </Link>
            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {errorMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
          <div className="bg-red-900 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-200 shadow-lg">
            {errorMsg}
          </div>
        </div>
      )}
    </div>
  )
}
