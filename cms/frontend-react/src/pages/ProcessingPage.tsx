import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  RefreshCw,
  Upload,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Training, useTrainings, useRerunTraining } from '../api/trainingApi'

// ── Progress steps ────────────────────────────────────────────────────────────

const STEPS = [
  { key: 'UPLOADING_DECK', label: 'Upload Deck' },
  { key: 'PARSING_CONTENT', label: 'Parse Excel' },
  { key: 'TRANSLATING', label: 'Translate' },
  { key: 'GENERATING_AUDIO', label: 'Generate Audio' },
  { key: 'COMPLETE', label: 'Ready' },
]

const STEP_ORDER = STEPS.map((s) => s.key)

// CLEARING_DATA is an extra step only shown during rerun
const RERUN_EXTRA = 'CLEARING_DATA'

function stepIndex(step: string | null | undefined): number {
  if (!step) return -1
  if (step === RERUN_EXTRA) return -0.5
  return STEP_ORDER.indexOf(step)
}

// ── Status helpers ────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case 'READY': return 'bg-green-100 text-green-700'
    case 'ERROR': return 'bg-red-100 text-red-700'
    case 'PROCESSING': return 'bg-blue-100 text-blue-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'READY': return <CheckCircle2 size={14} className="text-green-600" />
    case 'ERROR': return <AlertCircle size={14} className="text-red-500" />
    case 'PROCESSING': return <Loader2 size={14} className="text-blue-500 animate-spin" />
    default: return <Clock size={14} className="text-gray-400" />
  }
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ training }: { training: Training }) {
  const currentIdx = stepIndex(training.processingStep)
  const isError = training.status === 'ERROR'
  const isReady = training.status === 'READY'

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1">
        {STEPS.map((step, idx) => {
          const done = isReady || currentIdx > idx
          const active = !isReady && currentIdx === idx
          const failed = isError && currentIdx === idx

          return (
            <div key={step.key} className="flex items-center gap-1 flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={`w-full h-1.5 rounded-full transition-colors ${
                    done
                      ? 'bg-green-500'
                      : active
                      ? 'bg-blue-500 animate-pulse'
                      : failed
                      ? 'bg-red-400'
                      : 'bg-gray-200'
                  }`}
                />
                <span className={`text-[10px] mt-1 truncate w-full text-center ${
                  done ? 'text-green-600' : active ? 'text-blue-600 font-medium' : failed ? 'text-red-500' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <ChevronRight size={10} className={`flex-shrink-0 mb-3 ${done ? 'text-green-400' : 'text-gray-300'}`} />
              )}
            </div>
          )
        })}
      </div>
      {training.processingStep === RERUN_EXTRA && (
        <p className="text-xs text-blue-600 mt-1">Clearing previous data...</p>
      )}
    </div>
  )
}

// ── Rerun modal ───────────────────────────────────────────────────────────────

function RerunModal({
  training,
  onClose,
}: {
  training: Training
  onClose: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const rerun = useRerunTraining()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    try {
      await rerun.mutateAsync({ trainingId: training.id, dataExcel: file })
      toast.success(`Rerun started for "${training.name}"`)
      onClose()
    } catch {
      toast.error('Failed to start rerun.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Rerun Processing</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          Upload a corrected Excel file for <span className="font-medium text-gray-700">{training.name}</span>.
          The pipeline will clear existing content and reprocess from scratch.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Training Data Excel *</label>
            {file ? (
              <div className="flex items-center justify-between p-3 border border-green-300 bg-green-50 rounded-lg text-sm text-green-700">
                <span className="truncate font-medium">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} className="ml-2 text-red-400 hover:text-red-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-5 text-center text-sm text-gray-500 hover:border-primary-400 hover:bg-gray-50 transition-colors"
              >
                <Upload size={20} className="mx-auto mb-1 text-gray-400" />
                Click to select .xlsx file
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Workbook must contain sheets: Transcripts, FAQs, Quizzes
            </p>
          </div>

          {training.processingError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-medium text-red-700 mb-1">Previous error:</p>
              <p className="text-xs text-red-600 break-words">{training.processingError}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm px-4 py-2">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || rerun.isPending}
              className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
            >
              {rerun.isPending && <Loader2 size={14} className="animate-spin" />}
              {rerun.isPending ? 'Starting...' : 'Start Rerun'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Training row ──────────────────────────────────────────────────────────────

function TrainingRow({ training }: { training: Training }) {
  const [expanded, setExpanded] = useState(false)
  const [showRerun, setShowRerun] = useState(false)

  return (
    <>
      <div className="card p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 text-gray-400 hover:text-gray-600"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 truncate">{training.name}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(training.status)}`}>
                {statusIcon(training.status)}
                {training.status}
              </span>
              <span className="text-xs text-gray-400">{training.product}</span>
            </div>

            <ProgressBar training={training} />

            {expanded && (
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                <span><span className="font-medium">Category:</span> {training.category}</span>
                <span><span className="font-medium">ID:</span> <span className="font-mono">{training.id.slice(0, 8)}…</span></span>
                <span><span className="font-medium">Created by:</span> {training.createdBy}</span>
                <span><span className="font-medium">Updated:</span> {new Date(training.updatedAt).toLocaleString()}</span>
              </div>
            )}

            {training.processingError && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2 break-words">
                {training.processingError}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowRerun(true)}
            disabled={training.status === 'PROCESSING'}
            title="Rerun processing with updated Excel"
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              training.status === 'PROCESSING'
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-primary-300 text-primary-600 hover:bg-primary-50'
            }`}
          >
            <RefreshCw size={13} />
            Rerun
          </button>
        </div>
      </div>

      {showRerun && (
        <RerunModal training={training} onClose={() => setShowRerun(false)} />
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProcessingPage() {
  const { data: trainings, isLoading, isError } = useTrainings()

  const processing = trainings?.filter((t) => t.status === 'PROCESSING') ?? []
  const ready = trainings?.filter((t) => t.status === 'READY') ?? []
  const errored = trainings?.filter((t) => t.status === 'ERROR') ?? []
  const draft = trainings?.filter((t) => t.status === 'DRAFT') ?? []

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-500">
        <Loader2 size={20} className="animate-spin" />
        Loading trainings...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-8 flex items-center gap-2 text-red-600">
        <AlertCircle size={20} />
        Failed to load trainings.
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Processing Pipeline</h1>
        <p className="text-gray-500 mt-1">
          Monitor ingestion progress and rerun failed or outdated trainings.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Processing', count: processing.length + draft.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Ready', count: ready.length, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Failed', count: errored.length, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Total', count: trainings?.length ?? 0, color: 'text-gray-700', bg: 'bg-gray-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active / in-progress */}
      {processing.length + draft.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Active
          </h2>
          <div className="space-y-3">
            {[...processing, ...draft].map((t) => (
              <TrainingRow key={t.id} training={t} />
            ))}
          </div>
        </section>
      )}

      {/* Failed */}
      {errored.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wide mb-3">
            Failed — action required
          </h2>
          <div className="space-y-3">
            {errored.map((t) => (
              <TrainingRow key={t.id} training={t} />
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {ready.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Ready
          </h2>
          <div className="space-y-3">
            {ready.map((t) => (
              <TrainingRow key={t.id} training={t} />
            ))}
          </div>
        </section>
      )}

      {trainings?.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Upload size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No trainings yet. Upload one to get started.</p>
        </div>
      )}
    </div>
  )
}
