"use client";
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TrainingDraft } from '../store/useTrainingStore'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  config.headers['X-User-Id'] = 'admin-user'
  return config
})

export interface Slide {
  id: string
  trainingId: string
  slideIndex: number
  title: string
  imageGcsUrl: string | null
  transcripts: Record<string, string>
  audioUrls: Record<string, string>
}

export interface Training {
  id: string
  name: string
  category: string
  product: string
  status: string
  totalSlides: number
  supportedLocales: string[]
  processingStep: string | null
  processingError: string | null
  deckGcsUrl: string | null
  dataExcelUrl: string | null
  publishedAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Assignment {
  id: string
  userId: string
  trainingId: string
  product: string
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  deadline: string
  assignedAt: string
  assignedBy: string
}

export interface UnansweredQuestion {
  id: string
  trainingId: string
  userId: string
  slideIndex: number
  locale: string
  question: string
  aiResponse: string
  askedAt: string
  reviewed: boolean
}

export interface EvaluationResult {
  submissionId: string
  quizId: string
  userId: string
  trainingId: string
  score: number
  maxScore: number
  scorePercent: number
  feedback: string
  strengths: string
  improvements: string
  evaluatedAt: string
}

export interface EvalSummary {
  trainingId: string
  avgScore: number
  submissions: number
}

export interface LearnerProgress {
  id: string
  userId: string
  trainingId: string
  assignmentId: string
  currentSlideIndex: number
  totalSlides: number
  completionPercent: number
  status: string
  lastAccessedAt: string
}

export function useLearnerProgress(trainingId?: string) {
  return useQuery<LearnerProgress[]>({
    queryKey: ['learner-progress', trainingId],
    queryFn: async () => {
      const { data } = await mobileApi.get('/admin/progress', {
        params: trainingId ? { trainingId } : undefined,
      })
      return data
    },
  })
}

export function useTrainings() {
  return useQuery<Training[]>({
    queryKey: ['trainings'],
    queryFn: async () => {
      const { data } = await api.get('/trainings')
      return data
    },
    refetchInterval: (query) => {
      const list = query.state.data
      if (!list) return false
      const hasActive = list.some((t) => t.status === 'PROCESSING' || t.status === 'DRAFT')
      return hasActive ? 4000 : false
    },
  })
}

export function useTraining(id: string | null) {
  return useQuery<Training>({
    queryKey: ['training', id],
    queryFn: async () => {
      const { data } = await api.get(`/trainings/${id}`)
      return data
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const t = query.state.data
      if (!t) return false
      return t.status === 'PROCESSING' || t.status === 'DRAFT' ? 4000 : false
    },
  })
}

export function useCreateTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (draft: TrainingDraft) => {
      const form = new FormData()
      form.append('name', draft.name)
      form.append('category', draft.category)
      form.append('product', draft.product)
      form.append('locales', draft.locales.join(','))
      form.append('deck', draft.deck!)
      form.append('data', draft.dataExcel!)
      const { data } = await api.post('/trainings', form)
      return data as Training
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings'] }),
  })
}

export function useRerunTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ trainingId, dataExcel }: { trainingId: string; dataExcel: File }) => {
      const form = new FormData()
      form.append('data', dataExcel)
      const { data } = await api.post(`/trainings/${trainingId}/rerun`, form)
      return data as Training
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings'] }),
  })
}

export function useTrainingSlides(trainingId: string | null) {
  return useQuery<Slide[]>({
    queryKey: ['training-slides', trainingId],
    queryFn: async () => {
      const { data } = await api.get(`/trainings/${trainingId}/slides`)
      return data
    },
    enabled: !!trainingId,
  })
}

// Legacy status hook retained for UploadPage inline status polling
export function useTrainingStatus(trainingId: string | null) {
  return useQuery({
    queryKey: ['training-status', trainingId],
    queryFn: async () => {
      const { data } = await api.get(`/trainings/${trainingId}/status`)
      return data as { trainingId: string; status: string; processingStep: string; processingError?: string }
    },
    enabled: !!trainingId,
    refetchInterval: (query) => {
      const d = query.state.data
      return d?.status === 'PROCESSING' || d?.status === 'DRAFT' ? 4000 : false
    },
  })
}

export function useUpdateSlideTranscript() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      trainingId, slideId, locale, transcript,
    }: { trainingId: string; slideId: string; locale: string; transcript: string }) => {
      const { data } = await api.patch(`/trainings/${trainingId}/slides/${slideId}/transcript`, {
        locale,
        transcript,
      })
      return data as Slide
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['training-slides', vars.trainingId] }),
  })
}

export function useRegenerateSlideAudio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ trainingId, slideId, locale }: {
      trainingId: string; slideId: string; locale: string
    }) => {
      const { data } = await api.post(
        `/trainings/${trainingId}/slides/${slideId}/audio?locale=${locale}`
      )
      return data as Slide
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['training-slides', vars.trainingId] }),
  })
}

export function usePublishTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (trainingId: string) => {
      const { data } = await api.post(`/trainings/${trainingId}/publish`)
      return data as Training
    },
    onSuccess: (_, trainingId) => {
      qc.invalidateQueries({ queryKey: ['training', trainingId] })
      qc.invalidateQueries({ queryKey: ['trainings'] })
    },
  })
}

export function useAssignments(filters?: { product?: string; userId?: string }) {
  return useQuery<Assignment[]>({
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

// ── Mobile backend (unanswered FAQ questions) ─────────────────────────────────

const MOBILE_BASE = process.env.NEXT_PUBLIC_MOBILE_API_URL ?? 'http://localhost:8081/api'
const mobileApi = axios.create({ baseURL: MOBILE_BASE })
mobileApi.interceptors.request.use((c) => { c.headers['X-User-Id'] = 'admin-user'; return c })

export function useUnansweredQuestions(trainingId?: string) {
  return useQuery<UnansweredQuestion[]>({
    queryKey: ['unanswered-questions', trainingId],
    queryFn: async () => {
      const { data } = await mobileApi.get('/admin/unanswered-questions', {
        params: trainingId ? { trainingId } : undefined,
      })
      return data
    },
  })
}

export function useMarkReviewed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await mobileApi.patch(`/admin/unanswered-questions/${id}/reviewed`)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['unanswered-questions'] }),
  })
}

export function useEvaluationResults(trainingId?: string) {
  return useQuery<EvaluationResult[]>({
    queryKey: ['evaluations', trainingId],
    queryFn: async () => {
      const { data } = await mobileApi.get('/admin/evaluations', {
        params: trainingId ? { trainingId } : undefined,
      })
      return data
    },
  })
}

export function useEvalSummary() {
  return useQuery<EvalSummary[]>({
    queryKey: ['eval-summary'],
    queryFn: async () => {
      const { data } = await mobileApi.get('/admin/evaluations/summary')
      return data
    },
  })
}

