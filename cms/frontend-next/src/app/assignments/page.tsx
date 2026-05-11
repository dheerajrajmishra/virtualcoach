"use client"

import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, Loader2, Search, Users, CheckCircle2, AlertCircle,
  Clock, PlayCircle, X, Calendar, ChevronDown, BookOpen,
  AlertTriangle, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'
import {
  useAssignments, useCreateAssignment, useTrainings,
  Assignment, Training,
} from '@/api/trainingApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(userId: string) {
  return userId.slice(0, 2).toUpperCase()
}

function avatarColor(userId: string) {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-rose-500', 'bg-amber-500', 'bg-cyan-500',
  ]
  const i = userId.charCodeAt(0) % colors.length
  return colors[i]
}

function deadlineInfo(deadline: string, status: string) {
  if (status === 'COMPLETED') return { label: 'Completed', cls: 'text-green-600 bg-green-50' }
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, cls: 'text-red-600 bg-red-50' }
  if (diff === 0) return { label: 'Due today',                  cls: 'text-orange-600 bg-orange-50' }
  if (diff <= 3)  return { label: `${diff}d left`,              cls: 'text-amber-600 bg-amber-50' }
  return           { label: `${diff}d left`,                    cls: 'text-gray-500 bg-gray-50' }
}

function fmtDeadline(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  ASSIGNED:    { label: 'Assigned',    icon: <Clock size={11} />,        cls: 'text-blue-600 bg-blue-50 border-blue-200' },
  IN_PROGRESS: { label: 'In Progress', icon: <PlayCircle size={11} />,   cls: 'text-violet-600 bg-violet-50 border-violet-200' },
  COMPLETED:   { label: 'Completed',   icon: <CheckCircle2 size={11} />, cls: 'text-green-600 bg-green-50 border-green-200' },
  OVERDUE:     { label: 'Overdue',     icon: <AlertTriangle size={11} />,cls: 'text-red-600 bg-red-50 border-red-200' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.ASSIGNED
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number; icon: React.ElementType; color: string; sub?: string
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

// ── New Assignment modal ──────────────────────────────────────────────────────

function NewAssignmentModal({
  trainings,
  onClose,
}: {
  trainings: Training[]
  onClose: () => void
}) {
  const createAssignment = useCreateAssignment()
  const [form, setForm] = useState({ userId: '', trainingId: '', product: '', deadline: '' })

  const readyTrainings = trainings.filter(t => t.status === 'READY')
  const selectedTraining = readyTrainings.find(t => t.id === form.trainingId)

  function set(key: string, val: string) {
    setForm(prev => {
      const next = { ...prev, [key]: val }
      if (key === 'trainingId') {
        const t = readyTrainings.find(t => t.id === val)
        next.product = t?.product ?? prev.product
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createAssignment.mutateAsync({
        ...form,
        deadline: new Date(form.deadline).toISOString(),
      })
      toast.success('Assignment created!')
      onClose()
    } catch {
      toast.error('Failed to create assignment')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div>
            <h2 className="text-base font-bold text-gray-900">New Assignment</h2>
            <p className="text-xs text-gray-500 mt-0.5">Assign a training module to a learner</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200/60 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* User ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">User ID <span className="text-red-400">*</span></label>
            <div className="relative">
              <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9 w-full"
                value={form.userId}
                onChange={e => set('userId', e.target.value)}
                placeholder="e.g. user-001"
                required
              />
            </div>
          </div>

          {/* Training */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Training <span className="text-red-400">*</span></label>
            <div className="relative">
              <BookOpen size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                className="input pl-9 w-full appearance-none"
                value={form.trainingId}
                onChange={e => set('trainingId', e.target.value)}
                required
              >
                <option value="">Select training…</option>
                {readyTrainings.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {selectedTraining && (
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                  {selectedTraining.supportedLocales.join(' · ').toUpperCase()}
                </span>
                {selectedTraining.totalSlides} slides · {selectedTraining.category}
              </p>
            )}
          </div>

          {/* Product */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Product <span className="text-red-400">*</span></label>
            <input
              className="input w-full"
              value={form.product}
              onChange={e => set('product', e.target.value)}
              placeholder="Product name"
              required
            />
            <p className="text-[11px] text-gray-400 mt-1">Auto-filled from training — override if needed</p>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Deadline <span className="text-red-400">*</span></label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="datetime-local"
                className="input pl-9 w-full"
                value={form.deadline}
                onChange={e => set('deadline', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary text-sm px-4 py-2">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAssignment.isPending}
              className="btn-primary flex items-center gap-2 text-sm px-5 py-2"
            >
              {createAssignment.isPending && <Loader2 size={14} className="animate-spin" />}
              Assign Training
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Assignment row ────────────────────────────────────────────────────────────

function AssignmentRow({ assignment, trainingMap }: { assignment: Assignment; trainingMap: Record<string, Training> }) {
  const training = trainingMap[assignment.trainingId]
  const dl       = deadlineInfo(assignment.deadline, assignment.status)
  const isOverdue = assignment.status !== 'COMPLETED' && new Date(assignment.deadline) < new Date()

  return (
    <tr className="hover:bg-gray-50/60 transition-colors group">

      {/* User */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(assignment.userId)}`}>
            {initials(assignment.userId)}
          </div>
          <span className="font-medium text-gray-900 text-sm">{assignment.userId}</span>
        </div>
      </td>

      {/* Training */}
      <td className="px-5 py-3.5">
        <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">
          {training?.name ?? <span className="font-mono text-xs text-gray-400">{assignment.trainingId.slice(0, 12)}…</span>}
        </p>
        {training && (
          <p className="text-[11px] text-gray-400 mt-0.5">{training.category} · {training.totalSlides} slides</p>
        )}
      </td>

      {/* Product */}
      <td className="px-5 py-3.5">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {assignment.product}
        </span>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <StatusBadge status={isOverdue && assignment.status !== 'COMPLETED' ? 'OVERDUE' : assignment.status} />
      </td>

      {/* Deadline */}
      <td className="px-5 py-3.5">
        <p className="text-sm text-gray-700">{fmtDeadline(assignment.deadline)}</p>
        <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${dl.cls}`}>
          {dl.label}
        </span>
      </td>

      {/* Assigned by */}
      <td className="px-5 py-3.5 text-sm text-gray-500">{assignment.assignedBy}</td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['All', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'] as const

type SortField = 'userId' | 'training' | 'product' | 'status' | 'deadline' | 'assignedBy'
type SortOrder = 'asc' | 'desc' | null

interface SortConfig {
  field: SortField
  order: SortOrder
}

export default function AssignmentPage() {
  const [showForm, setShowForm]     = useState(false)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState<string>('All')
  const [productFilter, setProduct] = useState('')
  const [sort, setSort]             = useState<SortConfig>({ field: 'deadline', order: 'desc' })

  const { data: assignments = [], isLoading: aLoad } = useAssignments()
  const { data: trainings   = [], isLoading: tLoad } = useTrainings()

  const trainingMap = useMemo(
    () => Object.fromEntries(trainings.map(t => [t.id, t])),
    [trainings],
  )

  const products = useMemo(
    () => [...new Set(assignments.map((a: Assignment) => a.product))].sort(),
    [assignments],
  )

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim()
    
    // 1. Filter
    const filtered = assignments.filter((a: Assignment) => {
      const training = trainingMap[a.trainingId]
      if (statusFilter !== 'All' && a.status !== statusFilter) return false
      if (productFilter && a.product !== productFilter) return false
      if (q && !a.userId.toLowerCase().includes(q) &&
               !(training?.name.toLowerCase().includes(q)) &&
               !a.product.toLowerCase().includes(q)) return false
      return true
    })

    // 2. Sort
    if (!sort.order) return filtered

    return [...filtered].sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sort.field) {
        case 'userId':     aVal = a.userId; bVal = b.userId; break
        case 'product':    aVal = a.product; bVal = b.product; break
        case 'status':     aVal = a.status; bVal = b.status; break
        case 'assignedBy': aVal = a.assignedBy; bVal = b.assignedBy; break
        case 'deadline':   aVal = new Date(a.deadline).getTime(); bVal = new Date(b.deadline).getTime(); break
        case 'training':   
          aVal = trainingMap[a.trainingId]?.name ?? ''
          bVal = trainingMap[b.trainingId]?.name ?? ''
          break
        default:           return 0
      }

      if (aVal < bVal) return sort.order === 'asc' ? -1 : 1
      if (aVal > bVal) return sort.order === 'asc' ? 1 : -1
      return 0
    })
  }, [assignments, statusFilter, productFilter, search, trainingMap, sort])

  const counts = {
    total:      assignments.length,
    assigned:   assignments.filter((a: Assignment) => a.status === 'ASSIGNED').length,
    inProgress: assignments.filter((a: Assignment) => a.status === 'IN_PROGRESS').length,
    completed:  assignments.filter((a: Assignment) => a.status === 'COMPLETED').length,
    overdue:    assignments.filter((a: Assignment) =>
      a.status !== 'COMPLETED' && new Date(a.deadline) < new Date()).length,
  }

  const completionPct = counts.total > 0
    ? Math.round((counts.completed / counts.total) * 100) : 0

  const handleSort = (field: SortField) => {
    setSort(prev => {
      if (prev.field === field) {
        if (prev.order === 'asc') return { field, order: 'desc' }
        if (prev.order === 'desc') return { field, order: null }
        return { field, order: 'asc' }
      }
      return { field, order: 'asc' }
    })
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field || !sort.order) return <ArrowUpDown size={12} className="ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    if (sort.order === 'asc') return <ArrowUp size={12} className="ml-1 text-primary-500" />
    return <ArrowDown size={12} className="ml-1 text-primary-500" />
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Assignments</h1>
          <p className="text-gray-500 mt-1">Allocate training modules to learners and track their progress.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Assignment
        </button>
      </div>

      {/* Stats */}
      {(aLoad || tLoad) ? (
        <div className="flex items-center gap-2 text-gray-400 py-8">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard label="Total"       value={counts.total}      icon={Users}        color="bg-indigo-500" />
            <StatCard label="Assigned"    value={counts.assigned}   icon={Clock}        color="bg-blue-500"   />
            <StatCard label="In Progress" value={counts.inProgress} icon={PlayCircle}   color="bg-violet-500" />
            <StatCard label="Completed"   value={counts.completed}  icon={CheckCircle2} color="bg-green-500"  />
            <StatCard label="Overdue"     value={counts.overdue}    icon={AlertCircle}  color="bg-red-500"    />
          </div>

          {/* Completion bar */}
          <div className="card p-4 mb-6 flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 flex-shrink-0">Completion rate</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-sm font-bold text-gray-900 flex-shrink-0 w-10 text-right">{completionPct}%</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9 w-full text-sm"
                placeholder="Search user, training, product…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Product */}
            <div className="relative">
              <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                className="input pl-9 text-sm appearance-none pr-8"
                value={productFilter}
                onChange={e => setProduct(e.target.value)}
              >
                <option value="">All Products</option>
                {products.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Status pills */}
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    statusFilter === s
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                  }`}
                >
                  {s === 'All' ? 'All' : STATUS_CFG[s]?.label ?? s}
                </button>
              ))}
            </div>

            <span className="ml-auto text-xs text-gray-400">{visible.length} result{visible.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  {[
                    { label: 'Learner',    key: 'userId' },
                    { label: 'Training',   key: 'training' },
                    { label: 'Product',    key: 'product' },
                    { label: 'Status',     key: 'status' },
                    { label: 'Deadline',   key: 'deadline' },
                    { label: 'Assigned By',key: 'assignedBy' },
                  ].map(h => (
                    <th 
                      key={h.key} 
                      onClick={() => handleSort(h.key as SortField)}
                      className="group cursor-pointer select-none px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-100/80 transition-colors"
                    >
                      <div className="flex items-center">
                        {h.label}
                        <SortIcon field={h.key as SortField} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map((a: Assignment) => (
                  <AssignmentRow key={a.id} assignment={a} trainingMap={trainingMap} />
                ))}
              </tbody>
            </table>

            {visible.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Users size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  {assignments.length === 0 ? 'No assignments yet — create one to get started.' : 'No results match your filters.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {showForm && (
        <NewAssignmentModal trainings={trainings} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}
