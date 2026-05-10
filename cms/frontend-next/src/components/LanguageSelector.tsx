"use client";
import { useTrainingStore, ALL_LOCALES } from '../store/useTrainingStore'

const LANGUAGE_META: Record<string, { name: string; native: string; flag: string }> = {
  en: { name: 'English',  native: 'English',  flag: '🇬🇧' },
  hi: { name: 'Hindi',    native: 'हिन्दी',    flag: '🇮🇳' },
  ta: { name: 'Tamil',    native: 'தமிழ்',     flag: '🇮🇳' },
  te: { name: 'Telugu',   native: 'తెలుగు',    flag: '🇮🇳' },
  mr: { name: 'Marathi',  native: 'मराठी',     flag: '🇮🇳' },
  bn: { name: 'Bengali',  native: 'বাংলা',     flag: '🇧🇩' },
}

export default function LanguageSelector() {
  const { draft, setDraftField } = useTrainingStore()
  const selected = new Set(draft.locales)

  function toggle(code: string) {
    if (code === 'en') return
    const next = new Set(selected)
    if (next.has(code)) {
      next.delete(code)
    } else {
      next.add(code)
    }
    setDraftField('locales', ALL_LOCALES.filter((l) => next.has(l)))
  }

  const targetCount = draft.locales.filter((l) => l !== 'en').length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="label mb-0">Training Languages <span className="text-red-500">*</span></label>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
          {targetCount === 0
            ? 'English only'
            : `English + ${targetCount} translations`}
        </span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {ALL_LOCALES.map((code) => {
          const meta = LANGUAGE_META[code]
          const isSelected = selected.has(code)
          const isSource = code === 'en'

          return (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              title={isSource ? 'English is the source language and cannot be removed' : undefined}
              className={[
                'flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 select-none shadow-sm hover:shadow-md',
                isSelected
                  ? isSource
                    ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-default opacity-80'
                    : 'bg-gradient-to-br from-indigo-50 to-primary-100 border-primary-300 text-primary-700 ring-1 ring-primary-400/20'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:-translate-y-0.5',
              ].join(' ')}
            >
              <span className="text-base leading-none drop-shadow-sm">{meta.flag}</span>
              <span className="leading-none">{meta.name}</span>
              <span className="text-xs font-medium opacity-60 leading-none">{meta.native}</span>
              {isSource && (
                <span className="ml-1 text-[10px] font-bold bg-gray-200/80 text-gray-500 px-2 py-0.5 rounded-full leading-none">
                  Source
                </span>
              )}
            </button>
          )
        })}
      </div>

      {targetCount === 0 && (
        <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50/50 border border-amber-200/60 rounded-xl px-4 py-3">
          <span className="text-amber-500 font-bold mt-0.5">ⓘ</span>
          <p>
            No target languages selected. The content will be processed and stored in 
            <span className="font-bold"> English only</span> without translated text or audio.
          </p>
        </div>
      )}
    </div>
  )
}
