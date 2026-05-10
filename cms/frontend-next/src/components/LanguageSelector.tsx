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
    // English is the source language — always required
    if (code === 'en') return

    const next = new Set(selected)
    if (next.has(code)) {
      next.delete(code)
    } else {
      next.add(code)
    }
    // Preserve a stable order matching ALL_LOCALES
    setDraftField('locales', ALL_LOCALES.filter((l) => next.has(l)))
  }

  const targetCount = draft.locales.filter((l) => l !== 'en').length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label mb-0">Training Languages *</label>
        <span className="text-xs text-gray-400">
          {targetCount === 0
            ? 'English only (no translation)'
            : `English + ${targetCount} translation${targetCount > 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
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
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all select-none',
                isSelected
                  ? isSource
                    ? 'bg-gray-100 border-gray-300 text-gray-600 cursor-default'
                    : 'bg-primary-50 border-primary-400 text-primary-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600',
              ].join(' ')}
            >
              <span className="text-base leading-none">{meta.flag}</span>
              <span className="leading-none">{meta.name}</span>
              <span className="text-xs opacity-60 leading-none">{meta.native}</span>
              {isSource && (
                <span className="ml-1 text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full leading-none">
                  source
                </span>
              )}
            </button>
          )
        })}
      </div>

      {targetCount === 0 && (
        <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
          No target languages selected — content will be stored in English only without translation or audio.
        </p>
      )}
    </div>
  )
}

