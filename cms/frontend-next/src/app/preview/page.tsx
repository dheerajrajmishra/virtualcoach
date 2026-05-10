"use client"

import { Loader2, Eye, ChevronRight } from 'lucide-react'
import { useTrainings } from '@/api/trainingApi'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const LANG_META: Record<string, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇬🇧' },
  hi: { name: 'Hindi',   flag: '🇮🇳' },
  ta: { name: 'Tamil',   flag: '🇮🇳' },
  te: { name: 'Telugu',  flag: '🇮🇳' },
  mr: { name: 'Marathi', flag: '🇮🇳' },
  bn: { name: 'Bengali', flag: '🇧🇩' },
}

export default function PreviewListPage() {
  const router = useRouter()
  const { data: trainings, isLoading } = useTrainings()
  const ready = trainings?.filter(t => t.status === 'READY' || !!t.publishedAt) ?? []
  
  if (isLoading) return (
    <div className="p-8 flex items-center gap-2 text-gray-500">
      <Loader2 size={20} className="animate-spin" /> Loading trainings...
    </div>
  )
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Training Preview</h1>
        <p className="text-gray-500 mt-1">Select a ready training to preview its slides, transcripts and audio.</p>
      </div>
      {ready.length === 0 ? (
        <div className="text-center py-16 text-gray-400 card">
          <Eye size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-600 mb-1">No ready trainings</p>
          <p className="text-sm mb-4">Upload and process a training first.</p>
          <Link href="/processing" className="btn-primary text-sm px-4 py-2">View Pipeline</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {ready.map(t => (
            <button key={t.id} onClick={() => router.push(`/preview/${t.id}`)}
              className="w-full card !p-4 text-left hover:shadow-md transition-shadow flex items-center gap-4 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                  {t.publishedAt && (
                    <span className="text-[10px] font-medium bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      Published
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{t.category} · {t.product}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {(t.supportedLocales ?? []).map(lc => (
                    <span key={lc} className="text-xs bg-primary-50 text-primary-600 border border-primary-100 rounded px-1.5 py-0.5">
                      {LANG_META[lc]?.flag ?? '🌐'} {lc.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
