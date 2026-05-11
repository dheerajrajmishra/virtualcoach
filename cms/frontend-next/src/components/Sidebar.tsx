"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UploadCloud, Users, Activity, Eye, ChevronLeft, ChevronRight, LayoutDashboard, BookOpen } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'           },
  { to: '/trainings',   icon: BookOpen,        label: 'Trainings'           },
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
      className={`${navOpen ? 'w-64' : 'w-[72px]'} bg-brand text-white flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out border-r border-gray-800/50 shadow-xl relative z-10`}
    >
      {/* Logo / header */}
      <div className={`flex items-center ${navOpen ? 'justify-between px-5' : 'justify-center'} py-6 relative`}>
        {navOpen && (
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <span className="font-bold text-white text-sm">VC</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white/90">Virtual Coach</h1>
            </div>
          </div>
        )}
        <button
          onClick={() => setNavOpen(v => !v)}
          className={`p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 ${!navOpen ? 'mt-2' : ''}`}
          title={navOpen ? 'Collapse menu' : 'Expand menu'}
        >
          {navOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to)
          
          return (
            <Link
              key={to}
              href={to}
              title={!navOpen ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive 
                  ? 'bg-gradient-to-r from-primary-600/90 to-primary-500/80 text-white shadow-md shadow-primary-500/20' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              } ${!navOpen ? 'justify-center' : ''}`}
            >
              <Icon size={20} className={`flex-shrink-0 transition-transform duration-200 ${!isActive && 'group-hover:scale-110'}`} />
              {navOpen && <span className="truncate">{label}</span>}
              
              {/* Active Indicator Line */}
              {isActive && !navOpen && (
                <div className="absolute left-0 w-1 h-5 bg-white rounded-r-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer / User Area (placeholder) */}
      <div className={`p-4 border-t border-gray-800/50 ${navOpen ? 'flex items-center gap-3' : 'flex justify-center'}`}>
        <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-gray-300">A</span>
        </div>
        {navOpen && (
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/90 truncate">Admin User</p>
            <p className="text-xs text-gray-500 truncate">admin@virtualcoach.ai</p>
          </div>
        )}
      </div>
    </aside>
  )
}
