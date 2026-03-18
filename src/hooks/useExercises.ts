import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Exercise, MuscleGroup } from '../types'

export interface CreateExerciseInput {
  name: string
  muscle_group?: MuscleGroup | null
  is_unilateral?: boolean
  is_equipment_dependent?: boolean
  default_weight_increment?: number
  default_starting_weight?: number | null
  notes?: string | null
}

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async (): Promise<Exercise[]> => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateExerciseInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name: input.name,
          user_id: user.id,
          muscle_group: input.muscle_group ?? null,
          is_unilateral: input.is_unilateral ?? false,
          is_equipment_dependent: input.is_equipment_dependent ?? false,
          default_weight_increment: input.default_weight_increment ?? 2.5,
          default_starting_weight: input.default_starting_weight ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as Exercise
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['exercises'] })
    },
  })
}

export function useUpdateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<CreateExerciseInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('exercises')
        .update(fields)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Exercise
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['exercises'] })
    },
  })
}

export function useDeleteExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['exercises'] })
    },
  })
}
