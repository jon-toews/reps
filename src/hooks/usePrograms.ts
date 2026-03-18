import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Program } from '../types'

export function usePrograms() {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async (): Promise<Program[]> => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; exercise_order?: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('programs')
        .insert({
          user_id: user.id,
          name: input.name,
          exercise_order: input.exercise_order ?? [],
        })
        .select()
        .single()
      if (error) throw error
      return data as Program
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['programs'] })
    },
  })
}

export function useUpdateProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      programId,
      exercise_order,
    }: {
      programId: string
      exercise_order: string[]
    }) => {
      const { data, error } = await supabase
        .from('programs')
        .update({ exercise_order })
        .eq('id', programId)
        .select()
        .single()
      if (error) throw error
      return data as Program
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['programs'] })
    },
  })
}

export function useDeleteProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase.from('programs').delete().eq('id', programId)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['programs'] })
    },
  })
}
