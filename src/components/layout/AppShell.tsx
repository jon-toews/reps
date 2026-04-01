import React, { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useActiveSession } from '../../hooks/useActiveSession'
import type { User } from '@supabase/supabase-js'

// Context for session actions
export const SessionActionContext = React.createContext<{
  onFinish?: () => void
  onDiscard?: () => void
} | null>(null)

// ── Icons ──────────────────────────────────────────────────────────────────────

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l9-8 9 8" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </svg>
  )
}

function IconBarbell({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h20" />
      <rect x="4" y="8" width="3" height="8" rx="1" />
      <rect x="17" y="8" width="3" height="8" rx="1" />
      <rect x="1" y="10" width="2" height="4" rx="0.5" />
      <rect x="21" y="10" width="2" height="4" rx="0.5" />
    </svg>
  )
}

function IconSetup({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

// ── Tab Bar ────────────────────────────────────────────────────────────────────

interface TabBarProps {
  activeSessionId: string | null
  onFinish?: () => void
  isSessionCompleted?: boolean
}

function TabBar({ activeSessionId, onFinish, isSessionCompleted }: TabBarProps) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isSession = location.pathname.startsWith('/session/')
  const isSetup = location.pathname === '/setup'

  const handleSessionClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!activeSessionId) {
      e.preventDefault()
    }
  }

  // Show finish button when on active session that's not completed
  const showFinishBtn = isSession && activeSessionId && !isSessionCompleted && onFinish

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 border-t border-gray-800 bg-gray-950/95 backdrop-blur-sm flex items-center ${
        showFinishBtn ? 'justify-between px-3' : 'justify-around'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around flex-1">
        <Link
          to="/"
          className={`flex-1 flex items-center justify-center h-12 transition-colors ${
            isHome ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <IconHome />
        </Link>

        <Link
          to={activeSessionId ? `/session/${activeSessionId}` : '#'}
          onClick={handleSessionClick}
          className={`flex-1 flex items-center justify-center h-12 relative transition-colors ${
            isSession ? 'text-blue-500' : activeSessionId ? 'text-gray-500 hover:text-gray-300' : 'text-gray-700 cursor-not-allowed'
          }`}
        >
          <IconBarbell />
          {activeSessionId && (
            <span className="absolute top-1.5 right-3 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </Link>

        <Link
          to="/setup"
          className={`flex-1 flex items-center justify-center h-12 transition-colors ${
            isSetup ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <IconSetup />
        </Link>
      </div>

      {showFinishBtn && (
        <button
          onClick={onFinish}
          className="bg-green-700 hover:bg-green-600 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors shrink-0 ml-2"
        >
          Finish
        </button>
      )}
    </nav>
  )
}

// ── App Shell ──────────────────────────────────────────────────────────────────

export function AppShell() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sessionActions, setSessionActions] = useState<{ onFinish?: () => void; isCompleted?: boolean } | null>(null)
  const navigate = useNavigate()

  // Global active session query — works regardless of current page
  const { data: activeSession } = useActiveSession()
  const activeSessionId = activeSession?.id ?? null

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
    <SessionActionContext.Provider value={sessionActions}>
      <div className="min-h-screen flex flex-col bg-gray-950">
        <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-30">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/" className="font-bold text-lg tracking-tight text-white">
              LiftTrack
            </Link>
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
          <Outlet context={{ setSessionActions }} />
        </main>

        <TabBar
          activeSessionId={activeSessionId}
          onFinish={sessionActions?.onFinish}
          isSessionCompleted={sessionActions?.isCompleted}
        />

        {errorMsg && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
            <div className="bg-red-900 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-200 shadow-lg">
              {errorMsg}
            </div>
          </div>
        )}
      </div>
    </SessionActionContext.Provider>
  )
}
