"use client"

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import MetadataForm from '@/components/MetadataForm'
import FileUploader from '@/components/FileUploader'
import ProgressModal from '@/components/ProgressModal'
import { useCreateTraining } from '@/api/trainingApi'
import { useTrainingStore } from '@/store/useTrainingStore'

export default function UploadPage() {
  const { draft, resetDraft } = useTrainingStore()
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const createTraining = useCreateTraining()

  const isValid =
    draft.name && draft.category && draft.product &&
    draft.locales.length > 0 &&
    draft.deck && draft.dataExcel

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    try {
      const result = await createTraining.mutateAsync(draft)
      setCreatedId(result.id)
      setIsModalOpen(true)
      toast.success('Training submitted! Starting ingestion pipeline...')
      resetDraft()
    } catch {
      toast.error('Upload failed. Check your files and try again.')
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setCreatedId(null)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-full flex flex-col">
      {/* Header Section */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create Training</h1>
          <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Configure metadata and upload your source materials. The ingestion pipeline will automatically 
            process your presentation deck and synthesize multilingual audio from the provided Excel data.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 bg-white/60 px-4 py-2 rounded-xl border border-gray-200/60 shadow-sm backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Pipeline Ready
        </div>
      </div>

      <ProgressModal 
        trainingId={createdId} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />

      <form onSubmit={handleSubmit} className="flex-1 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Metadata */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card sticky top-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  1
                </div>
                <h2 className="text-lg font-bold text-gray-800">Training Details</h2>
              </div>
              <MetadataForm />
            </div>
          </div>

          {/* Right Column: Files & Submit */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  2
                </div>
                <h2 className="text-lg font-bold text-gray-800">Source Materials</h2>
              </div>

              <div className="space-y-8">
                <FileUploader
                  field="deck"
                  label="Presentation Deck (PPT / PDF) *"
                  accept={{
                    'application/vnd.ms-powerpoint': ['.ppt'],
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
                    'application/pdf': ['.pdf'],
                  }}
                  hint="Max 100 MB — slides will be automatically extracted and optimized"
                />

                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-2" />

                <FileUploader
                  field="dataExcel"
                  label="Training Data (Excel) *"
                  accept={{
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                  }}
                  hint="Must include 'Transcripts', 'FAQs', and 'Quizzes' sheets. Missing locales will be auto-translated."
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="glass-card flex items-center justify-between p-5 mt-8">
              <div className="text-sm text-gray-500">
                {!isValid ? (
                  <span className="flex items-center gap-2 text-amber-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Complete all required fields to submit
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-green-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Ready for ingestion
                  </span>
                )}
              </div>
              
              <button
                type="submit"
                disabled={!isValid || createTraining.isPending}
                className="btn-primary flex items-center gap-2 px-8 py-3 text-base shadow-lg shadow-primary-500/30"
              >
                {createTraining.isPending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Initializing Pipeline...
                  </>
                ) : (
                  'Start Ingestion Pipeline →'
                )}
              </button>
            </div>
          </div>
          
        </div>
      </form>
    </div>
  )
}
