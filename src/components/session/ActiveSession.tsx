import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  useSessionSets,
  useCompleteSession,
  useDeleteSession,
  useReorderSets,
  useUpdateSession,
  useRecentSessions,
} from '../../hooks/useSession'
import { useExercises } from '../../hooks/useExercises'
import { ExerciseBlock } from './ExerciseBlock'
import type { ExerciseBlockProps } from './ExerciseBlock'
import { ExercisePicker } from './ExercisePicker'
import type { Session, Exercise, SetWithExercise } from '../../types'

// ── Sortable Exercise Block wrapper ───────────────────────────────────────────

function SortableExerciseBlock(props: Omit<ExerciseBlockProps, 'dragHandleProps'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.exercise.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 0,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <ExerciseBlock
        {...props}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>}
      />
    </div>
  )
}

// ── Active Session ────────────────────────────────────────────────────────────

interface ActiveSessionProps {
  session: Session
  onSetSessionActions?: (actions: { onFinish?: () => void; isCompleted?: boolean }) => void
}

export function ActiveSession({ session, onSetSessionActions }: ActiveSessionProps) {
  const { data: sets = [] } = useSessionSets(session.id)
  const completeSession = useCompleteSession()
  const deleteSession = useDeleteSession()
  const reorderSets = useReorderSets()
  const updateSession = useUpdateSession()
  const { data: recentSessions = [] } = useRecentSessions()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: allExercises = [] } = useExercises()
  const [showPicker, setShowPicker] = useState(false)
  const [discardConfirm, setDiscardConfirm] = useState(false)
  const discardTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editingGym, setEditingGym] = useState(false)
  const [gymInput, setGymInput] = useState(session.gym_tag ?? '')
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const storageKey = `pending_exercises_${session.id}`
  const [pendingExercises, setPendingExercises] = useState<Exercise[]>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey)
      return saved ? (JSON.parse(saved) as Exercise[]) : []
    } catch {
      return []
    }
  })
  const templateInitialized = useRef(pendingExercises.length > 0)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [exerciseOrderOverride, setExerciseOrderOverride] = useState<string[] | null>(null)

  useEffect(() => () => { if (discardTimer.current) clearTimeout(discardTimer.current) }, [])

  // Detect keyboard height
  useEffect(() => {
    if (typeof window !== 'undefined' && 'visualViewport' in window) {
      const handleViewportResize = () => {
        const vv = window.visualViewport
        if (vv) {
          const keyboardHeight = window.innerHeight - vv.height
          setKeyboardHeight(Math.max(0, keyboardHeight))
        }
      }
      window.visualViewport?.addEventListener('resize', handleViewportResize)
      return () => window.visualViewport?.removeEventListener('resize', handleViewportResize)
    }
  }, [])

  useEffect(() => {
    try {
      if (pendingExercises.length > 0) {
        sessionStorage.setItem(storageKey, JSON.stringify(pendingExercises))
      } else {
        sessionStorage.removeItem(storageKey)
      }
    } catch { /* ignore */ }
  }, [pendingExercises, storageKey])

  // Clear exercise order override when server data updates
  useEffect(() => { setExerciseOrderOverride(null) }, [sets])

  const handleDiscard = () => {
    if (discardConfirm) {
      if (discardTimer.current) clearTimeout(discardTimer.current)
      deleteSession.mutate(session.id, { onSuccess: () => { sessionStorage.removeItem(storageKey); navigate('/') } })
    } else {
      setDiscardConfirm(true)
      discardTimer.current = setTimeout(() => setDiscardConfirm(false), 3000)
    }
  }

  const isCompleted = !!session.ended_at

  const recentGymTags = [...new Set(
    recentSessions.map((s) => s.gym_tag).filter(Boolean)
  )] as string[]

  const saveGymTag = () => {
    const val = gymInput.trim() || null
    if (val !== session.gym_tag) {
      updateSession.mutate({ sessionId: session.id, gymTag: val })
    }
    setEditingGym(false)
  }

  // Derive exercise objects from server set data
  const exercisesInOrder: Exercise[] = []
  const exerciseMap: Record<string, Exercise> = {}
  const seen = new Set<string>()
  for (const set of sets) {
    if (!seen.has(set.exercise_id)) {
      seen.add(set.exercise_id)
      exercisesInOrder.push(set.exercise)
      exerciseMap[set.exercise_id] = set.exercise
    }
  }

  const derivedExerciseOrder = exercisesInOrder.map((e) => e.id)

  const setsByExercise: Record<string, SetWithExercise[]> = {}
  for (const set of sets) {
    if (!setsByExercise[set.exercise_id]) setsByExercise[set.exercise_id] = []
    setsByExercise[set.exercise_id].push(set)
  }

  const effectiveExerciseOrder = exerciseOrderOverride ?? derivedExerciseOrder

  const handleSelectExercise = (exercise: Exercise) => {
    setShowPicker(false)
    setPendingExercises((prev) => {
      if (prev.find((e) => e.id === exercise.id)) return prev
      return [...prev, exercise]
    })
    setActiveExerciseId(exercise.id)
  }

  useEffect(() => {
    if (templateInitialized.current || allExercises.length === 0) return
    const ids = searchParams.get('exercises')?.split(',').filter(Boolean) ?? []
    if (ids.length === 0) return
    templateInitialized.current = true
    const resolved = ids.flatMap((id) => {
      const ex = allExercises.find((e) => e.id === id)
      return ex ? [ex] : []
    })
    setPendingExercises(resolved)
    if (resolved.length > 0) setActiveExerciseId(resolved[0].id)
  }, [allExercises, searchParams])

  const filteredPending = pendingExercises.filter((e) => !effectiveExerciseOrder.includes(e.id))
  const allExerciseIds = [...effectiveExerciseOrder, ...filteredPending.map((e) => e.id)]
  const activeId = activeExerciseId ?? allExerciseIds[allExerciseIds.length - 1] ?? null

  const handleFinish = async () => {
    await completeSession.mutateAsync(session.id)
    sessionStorage.removeItem(storageKey)
    navigate('/history')
  }

  // Update parent with finish handler
  useEffect(() => {
    if (onSetSessionActions) {
      onSetSessionActions({
        onFinish: isCompleted ? undefined : handleFinish,
        isCompleted,
      })
    }
  }, [isCompleted, onSetSessionActions])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleExerciseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = effectiveExerciseOrder.indexOf(String(active.id))
    const newIndex = effectiveExerciseOrder.indexOf(String(over.id))
    const newOrder = arrayMove(effectiveExerciseOrder, oldIndex, newIndex)
    setExerciseOrderOverride(newOrder)

    const updates: { id: string; order_index: number }[] = []
    let idx = 0
    for (const exerciseId of newOrder) {
      const exerciseSets = [...(setsByExercise[exerciseId] ?? [])].sort(
        (a, b) => a.order_index - b.order_index
      )
      for (const set of exerciseSets) {
        updates.push({ id: set.id, order_index: idx++ })
      }
    }
    if (updates.length > 0) {
      reorderSets.mutate({ sessionId: session.id, updates })
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">{session.name ?? 'Session'}</h1>

          {!isCompleted && (
            <div className="mt-0.5">
              {editingGym ? (
                <div className="space-y-1.5">
                  <input
                    autoFocus
                    type="text"
                    value={gymInput}
                    onChange={(e) => setGymInput(e.target.value)}
                    onBlur={saveGymTag}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveGymTag() }}
                    placeholder="Gym tag"
                    className="bg-gray-800 rounded-lg px-2 py-0.5 text-base focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-gray-300 w-40 touch-manipulation"
                    aria-label="Gym tag"
                  />
                  {recentGymTags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {recentGymTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setGymInput(tag); }}
                          className="text-xs px-2 py-0.5 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 touch-manipulation"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setGymInput(session.gym_tag ?? ''); setEditingGym(true) }}
                  className="text-sm text-gray-500 hover:text-gray-300 touch-manipulation"
                >
                  {session.gym_tag ?? '+ Add gym'}
                </button>
              )}
            </div>
          )}

          <p className="text-sm text-gray-500 mt-0.5">
            {isCompleted
              ? `Completed ${new Date(session.ended_at!).toLocaleDateString()}`
              : `Started ${new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>

        {!isCompleted && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDiscard}
              disabled={deleteSession.isPending}
              className={`text-xs px-3 py-3 rounded-lg border transition-colors disabled:opacity-50 ${
                discardConfirm
                  ? 'border-red-700 text-red-400 hover:bg-red-900/30'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              {deleteSession.isPending ? '…' : discardConfirm ? 'Confirm?' : 'Discard'}
            </button>
          </div>
        )}
      </div>

      {effectiveExerciseOrder.length === 0 && filteredPending.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No exercises yet</p>
          <p className="text-sm mt-1">Tap the button below to add your first exercise</p>
        </div>
      )}

      {/* Sortable exercises (those with sets) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleExerciseDragEnd}
      >
        <SortableContext items={effectiveExerciseOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {effectiveExerciseOrder.map((exerciseId) => {
              const exercise = exerciseMap[exerciseId]
              if (!exercise) return null
              return isCompleted ? (
                <ExerciseBlock
                  key={exerciseId}
                  exercise={exercise}
                  sets={setsByExercise[exerciseId] ?? []}
                  sessionId={session.id}
                  gymTag={session.gym_tag}
                  sessionCompleted
                  isActive={false}
                  onActivate={() => {}}
                />
              ) : (
                <SortableExerciseBlock
                  key={exerciseId}
                  exercise={exercise}
                  sets={setsByExercise[exerciseId] ?? []}
                  sessionId={session.id}
                  gymTag={session.gym_tag}
                  sessionCompleted={false}
                  isActive={activeId === exerciseId}
                  onActivate={() => setActiveExerciseId(exerciseId)}
                />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Pending exercises (no sets yet) — not sortable */}
      {filteredPending.map((exercise) => (
        <ExerciseBlock
          key={exercise.id}
          exercise={exercise}
          sets={[]}
          sessionId={session.id}
          gymTag={session.gym_tag}
          sessionCompleted={isCompleted}
          isActive={!isCompleted && activeId === exercise.id}
          onActivate={() => setActiveExerciseId(exercise.id)}
        />
      ))}

      {!isCompleted && (
        <div
          className="fixed left-1/2 -translate-x-1/2 transition-all"
          style={{
            bottom: `calc(max(1.5rem, env(safe-area-inset-bottom)) + ${keyboardHeight}px)`,
            opacity: keyboardHeight > 100 ? 0 : 1,
            pointerEvents: keyboardHeight > 100 ? 'none' : 'auto',
          }}
        >
          <button
            onClick={() => setShowPicker(true)}
            className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/40 rounded-full px-6 py-3 text-sm font-semibold transition-colors touch-manipulation"
          >
            + Add Exercise
          </button>
        </div>
      )}

      {showPicker && (
        <ExercisePicker
          onSelect={handleSelectExercise}
          onClose={() => setShowPicker(false)}
          alreadyAdded={allExerciseIds}
        />
      )}
    </div>
  )
}
