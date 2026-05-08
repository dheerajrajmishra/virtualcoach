import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Loader2 } from 'lucide-react'
import { useCreateAssignment } from '../api/trainingApi'
import AssignmentDashboard from '../components/AssignmentDashboard'

const PRODUCTS = ['Product A', 'Product B', 'Product C', 'Product D']

export default function AssignmentPage() {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({
    userId: '',
    trainingId: '',
    product: '',
    deadline: '',
  })

  const createAssignment = useCreateAssignment()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createAssignment.mutateAsync(form)
      toast.success('Assignment created!')
      setShowForm(false)
      setForm({ userId: '', trainingId: '', product: '', deadline: '' })
    } catch {
      toast.error('Failed to create assignment')
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Assignments</h1>
          <p className="text-gray-500 mt-1">Allocate training modules to learners by product and deadline.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          New Assignment
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <select
          className="input max-w-xs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All Products</option>
          {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <AssignmentDashboard productFilter={filter} />

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">New Assignment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">User ID *</label>
                <input
                  className="input"
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  placeholder="e.g. user-001"
                  required
                />
              </div>
              <div>
                <label className="label">Training ID *</label>
                <input
                  className="input"
                  value={form.trainingId}
                  onChange={(e) => setForm({ ...form, trainingId: e.target.value })}
                  placeholder="training-id"
                  required
                />
              </div>
              <div>
                <label className="label">Product *</label>
                <select
                  className="input"
                  value={form.product}
                  onChange={(e) => setForm({ ...form, product: e.target.value })}
                  required
                >
                  <option value="">Select product</option>
                  {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Deadline *</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: new Date(e.target.value).toISOString() })}
                  required
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAssignment.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  {createAssignment.isPending && <Loader2 size={14} className="animate-spin" />}
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
