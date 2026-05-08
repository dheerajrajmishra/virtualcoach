import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import AssignmentPage from './pages/AssignmentPage'
import { UploadCloud, Users } from 'lucide-react'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex">
        <aside className="w-64 bg-brand text-white flex flex-col">
          <div className="p-6 border-b border-brand-accent">
            <h1 className="text-xl font-bold tracking-tight">Pitch Perfect</h1>
            <p className="text-xs text-gray-400 mt-1">Content Management</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-brand-accent'
                }`
              }
            >
              <UploadCloud size={18} />
              Upload Training
            </NavLink>
            <NavLink
              to="/assignments"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-brand-accent'
                }`
              }
            >
              <Users size={18} />
              Assignments
            </NavLink>
          </nav>
        </aside>

        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/assignments" element={<AssignmentPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
