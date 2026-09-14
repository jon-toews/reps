import { useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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

function repsToken(set: HistorySet, isUnilateral: boolean): string {
  if (isUnilateral && set.reps_right != null) {
    return `${set.reps_left ?? '—'}·${set.reps_right}`
  }
  return String(set.reps_left ?? '—')
}

interface SessionGroup {
  sessionId: string
  startedAt: string
  gymTag: string | null
  summary: string
  hasSub: boolean
  tags: string[]
}

function summarizeSession(sets: HistorySet[], isUnilateral: boolean): string {
  // Chunk consecutive sets that share the same weight, then condense reps within each chunk.
  const chunks: { weight: number | null; tokens: string[] }[] = []
  for (const set of sets) {
    const token = repsToken(set, isUnilateral)
    const last = chunks[chunks.length - 1]
    if (last && last.weight === set.weight) {
      last.tokens.push(token)
    } else {
      chunks.push({ weight: set.weight, tokens: [token] })
    }
  }

  return chunks
    .map(({ weight, tokens }) => {
      const allSame = tokens.every((t) => t === tokens[0])
      const repsPart = allSame ? `${tokens.length}×${tokens[0]}` : tokens.join('/')
      const weightPart = weight != null ? ` @ ${weight} lb` : ''
      return `${repsPart}${weightPart}`
    })
    .join(', ')
}

export function ExerciseHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: exercises = [] } = useExercises()
  const { data: sets = [], isLoading } = useExerciseHistory(id)

  const exercise = exercises.find((e) => e.id === id)
  const backTo = (location.state as { from?: string } | null)?.from

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

  // Group sets into per-session recaps (filtered is chronological ascending, so
  // sets for the same session arrive contiguously and groups stay in session order).
  const sessionGroups = useMemo(() => {
    const groups: { sessionId: string; startedAt: string; gymTag: string | null; sets: HistorySet[] }[] = []
    for (const set of filtered) {
      const last = groups[groups.length - 1]
      if (last && last.sessionId === set.session.id) {
        last.sets.push(set)
      } else {
        groups.push({
          sessionId: set.session.id,
          startedAt: set.session.started_at,
          gymTag: set.session.gym_tag,
          sets: [set],
        })
      }
    }
    return groups.map(
      (g): SessionGroup => ({
        sessionId: g.sessionId,
        startedAt: g.startedAt,
        gymTag: g.gymTag,
        summary: summarizeSession(g.sets, !!exercise?.is_unilateral),
        hasSub: g.sets.some((s) => s.is_sub),
        tags: Array.from(new Set(g.sets.flatMap((s) => s.tags))),
      })
    )
  }, [filtered, exercise?.is_unilateral])

  const pillCls = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-medium transition-colors ${
      active ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
    }`

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(backTo ?? '/exercises')}
          className="text-gray-500 hover:text-white text-sm transition-colors"
        >
          ← {backTo ? 'Session' : 'Exercises'}
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

      {/* Session recap list */}
      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : sessionGroups.length === 0 ? (
        <p className="text-gray-500 text-sm">No sets recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {[...sessionGroups].reverse().map((group) => (
            <div key={group.sessionId} className="rounded-lg bg-gray-900 border border-gray-800 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{formatDate(group.startedAt)}</span>
                {group.gymTag && <span className="text-xs text-gray-600">{group.gymTag}</span>}
              </div>
              <p className="text-sm tabular-nums mt-0.5">{group.summary}</p>
              {(group.hasSub || group.tags.length > 0) && (
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {group.hasSub && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-900/40 text-yellow-600">sub</span>
                  )}
                  {group.tags.map((tag) => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
