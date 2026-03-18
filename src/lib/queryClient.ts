import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query'

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      const msg = extractMessage(error)
      console.error('[mutation error]', error)
      // Surface Supabase errors (schema mismatch, RLS violations, network errors)
      if (msg && msg !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lifttrack:error', { detail: msg }))
      }
    },
  }),
  queryCache: new QueryCache({
    onError: (error) => {
      console.error('[query error]', error)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
})
