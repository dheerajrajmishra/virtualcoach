import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { 
  Users, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  UserPlus,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { motion } from "motion/react";

export const AdminAssign: React.FC = () => {
  const [trainings, setTrainings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const trainSnap = await getDocs(collection(db, "trainings"));
      const userSnap = await getDocs(query(collection(db, "users")));
      setTrainings(trainSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setUsers(userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleAssign = async () => {
    if (!selectedTraining || selectedUsers.length === 0) return;
    setIsAssigning(true);
    
    try {
      for (const userId of selectedUsers) {
        await addDoc(collection(db, "assignments"), {
          trainingId: selectedTraining,
          userId,
          deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          assignedAt: serverTimestamp()
        });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setSelectedUsers([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-12">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-[0.9]">Assign<br/>Trainings</h1>
        <p className="text-slate-500 font-medium">Select a module and assign it to individual learners or teams.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Step 1: Select Training */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">1</div>
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Training</h3>
          </div>
          <div className="space-y-3">
             {trainings.map(t => (
               <button
                key={t.id}
                onClick={() => setSelectedTraining(t.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedTraining === t.id 
                  ? "bg-white border-primary shadow-lg ring-2 ring-primary/10" 
                  : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
                }`}
               >
                 <p className="text-sm font-bold text-slate-900">{t.name}</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">{t.productName}</p>
               </button>
             ))}
          </div>
        </div>

        {/* Step 2: Select Users */}
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">2</div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Assign To</h3>
           </div>
           
           <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                 <Search size={16} className="text-slate-400" />
                 <input type="text" placeholder="Search by name or team..." className="bg-transparent text-sm outline-none w-full" />
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {users.map(u => (
                   <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      selectedUsers.includes(u.id) ? "bg-primary/5 border border-primary/20" : "hover:bg-slate-50 border border-transparent"
                    }`}
                   >
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                           {u.name?.charAt(0)}
                        </div>
                        <div className="text-left">
                           <p className="text-xs font-bold text-slate-800 leading-tight">{u.name}</p>
                           <p className="text-[10px] text-slate-400 font-medium leading-tight">{u.email}</p>
                        </div>
                     </div>
                     {selectedUsers.includes(u.id) && <CheckCircle2 size={16} className="text-primary" />}
                   </button>
                 ))}
              </div>
           </div>
        </div>

        {/* Step 3: Finalize */}
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">3</div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Set Deadline</h3>
           </div>

           <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-8">
              <div className="space-y-4">
                 <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span>Target Date</span>
                    <CalendarIcon size={14} />
                 </div>
                 <input 
                  type="date" 
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                 />
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                 <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Summary</p>
                 <p className="text-sm font-semibold text-slate-700">
                    Assigning <span className="text-primary">{trainings.find(t => t.id === selectedTraining)?.name || "N/A"}</span> to {selectedUsers.length} users.
                 </p>
              </div>

              <button
                disabled={!selectedTraining || selectedUsers.length === 0 || isAssigning}
                onClick={handleAssign}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isAssigning ? <Loader2 className="animate-spin" size={18} /> : success ? <CheckCircle2 size={18} /> : <UserPlus size={18} />}
                {isAssigning ? "Processing..." : success ? "Assigned Successfully" : `Assign to ${selectedUsers.length} Learners`}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
