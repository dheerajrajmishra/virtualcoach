"use client"

import { useState } from 'react'
import {
  BookOpen, CheckCircle2, AlertCircle, Loader2, Clock,
  MessageSquareX, Users, TrendingUp, Globe, CalendarClock,
  CheckCheck, HelpCircle, ChevronRight, BadgeCheck, Star,
  ThumbsUp, ThumbsDown, BarChart2,
} from 'lucide-react'
import {
  useTrainings, useAssignments, useUnansweredQuestions, useMarkReviewed,
  useEvaluationResults, useEvalSummary,
  Training, Assignment, UnansweredQuestion, EvaluationResult, EvalSummary,
} from '@/api/trainingApi'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_STYLES: Record<string, string> = {
  READY:       'bg-green-100 text-green-700',
  PROCESSING:  'bg-blue-100  text-blue-700',
  ERROR:       'bg-red-100   text-red-700',
  DRAFT:       'bg-gray-100  text-gray-600',
  COMPLETED:   'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100  text-blue-700',
  ASSIGNED:    'bg-yellow-100 text-yellow-700',
  OVERDUE:     'bg-red-100   text-red-700',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN', hi: 'HI', ta: 'TA', te: 'TE', mr: 'MR', bn: 'BN',
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = ['Overview', 'Trainings', 'Missed FAQs', 'Assignments', 'Quiz Answers'] as const
type Tab = typeof TABS[number]

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: number | string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  trainings, assignments, unanswered,
}: {
  trainings: Training[]; assignments: Assignment[]; unanswered: UnansweredQuestion[]
}) {
  const published   = trainings.filter(t => t.publishedAt)
  const ready       = trainings.filter(t => t.status === 'READY')
  const processing  = trainings.filter(t => t.status === 'PROCESSING' || t.status === 'DRAFT')
  const failed      = trainings.filter(t => t.status === 'ERROR')
  const completed   = assignments.filter(a => a.status === 'COMPLETED')
  const overdue     = assignments.filter(a => a.status === 'OVERDUE')
  const inProgress  = assignments.filter(a => a.status === 'IN_PROGRESS')
  const unreviewed  = unanswered.filter(q => !q.reviewed)

  const recent = [...trainings].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 6)

  return (
    <div className="space-y-8">
      {/* Training KPIs */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Trainings</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Trainings"  value={trainings.length}    icon={BookOpen}      color="bg-indigo-500" />
          <StatCard label="Published"        value={published.length}    sub={`${ready.length} ready`} icon={BadgeCheck} color="bg-green-500" />
          <StatCard label="In Pipeline"      value={processing.length}   icon={Loader2}       color="bg-blue-500"  />
          <StatCard label="Failed"           value={failed.length}       icon={AlertCircle}   color="bg-red-500"   />
        </div>
      </section>

      {/* Assignment KPIs */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Assignments</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Assigned"   value={assignments.length}  icon={Users}         color="bg-violet-500" />
          <StatCard label="In Progress"      value={inProgress.length}   icon={TrendingUp}    color="bg-blue-500"   />
          <StatCard label="Completed"        value={completed.length}    icon={CheckCheck}    color="bg-green-500"  />
          <StatCard label="Overdue"          value={overdue.length}      icon={CalendarClock} color="bg-orange-500" />
        </div>
      </section>

      {/* FAQ KPI */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Learner Queries</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total FAQ Gaps"   value={unanswered.length}   icon={HelpCircle}        color="bg-amber-500" />
          <StatCard label="Unreviewed"       value={unreviewed.length}   sub="need attention" icon={MessageSquareX} color="bg-red-500"   />
          <StatCard label="Reviewed"         value={unanswered.length - unreviewed.length} icon={CheckCircle2}  color="bg-green-500" />
          <StatCard
            label="Trainings Affected"
            value={new Set(unreviewed.map(q => q.trainingId)).size}
            icon={BookOpen}
            color="bg-indigo-500"
          />
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Recent Activity</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Training</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Published</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[220px] truncate">{t.name}</td>
                  <td className="px-4 py-3 text-gray-500">{t.product}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-gray-500">{t.publishedAt ? fmtDate(t.publishedAt) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(t.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 && (
            <p className="text-center py-8 text-sm text-gray-400">No trainings yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}

// ── Trainings tab ─────────────────────────────────────────────────────────────

const TRAINING_FILTERS = ['All', 'READY', 'PROCESSING', 'ERROR', 'DRAFT'] as const
type TrainingFilter = typeof TRAINING_FILTERS[number]

function TrainingsTab({ trainings }: { trainings: Training[] }) {
  const [filter, setFilter] = useState<TrainingFilter>('All')

  const visible = filter === 'All' ? trainings : trainings.filter(t => t.status === filter)

  const filterCount = (f: TrainingFilter) =>
    f === 'All' ? trainings.length : trainings.filter(t => t.status === f).length

  return (
    <div className="space-y-5">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {TRAINING_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
            }`}
          >
            {f === 'All' ? 'All' : f.replace('_', ' ')} <span className="opacity-70">({filterCount(f)})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Slides</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Locales</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Published</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 max-w-[200px] truncate">{t.name}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{t.id.slice(0, 8)}…</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{t.category}</td>
                <td className="px-4 py-3 text-gray-600">{t.product}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                  {t.processingError && (
                    <p className="text-[11px] text-red-500 mt-0.5 max-w-[160px] truncate" title={t.processingError}>
                      {t.processingError}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{t.totalSlides || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(t.supportedLocales ?? []).map(l => (
                      <span key={l} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                        {LOCALE_LABELS[l] ?? l.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {t.publishedAt
                    ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 size={12} />{fmtDate(t.publishedAt)}</span>
                    : <span className="text-gray-300 text-xs">Not published</span>}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="text-center py-10 text-sm text-gray-400">No trainings match this filter.</p>
        )}
      </div>
    </div>
  )
}

// ── Missed FAQs tab ───────────────────────────────────────────────────────────

function MissedFaqsTab({
  questions, trainings,
}: {
  questions: UnansweredQuestion[]; trainings: Training[]
}) {
  const [filterTraining, setFilterTraining] = useState<string>('all')
  const [showReviewed, setShowReviewed] = useState(false)
  const markReviewed = useMarkReviewed()

  const trainingMap = Object.fromEntries(trainings.map(t => [t.id, t.name]))

  const affectedTrainings = [...new Set(questions.map(q => q.trainingId))]

  const visible = questions.filter(q => {
    if (!showReviewed && q.reviewed) return false
    if (filterTraining !== 'all' && q.trainingId !== filterTraining) return false
    return true
  })

  const topQuestions = questions
    .filter(q => !q.reviewed)
    .reduce<Record<string, number>>((acc, q) => {
      acc[q.question] = (acc[q.question] ?? 0) + 1
      return acc
    }, {})
  const topList = Object.entries(topQuestions).sort((a, b) => b[1] - a[1]).slice(0, 5)

  async function handleMark(id: string) {
    try {
      await markReviewed.mutateAsync(id)
      toast.success('Marked as reviewed')
    } catch {
      toast.error('Failed to update')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top repeated questions */}
      {topList.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Most Asked Gaps</h2>
          <div className="card divide-y divide-gray-50">
            {topList.map(([q, count]) => (
              <div key={q} className="flex items-center justify-between px-4 py-3 gap-4">
                <p className="text-sm text-gray-800 flex-1 min-w-0 truncate" title={q}>{q}</p>
                <span className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                  ×{count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterTraining}
          onChange={e => setFilterTraining(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="all">All Trainings</option>
          {affectedTrainings.map(tid => (
            <option key={tid} value={tid}>{trainingMap[tid] ?? tid.slice(0, 8)}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={showReviewed} onChange={e => setShowReviewed(e.target.checked)}
            className="rounded" />
          Show reviewed
        </label>
        <span className="text-xs text-gray-400 ml-auto">{visible.length} items</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Question</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Training</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Slide</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Locale</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Asked</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map(q => (
              <tr key={q.id} className={`hover:bg-gray-50/50 transition-colors ${q.reviewed ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 max-w-[280px]">
                  <p className="text-gray-900 line-clamp-2">{q.question}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">
                  {trainingMap[q.trainingId] ?? <span className="font-mono text-xs">{q.trainingId.slice(0, 8)}</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">#{q.slideIndex + 1}</td>
                <td className="px-4 py-3">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">
                    {(q.locale ?? 'en').toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDateTime(q.askedAt)}</td>
                <td className="px-4 py-3">
                  {q.reviewed
                    ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={12} />Reviewed</span>
                    : <span className="text-xs text-amber-600">Pending</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {!q.reviewed && (
                    <button
                      onClick={() => handleMark(q.id)}
                      disabled={markReviewed.isPending}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium whitespace-nowrap"
                    >
                      Mark reviewed
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <MessageSquareX size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No unanswered questions{filterTraining !== 'all' ? ' for this training' : ''}.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Assignments tab ───────────────────────────────────────────────────────────

const ASSIGNMENT_FILTERS = ['All', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'] as const
type AssignmentFilter = typeof ASSIGNMENT_FILTERS[number]

function AssignmentsTab({ assignments, trainings }: { assignments: Assignment[]; trainings: Training[] }) {
  const [filter, setFilter] = useState<AssignmentFilter>('All')
  const trainingMap = Object.fromEntries(trainings.map(t => [t.id, t.name]))

  const visible = filter === 'All' ? assignments : assignments.filter(a => a.status === filter)
  const count = (f: AssignmentFilter) => f === 'All' ? assignments.length : assignments.filter(a => a.status === f).length

  const completionRate = assignments.length > 0
    ? Math.round((assignments.filter(a => a.status === 'COMPLETED').length / assignments.length) * 100)
    : 0

  return (
    <div className="space-y-5">
      {/* Mini stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total',       value: assignments.length,                                        color: 'bg-gray-50   text-gray-700'   },
          { label: 'Assigned',    value: assignments.filter(a => a.status === 'ASSIGNED').length,    color: 'bg-yellow-50 text-yellow-700' },
          { label: 'In Progress', value: assignments.filter(a => a.status === 'IN_PROGRESS').length, color: 'bg-blue-50   text-blue-700'   },
          { label: 'Completed',   value: assignments.filter(a => a.status === 'COMPLETED').length,   color: 'bg-green-50  text-green-700'  },
          { label: 'Overdue',     value: assignments.filter(a => a.status === 'OVERDUE').length,     color: 'bg-red-50    text-red-700'    },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color.split(' ')[0]}`}>
            <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Completion bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Completion Rate</span>
          <span className="text-sm font-bold text-gray-900">{completionRate}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {ASSIGNMENT_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
            }`}
          >
            {f === 'All' ? 'All' : f.replace('_', ' ')} <span className="opacity-70">({count(f)})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Training</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deadline</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map(a => {
              const isOverdue = a.status === 'OVERDUE' || (a.status !== 'COMPLETED' && new Date(a.deadline) < new Date())
              return (
                <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.userId}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                    {trainingMap[a.trainingId] ?? <span className="font-mono text-xs">{a.trainingId.slice(0, 8)}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.product}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className={`px-4 py-3 text-xs font-medium ${isOverdue && a.status !== 'COMPLETED' ? 'text-red-600' : 'text-gray-500'}`}>
                    {fmtDate(a.deadline)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(a.assignedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="text-center py-10 text-sm text-gray-400">No assignments match this filter.</div>
        )}
      </div>
    </div>
  )
}

// ── Quiz Answers tab ──────────────────────────────────────────────────────────

function ScoreBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-9 text-right ${
        pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'
      }`}>{Math.round(pct)}%</span>
    </div>
  )
}

function QuizAnswersTab({
  evaluations, summary, trainings,
}: {
  evaluations: EvaluationResult[]; summary: EvalSummary[]; trainings: Training[]
}) {
  const [filterTraining, setFilterTraining] = useState<string>('all')
  const [expandedId, setExpandedId]         = useState<string | null>(null)

  const trainingMap = Object.fromEntries(trainings.map(t => [t.id, t.name]))

  const visible = filterTraining === 'all'
    ? evaluations
    : evaluations.filter(e => e.trainingId === filterTraining)

  const avgOverall = evaluations.length
    ? Math.round(evaluations.reduce((s, e) => s + e.scorePercent, 0) / evaluations.length)
    : 0

  const passCount = evaluations.filter(e => e.scorePercent >= 60).length

  return (
    <div className="space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Submissions" value={evaluations.length}  icon={BarChart2}  color="bg-indigo-500" />
        <StatCard label="Avg Score"         value={`${avgOverall}%`}    icon={Star}       color="bg-amber-500"  />
        <StatCard label="Passed (≥60%)"     value={passCount}           icon={ThumbsUp}   color="bg-green-500"  />
        <StatCard label="Below 60%"         value={evaluations.length - passCount} icon={ThumbsDown} color="bg-red-500" />
      </div>

      {/* Per-training avg scores */}
      {summary.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Avg Score by Training</h2>
          <div className="card divide-y divide-gray-50">
            {summary.map(s => (
              <div key={s.trainingId} className="flex items-center gap-4 px-4 py-3">
                <p className="flex-1 text-sm font-medium text-gray-800 truncate min-w-0">
                  {trainingMap[s.trainingId] ?? <span className="font-mono text-xs">{s.trainingId.slice(0, 8)}</span>}
                </p>
                <ScoreBar pct={s.avgScore} />
                <span className="text-xs text-gray-400 w-20 text-right flex-shrink-0">{s.submissions} attempts</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filterTraining}
          onChange={e => setFilterTraining(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="all">All Trainings</option>
          {[...new Set(evaluations.map(e => e.trainingId))].map(tid => (
            <option key={tid} value={tid}>{trainingMap[tid] ?? tid.slice(0, 8)}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{visible.length} results</span>
      </div>

      {/* Results table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Training</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Result</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Evaluated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map(e => {
              const expanded = expandedId === e.submissionId
              return (
                <>
                  <tr
                    key={e.submissionId}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : e.submissionId)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{e.userId}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                      {trainingMap[e.trainingId] ?? <span className="font-mono text-xs">{e.trainingId.slice(0, 8)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{e.score}/{e.maxScore}</span>
                        <ScoreBar pct={e.scorePercent} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        e.scorePercent >= 80 ? 'bg-green-100 text-green-700' :
                        e.scorePercent >= 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {e.scorePercent >= 80 ? 'Excellent' : e.scorePercent >= 60 ? 'Pass' : 'Needs Work'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDateTime(e.evaluatedAt)}</td>
                    <td className="px-4 py-3 text-gray-400">
                      <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    </td>
                  </tr>
                  {expanded && (
                    <tr key={`${e.submissionId}-detail`} className="bg-gray-50/80">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          {e.feedback && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Feedback</p>
                              <p className="text-gray-700 leading-relaxed">{e.feedback}</p>
                            </div>
                          )}
                          {e.strengths && (
                            <div>
                              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Strengths</p>
                              <p className="text-gray-700 leading-relaxed">{e.strengths}</p>
                            </div>
                          )}
                          {e.improvements && (
                            <div>
                              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Improvements</p>
                              <p className="text-gray-700 leading-relaxed">{e.improvements}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <BarChart2 size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No quiz submissions yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  const { data: trainings = [],    isLoading: tLoad } = useTrainings()
  const { data: assignments = [],  isLoading: aLoad } = useAssignments()
  const { data: unanswered = [],   isLoading: qLoad } = useUnansweredQuestions()
  const { data: evaluations = [] }                    = useEvaluationResults()
  const { data: evalSummary = [] }                    = useEvalSummary()

  const isLoading = tLoad || aLoad

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Health overview of your training content platform.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
          <Clock size={13} />
          {new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8 w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'Missed FAQs' && unanswered.filter(q => !q.reviewed).length > 0 && (
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                {unanswered.filter(q => !q.reviewed).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-400 py-16 justify-center">
          <Loader2 size={20} className="animate-spin" />
          Loading dashboard data…
        </div>
      ) : (
        <>
          {activeTab === 'Overview' && (
            <OverviewTab trainings={trainings} assignments={assignments} unanswered={unanswered} />
          )}
          {activeTab === 'Trainings' && (
            <TrainingsTab trainings={trainings} />
          )}
          {activeTab === 'Missed FAQs' && (
            <MissedFaqsTab questions={unanswered} trainings={trainings} />
          )}
          {activeTab === 'Assignments' && (
            <AssignmentsTab assignments={assignments} trainings={trainings} />
          )}
          {activeTab === 'Quiz Answers' && (
            <QuizAnswersTab evaluations={evaluations} summary={evalSummary} trainings={trainings} />
          )}
        </>
      )}
    </div>
  )
}
