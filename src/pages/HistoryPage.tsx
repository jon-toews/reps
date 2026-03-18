import { useNavigate } from 'react-router-dom'
import { useRecentSessions } from '../hooks/useSession'
import { sessionLabel } from '../types'

export function HistoryPage() {
  const { data: sessions = [], isLoading } = useRecentSessions()
  const navigate = useNavigate()

  const completed = sessions.filter((s) => s.ended_at)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">History</h1>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : completed.length === 0 ? (
        <p className="text-gray-500 text-sm">No completed sessions yet.</p>
      ) : (
        <div className="space-y-2">
          {completed.map((session) => {
            const date = new Date(session.started_at).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })
            return (
              <button
                key={session.id}
                onClick={() => navigate(`/session/${session.id}`)}
                className="w-full text-left px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <p className="text-sm font-medium">{sessionLabel(session)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{date}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
