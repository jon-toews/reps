import { ExerciseList } from '../components/exercises/ExerciseList'

export function ExercisesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Exercises</h1>
      <ExerciseList />
    </div>
  )
}
