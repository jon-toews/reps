import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useLastWeight } from '../../hooks/useLastWeight'
import { useReorderSets } from '../../hooks/useSession'
import { ConfirmedSetRow, SortableSetRow, TentativeSetRow } from './SetRow'
import type { Exercise, SetWithExercise } from '../../types'

export interface ExerciseBlockProps {
  exercise: Exercise
  sets: SetWithExercise[]
  sessionId: string
  gymTag: string | null
  sessionCompleted: boolean
  isActive: boolean
  onActivate: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}

export function ExerciseBlock({
  exercise,
  sets,
  sessionId,
  gymTag,
  sessionCompleted,
  isActive,
  onActivate,
  dragHandleProps,
}: ExerciseBlockProps) {
  const { data: lastSet } = useLastWeight(exercise.id, gymTag, exercise.is_equipment_dependent)
  const reorderSets = useReorderSets()
  const [setsOverride, setSetsOverride] = useState<SetWithExercise[] | null>(null)

  // Clear optimistic override when server data arrives
  useEffect(() => { setSetsOverride(null) }, [sets])

  const displaySets = setsOverride ?? sets
  const lastDisplaySet = displaySets[displaySets.length - 1]

  // Pre-fill: last set in this session first, then lastWeight from DB
  const tentativeWeight = lastDisplaySet?.weight ?? lastSet?.weight ?? exercise.default_starting_weight ?? null
  const tentativeReps = displaySets.length > 0 ? (lastDisplaySet?.reps_left ?? null) : null
  const tentativeTags = lastDisplaySet?.tags ?? []

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleSetDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = displaySets.findIndex((s) => s.id === active.id)
    const newIndex = displaySets.findIndex((s) => s.id === over.id)
    const newSets = arrayMove(displaySets, oldIndex, newIndex)
    setSetsOverride(newSets)

    const originalIndices = [...sets]
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => s.order_index)
    const updates = newSets.map((set, i) => ({ id: set.id, order_index: originalIndices[i] }))
    reorderSets.mutate({ sessionId, updates })
  }

  return (
    <div
      className={`rounded-2xl border bg-gray-900 transition-colors ${
        isActive ? 'border-blue-600/50' : 'border-gray-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onActivate}
          disabled={sessionCompleted}
          className="flex-1 flex items-center justify-between pl-4 pr-2 py-4 text-left disabled:cursor-default"
        >
          <div>
            <h3 className="font-semibold text-base">{exercise.name}</h3>
            {exercise.muscle_group && (
              <p className="text-xs text-gray-600 mt-0.5">{exercise.muscle_group.replace('_', ' ')}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {exercise.is_unilateral && (
              <span className="text-xs text-gray-600">unilateral</span>
            )}
            <span className="text-xs text-gray-500">
              {sets.length} set{sets.length !== 1 ? 's' : ''}
            </span>
            {!sessionCompleted && (
              <span
                className={`text-gray-600 transition-transform duration-200 text-xs ${
                  isActive ? 'rotate-180' : ''
                }`}
              >
                ▾
              </span>
            )}
          </div>
        </button>

        {/* Exercise drag handle */}
        {dragHandleProps && !sessionCompleted && (
          <button
            {...dragHandleProps}
            className="pl-1 pr-4 py-4 text-lg text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none select-none"
            aria-label="Drag to reorder exercise"
            tabIndex={-1}
          >
            ⠿
          </button>
        )}
      </div>

      {/* Sets + entry card */}
      {(displaySets.length > 0 || isActive) && (
        <div className="px-4 pb-4 space-y-1">
          {sessionCompleted ? (
            displaySets.map((set, i) => (
              <ConfirmedSetRow
                key={set.id}
                set={set}
                setNumber={i + 1}
                sessionId={sessionId}
                sessionCompleted
              />
            ))
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSetDragEnd}
            >
              <SortableContext
                items={displaySets.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {displaySets.map((set, i) => (
                  <SortableSetRow
                    key={set.id}
                    set={set}
                    setNumber={i + 1}
                    sessionId={sessionId}
                    sessionCompleted={false}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

          {isActive && (
            <TentativeSetRow
              key={`${sessionId}-${exercise.id}-tentative`}
              sessionId={sessionId}
              exercise={exercise}
              gymTag={gymTag}
              defaultWeight={tentativeWeight}
              defaultReps={tentativeReps}
              defaultTags={tentativeTags}
            />
          )}
        </div>
      )}
    </div>
  )
}
