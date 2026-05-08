import axios from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const api = axios.create({
  baseURL: 'http://10.0.2.2:8081/api', // Android emulator -> localhost
})

let currentUserId = 'learner-uid'

export function setUserId(uid: string) {
  currentUserId = uid
  api.defaults.headers.common['X-User-Id'] = uid
}

export function useProgress(trainingId: string) {
  return useQuery({
    queryKey: ['progress', trainingId],
    queryFn: async () => {
      const { data } = await api.get(`/learner/progress/${trainingId}`)
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
