import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecentSessions, useCreateSession, useSessionsExercises } from '../hooks/useSession'
import { usePrograms } from '../hooks/usePrograms'
import type { Session, Program } from '../types'
import { sessionLabel } from '../types'

// ── New Session Modal ─────────────────────────────────────────────────────────

interface NewSessionModalProps {
  onConfirm: (program: Program | null, gymTag: string) => void
  onClose: () => void
  isPending: boolean
}

function NewSessionModal({ onConfirm, onClose, isPending }: NewSessionModalProps) {
  const { data: programs = [], isLoading: programsLoading } = usePrograms()
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [gymTag, setGymTag] = useState('')
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined' || !('visualViewport' in window)) return
    const handleResize = () => {
      const vv = window.visualViewport
      if (vv) setKeyboardHeight(Math.max(0, window.innerHeight - vv.height))
    }
    handleResize()
    window.visualViewport?.addEventListener('resize', handleResize)
    return () => window.visualViewport?.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-800 shadow-2xl p-5 space-y-4"
        style={{
          maxHeight: keyboardHeight > 0 ? `calc(100vh - ${keyboardHeight}px - 1rem)` : undefined,
          marginBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
          overflow: keyboardHeight > 0 ? 'auto' : undefined,
        }}
      >
        <h2 className="font-semibold text-base">New Session</h2>

        <div>
          <p className="text-xs text-gray-500 mb-2">Program</p>
          {programsLoading ? (
            <p className="text-sm text-gray-600">Loading…</p>
          ) : programs.length === 0 ? (
            <p className="text-sm text-gray-600">No programs yet — session will start empty.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {programs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProgram(selectedProgram?.id === p.id ? null : p)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    selectedProgram?.id === p.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {p.name}
                  <span className={`ml-2 text-xs font-normal ${
                    selectedProgram?.id === p.id ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {p.exercise_order.length} ex
                  </span>
                </button>
              ))}
              <button
                onClick={() => setSelectedProgram(null)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  selectedProgram === null
                    ? 'text-gray-300 bg-gray-800'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                No template
              </button>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2">Gym tag <span className="text-gray-700">(optional)</span></p>
          <input
            type="text"
            value={gymTag}
            onChange={(e) => setGymTag(e.target.value)}
            placeholder="e.g. home, commercial"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onConfirm(selectedProgram, gymTag.trim())}
            disabled={isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            {isPending ? 'Creating…' : 'Start Session'}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white px-4 py-2 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Home Page ─────────────────────────────────────────────────────────────────

export function HomePage() {
  const { data: sessions = [], isLoading } = useRecentSessions()
  const createSession = useCreateSession()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  const sessionIds = sessions.map((s) => s.id)
  const { data: sessionExercises = {} } = useSessionsExercises(sessionIds)

  const handleNewSession = async (program: Program | null, gymTag: string) => {
    const { session, exerciseIds } = await createSession.mutateAsync({
      name: program?.name ?? null,
      gymTag: gymTag || null,
      programId: program?.id,
    })
    setShowModal(false)
    const path = exerciseIds.length > 0
      ? `/session/${session.id}?exercises=${exerciseIds.join(',')}`
      : `/session/${session.id}`
    navigate(path)
  }

  const handleUseAsTemplate = async (template: Session) => {
    const exerciseIds = (sessionExercises[template.id] ?? []).map((e) => e.id)
    const { session } = await createSession.mutateAsync({
      name: template.name ?? null,
      gymTag: template.gym_tag ?? null,
      exerciseIds,
    })
    const path = exerciseIds.length > 0
      ? `/session/${session.id}?exercises=${exerciseIds.join(',')}`
      : `/session/${session.id}`
    navigate(path)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Workouts</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
        >
          New Session
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No sessions yet</p>
          <p className="text-sm mt-1">Start your first workout above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Recent Sessions</p>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              exercises={sessionExercises[session.id] ?? []}
              onOpen={() => navigate(`/session/${session.id}`)}
              onUseAsTemplate={() => void handleUseAsTemplate(session)}
              creating={createSession.isPending}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewSessionModal
          onConfirm={(program, gym) => void handleNewSession(program, gym)}
          onClose={() => setShowModal(false)}
          isPending={createSession.isPending}
        />
      )}
    </div>
  )
}

function SessionCard({
  session,
  exercises,
  onOpen,
  onUseAsTemplate,
  creating,
}: {
  session: Session
  exercises: { id: string; name: string }[]
  onOpen: () => void
  onUseAsTemplate: () => void
  creating: boolean
}) {
  const date = new Date(session.started_at).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const MAX_SHOWN = 4
  const shown = exercises.slice(0, MAX_SHOWN).map((e) => e.name).join(' · ')
  const overflow = exercises.length > MAX_SHOWN ? ` · +${exercises.length - MAX_SHOWN}` : ''
  const exerciseSummary = exercises.length > 0 ? shown + overflow : null

  return (
    <div className="px-4 py-3 rounded-xl bg-gray-900 border border-gray-800">
      <div className="flex items-start justify-between gap-4">
        <button onClick={onOpen} className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium">{sessionLabel(session)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {date}
            {session.ended_at ? (
              <span className="ml-2 text-green-600">Completed</span>
            ) : (
              <span className="ml-2 text-yellow-600">In progress</span>
            )}
          </p>
          {exerciseSummary && (
            <p className="text-xs text-gray-500 mt-1.5 truncate">{exerciseSummary}</p>
          )}
        </button>
        <button
          onClick={onUseAsTemplate}
          disabled={creating}
          className="text-xs text-gray-500 hover:text-blue-400 disabled:opacity-40 transition-colors shrink-0 mt-0.5"
          title="Start new session based on this one"
        >
          Use as template
        </button>
      </div>
    </div>
  )
}
