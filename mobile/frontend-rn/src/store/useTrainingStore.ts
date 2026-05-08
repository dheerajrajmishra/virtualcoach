import { create } from 'zustand'

export interface SlideData {
  id: string
  slideIndex: number
  title: string
  imageGcsUrl: string
  audioUrls: Record<string, string>
  transcripts: Record<string, string>
}

export interface QuizData {
  id: string
  slideIndex: number
  questions: Record<string, string>
  inputType: 'text' | 'audio' | 'video'
  maxScore: number
}

interface TrainingStore {
  trainingId: string | null
  slides: SlideData[]
  quizzes: QuizData[]
  currentSlideIndex: number
  preferredLocale: string
  isCoachOpen: boolean

  setTraining: (id: string, slides: SlideData[], quizzes: QuizData[]) => void
  setSlide: (index: number) => void
  setLocale: (locale: string) => void
  toggleCoach: () => void
  reset: () => void
}

export const useTrainingStore = create<TrainingStore>((set) => ({
  trainingId: null,
  slides: [],
  quizzes: [],
  currentSlideIndex: 0,
  preferredLocale: 'en',
  isCoachOpen: false,

  setTraining: (id, slides, quizzes) =>
    set({ trainingId: id, slides, quizzes, currentSlideIndex: 0 }),

  setSlide: (index) => set({ currentSlideIndex: index }),

  setLocale: (locale) => set({ preferredLocale: locale }),

  toggleCoach: () => set((s) => ({ isCoachOpen: !s.isCoachOpen })),

  reset: () =>
    set({
      trainingId: null,
      slides: [],
      quizzes: [],
      currentSlideIndex: 0,
      isCoachOpen: false,
    }),
}))
