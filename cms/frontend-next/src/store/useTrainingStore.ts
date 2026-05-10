"use client";
import { create } from 'zustand'

export const ALL_LOCALES = ['en', 'hi', 'ta', 'te', 'mr', 'bn'] as const
export type Locale = typeof ALL_LOCALES[number]

export interface TrainingDraft {
  name: string
  category: string
  product: string
  locales: string[]
  deck: File | null
  dataExcel: File | null
}

interface TrainingStore {
  draft: TrainingDraft
  setDraftField: <K extends keyof TrainingDraft>(key: K, value: TrainingDraft[K]) => void
  resetDraft: () => void
}

const initialDraft: TrainingDraft = {
  name: '',
  category: 'Product Training',
  product: 'Product A',
  locales: ['en'],
  deck: null,
  dataExcel: null,
}

export const useTrainingStore = create<TrainingStore>((set) => ({
  draft: initialDraft,
  setDraftField: (key, value) =>
    set((state) => ({ draft: { ...state.draft, [key]: value } })),
  resetDraft: () => set({ draft: initialDraft }),
}))

