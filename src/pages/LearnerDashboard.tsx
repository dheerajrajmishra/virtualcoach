import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db, auth } from "../lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronRight,
  TrendingUp,
  Award,
  BookOpen
} from "lucide-react";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";

export const LearnerDashboard: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!auth.currentUser) return;
      
      const q = query(
        collection(db, "assignments"),
        where("userId", "==", auth.currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      const data = await Promise.all(snapshot.docs.map(async (d) => {
        const assignment = { id: d.id, ...d.data() };
        const trainingDoc = await getDoc(doc(db, "trainings", (assignment as any).trainingId));
        return { 
          ...assignment, 
          training: trainingDoc.data() 
        };
      }));
      
      setAssignments(data);
      setLoading(false);
    };

    fetchAssignments();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  const incomplete = assignments.filter(a => a.status === "pending");
  const completed = assignments.filter(a => a.status === "completed");

  return (
    <div className="space-y-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-[0.9]">Learner<br/>Dashboard</h1>
          <p className="text-slate-500 font-medium tracking-tight">You have {incomplete.length} pending trainings to complete.</p>
        </div>
        <div className="flex gap-4">
           <StatCard label="Completed" value={completed.length} icon={<Award className="text-amber-500" />} />
           <StatCard label="Continuous Streak" value="12 Days" icon={<TrendingUp className="text-success" />} />
        </div>
      </div>

      {/* Trainings List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">My Trainings</h2>
          <div className="h-[1px] flex-1 mx-4 bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment, idx) => (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link to={`/learn/play/${assignment.trainingId}`}>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group flex flex-col h-full ring-primary/0 hover:ring-2">
                  <div className="flex justify-between items-start mb-6">
                     <div className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {assignment.training?.category || "Sales"}
                     </div>
                     <StatusBadge status={assignment.status} deadline={assignment.deadline} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight group-hover:text-primary transition-colors">
                    {assignment.training?.name || "Product Training"}
                  </h3>
                  <p className="text-slate-500 text-sm mb-8 flex items-center gap-2">
                    <BookOpen size={14} />
                    {assignment.training?.productName}
                  </p>

                  <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Clock size={16} className="text-slate-400" />
                       <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {assignment.deadline ? `Due ${formatDistanceToNow(new Date(assignment.deadline))} ago` : "No deadline"}
                       </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-inner group-hover:shadow-lg">
                      <PlayCircle size={20} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
          
          {assignments.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
               <BookOpen className="mx-auto mb-4 text-slate-300" size={48} />
               <p className="text-slate-500 font-medium">No trainings assigned yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }: any) => (
  <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-900 leading-none">{value}</p>
    </div>
  </div>
);

const StatusBadge = ({ status, deadline }: any) => {
  const isOverdue = deadline ? new Date(deadline) < new Date() : false;
  
  if (status === "completed") {
    return (
      <div className="flex items-center gap-1.5 text-success font-bold text-[10px] uppercase bg-success/10 px-2.5 py-1 rounded-full">
        <CheckCircle2 size={12} />
        Completed
      </div>
    );
  }

  if (isOverdue) {
    return (
      <div className="flex items-center gap-1.5 text-rose-500 font-bold text-[10px] uppercase bg-rose-50 px-2.5 py-1 rounded-full">
        <AlertTriangle size={12} />
        Overdue
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-primary font-bold text-[10px] uppercase bg-primary/5 px-2.5 py-1 rounded-full">
      <Clock size={12} />
      In Progress
    </div>
  );
};
