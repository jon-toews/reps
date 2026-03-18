import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session, WorkoutSet, SetWithExercise } from '../types'

// --- Session queries ---

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<Session> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId!)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useSessionSets(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessionSets', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<SetWithExercise[]> => {
      const { data, error } = await supabase
        .from('sets')
        .select('*, exercise:exercises(*)')
        .eq('session_id', sessionId!)
        .order('order_index')
      if (error) throw error
      return data as SetWithExercise[]
    },
  })
}

export function useRecentSessions() {
  return useQuery({
    queryKey: ['recentSessions'],
    queryFn: async (): Promise<Session[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
  })
}

// --- Session mutations ---

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      name,
      gymTag,
      programId,
      exerciseIds,
    }: {
      name?: string | null
      gymTag?: string | null
      programId?: string
      exerciseIds?: string[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: session, error: sessionErr } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          name: name ?? null,
          gym_tag: gymTag ?? null,
          program_id: programId ?? null,
        })
        .select()
        .single()
      if (sessionErr) throw sessionErr

      // If exerciseIds provided directly (template use case), use them
      let resolvedExerciseIds: string[] = exerciseIds ?? []

      // If a programId is given and no direct exerciseIds, load from program
      if (programId && resolvedExerciseIds.length === 0) {
        const { data: program } = await supabase
          .from('programs')
          .select('exercise_order')
          .eq('id', programId)
          .single()
        if (program) resolvedExerciseIds = program.exercise_order as string[]
      }

      return { session: session as Session, exerciseIds: resolvedExerciseIds }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recentSessions'] })
    },
  })
}

export function useCompleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select()
        .single()
      if (error) throw error
      return data as Session
    },
    onSuccess: (_data, sessionId) => {
      void qc.invalidateQueries({ queryKey: ['session', sessionId] })
      void qc.invalidateQueries({ queryKey: ['recentSessions'] })
    },
  })
}

// --- Set mutations ---

export interface AddSetInput {
  sessionId: string
  exerciseId: string
  weight: number | null
  reps_left: number | null
  reps_right: number | null
  rir: number | null
  tags: string[]
  is_sub: boolean
  notes: string | null
}

export interface UpdateSetInput {
  setId: string
  sessionId: string
  weight: number | null
  reps_left: number | null
  reps_right: number | null
  rir: number | null
  notes: string | null
}

export function useAddSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddSetInput): Promise<WorkoutSet> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get current max order_index for this session
      const { data: existing } = await supabase
        .from('sets')
        .select('order_index')
        .eq('session_id', input.sessionId)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle()

      const orderIndex = existing ? existing.order_index + 1 : 0

      const { data, error } = await supabase
        .from('sets')
        .insert({
          session_id: input.sessionId,
          exercise_id: input.exerciseId,
          order_index: orderIndex,
          weight: input.weight,
          reps_left: input.reps_left,
          reps_right: input.reps_right,
          tags: input.tags,
          is_sub: input.is_sub,
          rir: input.rir,
          notes: input.notes,
          user_id: user.id,
        })
        .select()
        .single()
      if (error) throw error
      return data as WorkoutSet
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: ['sessionSets', input.sessionId] })
      void qc.invalidateQueries({ queryKey: ['lastWeight'] })
    },
  })
}

export function useDeleteSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ setId, sessionId }: { setId: string; sessionId: string }) => {
      const { error } = await supabase.from('sets').delete().eq('id', setId)
      if (error) throw error
      return { sessionId }
    },
    onSuccess: (_data, { sessionId }) => {
      void qc.invalidateQueries({ queryKey: ['sessionSets', sessionId] })
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['recentSessions'] })
    },
  })
}

export function useSessionsExercises(sessionIds: string[]) {
  const key = [...sessionIds].sort().join(',')
  return useQuery({
    queryKey: ['sessionsExercises', key],
    enabled: sessionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sets')
        .select('session_id, exercise_id, order_index, exercise:exercises(name)')
        .in('session_id', sessionIds)
        .order('order_index')
      if (error) throw error

      const result: Record<string, { id: string; name: string }[]> = {}
      for (const row of data as unknown as Array<{ session_id: string; exercise_id: string; exercise: { name: string } }>) {
        if (!result[row.session_id]) result[row.session_id] = []
        if (!result[row.session_id].find((e) => e.id === row.exercise_id)) {
          result[row.session_id].push({ id: row.exercise_id, name: row.exercise.name })
        }
      }
      return result
    },
  })
}

export function useReorderSets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      updates,
    }: {
      sessionId: string
      updates: { id: string; order_index: number }[]
    }) => {
      await Promise.all(
        updates.map(({ id, order_index }) =>
          supabase.from('sets').update({ order_index }).eq('id', id)
        )
      )
    },
    onSuccess: (_data, { sessionId }) => {
      void qc.invalidateQueries({ queryKey: ['sessionSets', sessionId] })
    },
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, gymTag }: { sessionId: string; gymTag: string | null }) => {
      const { data, error } = await supabase
        .from('sessions')
        .update({ gym_tag: gymTag })
        .eq('id', sessionId)
        .select()
        .single()
      if (error) throw error
      return data as Session
    },
    onSuccess: (_data, { sessionId }) => {
      void qc.invalidateQueries({ queryKey: ['session', sessionId] })
      void qc.invalidateQueries({ queryKey: ['recentSessions'] })
    },
  })
}

export function useUpdateSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateSetInput): Promise<WorkoutSet> => {
      const { data, error } = await supabase
        .from('sets')
        .update({
          weight: input.weight,
          reps_left: input.reps_left,
          reps_right: input.reps_right,
          rir: input.rir,
          notes: input.notes,
        })
        .eq('id', input.setId)
        .select()
        .single()
      if (error) throw error
      return data as WorkoutSet
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: ['sessionSets', input.sessionId] })
    },
  })
}
