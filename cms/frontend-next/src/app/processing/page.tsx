"use client"

import { useRef, useState, useEffect } from 'react'
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
  Database,
  BrainCircuit,
  Languages,
  Mic,
  Rocket,
} from 'lucide-react'
import { Training, useTrainings, useRerunTraining } from '@/api/trainingApi'

// ── Progress steps config ──────────────────────────────────────────────────────

const STEPS = [
  { key: 'UPLOADING_DECK', label: 'Ingesting', icon: Database, color: 'from-blue-400 to-indigo-500' },
  { key: 'PARSING_CONTENT', label: 'Parsing', icon: BrainCircuit, color: 'from-indigo-400 to-violet-500' },
  { key: 'TRANSLATING', label: 'Translating', icon: Languages, color: 'from-violet-400 to-purple-500' },
  { key: 'GENERATING_AUDIO', label: 'Voice Gen', icon: Mic, color: 'from-purple-400 to-fuchsia-500' },
  { key: 'COMPLETE', label: 'Live', icon: Rocket, color: 'from-fuchsia-400 to-pink-500' },
]

const STEP_ORDER = STEPS.map((s) => s.key)
const RERUN_EXTRA = 'CLEARING_DATA'

function getStepIndex(step: string | null | undefined): number {
  if (!step) return -1
  if (step === RERUN_EXTRA) return -0.5
  return STEP_ORDER.indexOf(step)
}

