import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { ActiveSession } from '../components/session/ActiveSession'
import { VolumeView } from '../components/session/VolumeView'

export function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading, error } = useSession(id)
  const [showVolume, setShowVolume] = useState(false)

  if (isLoading) {
    return <p className="text-gray-500 text-sm">Loading session…</p>
  }

  if (error || !session) {
    return <p className="text-red-400 text-sm">Session not found.</p>
  }

  return (
    <div>
      {session.program_id && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowVolume((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              showVolume
                ? 'border-blue-600 text-blue-400'
                : 'border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            Volume
          </button>
        </div>
      )}

      {showVolume && session.program_id ? (
        <VolumeView session={session} />
      ) : (
        <ActiveSession session={session} />
      )}
    </div>
  )
}
