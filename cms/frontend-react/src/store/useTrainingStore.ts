import { create } from 'zustand'

export interface TrainingDraft {
  name: string
  category: string
  product: string
  deck: File | null
  transcriptsExcel: File | null
  faqsExcel: File | null
  quizzesExcel: File | null
}

interface TrainingStore {
  draft: TrainingDraft
  setDraftField: <K extends keyof TrainingDraft>(key: K, value: TrainingDraft[K]) => void
  resetDraft: () => void
}

const initialDraft: TrainingDraft = {
  name: '',
  category: '',
  product: '',
  deck: null,
  transcriptsExcel: null,
  faqsExcel: null,
  quizzesExcel: null,
}

export const useTrainingStore = create<TrainingStore>((set) => ({
  draft: initialDraft,
  setDraftField: (key, value) =>
    set((state) => ({ draft: { ...state.draft, [key]: value } })),
  resetDraft: () => set({ draft: initialDraft }),
}))
