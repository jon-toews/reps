import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Session, MuscleGroup, SetWithExercise } from '../../types'
import { useSessionSets } from '../../hooks/useSession'

function countByMuscleGroup(sets: SetWithExercise[]): Partial<Record<MuscleGroup, number>> {
  const counts: Partial<Record<MuscleGroup, number>> = {}
  for (const set of sets) {
    const mg = set.exercise.muscle_group
    if (mg) counts[mg] = (counts[mg] ?? 0) + 1
  }
  return counts
}

function usePreviousSessionSets(currentSessionId: string, programId: string | null) {
  return useQuery({
    queryKey: ['prevSessionSets', currentSessionId, programId],
    enabled: !!programId,
    queryFn: async (): Promise<SetWithExercise[]> => {
      const { data: current } = await supabase
        .from('sessions')
        .select('started_at')
        .eq('id', currentSessionId)
        .single()
      if (!current) return []

      const { data: prevSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('program_id', programId!)
        .not('ended_at', 'is', null)
        .neq('id', currentSessionId)
        .lt('started_at', current.started_at)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!prevSession) return []

      const { data, error } = await supabase
        .from('sets')
        .select('*, exercise:exercises(*)')
        .eq('session_id', prevSession.id)
        .order('order_index')
      if (error) throw error
      return data as SetWithExercise[]
    },
  })
}

interface VolumeViewProps {
  session: Session
}

export function VolumeView({ session }: VolumeViewProps) {
  const { data: currentSets = [] } = useSessionSets(session.id)
  const { data: prevSets = [] } = usePreviousSessionSets(session.id, session.program_id)

  const currentVolume = countByMuscleGroup(currentSets)
  const prevVolume = countByMuscleGroup(prevSets)

  const allMuscleGroups = Array.from(
    new Set([
      ...Object.keys(currentVolume),
      ...Object.keys(prevVolume),
    ])
  ).sort() as MuscleGroup[]

  if (!session.program_id) {
    return (
      <div className="text-center py-8 text-gray-600 text-sm">
        Volume comparison requires a program template
      </div>
    )
  }

  if (allMuscleGroups.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 text-sm">
        No sets logged yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center px-3 py-1">
        <span className="flex-1 text-xs text-gray-600">Muscle group</span>
        <span className="w-16 text-right text-xs text-gray-600">Prev</span>
        <span className="w-16 text-right text-xs text-gray-600">Now</span>
      </div>

      {allMuscleGroups.map((mg) => {
        const current = currentVolume[mg] ?? 0
        const prev = prevVolume[mg] ?? 0
        const delta = current - prev

        return (
          <div key={mg} className="flex items-center px-3 py-2 rounded-lg bg-gray-800/40">
            <span className="flex-1 text-sm capitalize">{mg.replace(/_/g, ' ')}</span>
            <span className="w-16 text-right text-sm text-gray-500">{prev > 0 ? prev : '—'}</span>
            <span className={`w-16 text-right text-sm font-medium ${
              delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-white'
            }`}>
              {current > 0 ? current : '—'}
              {prev > 0 && current > 0 && delta !== 0 && (
                <span className="text-xs ml-1">
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
