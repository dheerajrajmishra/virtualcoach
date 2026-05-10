"use client";
import React from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useTraining } from '../api/trainingApi'

interface ProgressModalProps {
  trainingId: string | null
  isOpen: boolean
  onClose: () => void
}

const STEPS = [
  { key: 'UPLOADING_DECK', label: 'Uploading Presentation Deck', description: 'Splitting slides and uploading to storage' },
  { key: 'PARSING_CONTENT', label: 'Parsing Training Data', description: 'Extracting transcripts, FAQs, and quizzes' },
  { key: 'TRANSLATING', label: 'AI Translation', description: 'Translating content into supported locales' },
  { key: 'GENERATING_AUDIO', label: 'Voice Synthesis', description: 'Generating high-quality voice audio' },
  { key: 'COMPLETE', label: 'Finalizing', description: 'Training module is ready for preview' },
]

const STEP_ORDER = STEPS.map(s => s.key)

function getStepIndex(step: string | null | undefined): number {
  if (!step) return -1
  return STEP_ORDER.indexOf(step)
}

export default function ProgressModal({ trainingId, isOpen, onClose }: ProgressModalProps) {
  const { data: training, isLoading } = useTraining(trainingId)

  if (!isOpen) return null

  const currentStepIdx = getStepIndex(training?.processingStep)
  const isError = training?.status === 'ERROR'
  const isReady = training?.status === 'READY'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ingestion Progress</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{trainingId}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200/50 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading || !training ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 size={32} className="animate-spin mb-3 text-primary-500" />
              <p className="text-sm font-medium">Initializing pipeline...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Training Name & Badge */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 truncate flex-1 mr-4">{training.name}</h3>
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  isReady ? 'bg-green-100 text-green-700' : isError ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {training.status}
                </span>
              </div>

              {/* Vertical Step List */}
              <div className="relative space-y-8">
                {/* Connecting Line */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-100" />
                
                {STEPS.map((step, idx) => {
                  const isPast = isReady || currentStepIdx > idx
                  const isCurrent = !isReady && !isError && currentStepIdx === idx
                  const isFailed = isError && currentStepIdx === idx
                  const isFuture = !isPast && !isCurrent && !isFailed

                  return (
                    <div key={step.key} className="relative flex items-start gap-4">
                      {/* Icon Container */}
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isPast ? 'bg-green-500 text-white shadow-lg shadow-green-100' :
                        isCurrent ? 'bg-primary-600 text-white shadow-lg shadow-primary-100 ring-4 ring-primary-50' :
                        isFailed ? 'bg-red-500 text-white' :
                        'bg-white border-2 border-gray-100 text-gray-300'
                      }`}>
                        {isPast ? <CheckCircle2 size={16} /> :
                         isCurrent ? <Loader2 size={16} className="animate-spin" /> :
                         isFailed ? <AlertCircle size={16} /> :
                         <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                      </div>

                      {/* Text Content */}
                      <div className="flex-1 pt-1">
                        <p className={`text-sm font-bold transition-colors ${
                          isPast ? 'text-gray-800' : isCurrent ? 'text-primary-700' : isFailed ? 'text-red-700' : 'text-gray-400'
                        }`}>
                          {step.label}
                        </p>
                        <p className={`text-xs mt-0.5 leading-relaxed ${
                          isCurrent ? 'text-primary-600/70' : 'text-gray-400'
                        }`}>
                          {isFailed ? (training.processingError || 'Something went wrong') : step.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <Link 
            href="/processing"
            className="text-xs font-semibold text-gray-500 hover:text-primary-600 flex items-center gap-1.5 transition-colors"
          >
            Open Full Pipeline <ExternalLink size={12} />
          </Link>
          
          <div className="flex gap-3">
             {isReady && (
                <Link
                  href={`/preview/${trainingId}`}
                  className="btn-primary py-1.5 px-4 text-xs flex items-center gap-2"
                >
                  Preview Module <ArrowRight size={14} />
                </Link>
             )}
             {(isReady || isError) && (
               <button onClick={onClose} className="btn-secondary py-1.5 px-4 text-xs font-bold">
                 Close
               </button>
             )}
          </div>
        </div>

      </div>
    </div>
  )
}

