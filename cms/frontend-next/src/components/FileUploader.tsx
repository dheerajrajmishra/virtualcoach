"use client";
import { useState, useCallback } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { UploadCloud, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { useTrainingStore, TrainingDraft } from '../store/useTrainingStore'

interface Props {
  field: keyof Pick<TrainingDraft, 'deck' | 'dataExcel'>
  label: string
  accept: Record<string, string[]>
  hint: string
}

export default function FileUploader({ field, label, accept, hint }: Props) {
  const { draft, setDraftField } = useTrainingStore()
  const [error, setError] = useState<string | null>(null)

  const currentFile = draft[field] as File | null

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setError(null)
    if (fileRejections.length > 0) {
      setError(fileRejections[0].errors[0].message)
      return
    }
    if (acceptedFiles.length > 0) {
      setDraftField(field, acceptedFiles[0])
    }
  }, [field, setDraftField])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  })

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraftField(field, null)
    setError(null)
  }

  return (
    <div>
      <label className="block text-sm font-bold text-gray-800 mb-2">{label}</label>

      {!currentFile ? (
        <div
          {...getRootProps()}
          className={`relative overflow-hidden group border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer ${isDragActive
              ? 'border-primary-500 bg-primary-50 shadow-inner'
              : 'border-gray-300 bg-gray-50/50 hover:border-primary-400 hover:bg-white'
            }`}
        >
          {isDragActive && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-violet-500/5 pointer-events-none" />
          )}
          <input {...getInputProps()} />
          <div className="flex flex-col items-center text-center relative z-10">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform duration-300 ${isDragActive ? 'bg-primary-100 scale-110' : 'bg-white shadow-sm group-hover:scale-105 group-hover:shadow-md'}`}>
              <UploadCloud size={24} className={isDragActive ? 'text-primary-600' : 'text-primary-500'} />
            </div>
            <p className="text-sm font-semibold text-gray-700">
              {isDragActive ? 'Drop your file here...' : 'Click or drag file to upload'}
            </p>
            {hint && <p className="text-xs text-gray-400 mt-2 max-w-xs">{hint}</p>}
            {error && (
              <div className="mt-3 text-xs font-medium text-red-500 bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50/30 rounded-2xl p-4 flex items-center gap-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0 text-green-600">
            <FileText size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate pr-4">{currentFile.name}</p>
            <p className="text-xs font-medium text-green-700 mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Ready for processing
            </p>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
            title="Remove file"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  )
};
