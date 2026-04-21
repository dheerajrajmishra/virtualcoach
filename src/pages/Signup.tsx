import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth, db } from "../lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { BookOpen, UserPlus, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

export const Signup: React.FC = () => {
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (loading) return null;
  if (user) {
    // Redirect to learner dashboard after signup
    return <Navigate to="/learn" />;
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Update Firebase auth profile with the user's name
      await updateProfile(newUser, { displayName: name });

      // Create user document in Firestore to store role and other details
      await setDoc(doc(db, "users", newUser.uid), {
        name: name,
        email: newUser.email,
        role: "learner",
        createdAt: serverTimestamp()
      });

      // The AuthProvider will now automatically log the user in and redirect.
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("This email address is already in use.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters long.");
      } else {
        setError(err.message || "Failed to create an account.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Left side - Branding */}
      <div className="w-full md:w-1/2 bg-primary flex flex-col items-center justify-center text-white p-12 relative overflow-hidden">
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
        </motion.div>
      </div>

      {/* Right side - Signup Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-slate-50 relative">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-sm w-full space-y-12"
        >
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 leading-[0.9]">Create<br/>Account</h2>
            <p className="text-slate-500 font-medium">Join the platform to start your learning journey.</p>
          </div>

        <form 
          onSubmit={handleSignup}
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
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
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
          <button type="submit" className="w-full bg-primary text-white px-6 py-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]">
            <UserPlus size={20} />
            Create Account
          </button>
          <p className="text-center text-sm text-slate-500 pt-4">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </form>
        </motion.div>
      </div>
    </div>
  );
};