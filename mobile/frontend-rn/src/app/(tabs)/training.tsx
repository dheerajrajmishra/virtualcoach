import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TrainingPlayer from '../../components/TrainingPlayer'

const queryClient = new QueryClient()

export default function TrainingScreen() {
  return (
    <QueryClientProvider client={queryClient}>
      <TrainingPlayer />
    </QueryClientProvider>
  )
}
