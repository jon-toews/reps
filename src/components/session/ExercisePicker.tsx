import { useState } from 'react'
import { useDrag } from '@use-gesture/react'
import { useExercises, useCreateExercise } from '../../hooks/useExercises'
import type { Exercise } from '../../types'

const DISMISS_THRESHOLD = 80 // px downward drag to dismiss

interface ExercisePickerProps {
  onSelect: (exercise: Exercise) => void
  onClose: () => void
  alreadyAdded: string[]
}

export function ExercisePicker({ onSelect, onClose, alreadyAdded }: ExercisePickerProps) {
  const { data: exercises = [] } = useExercises()
  const createExercise = useCreateExercise()
  const [search, setSearch] = useState('')
  const [sheetY, setSheetY] = useState(0)
  const [settling, setSettling] = useState(false)

  const searchLower = search.toLowerCase()
  const trimmedSearch = search.trim()
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(searchLower))
  const canCreate = trimmedSearch.length > 0
  const noResults = filtered.length === 0

  const handleCreate = async () => {
    if (!canCreate || createExercise.isPending) return
    const created = await createExercise.mutateAsync({ name: trimmedSearch })
    onSelect(created)
  }

  const bind = useDrag(
    ({ movement: [, my], last }) => {
      const clamped = Math.max(0, my) // only downward

      if (last) {
        if (my > DISMISS_THRESHOLD) {
          setSettling(true)
          setSheetY(window.innerHeight)
          setTimeout(onClose, 200)
        } else {
          setSettling(true)
          setSheetY(0)
          setTimeout(() => setSettling(false), 250)
        }
      } else {
        setSettling(false)
        setSheetY(clamped)
      }
    },
    { axis: 'y', filterTaps: true, pointer: { touch: true } }
  )

  const dismissProgress = Math.min(1, sheetY / DISMISS_THRESHOLD)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60"
        style={{ opacity: 1 - dismissProgress * 0.5 }}
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-800 shadow-2xl max-h-[75vh] flex flex-col"
        style={{
          transform: `translateY(${sheetY}px)`,
          transition: settling ? 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
        }}
      >
        {/* Drag handle — gesture attached here only, not the scrollable list */}
        <div
          {...bind()}
          className="flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none select-none"
          aria-label="Drag to dismiss"
        >
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>

        <div className="flex items-center justify-between px-4 pt-1 pb-3 border-b border-gray-800">
          <h2 className="font-semibold">Add Exercise</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center touch-manipulation"
          >
            ✕
          </button>
        </div>

        <div className="px-3 py-2.5 border-b border-gray-800">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && noResults && void handleCreate()}
            placeholder="Search or type a new name…"
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 touch-manipulation"
          />
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {noResults && canCreate && (
            <div className="flex flex-col items-center py-8 gap-3">
              <p className="text-sm text-gray-500">No exercise found</p>
              <button
                onClick={() => void handleCreate()}
                disabled={createExercise.isPending}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-6 py-3 text-sm font-semibold transition-colors touch-manipulation"
              >
                {createExercise.isPending ? 'Creating…' : `Create "${trimmedSearch}"`}
              </button>
            </div>
          )}

          {noResults && !canCreate && (
            <p className="text-sm text-gray-500 text-center py-8">
              Type a name to search or create an exercise
            </p>
          )}

          {filtered.map((exercise) => {
            const added = alreadyAdded.includes(exercise.id)
            return (
              <button
                key={exercise.id}
                onClick={() => !added && onSelect(exercise)}
                disabled={added}
                className={`w-full text-left px-3 py-3.5 rounded-xl text-base transition-colors flex items-center justify-between touch-manipulation ${
                  added ? 'text-gray-600 cursor-default' : 'hover:bg-gray-800 active:bg-gray-800 text-gray-200'
                }`}
              >
                {exercise.name}
                {added && <span className="text-xs text-gray-600">Added</span>}
              </button>
            )
          })}
        </div>

        {canCreate && !noResults && (
          <div className="p-3 border-t border-gray-800">
            <button
              onClick={() => void handleCreate()}
              disabled={createExercise.isPending}
              className="w-full text-sm text-blue-400 hover:text-blue-300 py-2 transition-colors touch-manipulation disabled:opacity-50"
            >
              {createExercise.isPending ? 'Creating…' : `+ Create "${trimmedSearch}"`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
