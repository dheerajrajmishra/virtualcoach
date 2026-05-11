"use client"

import React, { useState } from 'react'
import { 
  BookOpen, Plus, Users, CheckCircle2, ChevronRight, 
  BarChart3, Settings, ExternalLink, Loader2, ArrowRight, Eye,
  Star, Trophy, ThumbsUp, ThumbsDown
} from 'lucide-react'
import Link from 'next/link'
import { 
  useTrainings, useAssignments, useEvaluationResults, useLearnerProgress,
  Training, Assignment, EvaluationResult 
} from '@/api/trainingApi'
import AssignUserModal from '@/components/AssignUserModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  READY:       { label: 'Ready',       color: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  PROCESSING:  { label: 'Processing',  color: 'bg-blue-50 text-blue-600 border border-blue-100 animate-pulse' },
  ERROR:       { label: 'Error',       color: 'bg-red-100 text-red-700 border border-red-200' },
  DRAFT:       { label: 'Draft',       color: 'bg-gray-100 text-gray-600 border border-gray-200' },
}

function ProgressRing({ value }: { value: number }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative w-12 h-12">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="24" cy="24" r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="3.5"
          className="text-gray-100"
        />
        <circle
          cx="24" cy="24" r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary-500 transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
        {Math.round(value)}%
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TrainingsPage() {
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedLearnerId, setExpandedLearnerId] = useState<string | null>(null)

  const { data: trainings = [], isLoading: tLoad } = useTrainings()
  const { data: assignments = [], isLoading: aLoad } = useAssignments()
  const { data: evaluations = [] } = useEvaluationResults()
  const { data: progressRecords = [] } = useLearnerProgress()

  const isLoading = tLoad || aLoad

  const getStats = (trainingId: string) => {
    const relevant = assignments.filter(a => a.trainingId === trainingId)
    const total = relevant.length
    
    // Calculate average progress and completion count across all assigned learners
    let sumPercent = 0
    let completed = 0
    let inProgress = 0
    
    relevant.forEach(a => {
      const prog = progressRecords.find(p => p.userId === a.userId && p.trainingId === a.trainingId)
      
      const isRecordComplete = prog?.status === 'COMPLETED' || (prog?.completionPercent ?? 0) >= 100
      const isAssignmentComplete = a.status === 'COMPLETED'
      
      if (isRecordComplete || isAssignmentComplete) {
        completed++
        sumPercent += 100
      } else if (prog || a.status === 'IN_PROGRESS') {
        inProgress++
        sumPercent += (prog?.completionPercent ?? 0)
      }
    })
    
    const percent = total > 0 ? sumPercent / total : 0
    return { total, completed, inProgress, percent }
  }

  const handleAssign = (t: Training, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedTraining(t)
    setIsModalOpen(true)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-full bg-mesh">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <BookOpen className="text-primary-600" size={32} />
            Trainings Management
          </h1>
          <p className="text-gray-500 mt-2 text-sm max-w-xl">
            Monitor ingestion status, track learner completion rates across modules, 
            and manage user assignments for your training content.
          </p>
        </div>
        
        <Link href="/" className="btn-primary flex items-center gap-2 px-6 shadow-lg shadow-primary-500/20">
          <Plus size={18} />
          Add New Training
        </Link>
      </div>

      <AssignUserModal 
        training={selectedTraining} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* Grid Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-4">
          <Loader2 size={32} className="animate-spin text-primary-500" />
          <p className="font-medium">Loading training modules...</p>
        </div>
      ) : trainings.length === 0 ? (
        <div className="glass-card py-20 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
            <BookOpen size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Trainings Found</h3>
          <p className="text-gray-500 mt-1 mb-6 text-sm">Get started by creating your first training module.</p>
          <Link href="/" className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Create Training
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {trainings.map(t => {
            const { total, completed, inProgress, percent } = getStats(t.id)
            const status = STATUS_CONFIG[t.status] || { label: t.status, color: 'bg-gray-100 text-gray-600 border border-gray-200' }
            const isExpanded = expandedId === t.id
            const trainingAssignments = assignments.filter(a => a.trainingId === t.id)
            
            return (
              <div key={t.id} className="flex flex-col gap-1">
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  className={`glass-card p-5 group cursor-pointer transition-all duration-300 flex flex-col md:flex-row md:items-center gap-6 ${isExpanded ? 'border-primary-300 ring-1 ring-primary-100 bg-white/80' : 'hover:shadow-md hover:border-primary-200/50'}`}
                >
                  {/* Module Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${t.publishedAt ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20' : status.color}`}>
                        {t.publishedAt && <CheckCircle2 size={10} />}
                        {t.publishedAt ? 'Published' : status.label}
                      </span>
                      <span className="text-[11px] font-mono text-gray-400">#{t.id.slice(0, 8)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                      {t.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Settings size={14} className="text-gray-400" />
                        {t.category}
                      </span>
                      <span className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
                        <BarChart3 size={14} className="text-gray-400" />
                        {t.product}
                      </span>
                      <span className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
                        <CheckCircle2 size={14} className="text-gray-400" />
                        {t.totalSlides} Slides
                      </span>
                      <div className="flex flex-wrap gap-1 border-l border-gray-200 pl-4">
                        {(t.supportedLocales ?? []).map(l => (
                          <span key={l} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-bold text-[9px] uppercase">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-10 px-6 border-l border-r border-gray-100">
                    <div className="flex items-center gap-4">
                      <ProgressRing value={percent} />
                      <div className="min-w-[120px]">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                          {completed} <span className="text-gray-400 font-medium">/ {total}</span>
                        </div>
                        <p className="text-[11px] font-medium text-gray-400">Learners Completed</p>
                      </div>
                    </div>
                    
                    <div className="hidden lg:block text-right min-w-[80px]">
                      <div className="flex items-center gap-1 justify-end text-sm font-bold text-indigo-600">
                        {inProgress}
                      </div>
                      <p className="text-[11px] font-medium text-gray-400 text-nowrap">In Progress</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => handleAssign(t, e)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                    >
                      Assign User
                      <ArrowRight size={16} />
                    </button>
                    
                    <Link
                      href={`/preview/${t.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                      title="Preview Training Content"
                    >
                      <Eye size={20} />
                    </Link>
                    
                    <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-primary-100 text-primary-600' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}>
                      <ChevronRight size={20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mx-4 -mt-1 mb-4 p-6 glass-card rounded-t-none border-t-0 bg-white/40 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Users size={16} className="text-primary-500" />
                        Learner Progress Details
                      </h4>
                      <span className="text-xs text-gray-400 font-medium">{trainingAssignments.length} total assignments</span>
                    </div>

                    {trainingAssignments.length === 0 ? (
                      <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-sm text-gray-400 font-medium text-balance max-w-xs mx-auto">
                          No learners assigned to this module yet. Use the "Assign User" button above to get started.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">User ID</th>
                              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Progress</th>
                              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quiz Score</th>
                              <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deadline</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {trainingAssignments.map(a => {
                              const evalResult = evaluations.find(e => e.userId === a.userId && e.trainingId === a.trainingId)
                              const prog = progressRecords.find(p => p.userId === a.userId && p.trainingId === a.trainingId)
                              const percentVal = prog ? Math.round(prog.completionPercent) : (a.status === 'COMPLETED' ? 100 : 0)
                              const isLearnerExpanded = expandedLearnerId === `${t.id}-${a.userId}`

                              return (
                                <React.Fragment key={a.id}>
                                  <tr 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setExpandedLearnerId(isLearnerExpanded ? null : `${t.id}-${a.userId}`)
                                    }}
                                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isLearnerExpanded ? 'bg-indigo-50/30' : ''}`}
                                  >
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-600">
                                          {a.userId.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-gray-900 hover:text-primary-600 transition-colors">{a.userId}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        (a.status === 'COMPLETED' || prog?.status === 'COMPLETED') ? 'bg-green-100 text-green-700' :
                                        a.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                        a.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        {(a.status === 'COMPLETED' || prog?.status === 'COMPLETED') ? 'COMPLETED' : a.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2 min-w-[100px]">
                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full ${a.status === 'COMPLETED' ? 'bg-green-500' : 'bg-primary-500'}`}
                                            style={{ width: `${percentVal}%` }}
                                          />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400">
                                          {percentVal}%
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      {evalResult ? (
                                        <div className="flex items-center gap-1.5">
                                          <Star size={12} className="text-amber-500 fill-amber-500" />
                                          <span className={`text-xs font-bold ${evalResult.scorePercent >= 80 ? 'text-green-600' : 'text-primary-600'}`}>
                                            {Math.round(evalResult.scorePercent)}%
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-300 font-medium">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 font-medium">
                                      {new Date(a.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </td>
                                  </tr>
                                  
                                  {isLearnerExpanded && (
                                    <tr className="bg-white/60">
                                      <td colSpan={5} className="px-8 py-6">
                                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                          {evalResult ? (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                              <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-primary-600">
                                                  <Trophy size={16} />
                                                  <h5 className="text-xs font-bold uppercase tracking-wider">Coach Feedback</h5>
                                                </div>
                                                <p className="text-sm text-gray-700 leading-relaxed bg-white/50 p-3 rounded-xl border border-primary-100">
                                                  {evalResult.feedback || 'No detailed feedback available yet.'}
                                                </p>
                                              </div>
                                              <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-green-600">
                                                  <ThumbsUp size={16} />
                                                  <h5 className="text-xs font-bold uppercase tracking-wider">Key Strengths</h5>
                                                </div>
                                                <p className="text-sm text-gray-700 leading-relaxed bg-green-50/30 p-3 rounded-xl border border-green-100">
                                                  {evalResult.strengths || 'Consistent performance across modules.'}
                                                </p>
                                              </div>
                                              <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-amber-600">
                                                  <ThumbsDown size={16} />
                                                  <h5 className="text-xs font-bold uppercase tracking-wider">Growth Areas</h5>
                                                </div>
                                                <p className="text-sm text-gray-700 leading-relaxed bg-amber-50/30 p-3 rounded-xl border border-amber-100">
                                                  {evalResult.improvements || 'Focus on rapid response times in later slides.'}
                                                </p>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center justify-center py-4 text-center">
                                              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-2">
                                                <BarChart3 size={24} />
                                              </div>
                                              <p className="text-sm font-medium text-gray-500">Analysis Pending</p>
                                              <p className="text-xs text-gray-400 mt-1">Detailed feedback will be available once the learner completes their quiz.</p>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
