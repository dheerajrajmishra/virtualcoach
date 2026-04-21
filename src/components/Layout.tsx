import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LayoutDashboard, Upload, Users, BarChart3, LogOut, PlayCircle, BookOpen, Menu, X } from "lucide-react";
import { logOut } from "../lib/firebase";

interface LayoutProps {
  portal: "admin" | "learner";
}

export const Layout: React.FC<LayoutProps> = ({ portal }) => {
  const { profile, isAdmin } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const adminNav = [
    { name: "Upload Training", path: "/admin/upload", icon: Upload },
    { name: "Assign Training", path: "/admin/assign", icon: Users },
    { name: "Reports", path: "/admin/reports", icon: BarChart3 },
  ];

  const learnerNav = [
    { name: "Dashboard", path: "/learn/dashboard", icon: LayoutDashboard },
  ];

  // Admins see all navigation options, learners only see learner options
  const navItems = isAdmin ? [...adminNav, ...learnerNav] : learnerNav;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`absolute md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm transform transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl transition-transform hover:scale-105">V</div>
            <h1 className="text-sm font-semibold text-slate-900 tracking-tight uppercase">VirtualCoach</h1>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 mb-4">
            {isAdmin ? "Main Menu" : `${portal} menu`}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                onClick={() => setIsSidebarOpen(false)}
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                  ? "bg-slate-50 text-primary border-r-2 border-primary shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                }`}
              >
                <Icon size={18} className={`${isActive ? "text-primary" : "text-slate-400 group-hover:text-primary"} transition-colors`} />
                <span className={`text-sm ${isActive ? "font-bold" : "font-medium"}`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100 space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-medium border-2 border-white shadow-sm ring-1 ring-slate-100">
              {profile?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate leading-tight">{profile?.name}</p>
              <p className="text-[10px] text-slate-400 truncate leading-tight uppercase font-bold tracking-wider">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={() => logOut()}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-all text-slate-600 hover:text-rose-500 border border-transparent hover:border-slate-100 group"
          >
            <LogOut size={18} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-50/50">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm z-30 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">V</div>
            <h1 className="text-sm font-semibold text-slate-900 tracking-tight uppercase">VirtualCoach</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            <Menu size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 w-full max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
