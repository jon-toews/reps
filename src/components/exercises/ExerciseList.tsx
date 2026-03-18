import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExercises, useDeleteExercise } from '../../hooks/useExercises'
import { ExerciseForm } from './ExerciseForm'
import type { Exercise } from '../../types'

export function ExerciseList() {
  const { data: exercises = [], isLoading } = useExercises()
  const deleteExercise = useDeleteExercise()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)

  if (isLoading) return <p className="text-gray-500 text-sm">Loading…</p>

  return (
    <div className="space-y-3">
      {adding && <ExerciseForm onDone={() => setAdding(false)} />}
      {editing && <ExerciseForm exercise={editing} onDone={() => setEditing(null)} />}

      {exercises.length === 0 && !adding ? (
        <p className="text-gray-500 text-sm">No exercises yet. Add one below.</p>
      ) : (
        <div className="space-y-2">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 group"
            >
              <div className="min-w-0">
                <span className="text-sm">{exercise.name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {exercise.muscle_group && (
                    <span className="text-xs text-gray-600">
                      {exercise.muscle_group.replace(/_/g, ' ')}
                    </span>
                  )}
                  {exercise.is_unilateral && (
                    <span className="text-xs text-gray-600">unilateral</span>
                  )}
                  {exercise.is_equipment_dependent && (
                    <span className="text-xs text-gray-600">equipment</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => navigate(`/exercises/${exercise.id}`)}
                  className="text-gray-500 hover:text-green-400 text-xs transition-colors"
                >
                  History
                </button>
                <button
                  onClick={() => setEditing(exercise)}
                  className="text-gray-500 hover:text-blue-400 text-xs transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteExercise.mutate(exercise.id)}
                  disabled={deleteExercise.isPending}
                  className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!adding && !editing && (
        <button
          onClick={() => setAdding(true)}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          + New Exercise
        </button>
      )}
    </div>
  )
}
