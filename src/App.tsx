import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { SessionPage } from './pages/SessionPage'
import { HistoryPage } from './pages/HistoryPage'
import { ExercisesPage } from './pages/ExercisesPage'
import { ExerciseHistoryPage } from './pages/ExerciseHistoryPage'
import { SetupPage } from './pages/SetupPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/session/:id" element={<SessionPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/exercises" element={<ExercisesPage />} />
        <Route path="/exercises/:id" element={<ExerciseHistoryPage />} />
        <Route path="/setup" element={<SetupPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
