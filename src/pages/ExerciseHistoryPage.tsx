import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExercises } from '../hooks/useExercises'
import { useExerciseHistory } from '../hooks/useExerciseHistory'
import type { HistorySet } from '../hooks/useExerciseHistory'

// ── Sparkline ─────────────────────────────────────────────────────────────────

interface SparklineProps {
  values: number[]
  color: string
  width?: number
  height?: number
}

function Sparkline({ values, color, width = 240, height = 48 }: SparklineProps) {
  if (values.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <span className="text-xs text-gray-700">Not enough data</span>
      </div>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pad = 4

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (v - min) / range) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const last = points[points.length - 1]
  const [lx, ly] = last.split(',').map(Number)

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx={lx} cy={ly} r="3" fill={color} />
    </svg>
  )
}

// ── Exercise History Page ─────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function canonicalReps(set: HistorySet): number | null {
  if (set.reps_left == null) return null
  if (set.reps_right != null) return Math.min(set.reps_left, set.reps_right)
  return set.reps_left
}

export function ExerciseHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: exercises = [] } = useExercises()
  const { data: sets = [], isLoading } = useExerciseHistory(id)

  const exercise = exercises.find((e) => e.id === id)

  // Filter state
  const [gymFilter, setGymFilter] = useState<string>('all')

  // Collect distinct gym tags
  const gymTags = useMemo(() => {
    const tags = new Set<string>()
    for (const s of sets) {
      if (s.session.gym_tag) tags.add(s.session.gym_tag)
    }
    return Array.from(tags).sort()
  }, [sets])

  const filtered = useMemo(() => {
    return sets.filter((s) => {
      if (gymFilter !== 'all' && s.session.gym_tag !== gymFilter) return false
      return true
    })
  }, [sets, gymFilter])

  // Trend data: one point per set, chronological
  const weightValues = filtered.map((s) => s.weight).filter((w): w is number => w != null)
  const repsValues = filtered.map((s) => canonicalReps(s)).filter((r): r is number => r != null)

  const pillCls = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-medium transition-colors ${
      active ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
    }`

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/exercises')}
          className="text-gray-500 hover:text-white text-sm transition-colors"
        >
          ← Exercises
        </button>
        {exercise && (
          <div>
            <h1 className="text-xl font-bold">{exercise.name}</h1>
            {exercise.muscle_group && (
              <p className="text-xs text-gray-600">{exercise.muscle_group.replace(/_/g, ' ')}</p>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      {gymTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button className={pillCls(gymFilter === 'all')} onClick={() => setGymFilter('all')}>
            All gyms
          </button>
          {gymTags.map((tag) => (
            <button key={tag} className={pillCls(gymFilter === tag)} onClick={() => setGymFilter(tag)}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Trend charts */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-3 space-y-1">
            <p className="text-xs text-gray-500">Weight (lb)</p>
            {weightValues.length > 0 ? (
              <>
                <Sparkline values={weightValues} color="#3b82f6" />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{Math.min(...weightValues)}</span>
                  <span className="font-medium text-white">{weightValues[weightValues.length - 1]}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-700 py-3">No data</p>
            )}
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-3 space-y-1">
            <p className="text-xs text-gray-500">Reps</p>
            {repsValues.length > 0 ? (
              <>
                <Sparkline values={repsValues} color="#22c55e" />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{Math.min(...repsValues)}</span>
                  <span className="font-medium text-white">{repsValues[repsValues.length - 1]}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-700 py-3">No data</p>
            )}
          </div>
        </div>
      )}

      {/* Set list */}
      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">No sets recorded yet.</p>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center px-3 py-1 text-xs text-gray-600">
            <span className="w-20">Date</span>
            <span className="w-16 text-right">Weight</span>
            <span className="w-16 text-right">Reps</span>
            <span className="w-12 text-right">RIR</span>
            <span className="flex-1 text-right">Gym</span>
          </div>
          {[...filtered].reverse().map((set) => {
            const repsDisplay = set.reps_right != null && exercise?.is_unilateral
              ? `${set.reps_left ?? '—'}/${set.reps_right}`
              : String(set.reps_left ?? '—')
            return (
              <div
                key={set.id}
                className="rounded-lg bg-gray-900 border border-gray-800 text-sm"
              >
                <div className="flex items-center px-3 py-2.5">
                  <span className="w-20 text-gray-400 text-xs">{formatDate(set.session.started_at)}</span>
                  <span className="w-16 text-right tabular-nums">
                    {set.weight != null ? `${set.weight} lb` : '—'}
                  </span>
                  <span className="w-16 text-right tabular-nums">
                    {repsDisplay}
                    {set.is_sub && <span className="ml-1 text-xs text-yellow-600">sub</span>}
                  </span>
                  <span className="w-12 text-right text-gray-500 tabular-nums text-xs">
                    {set.rir != null ? set.rir : '—'}
                  </span>
                  <span className="flex-1 text-right text-gray-600 text-xs">
                    {set.session.gym_tag ?? ''}
                  </span>
                </div>
                {set.tags.length > 0 && (
                  <div className="flex gap-1 px-3 pb-2 flex-wrap">
                    {set.tags.map((tag) => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
