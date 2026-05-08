import { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import AssignmentPage from './pages/AssignmentPage'
import ProcessingPage from './pages/ProcessingPage'
import PreviewPage from './pages/PreviewPage'
import { UploadCloud, Users, Activity, Eye, ChevronLeft, ChevronRight } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',            end: true,  icon: UploadCloud, label: 'Upload Training'    },
  { to: '/processing',  end: false, icon: Activity,    label: 'Processing Pipeline' },
  { to: '/preview',     end: false, icon: Eye,         label: 'Preview'             },
  { to: '/assignments', end: false, icon: Users,       label: 'Assignments'         },
]

export default function App() {
  const [navOpen, setNavOpen] = useState(true)

  return (
    <BrowserRouter>
      <div className="min-h-screen flex">

        {/* ── Collapsible sidebar ── */}
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
            {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={!navOpen ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-brand-accent'
                  } ${!navOpen ? 'justify-center' : ''}`
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {navOpen && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-auto flex flex-col min-w-0">
          <Routes>
            <Route path="/"            element={<UploadPage />} />
            <Route path="/processing"  element={<ProcessingPage />} />
            <Route path="/preview"     element={<PreviewPage />} />
            <Route path="/preview/:id" element={<PreviewPage />} />
            <Route path="/assignments" element={<AssignmentPage />} />
          </Routes>
        </main>

      </div>
    </BrowserRouter>
  )
}
