import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileCheck, X } from 'lucide-react'
import { useTrainingStore, TrainingDraft } from '../store/useTrainingStore'

interface Props {
  field: keyof Pick<TrainingDraft, 'deck' | 'transcriptsExcel' | 'faqsExcel' | 'quizzesExcel'>
  label: string
  accept: Record<string, string[]>
  hint: string
}

export default function FileUploader({ field, label, accept, hint }: Props) {
  const { draft, setDraftField } = useTrainingStore()
  const file = draft[field] as File | null

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) setDraftField(field, accepted[0])
    },
    [field, setDraftField]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
  })

  return (
    <div>
      <label className="label">{label}</label>
      {file ? (
        <div className="flex items-center justify-between p-3 border border-green-300 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <FileCheck size={16} />
            <span className="font-medium truncate max-w-xs">{file.name}</span>
            <span className="text-green-500">({(file.size / 1024).toFixed(0)} KB)</span>
          </div>
          <button
            type="button"
            onClick={() => setDraftField(field, null)}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud size={24} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            {isDragActive ? 'Drop it here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-gray-400 mt-1">{hint}</p>
        </div>
      )}
    </div>
  )
}
