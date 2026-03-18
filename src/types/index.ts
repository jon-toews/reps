export const MUSCLE_GROUPS = [
  'upper_chest',
  'lower_chest',
  'front_delt',
  'side_delt',
  'rear_delt',
  'upper_back',
  'lats',
  'lower_back',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'obliques',
  'neck',
  'traps',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export interface Exercise {
  id: string
  user_id: string
  name: string
  muscle_group: MuscleGroup | null
  is_unilateral: boolean
  is_equipment_dependent: boolean
  default_weight_increment: number
  default_starting_weight: number | null
  notes: string | null
  created_at: string
}

export interface Program {
  id: string
  user_id: string
  name: string
  exercise_order: string[]
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  name: string | null
  gym_tag: string | null
  program_id: string | null
  started_at: string
  ended_at: string | null
}

export interface WorkoutSet {
  id: string
  session_id: string
  exercise_id: string
  order_index: number
  weight: number | null
  reps_left: number | null
  reps_right: number | null
  tags: string[]
  is_sub: boolean
  rir: number | null
  notes: string | null
  created_at: string
}

export interface SetWithExercise extends WorkoutSet {
  exercise: Exercise
}

export function sessionLabel(session: Session): string {
  const base = session.name ?? 'Session'
  return session.gym_tag ? `${base} — ${session.gym_tag}` : base
}
