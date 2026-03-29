import { useState } from 'react'
import { usePrograms, useCreateProgram, useUpdateProgram, useDeleteProgram } from '../hooks/usePrograms'
import { useExercises, useDeleteExercise } from '../hooks/useExercises'
import { ExerciseForm } from '../components/exercises/ExerciseForm'
import { ExercisePicker } from '../components/session/ExercisePicker'
import type { Program, Exercise } from '../types'

type Tab = 'programs' | 'exercises'

// ── Program Detail (inline) ──────────────────────────────────────────────────

function ProgramDetail({ program, allExercises, onClose }: {
  program: Program
  allExercises: Exercise[]
  onClose: () => void
}) {
  const updateProgram = useUpdateProgram()
  const deleteProgram = useDeleteProgram()
  const [showPicker, setShowPicker] = useState(false)

  const exercises = program.exercise_order.flatMap((id) => {
    const ex = allExercises.find((e) => e.id === id)
    return ex ? [ex] : []
  })

  const removeExercise = (exerciseId: string) => {
    const newOrder = program.exercise_order.filter((id) => id !== exerciseId)
    updateProgram.mutate({ programId: program.id, exercise_order: newOrder })
  }

  const moveExercise = (index: number, direction: -1 | 1) => {
    const newOrder = [...program.exercise_order]
    const swap = index + direction
    if (swap < 0 || swap >= newOrder.length) return;
    [newOrder[index], newOrder[swap]] = [newOrder[swap], newOrder[index]]
    updateProgram.mutate({ programId: program.id, exercise_order: newOrder })
  }

  const handleAddExercise = (exercise: Exercise) => {
    setShowPicker(false)
    if (program.exercise_order.includes(exercise.id)) return
    updateProgram.mutate({
      programId: program.id,
      exercise_order: [...program.exercise_order, exercise.id],
    })
  }

  const handleDelete = () => {
    deleteProgram.mutate(program.id, { onSuccess: onClose })
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">{program.name}</h3>
          <p className="text-xs text-gray-500">{program.exercise_order.length} exercises</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={deleteProgram.isPending}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xs">Done</button>
        </div>
      </div>

      {exercises.length === 0 ? (
        <p className="text-xs text-gray-600">No exercises yet</p>
      ) : (
        <div className="space-y-1">
          {exercises.map((ex, i) => (
            <div key={ex.id} className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveExercise(i, -1)}
                  disabled={i === 0}
                  className="text-gray-600 hover:text-gray-400 disabled:opacity-20 text-xs leading-none"
                >
                  ▴
                </button>
                <button
                  onClick={() => moveExercise(i, 1)}
                  disabled={i === exercises.length - 1}
                  className="text-gray-600 hover:text-gray-400 disabled:opacity-20 text-xs leading-none"
                >
                  ▾
                </button>
              </div>
              <span className="text-xs text-gray-400 w-5 tabular-nums shrink-0">{i + 1}</span>
              <span className="flex-1 text-sm">{ex.name}</span>
              <button
                onClick={() => removeExercise(ex.id)}
                className="text-gray-600 hover:text-red-400 text-xs transition-colors shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowPicker(true)}
        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        + Add Exercise
      </button>

      {showPicker && (
        <ExercisePicker
          onSelect={handleAddExercise}
          onClose={() => setShowPicker(false)}
          alreadyAdded={program.exercise_order}
        />
      )}
    </div>
  )
}

// ── Setup Page ───────────────────────────────────────────────────────────────

export function SetupPage() {
  const [tab, setTab] = useState<Tab>('programs')
  const { data: programs = [], isLoading: loadingPrograms } = usePrograms()
  const { data: exercises = [], isLoading: loadingExercises } = useExercises()
  const deleteExercise = useDeleteExercise()
  const createProgram = useCreateProgram()

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [addingProgram, setAddingProgram] = useState(false)
  const [programName, setProgramName] = useState('')

  const [addingExercise, setAddingExercise] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  const selectedProgram = programs.find((p) => p.id === selectedProgramId) ?? null

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault()
    if (!programName.trim()) return
    createProgram.mutate(
      { name: programName.trim() },
      { onSuccess: (p) => { setAddingProgram(false); setProgramName(''); setSelectedProgramId(p.id) } }
    )
  }

  const tabCls = (active: boolean) =>
    `flex-1 text-center py-2 text-sm font-medium transition-colors ${
      active ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 border-b border-gray-800'
    }`

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex">
        <button className={tabCls(tab === 'programs')} onClick={() => setTab('programs')}>
          Programs
        </button>
        <button className={tabCls(tab === 'exercises')} onClick={() => setTab('exercises')}>
          Exercises
        </button>
      </div>

      {/* ── Programs tab ── */}
      {tab === 'programs' && (
        <div className="space-y-3">
          {addingProgram ? (
            <form onSubmit={handleCreateProgram} className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
              <h3 className="font-medium text-sm">New Program</h3>
              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Program name (e.g. Push, Upper A)"
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createProgram.isPending || !programName.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  {createProgram.isPending ? '…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingProgram(false); setProgramName('') }}
                  className="text-gray-400 hover:text-white px-3 py-2 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAddingProgram(true)}
              className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
            >
              New Program
            </button>
          )}

          {selectedProgram && (
            <ProgramDetail
              program={selectedProgram}
              allExercises={exercises}
              onClose={() => setSelectedProgramId(null)}
            />
          )}

          {loadingPrograms ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : programs.length === 0 && !addingProgram ? (
            <p className="text-gray-500 text-sm">
              No programs yet. Create one to define your exercise order.
            </p>
          ) : (
            <div className="space-y-2">
              {programs.map((program) => (
                <button
                  key={program.id}
                  onClick={() => setSelectedProgramId(program.id === selectedProgramId ? null : program.id)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <p className="text-sm font-medium">{program.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {program.exercise_order.length} exercise{program.exercise_order.length !== 1 ? 's' : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Exercises tab ── */}
      {tab === 'exercises' && (
        <div className="space-y-3">
          {addingExercise && <ExerciseForm onDone={() => setAddingExercise(false)} />}
          {editingExercise && <ExerciseForm exercise={editingExercise} onDone={() => setEditingExercise(null)} />}

          {loadingExercises ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : exercises.length === 0 && !addingExercise ? (
            <p className="text-gray-500 text-sm">No exercises yet. Add one below.</p>
          ) : (
            <div className="space-y-2">
              {exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-900 border border-gray-800"
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingExercise(exercise)}
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

          {!addingExercise && !editingExercise && (
            <button
              onClick={() => setAddingExercise(true)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              + New Exercise
            </button>
          )}
        </div>
      )}
    </div>
  )
}
