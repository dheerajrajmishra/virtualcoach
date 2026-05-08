import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import MetadataForm from '../components/MetadataForm'
import FileUploader from '../components/FileUploader'
import { useCreateTraining, useTrainingStatus } from '../api/trainingApi'
import { useTrainingStore } from '../store/useTrainingStore'

const STEP_LABELS: Record<string, string> = {
  UPLOADING_DECK: 'Uploading deck...',
  PARSING_CONTENT: 'Parsing Excel sheets...',
  TRANSLATING: 'Translating content...',
  GENERATING_AUDIO: 'Generating audio...',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
}

export default function UploadPage() {
  const { draft, resetDraft } = useTrainingStore()
  const [createdId, setCreatedId] = useState<string | null>(null)
  const createTraining = useCreateTraining()
  const { data: statusData } = useTrainingStatus(createdId)

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
      toast.success('Training submitted! Processing in background...')
      resetDraft()
    } catch {
      toast.error('Upload failed. Check your files and try again.')
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload Training Module</h1>
        <p className="text-gray-500 mt-1">
          Fill in the metadata, upload your deck and the combined Excel template
          (sheets: Transcripts, FAQs, Quizzes). Gemini will auto-translate missing content.
        </p>
      </div>

      {createdId && statusData && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
          statusData.status === 'READY'
            ? 'bg-green-50 border border-green-200'
            : statusData.status === 'ERROR'
            ? 'bg-red-50 border border-red-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="mt-0.5">
            {statusData.status === 'READY' ? (
              <CheckCircle2 size={20} className="text-green-600" />
            ) : statusData.status === 'ERROR' ? (
              <AlertCircle size={20} className="text-red-600" />
            ) : (
              <Loader2 size={20} className="text-blue-600 animate-spin" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              {statusData.status === 'READY'
                ? 'Training ready!'
                : statusData.status === 'ERROR'
                ? 'Processing failed'
                : STEP_LABELS[statusData.processingStep] ?? 'Processing...'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">ID: {createdId}</p>
            {statusData.processingError && (
              <p className="text-xs text-red-600 mt-1 truncate">{statusData.processingError}</p>
            )}
          </div>
          {(statusData.status === 'READY' || statusData.status === 'ERROR') && (
            <Link
              to="/processing"
              className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 whitespace-nowrap"
            >
              View pipeline <ArrowRight size={12} />
            </Link>
          )}
        </div>
      )}

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
