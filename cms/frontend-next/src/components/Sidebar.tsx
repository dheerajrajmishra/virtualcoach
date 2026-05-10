"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UploadCloud, Users, Activity, Eye, ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'           },
  { to: '/',            icon: UploadCloud,     label: 'Upload Training'     },
  { to: '/processing',  icon: Activity,        label: 'Processing Pipeline' },
  { to: '/preview',     icon: Eye,             label: 'Preview'             },
  { to: '/assignments', icon: Users,           label: 'Assignments'         },
]

export function Sidebar() {
  const [navOpen, setNavOpen] = useState(true)
  const pathname = usePathname()

  return (
    <aside
      className={`${navOpen ? 'w-64' : 'w-16'} bg-brand text-white flex flex-col flex-shrink-0 transition-all duration-200`}
    >
      {/* Logo / header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-brand-accent">
        {navOpen && (
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">Pitch Perfect</h1>
            <p className="text-xs text-gray-400 mt-0.5">Content Management</p>
          </div>
        )}
        <button
          onClick={() => setNavOpen(v => !v)}
          className={`p-1.5 rounded-lg hover:bg-brand-accent transition-colors flex-shrink-0 ${!navOpen ? 'mx-auto' : ''}`}
          title={navOpen ? 'Collapse menu' : 'Expand menu'}
        >
          {navOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          // Check if active (handle root vs others)
          const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to)
          
          return (
            <Link
              key={to}
              href={to}
              title={!navOpen ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-brand-accent'
              } ${!navOpen ? 'justify-center' : ''}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {navOpen && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
