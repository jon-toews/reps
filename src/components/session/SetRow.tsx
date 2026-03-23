import { useState, useMemo } from 'react'
import { useDrag } from '@use-gesture/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAddSet, useUpdateSet, useDeleteSet, useSessionSets } from '../../hooks/useSession'
import type { Exercise, SetWithExercise } from '../../types'

// ── Stepper Button ────────────────────────────────────────────────────────────

function StepBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 active:scale-95 flex items-center justify-center text-lg font-light transition-all select-none touch-manipulation shrink-0"
    >
      {children}
    </button>
  )
}

// ── Confirmed Set Row ─────────────────────────────────────────────────────────

const DELETE_WIDTH = 72
const DELETE_THRESHOLD = -52

export interface ConfirmedSetRowProps {
  set: SetWithExercise
  setNumber: number
  sessionId: string
  sessionCompleted: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}

export function ConfirmedSetRow({
  set,
  setNumber,
  sessionId,
  sessionCompleted,
  dragHandleProps,
}: ConfirmedSetRowProps) {
  const updateSet = useUpdateSet()
  const deleteSet = useDeleteSet()

  const isUnilateral = set.exercise.is_unilateral

  const [weight, setWeight] = useState(set.weight != null ? String(set.weight) : '')
  const [repsLeft, setRepsLeft] = useState(set.reps_left != null ? String(set.reps_left) : '')
  const [repsRight, setRepsRight] = useState(set.reps_right != null ? String(set.reps_right) : '')
  const [rir, setRir] = useState(set.rir != null ? String(set.rir) : '')
  const [offsetX, setOffsetX] = useState(0)
  const [settling, setSettling] = useState(false)

  const save = () => {
    const newWeight = weight !== '' ? parseFloat(weight) : null
    const newRepsLeft = repsLeft !== '' ? parseInt(repsLeft, 10) : null
    const newRepsRight = repsRight !== '' ? parseInt(repsRight, 10) : null
    const newRir = rir !== '' ? parseInt(rir, 10) : null
    if (
      newWeight === set.weight &&
      newRepsLeft === set.reps_left &&
      newRepsRight === set.reps_right &&
      newRir === set.rir
    )
      return
    updateSet.mutate({
      setId: set.id,
      sessionId,
      weight: newWeight,
      reps_left: newRepsLeft,
      reps_right: newRepsRight,
      rir: newRir,
      notes: set.notes,
    })
  }

  const triggerDelete = () => {
    setSettling(true)
    setOffsetX(-DELETE_WIDTH * 2)
    setTimeout(() => deleteSet.mutate({ setId: set.id, sessionId }), 180)
  }

  const bind = useDrag(
    ({ movement: [mx], last, active }) => {
      if (sessionCompleted) return
      const clamped = Math.max(-DELETE_WIDTH, Math.min(0, mx))
      if (last) {
        if (mx < DELETE_THRESHOLD) {
          triggerDelete()
        } else {
          setSettling(true)
          setOffsetX(0)
          setTimeout(() => setSettling(false), 250)
        }
      } else {
        setSettling(false)
        setOffsetX(active ? clamped : 0)
      }
    },
    { axis: 'x', filterTaps: true, pointer: { touch: true } }
  )

  const inputCls =
    'bg-transparent text-center focus:outline-none tabular-nums text-base disabled:text-gray-500 touch-manipulation'

  const deleteOpacity = Math.min(1, Math.abs(offsetX) / DELETE_WIDTH)

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete zone */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600 rounded-r-xl"
        style={{ width: DELETE_WIDTH, opacity: deleteOpacity }}
      >
        <span className="text-xs font-semibold text-white select-none">Delete</span>
      </div>

      {/* Swipeable row */}
      <div
        {...(sessionCompleted ? {} : bind())}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: settling ? 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
        }}
        className="relative flex items-center gap-2 py-2 px-3 bg-gray-800/50 touch-pan-y"
      >
        {/* Drag handle / set number */}
        {dragHandleProps ? (
          <button
            {...dragHandleProps}
            className="w-5 shrink-0 flex items-center justify-center text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none select-none text-base"
            aria-label="Drag to reorder set"
            tabIndex={-1}
          >
            ⠿
          </button>
        ) : (
          <span className="text-xs font-medium text-gray-500 w-5 shrink-0 tabular-nums">
            {setNumber}
          </span>
        )}

        <input
          type="text"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={save}
          disabled={sessionCompleted}
          className={`${inputCls} w-14`}
          placeholder="—"
          aria-label="Weight lb"
        />
        <span className="text-gray-600 text-xs">lb ×</span>

        {isUnilateral ? (
          <>
            <input
              type="text"
              inputMode="numeric"
              value={repsLeft}
              onChange={(e) => setRepsLeft(e.target.value)}
              onBlur={save}
              disabled={sessionCompleted}
              className={`${inputCls} w-8`}
              placeholder="—"
              aria-label="Reps left"
            />
            <span className="text-gray-600 text-xs">/</span>
            <input
              type="text"
              inputMode="numeric"
              value={repsRight}
              onChange={(e) => setRepsRight(e.target.value)}
              onBlur={save}
              disabled={sessionCompleted}
              className={`${inputCls} w-8`}
              placeholder="—"
              aria-label="Reps right"
            />
            <span className="text-gray-600 text-xs">reps</span>
          </>
        ) : (
          <>
            <input
              type="text"
              inputMode="numeric"
              value={repsLeft}
              onChange={(e) => setRepsLeft(e.target.value)}
              onBlur={save}
              disabled={sessionCompleted}
              className={`${inputCls} w-10`}
              placeholder="—"
              aria-label="Reps"
            />
            <span className="text-gray-600 text-xs">reps</span>
          </>
        )}

        {set.is_sub && (
          <span className="text-xs text-yellow-600 ml-1">sub</span>
        )}

        <input
          type="text"
          inputMode="numeric"
          value={rir}
          onChange={(e) => setRir(e.target.value)}
          onBlur={save}
          disabled={sessionCompleted}
          className={`${inputCls} ml-auto w-8 text-gray-500 text-sm`}
          placeholder="RIR"
          aria-label="RIR"
        />
      </div>
      {set.tags.length > 0 && (
        <div className="flex gap-1 px-3 pb-1.5 flex-wrap">
          {set.tags.map((tag) => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-400">{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sortable Set Row ──────────────────────────────────────────────────────────

export function SortableSetRow(props: ConfirmedSetRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.set.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
        zIndex: isDragging ? 10 : 0,
      }}
    >
      <ConfirmedSetRow
        {...props}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>}
      />
    </div>
  )
}

