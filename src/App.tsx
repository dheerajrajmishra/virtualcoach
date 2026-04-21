import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { AdminUpload } from "./pages/AdminUpload";
import { AdminAssign } from "./pages/AdminAssign";
import { AdminReports } from "./pages/AdminReports";
import { LearnerDashboard } from "./pages/LearnerDashboard";
import { LearnerPlayer } from "./pages/LearnerPlayer";
import { Loader2 } from "lucide-react";

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={48} />
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/learn/dashboard" />;

  return <>{children}</>;
};

export default function App() {
  return (
    <Routes>
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      
      <Route path="/admin" element={<ProtectedRoute adminOnly><Layout portal="admin" /></ProtectedRoute>}>
        <Route index element={<Navigate to="/admin/upload" />} />
        <Route path="upload" element={<AdminUpload />} />
        <Route path="assign" element={<AdminAssign />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      <Route path="/learn" element={<ProtectedRoute><Layout portal="learner" /></ProtectedRoute>}>
        <Route index element={<Navigate to="/learn/dashboard" />} />
        <Route path="dashboard" element={<LearnerDashboard />} />
        <Route path="play/:trainingId" element={<LearnerPlayer />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}
