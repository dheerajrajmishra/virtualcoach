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
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload Training Module</h1>
        <p className="text-gray-500 mt-1">
          Fill in the metadata, upload your deck and the combined Excel template
          (sheets: Transcripts, FAQs, Quizzes). Missing content will be auto-translated.
        </p>
      </div>

      <ProgressModal 
        trainingId={createdId} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="card">
          <MetadataForm />
        </div>

        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">File Uploads</h2>

          <FileUploader
            field="deck"
            label="Presentation Deck (PPT / PDF) *"
            accept={{
              'application/vnd.ms-powerpoint': ['.ppt'],
              'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
              'application/pdf': ['.pdf'],
            }}
            hint="Max 100 MB — slides will be split into images automatically"
          />

          <FileUploader
            field="dataExcel"
            label="Training Data Excel *"
            accept={{
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            }}
            hint="Single workbook with three sheets: 'Transcripts', 'FAQs', 'Quizzes' — blank locale columns will be auto-translated"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isValid || createTraining.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {createTraining.isPending && <Loader2 size={16} className="animate-spin" />}
            {createTraining.isPending ? 'Uploading...' : 'Submit Training'}
          </button>
        </div>
      </form>
    </div>
  )
}
