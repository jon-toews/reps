import { useState, useEffect } from 'react'
import { useUpdateExercise } from '../../hooks/useExercises'
import { MUSCLE_GROUPS } from '../../types'
import type { Exercise, MuscleGroup } from '../../types'

const INCREMENT_PRESETS = [1, 2.5, 5, 10]

interface ExerciseConfigSheetProps {
  exercise: Exercise
  onClose: () => void
}

const fmtNum = (n: number) => (n % 1 === 0 ? String(n) : String(Number(n.toFixed(2))))

export function ExerciseConfigSheet({ exercise, onClose }: ExerciseConfigSheetProps) {
  const updateExercise = useUpdateExercise()
  const [repTarget, setRepTarget] = useState<number | null>(exercise.rep_target)
  const [increment, setIncrement] = useState<number>(exercise.default_weight_increment || 2.5)
  const [startingWeight, setStartingWeight] = useState<string>(
    exercise.default_starting_weight != null ? fmtNum(exercise.default_starting_weight) : ''
  )
  const [isUnilateral, setIsUnilateral] = useState(exercise.is_unilateral)
  const [isEquipmentDependent, setIsEquipmentDependent] = useState(exercise.is_equipment_dependent)
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | ''>(exercise.muscle_group ?? '')
  const [notes, setNotes] = useState(exercise.notes ?? '')
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null)

  // Track the visual viewport so the sheet stays above the iOS keyboard
  // (same approach as the New Session modal).
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const handleChange = () => setViewport({ height: vv.height, top: vv.offsetTop })
    handleChange()
    vv.addEventListener('resize', handleChange)
    vv.addEventListener('scroll', handleChange)
    return () => {
      vv.removeEventListener('resize', handleChange)
      vv.removeEventListener('scroll', handleChange)
    }
  }, [])

  const parsedStarting = startingWeight.trim() !== '' ? parseFloat(startingWeight) : null
  const startingValid = parsedStarting == null || (!Number.isNaN(parsedStarting) && parsedStarting >= 0)

  const handleSave = () => {
    if (!startingValid) return
    updateExercise.mutate(
      {
        id: exercise.id,
        rep_target: repTarget,
        default_weight_increment: increment,
        default_starting_weight: parsedStarting,
        is_unilateral: isUnilateral,
        is_equipment_dependent: isEquipmentDependent,
        muscle_group: muscleGroup || null,
        notes: notes.trim() || null,
      },
      { onSuccess: onClose }
    )
  }

  const stepRepTarget = (delta: number) => {
    setRepTarget((prev) => {
      if (prev == null) return delta > 0 ? 10 : null
      const next = prev + delta
      return next < 1 ? null : next
    })
  }

  const stepStarting = (delta: number) => {
    const base = parsedStarting != null && !Number.isNaN(parsedStarting) ? parsedStarting : 0
    setStartingWeight(fmtNum(Math.max(0, base + delta * increment)))
  }

  const incrementOptions = INCREMENT_PRESETS.includes(increment)
    ? INCREMENT_PRESETS
    : [...INCREMENT_PRESETS, increment].sort((a, b) => a - b)

  const stepBtn =
    'w-14 h-14 shrink-0 rounded-xl bg-gray-800 active:bg-gray-700 text-2xl font-medium text-gray-200 touch-manipulation select-none disabled:opacity-40'
  const sectionLabel = 'text-xs text-gray-500 mb-2'

  return (
    <div
      className="fixed inset-x-0 z-50 flex items-end sm:items-center justify-center"
      style={{
        top: viewport ? `${viewport.top}px` : 0,
        height: viewport ? `${viewport.height}px` : '100vh',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Configure ${exercise.name}`}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md max-h-full flex flex-col bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between pl-5 pr-2 pt-3 pb-3 border-b border-gray-800">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Exercise config</p>
            <h2 className="font-semibold text-base truncate">{exercise.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white w-12 h-12 flex items-center justify-center touch-manipulation"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Rep target */}
          <div>
            <p className={sectionLabel}>Rep target</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => stepRepTarget(-1)}
                disabled={repTarget == null}
                className={stepBtn}
                aria-label="Decrease rep target"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className={`text-3xl font-semibold tabular-nums ${repTarget == null ? 'text-gray-600' : ''}`}>
                  {repTarget ?? 'Off'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => stepRepTarget(1)}
                className={stepBtn}
                aria-label="Increase rep target"
              >
                +
              </button>
            </div>
            {repTarget != null && (
              <button
                type="button"
                onClick={() => setRepTarget(null)}
                className="mt-1 text-xs text-gray-500 hover:text-gray-300 py-2 touch-manipulation"
              >
                Clear target
              </button>
            )}
          </div>

          {/* Weight increment */}
          <div>
            <p className={sectionLabel}>Weight increment (lb)</p>
            <div className="flex gap-2">
              {incrementOptions.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setIncrement(val)}
                  className={`flex-1 h-12 rounded-xl text-base font-medium tabular-nums transition-colors touch-manipulation ${
                    increment === val
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 active:bg-gray-700'
                  }`}
                >
                  {fmtNum(val)}
                </button>
              ))}
            </div>
          </div>

          {/* Starting weight */}
          <div>
            <p className={sectionLabel}>Starting weight (lb)</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => stepStarting(-1)}
                disabled={parsedStarting == null || parsedStarting <= 0}
                className={stepBtn}
                aria-label="Decrease starting weight"
              >
                −
              </button>
              <input
                type="text"
                inputMode="decimal"
                value={startingWeight}
                onChange={(e) => setStartingWeight(e.target.value)}
                placeholder="—"
                className={`flex-1 min-w-0 h-14 bg-gray-800 border rounded-xl text-center text-2xl font-semibold tabular-nums focus:outline-none touch-manipulation ${
                  startingValid ? 'border-gray-700 focus:border-blue-500' : 'border-red-600'
                }`}
                aria-label="Starting weight"
              />
              <button
                type="button"
                onClick={() => stepStarting(1)}
                className={stepBtn}
                aria-label="Increase starting weight"
              >
                +
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <ToggleRow
              label="Unilateral"
              hint="Track reps per side"
              checked={isUnilateral}
              onChange={setIsUnilateral}
            />
            <ToggleRow
              label="Equipment-dependent"
              hint="Scope progress to gym tag"
              checked={isEquipmentDependent}
              onChange={setIsEquipmentDependent}
            />
          </div>

          {/* Muscle group */}
          <div>
            <p className={sectionLabel}>Muscle group</p>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup | '')}
              className="w-full h-12 bg-gray-800 border border-gray-700 rounded-xl px-3 text-base focus:outline-none focus:border-blue-500 touch-manipulation"
            >
              <option value="">— select —</option>
              {MUSCLE_GROUPS.map((mg) => (
                <option key={mg} value={mg}>{mg.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <p className={sectionLabel}>Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Seat height, grip, cues…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-base resize-none focus:outline-none focus:border-blue-500 touch-manipulation"
            />
          </div>
        </div>

        <div
          className="px-5 pt-3 border-t border-gray-800"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          {updateExercise.isError && (
            <p className="text-xs text-red-400 mb-2">Couldn't save — try again.</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={updateExercise.isPending || !startingValid}
            className="w-full h-14 bg-blue-600 hover:bg-blue-500 active:bg-blue-500 disabled:opacity-50 rounded-xl text-base font-semibold transition-colors touch-manipulation"
          >
            {updateExercise.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gray-800 active:bg-gray-700 text-left touch-manipulation"
    >
      <div>
        <p className="text-base">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <span
        className={`relative w-12 h-7 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  )
}
