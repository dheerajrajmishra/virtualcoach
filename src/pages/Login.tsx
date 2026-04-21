import React, { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { BookOpen, LogIn, ChevronRight, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

export const Login: React.FC = () => {
  const { user, loading, profile, isAdmin } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  if (loading) return null;
  if (user) {
    return <Navigate to={isAdmin || profile?.role === "admin" ? "/admin" : "/learn"} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Left side - Branding */}
      <div className="w-full md:w-1/2 bg-primary flex flex-col items-center justify-center text-white p-12 relative overflow-hidden">
         {/* Background pattern */}
         <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-10 -left-20 w-96 h-96 border-[1px] border-white rounded-full"></div>
            <div className="absolute bottom-40 left-40 w-80 h-80 border-[1px] border-white rounded-full"></div>
         </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center z-10"
        >
          <BookOpen className="mx-auto mb-8 h-20 w-20" strokeWidth={1.5} />
          <h1 className="text-5xl font-bold mb-6 tracking-tighter uppercase leading-[0.9]">Virtual<br/>Coach</h1>
          <p className="text-white/70 text-lg font-light leading-relaxed mb-8">
            The intelligent training delivery platform for high-performance enterprise sales teams.
          </p>
          <div className="flex justify-center gap-4">
             <div className="px-4 py-1 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-widest">Enterprise Ready</div>
             <div className="px-4 py-1 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-widest">AI Assisted</div>
          </div>
        </motion.div>
      </div>

      {/* Right side - Login */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-slate-50 relative">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-sm w-full space-y-12"
        >
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 leading-[0.9]">Welcome<br/>Back</h2>
            <p className="text-slate-500 font-medium">Please sign in to your enterprise account to continue.</p>
          </div>

        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              await signInWithEmailAndPassword(auth, email, password);
            } catch (err: any) {
              setError(err.message || "Failed to log in");
            }
          }}
          className="space-y-4"
        >
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 text-rose-600 text-sm font-semibold">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white px-6 py-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            <LogIn size={20} />
            Sign In
          </button>
          <div className="text-center text-sm text-slate-500 pt-2">
            Don't have an account?{" "}
            <Link to="/signup" className="font-bold text-primary hover:underline">
              Sign Up
            </Link>
          </div>
          <button
            type="button"
            onClick={async () => {
                // Secret dev helper to seed data for testing
                try {
                  const { db } = await import("../lib/firebase");
                  const { collection, addDoc, getDocs, deleteDoc, doc } = await import("firebase/firestore");
                  
                  // Simple check if admin exists
                  const t = await addDoc(collection(db, "trainings"), {
                    name: "CloudConnect Pro Masterclass",
                    productName: "CloudConnect Pro",
                    category: "Enterprise Software",
                    subCategory: "CRM",
                    languages: ["en", "hi", "ta"],
                    status: "published",
                    slideCount: 8,
                    createdAt: new Date().toISOString()
                  });

                  alert("Demo training created! Log in to see it.");
                } catch (e) {
                  console.error(e);
                }
              }}
              className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:text-primary transition-colors border border-transparent hover:border-primary/20 rounded-lg"
            >
              Initialize Demo Data
            </button>
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider">Secure corporate authentication</p>
        </form>

          <div className="pt-12 border-t border-slate-200">
             <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">For Admins</h4>
                  <p className="text-xs text-slate-600 leading-relaxed italic">Upload modules, assign teams, and view performance deep-dives.</p>
                </div>
                <div>
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">For Learners</h4>
                   <p className="text-xs text-slate-600 leading-relaxed italic">Interactive slides, AI coaching, and skill-based certifications.</p>
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
