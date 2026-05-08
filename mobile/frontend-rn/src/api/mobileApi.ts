import axios from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Platform } from 'react-native'

// For physical device testing, use the computer's LAN IP
const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:8081/api'
  : 'http://192.168.1.3:8081/api'

const api = axios.create({ baseURL: BASE_URL })

let currentUserId = 'learner-uid'

export function setUserId(uid: string) {
  currentUserId = uid
  api.defaults.headers.common['X-User-Id'] = uid
}

interface ProgressData {
  completionPercent: number
  currentSlideIndex: number
  status: string
  quizScores: Record<string, number>
}

export function useProgress(trainingId: string) {
  return useQuery<ProgressData>({
    queryKey: ['progress', trainingId],
    queryFn: async () => {
      const { data } = await api.get<ProgressData>(`/learner/progress/${trainingId}`)
      return data
    },
  })
}

export function useUpdateSlide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      trainingId,
      slideIndex,
      totalSlides,
    }: {
      trainingId: string
      slideIndex: number
      totalSlides: number
    }) => {
      const { data } = await api.patch(`/learner/progress/${trainingId}/slide`, {
        slideIndex,
        totalSlides,
      })
      return data
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['progress', vars.trainingId] }),
  })
}

export function useAskCoach() {
  return useMutation({
    mutationFn: async ({
      trainingId,
      slideIndex,
      question,
      locale,
    }: {
      trainingId: string
      slideIndex: number
      question: string
      locale: string
    }) => {
      const { data } = await api.post('/learner/ask', {
        trainingId,
        slideIndex,
        question,
        locale,
      })
      return data as { answer: string }
    },
  })
}

export function useSubmitTextQuiz() {
  return useMutation({
    mutationFn: async ({
      trainingId,
      quizId,
      locale,
      response,
    }: {
      trainingId: string
      quizId: string
      locale: string
      response: string
    }) => {
      const params = new URLSearchParams({ trainingId, quizId, locale, response })
      const { data } = await api.post(`/evaluation/submit/text?${params}`)
      return data
    },
  })
}

export function useSubmitMediaQuiz() {
  return useMutation({
    mutationFn: async ({
      trainingId,
      quizId,
      inputType,
      locale,
      mediaGcsUrl,
    }: {
      trainingId: string
      quizId: string
      inputType: string
      locale: string
      mediaGcsUrl: string
    }) => {
      const params = new URLSearchParams({ trainingId, quizId, inputType, locale, mediaGcsUrl })
      const { data } = await api.post(`/evaluation/submit/media?${params}`)
      return data
    },
  })
}
