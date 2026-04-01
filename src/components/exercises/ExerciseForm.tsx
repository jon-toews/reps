import { useForm } from 'react-hook-form'
import { useCreateExercise, useUpdateExercise } from '../../hooks/useExercises'
import { MUSCLE_GROUPS } from '../../types'
import type { Exercise, MuscleGroup } from '../../types'

interface FormValues {
  name: string
  muscle_group: MuscleGroup | ''
  is_unilateral: boolean
  is_equipment_dependent: boolean
  default_weight_increment: number
  default_starting_weight: string
  notes: string
}

interface ExerciseFormProps {
  exercise?: Exercise
  onDone: () => void
}

export function ExerciseForm({ exercise, onDone }: ExerciseFormProps) {
  const createExercise = useCreateExercise()
  const updateExercise = useUpdateExercise()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: exercise?.name ?? '',
      muscle_group: exercise?.muscle_group ?? '',
      is_unilateral: exercise?.is_unilateral ?? false,
      is_equipment_dependent: exercise?.is_equipment_dependent ?? false,
      default_weight_increment: exercise?.default_weight_increment ?? 2.5,
      default_starting_weight: exercise?.default_starting_weight != null
        ? String(exercise.default_starting_weight)
        : '',
      notes: exercise?.notes ?? '',
    },
  })

  const isPending = createExercise.isPending || updateExercise.isPending

  const onSubmit = (values: FormValues) => {
    const input = {
      name: values.name.trim(),
      muscle_group: values.muscle_group || null,
      is_unilateral: values.is_unilateral,
      is_equipment_dependent: values.is_equipment_dependent,
      default_weight_increment: Number(values.default_weight_increment),
      default_starting_weight: values.default_starting_weight !== ''
        ? Number(values.default_starting_weight)
        : null,
      notes: values.notes.trim() || null,
    }

    if (exercise) {
      updateExercise.mutate({ id: exercise.id, ...input }, {
        onSuccess: () => { reset(); onDone() },
      })
    } else {
      createExercise.mutate(input, {
        onSuccess: () => { reset(); onDone() },
      })
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-base focus:outline-none focus:border-blue-500'
  const labelCls = 'block text-xs text-gray-400 mb-1'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div>
        <label className={labelCls}>Name *</label>
        <input
          {...register('name', { required: 'Name is required' })}
          type="text"
          placeholder="Exercise name"
          className={inputCls}
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Muscle group</label>
        <select {...register('muscle_group')} className={inputCls}>
          <option value="">— select —</option>
          {MUSCLE_GROUPS.map((mg) => (
            <option key={mg} value={mg}>{mg.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            {...register('is_unilateral')}
            className="rounded"
          />
          Unilateral
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            {...register('is_equipment_dependent')}
            className="rounded"
          />
          Equipment-dependent
        </label>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelCls}>Weight increment (lb)</label>
          <input
            {...register('default_weight_increment', {
              required: true,
              min: 0.25,
              valueAsNumber: true,
            })}
            type="number"
            step="0.25"
            min="0.25"
            className={inputCls}
          />
        </div>
        <div className="flex-1">
          <label className={labelCls}>Starting weight (lb)</label>
          <input
            {...register('default_starting_weight')}
            type="number"
            step="0.5"
            min="0"
            placeholder="optional"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="optional"
          className={`${inputCls} resize-none`}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {isPending ? '…' : exercise ? 'Save' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-gray-400 hover:text-white px-3 py-2 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
