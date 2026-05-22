import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface LastSetData {
  weight: number | null
  reps_left: number | null
  reps_right: number | null
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
      // Equipment-dependent with a gym tag: scope to that gym first
      if (isEquipmentDependent && gymTag) {
        const { data: sessionRows } = await supabase
          .from('sessions')
          .select('id')
          .eq('gym_tag', gymTag)

        const sessionIds = (sessionRows ?? []).map((s: { id: string }) => s.id)
        if (sessionIds.length > 0) {
          const { data, error } = await supabase
            .from('sets')
            .select('weight, reps_left, reps_right')
            .eq('exercise_id', exerciseId!)
            .in('session_id', sessionIds)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (error) throw error
          if (data) return data
        }
        // No history at this gym — fall through to any-gym lookup
      }

      // Free weights, no gym tag, or equipment-dependent at a new gym: gym-agnostic
      const { data, error } = await supabase
        .from('sets')
        .select('weight, reps_left, reps_right')
        .eq('exercise_id', exerciseId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
