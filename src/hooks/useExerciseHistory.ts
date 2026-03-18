import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface HistorySet {
  id: string
  weight: number | null
  reps_left: number | null
  reps_right: number | null
  rir: number | null
  tags: string[]
  is_sub: boolean
  created_at: string
  session: {
    id: string
    name: string | null
    gym_tag: string | null
    started_at: string
  }
}

export function useExerciseHistory(exerciseId: string | undefined) {
  return useQuery({
    queryKey: ['exerciseHistory', exerciseId],
    enabled: !!exerciseId,
    queryFn: async (): Promise<HistorySet[]> => {
      const { data, error } = await supabase
        .from('sets')
        .select('id, weight, reps_left, reps_right, rir, tags, is_sub, created_at, session:sessions(id, name, gym_tag, started_at)')
        .eq('exercise_id', exerciseId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as unknown) as HistorySet[]
    },
  })
}
