"use client";
import { useAssignments } from '../api/trainingApi'
import { format } from 'date-fns'
import { Clock, CheckCircle, AlertTriangle, PlayCircle } from 'lucide-react'

const STATUS_STYLES: Record<string, { color: string; icon: React.ReactNode }> = {
  ASSIGNED: { color: 'text-blue-600 bg-blue-50', icon: <Clock size={14} /> },
  IN_PROGRESS: { color: 'text-yellow-600 bg-yellow-50', icon: <PlayCircle size={14} /> },
  COMPLETED: { color: 'text-green-600 bg-green-50', icon: <CheckCircle size={14} /> },
  OVERDUE: { color: 'text-red-600 bg-red-50', icon: <AlertTriangle size={14} /> },
}

export default function AssignmentDashboard({ productFilter }: { productFilter: string }) {
  const { data: assignments = [], isLoading } = useAssignments(
    productFilter ? { product: productFilter } : undefined
  )

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Loading assignments...</div>
  }

  if (assignments.length === 0) {
    return (
      <div className="card text-center py-12 text-gray-400">
        No assignments found. Create one to get started.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['User ID', 'Training ID', 'Product', 'Status', 'Deadline', 'Assigned By'].map((h) => (
              <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {assignments.map((a: {
            id: string; userId: string; trainingId: string; product: string;
            status: string; deadline: string; assignedBy: string
          }) => {
            const style = STATUS_STYLES[a.status] ?? STATUS_STYLES.ASSIGNED
            return (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{a.userId}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.trainingId}</td>
                <td className="px-4 py-3">{a.product}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.color}`}>
                    {style.icon}
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {format(new Date(a.deadline), 'dd MMM yyyy HH:mm')}
                </td>
                <td className="px-4 py-3 text-gray-500">{a.assignedBy}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