// ── UI Components ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const configs: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    READY: { label: 'Ready', bg: 'bg-emerald-500/10', text: 'text-emerald-600', icon: CheckCircle2 },
    ERROR: { label: 'Failed', bg: 'bg-rose-500/10', text: 'text-rose-600', icon: AlertCircle },
    PROCESSING: { label: 'Processing', bg: 'bg-amber-500/10', text: 'text-amber-600', icon: Loader2 },
    DRAFT: { label: 'Draft', bg: 'bg-slate-500/10', text: 'text-slate-600', icon: Clock },
  }

  const cfg = configs[status] || configs.DRAFT
  const Icon = cfg.icon

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text} border border-current/10`}>
      <Icon size={12} className={status === 'PROCESSING' ? 'animate-spin' : ''} />
      {cfg.label}
    </div>
  )
}

function PipelineProgress({ training }: { training: Training }) {
  const currentIdx = getStepIndex(training.processingStep)
  const isError = training.status === 'ERROR'
  const isReady = training.status === 'READY'

  return (
    <div className="mt-6 relative">
      {/* Background Track */}
      <div className="absolute top-4 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 rounded-full" />
      
      {/* Active Track Overlay */}
      <div 
        className="absolute top-4 left-0 h-1 bg-gradient-to-r from-primary-500 to-violet-500 rounded-full transition-all duration-1000 ease-out" 
        style={{ width: `${Math.max(0, (currentIdx / (STEPS.length - 1)) * 100)}%` }}
      />

      <div className="flex justify-between relative z-10">
        {STEPS.map((step, idx) => {
          const isDone = isReady || currentIdx > idx
          const isActive = !isReady && currentIdx === idx
          const isFailed = isError && currentIdx === idx
          const StepIcon = step.icon

          return (
            <div key={step.key} className="flex flex-col items-center">
              <div 
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 border-2 ${
                  isDone 
                    ? `bg-gradient-to-br ${step.color} border-white shadow-lg shadow-indigo-500/20` 
                    : isActive
                    ? 'bg-white border-primary-500 shadow-xl shadow-primary-500/30 scale-110'
                    : isFailed
                    ? 'bg-rose-50 border-rose-500 text-rose-500 shadow-lg shadow-rose-500/20'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <StepIcon size={18} className={isDone ? 'text-white' : isActive ? 'text-primary-500' : ''} />
              </div>
              <div className="mt-2 text-center">
                <p className={`text-[10px] font-bold uppercase tracking-tight ${
                  isDone ? 'text-indigo-600' : isActive ? 'text-primary-600' : isFailed ? 'text-rose-500' : 'text-slate-400'
                }`}>
                  {step.label}
                </p>
                {isActive && (
                  <span className="flex gap-0.5 justify-center mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Rerun Modal ──────────────────────────────────────────────────────────────

function RerunModal({ training, onClose }: { training: Training, onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const rerun = useRerunTraining()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    try {
      await rerun.mutateAsync({ trainingId: training.id, dataExcel: file })
      toast.success(`Pipeline restarted for "${training.name}"`)
      onClose()
    } catch {
      toast.error('Failed to restart pipeline.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="glass-card w-full max-w-lg overflow-hidden border-indigo-100 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Restart</h2>
            <p className="text-sm text-slate-500 mt-1">Reprocessing <span className="font-semibold text-primary-600">{training.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div 
            onClick={() => !file && fileRef.current?.click()}
            className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ${
              file 
                ? 'border-emerald-300 bg-emerald-50/50' 
                : 'border-slate-200 hover:border-primary-400 hover:bg-primary-50/30'
            }`}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-sm font-bold text-emerald-700 truncate max-w-xs">{file.name}</p>
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="mt-3 text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider"
                >
                  Remove File
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-500/10 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-bold text-slate-700">Drop your .xlsx deck here</p>
                <p className="text-xs text-slate-400 mt-2">Workbook must contain: Transcripts, FAQs, Quizzes</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {training.processingError && (
            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 flex gap-3">
              <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">Last Error Details</p>
                <p className="text-xs text-rose-600 mt-1 leading-relaxed">{training.processingError}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Abort
            </button>
            <button
              type="submit"
              disabled={!file || rerun.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {rerun.isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Initiate Rerun
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Training Row ──────────────────────────────────────────────────────────────

function TrainingRow({ training }: { training: Training }) {
  const [expanded, setExpanded] = useState(false)
  const [showRerun, setShowRerun] = useState(false)

  return (
    <div className="group relative">
      {/* Animated Gradient Border on Hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-violet-600 rounded-[22px] opacity-0 group-hover:opacity-20 blur transition duration-500" />
      
      <div className="relative glass-card border-slate-100 group-hover:border-primary-100 transition-all duration-300">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{training.name}</h3>
                <StatusPill status={training.status} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRerun(true)}
                  disabled={training.status === 'PROCESSING'}
                  className={`p-2 rounded-xl border transition-all duration-300 ${
                    training.status === 'PROCESSING'
                      ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-600 hover:shadow-lg'
                  }`}
                  title="Restart Pipeline"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className={`p-2 rounded-xl border transition-all duration-300 ${
                    expanded ? 'bg-primary-50 border-primary-100 text-primary-600' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              {training.product} • {training.category}
            </p>

            <PipelineProgress training={training} />

            {expanded && (
              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Internal ID</span>
                    <span className="font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded">{training.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Originator</span>
                    <span className="text-slate-900 font-semibold">{training.createdBy}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Last Modification</span>
                    <span className="text-slate-900 font-semibold">{new Date(training.updatedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Slide Count</span>
                    <span className="text-slate-900 font-semibold">{training.totalSlides || 'N/A'}</span>
                  </div>
                </div>
                
                {training.processingError && (
                  <div className="md:col-span-2 mt-2 bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3">
                    <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-600 leading-relaxed font-medium">
                      {training.processingError}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showRerun && (
        <RerunModal training={training} onClose={() => setShowRerun(false)} />
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ProcessingPage() {
  const { data: trainings, isLoading, isError } = useTrainings()

  const processing = trainings?.filter((t) => t.status === 'PROCESSING' || t.status === 'DRAFT') ?? []
  const ready = trainings?.filter((t) => t.status === 'READY') ?? []
  const errored = trainings?.filter((t) => t.status === 'ERROR') ?? []

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="w-16 h-16 rounded-3xl bg-primary-500/10 flex items-center justify-center mb-4 relative">
          <div className="absolute inset-0 rounded-3xl border-2 border-primary-500 animate-ping opacity-20" />
          <Loader2 size={32} className="text-primary-500 animate-spin" />
        </div>
        <p className="text-lg font-bold text-slate-600 tracking-tight">Syncing Pipeline State...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] text-rose-500">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <p className="text-lg font-bold text-rose-600 tracking-tight">Connection Interrupt</p>
        <p className="text-sm text-rose-400 mt-1">Failed to establish contact with the server.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mesh p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
              Ingestion <span className="text-gradient">Control</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-md leading-relaxed">
              Real-time monitoring of the AI synthesis pipeline. Observe parsing, translation, and neural voice generation.
            </p>
          </div>
          
          <div className="flex gap-2">
             <div className="bg-white/50 backdrop-blur-md px-5 py-3 rounded-2xl border border-white shadow-sm flex flex-col items-center">
                <span className="text-2xl font-black text-primary-600 leading-none">{processing.length}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active</span>
             </div>
             <div className="bg-white/50 backdrop-blur-md px-5 py-3 rounded-2xl border border-white shadow-sm flex flex-col items-center">
                <span className="text-2xl font-black text-emerald-600 leading-none">{ready.length}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Stable</span>
             </div>
             <div className="bg-white/50 backdrop-blur-md px-5 py-3 rounded-2xl border border-white shadow-sm flex flex-col items-center">
                <span className="text-2xl font-black text-rose-600 leading-none">{errored.length}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Breaks</span>
             </div>
          </div>
        </div>

        <div className="space-y-12">
          {/* Active Workstream */}
          {(processing.length > 0 || errored.length > 0) && (
            <section>
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                  Operational Stream
                </h2>
                <div className="h-px w-full bg-slate-100" />
              </div>
              <div className="grid gap-6">
                {[...processing, ...errored].map((t) => (
                  <TrainingRow key={t.id} training={t} />
                ))}
              </div>
            </section>
          )}

          {/* Stable Trainings */}
          {ready.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                  Archive & Stable
                </h2>
                <div className="h-px w-full bg-slate-100" />
              </div>
              <div className="grid gap-6">
                {ready.map((t) => (
                  <TrainingRow key={t.id} training={t} />
                ))}
              </div>
            </section>
          )}

          {trainings?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 glass-card border-dashed border-slate-200">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Upload size={32} className="text-slate-300" />
              </div>
              <p className="text-lg font-bold text-slate-900 tracking-tight">Empty Workspace</p>
              <p className="text-sm text-slate-500 mt-1">Upload a training deck to initiate the pipeline.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