// ── Tentative Set Row ─────────────────────────────────────────────────────────

interface TentativeSetRowProps {
  sessionId: string
  exercise: Exercise
  gymTag: string | null
  defaultWeight: number | null
  defaultReps: number | null
  defaultTags: string[]
}

export function TentativeSetRow({
  sessionId,
  exercise,
  gymTag: _gymTag,
  defaultWeight,
  defaultReps,
  defaultTags,
}: TentativeSetRowProps) {
  const addSet = useAddSet()
  const { data: sessionSets = [] } = useSessionSets(sessionId)
  const [weight, setWeight] = useState(defaultWeight != null ? String(defaultWeight) : '')
  const [repsLeft, setRepsLeft] = useState(defaultReps != null ? String(defaultReps) : '')
  const [repsRight, setRepsRight] = useState(defaultReps != null ? String(defaultReps) : '')
  const [rir, setRir] = useState('')
  const [tags, setTags] = useState(defaultTags.join(', '))

  // Extract recent tags for this exercise from the last N sets
  const recentTags = useMemo(() => {
    const tagSet = new Set<string>()
    const setsForExercise = sessionSets
      .filter((s) => s.exercise_id === exercise.id)
      .slice(-10) // Last 10 sets for this exercise
    for (const set of setsForExercise) {
      for (const tag of set.tags) {
        tagSet.add(tag)
      }
    }
    return Array.from(tagSet)
  }, [sessionSets, exercise.id])

  const toggleTag = (tag: string) => {
    const currentTags = tags.trim().split(/[\s,]+/).filter(Boolean)
    const idx = currentTags.indexOf(tag)
    if (idx >= 0) {
      currentTags.splice(idx, 1)
    } else {
      currentTags.push(tag)
    }
    setTags(currentTags.join(', '))
  }

  const currentTagSet = new Set(tags.trim().split(/[\s,]+/).filter(Boolean))

  const increment = exercise.default_weight_increment || 2.5

  const adjust = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    current: string,
    delta: number,
    min = 0
  ) => {
    const next = Math.max(min, (parseFloat(current) || 0) + delta)
    setter(next % 1 === 0 ? String(next) : next.toFixed(1))
  }

  const confirm = () => {
    if (addSet.isPending) return
    addSet.mutate({
      sessionId,
      exerciseId: exercise.id,
      weight: weight !== '' ? parseFloat(weight) : null,
      reps_left: repsLeft !== '' ? parseInt(repsLeft, 10) : null,
      reps_right: exercise.is_unilateral && repsRight !== '' ? parseInt(repsRight, 10) : null,
      rir: rir !== '' ? parseInt(rir, 10) : null,
      tags: tags.trim().split(/[\s,]+/).filter(Boolean),
      is_sub: false,
      notes: null,
    })
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') confirm()
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-1.5 px-2 py-2 rounded-2xl border border-dashed border-gray-700 bg-gray-900/60 flex-wrap">
        <StepBtn onClick={() => adjust(setWeight, weight, -increment)} label="Decrease weight">−</StepBtn>
        <input
          type="text"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="0"
          className="w-14 bg-transparent text-center text-base font-semibold focus:outline-none tabular-nums caret-blue-400 touch-manipulation"
          aria-label="Weight lb"
        />
        <StepBtn onClick={() => adjust(setWeight, weight, increment)} label="Increase weight">+</StepBtn>

        <span className="text-gray-600 text-xs px-0.5 shrink-0">lb ×</span>

        {exercise.is_unilateral ? (
          <>
            <StepBtn onClick={() => adjust(setRepsLeft, repsLeft, -1)} label="Decrease reps left">−</StepBtn>
            <input
              type="text"
              inputMode="numeric"
              value={repsLeft}
              onChange={(e) => {
                setRepsLeft(e.target.value)
                setRepsRight(e.target.value) // right mirrors left by default
              }}
              onKeyDown={onKeyDown}
              placeholder="0"
              className="w-8 bg-transparent text-center text-base font-semibold focus:outline-none tabular-nums caret-blue-400 touch-manipulation"
              aria-label="Reps left"
              autoFocus
            />
            <StepBtn onClick={() => adjust(setRepsLeft, repsLeft, 1)} label="Increase reps left">+</StepBtn>
            <span className="text-gray-600 text-xs">/</span>
            <StepBtn onClick={() => adjust(setRepsRight, repsRight, -1)} label="Decrease reps right">−</StepBtn>
            <input
              type="text"
              inputMode="numeric"
              value={repsRight}
              onChange={(e) => setRepsRight(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="0"
              className="w-8 bg-transparent text-center text-base font-semibold focus:outline-none tabular-nums caret-blue-400 touch-manipulation"
              aria-label="Reps right"
            />
            <StepBtn onClick={() => adjust(setRepsRight, repsRight, 1)} label="Increase reps right">+</StepBtn>
          </>
        ) : (
          <>
            <StepBtn onClick={() => adjust(setRepsLeft, repsLeft, -1)} label="Decrease reps">−</StepBtn>
            <input
              type="text"
              inputMode="numeric"
              value={repsLeft}
              onChange={(e) => setRepsLeft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="0"
              className="w-10 bg-transparent text-center text-base font-semibold focus:outline-none tabular-nums caret-blue-400 touch-manipulation"
              aria-label="Reps"
              autoFocus
            />
            <StepBtn onClick={() => adjust(setRepsLeft, repsLeft, 1)} label="Increase reps">+</StepBtn>
          </>
        )}

        <button
          type="button"
          onClick={confirm}
          disabled={addSet.isPending}
          className="ml-auto w-11 h-11 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 rounded-xl text-base font-bold flex items-center justify-center transition-colors shrink-0 touch-manipulation"
          aria-label="Log set"
        >
          {addSet.isPending ? '…' : '✓'}
        </button>
      </div>

      <div className="flex items-center gap-2 px-2">
        <span className="text-xs text-gray-600 shrink-0">RIR</span>
        <div className="flex gap-1">
          {['0', '1', '2', '3'].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setRir(rir === val ? '' : val)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors touch-manipulation ${
                rir === val
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {val}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRir('')}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors touch-manipulation ${
              rir === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            —
          </button>
        </div>
        <span className="text-xs text-gray-600 ml-2">Tags</span>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="e.g. paused, close-grip"
          className="flex-1 bg-gray-800 rounded-lg text-sm px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-gray-400 touch-manipulation"
          aria-label="Tags"
        />
      </div>

      {recentTags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap px-2">
          {recentTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors touch-manipulation ${
                currentTagSet.has(tag)
                  ? 'bg-blue-700 border-blue-600 text-blue-100'
                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
