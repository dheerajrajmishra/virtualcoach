import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TrainingDraft } from '../store/useTrainingStore'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  config.headers['X-User-Id'] = 'admin-user'
  return config
})

export function useCreateTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (draft: TrainingDraft) => {
      const form = new FormData()
      form.append('name', draft.name)
      form.append('category', draft.category)
      form.append('product', draft.product)
      form.append('deck', draft.deck!)
      form.append('transcripts', draft.transcriptsExcel!)
      form.append('faqs', draft.faqsExcel!)
      form.append('quizzes', draft.quizzesExcel!)
      const { data } = await api.post('/trainings', form)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings'] }),
  })
}

export function useTrainingStatus(trainingId: string | null) {
  return useQuery({
    queryKey: ['training-status', trainingId],
    queryFn: async () => {
      const { data } = await api.get(`/trainings/${trainingId}/status`)
      return data
    },
    enabled: !!trainingId,
    refetchInterval: (data) =>
      data?.status === 'PROCESSING' || data?.status === 'DRAFT' ? 5000 : false,
  })
}

export function useAssignments(filters?: { product?: string; userId?: string }) {
  return useQuery({
    queryKey: ['assignments', filters],
    queryFn: async () => {
      const { data } = await api.get('/assignments', { params: filters })
      return data
    },
  })
}

export function useCreateAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      userId: string
      trainingId: string
      product: string
      deadline: string
    }) => {
      const { data } = await api.post('/assignments', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  })
}
