import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session } from '../types'

/** Returns the most recent session with no ended_at (i.e. still in progress). */
export function useActiveSession() {
  return useQuery({
    queryKey: ['activeSession'],
    queryFn: async (): Promise<Session | null> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
