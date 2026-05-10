"use client"

import { useState } from 'react'
import { X, UserPlus, Calendar, Loader2 } from 'lucide-react'
import { Training, useCreateAssignment } from '@/api/trainingApi'
import toast from 'react-hot-toast'

interface AssignUserModalProps {
  training: Training | null
  isOpen: boolean
  onClose: () => void
}

export default function AssignUserModal({ training, isOpen, onClose }: AssignUserModalProps) {
  const [userId, setUserId] = useState('learner-uid')
  const [deadline, setDeadline] = useState('')
  const createAssignment = useCreateAssignment()

  if (!isOpen || !training) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !deadline) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      await createAssignment.mutateAsync({
        userId,
        trainingId: training.id,
        product: training.product,
        deadline: new Date(deadline).toISOString(),
      })
      toast.success(`Assigned to user: ${userId}`)
      setUserId('')
      setDeadline('')
      onClose()
    } catch {
      toast.error('Failed to create assignment')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="glass-card w-full max-w-md relative animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Assign Training</h2>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{training.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Learner User ID</label>
            <div className="relative">
              <input
                type="text"
                className="input pr-10"
                placeholder="e.g. learner-123"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 px-1">
              Enter the unique identifier of the learner to assign this module.
            </p>
          </div>

          <div>
            <label className="label">Completion Deadline</label>
            <div className="relative">
              <input
                type="date"
                className="input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAssignment.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {createAssignment.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Assigning...
                </>
              ) : (
                'Confirm Assignment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
