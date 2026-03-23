import React, { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSession as useSessionHook } from '../../hooks/useSession'
import type { User } from '@supabase/supabase-js'

// ── More Menu Sheet ────────────────────────────────────────────────────────────

interface MoreMenuSheetProps {
  isOpen: boolean
  onClose: () => void
  onSignOut: () => void
}

function MoreMenuSheet({ isOpen, onClose, onSignOut }: MoreMenuSheetProps) {
  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 rounded-t-2xl p-4 space-y-1 max-h-96 overflow-y-auto"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex h-1 bg-gray-700 rounded-full mx-auto mb-4 w-12" />
        <Link
          to="/exercises"
          onClick={onClose}
          className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Exercises
        </Link>
        <Link
          to="/programs"
          onClick={onClose}
          className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Programs
        </Link>
        <button
          onClick={() => {
            onSignOut()
            onClose()
          }}
          className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  )
}

// Context for session actions
export const SessionActionContext = React.createContext<{
  onFinish?: () => void
  onDiscard?: () => void
} | null>(null)

// ── Tab Bar ────────────────────────────────────────────────────────────────────

interface TabBarProps {
  onMoreOpen: () => void
  activeSessionId: string | null
  onFinish?: () => void
  isSessionCompleted?: boolean
}

function TabBar({ onMoreOpen, activeSessionId, onFinish, isSessionCompleted }: TabBarProps) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isSession = location.pathname.startsWith('/session/')
  const isHistory = location.pathname === '/history'

  const handleSessionClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!activeSessionId) {
      e.preventDefault()
      return
    }
  }

  // Show finish button when on active session that's not completed
  const showFinishBtn = isSession && activeSessionId && !isSessionCompleted && onFinish

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 border-t border-gray-800 bg-gray-900 flex items-center ${
        showFinishBtn ? 'justify-between px-3' : 'justify-around'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around flex-1">
        <Link
          to="/"
          className={`flex-1 flex items-center justify-center h-14 text-lg transition-colors ${
            isHome ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'
          }`}
          title="Home"
        >
          🏠
        </Link>

        <Link
          to={activeSessionId ? `/session/${activeSessionId}` : '/'}
          onClick={handleSessionClick}
          className={`flex-1 flex items-center justify-center h-14 relative transition-colors ${
            isSession ? 'text-blue-500' : activeSessionId ? 'text-gray-500 hover:text-gray-300' : 'text-gray-700 cursor-not-allowed'
          }`}
          title="Active Session"
        >
          <span className="text-lg">💪</span>
          {activeSessionId && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </Link>

        <Link
          to="/history"
          className={`flex-1 flex items-center justify-center h-14 text-lg transition-colors ${
            isHistory ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'
          }`}
          title="History"
        >
          📊
        </Link>

        <button
          onClick={onMoreOpen}
          className="flex-1 flex items-center justify-center h-14 text-lg text-gray-500 hover:text-gray-300 transition-colors"
          title="More"
        >
          ⋯
        </button>
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
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [sessionActions, setSessionActions] = useState<{ onFinish?: () => void; isCompleted?: boolean } | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Get active session status
  const sessionIdMatch = location.pathname.match(/\/session\/([a-zA-Z0-9-]+)/)
  const sessionId = sessionIdMatch?.[1]
  const { data: currentSession } = useSessionHook(sessionId || '')
  const activeSessionId = currentSession && !currentSession.ended_at ? currentSession.id : null

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
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
            <Link to="/" className="font-bold text-lg tracking-tight text-white">
              LiftTrack
            </Link>
          </div>
        </header>
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24">
          <Outlet context={{ setSessionActions }} />
        </main>

        <TabBar
          onMoreOpen={() => setShowMoreMenu(true)}
          activeSessionId={activeSessionId}
          onFinish={sessionActions?.onFinish}
          isSessionCompleted={sessionActions?.isCompleted}
        />
        <MoreMenuSheet
          isOpen={showMoreMenu}
          onClose={() => setShowMoreMenu(false)}
          onSignOut={handleSignOut}
        />

        {errorMsg && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
            <div className="bg-red-900 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-200 shadow-lg">
              {errorMsg}
            </div>
          </div>
        )}
      </div>
    </SessionActionContext.Provider>
  )
}
