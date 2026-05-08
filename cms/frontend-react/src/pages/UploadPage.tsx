import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import MetadataForm from '../components/MetadataForm'
import FileUploader from '../components/FileUploader'
import { useCreateTraining, useTrainingStatus } from '../api/trainingApi'
import { useTrainingStore } from '../store/useTrainingStore'

export default function UploadPage() {
  const { draft, resetDraft } = useTrainingStore()
  const [createdId, setCreatedId] = useState<string | null>(null)
  const createTraining = useCreateTraining()
  const { data: statusData } = useTrainingStatus(createdId)

  const isValid =
    draft.name &&
    draft.category &&
    draft.product &&
    draft.deck &&
    draft.transcriptsExcel &&
    draft.faqsExcel &&
    draft.quizzesExcel

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
          Fill in the metadata, upload your deck and three Excel templates.
          Gemini will auto-translate missing locale content.
        </p>
      </div>

      {createdId && statusData && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          statusData.status === 'READY'
            ? 'bg-green-50 border border-green-200'
            : statusData.status === 'ERROR'
            ? 'bg-red-50 border border-red-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          {statusData.status === 'READY' ? (
            <CheckCircle2 size={20} className="text-green-600" />
          ) : statusData.status === 'ERROR' ? (
            <AlertCircle size={20} className="text-red-600" />
          ) : (
            <Loader2 size={20} className="text-blue-600 animate-spin" />
          )}
          <div>
            <p className="font-medium text-sm">
              {statusData.status === 'READY'
                ? 'Training ready!'
                : statusData.status === 'ERROR'
                ? 'Processing failed'
                : 'Processing — translating content & generating audio...'}
            </p>
            <p className="text-xs text-gray-500">ID: {createdId}</p>
          </div>
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
            field="transcriptsExcel"
            label="Transcripts Excel *"
            accept={{
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            }}
            hint="Use the transcripts_template.xlsx — blank locale columns will be auto-translated"
          />

          <FileUploader
            field="faqsExcel"
            label="FAQs Excel *"
            accept={{
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            }}
            hint="Use the faqs_template.xlsx"
          />

          <FileUploader
            field="quizzesExcel"
            label="Quizzes Excel *"
            accept={{
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            }}
            hint="Use the quizzes_template.xlsx"
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
