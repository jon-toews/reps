import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface LastSetData {
  weight: number | null
  reps_left: number | null
}

export function useLastWeight(
  exerciseId: string | undefined,
  gymTag?: string | null,
  isEquipmentDependent?: boolean,
) {
  return useQuery({
    queryKey: ['lastWeight', exerciseId, gymTag ?? null, isEquipmentDependent ?? false],
    enabled: !!exerciseId,
    queryFn: async (): Promise<LastSetData | null> => {
      // Equipment-dependent with a gym tag: scope to that gym only
      if (isEquipmentDependent && gymTag) {
        const { data: sessionRows } = await supabase
          .from('sessions')
          .select('id')
          .eq('gym_tag', gymTag)

        const sessionIds = (sessionRows ?? []).map((s: { id: string }) => s.id)
        if (sessionIds.length === 0) return null

        const { data, error } = await supabase
          .from('sets')
          .select('weight, reps_left')
          .eq('exercise_id', exerciseId!)
          .in('session_id', sessionIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error) throw error
        return data
      }

      // Free weights / no gym tag: gym-agnostic
      const { data, error } = await supabase
        .from('sets')
        .select('weight, reps_left')
        .eq('exercise_id', exerciseId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
