import React from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Users, 
  Download,
  ArrowUpRight,
  PieChart as PieIcon
} from "lucide-react";
import { motion } from "motion/react";

export const AdminReports: React.FC = () => {
  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1 md:space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-[0.9]">Analytics<br/>Insights</h1>
          <p className="text-slate-500 font-medium">Global performance metrics and team-level proficiency tracking.</p>
        </div>
        <button className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
           <Download size={16} />
           Export Report
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <MetricCard label="Total Completions" value="1,284" change="+12.5%" trend="up" icon={<TrendingUp className="text-primary" />} />
        <MetricCard label="Avg. Score" value="88%" change="+2.1%" trend="up" icon={<Target className="text-accent" />} />
        <MetricCard label="Active Learners" value="482" change="-3.4%" trend="down" icon={<Users className="text-slate-400" />} />
        <MetricCard label="Pass Rate" value="94.2%" change="+0.8%" trend="up" icon={<PieIcon className="text-success" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
         {/* Top Trainings */}
         <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8">Performance by Training</h3>
            <div className="space-y-8">
               {[
                 { name: "CloudConnect Pro Masterclass", completions: 420, rate: 95 },
                 { name: "Enterprise Security Protocols", completions: 310, rate: 82 },
                 { name: "Compliance & Data Ethics", completions: 280, rate: 100 },
                 { name: "Q3 Sales Expansion Strategy", completions: 120, rate: 45 }
               ].map((t, idx) => (
                 <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-bold">
                       <span className="text-slate-900">{t.name}</span>
                       <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">{t.completions} Leads</span>
                    </div>
                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${t.rate}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                        className={`h-full rounded-full ${t.rate > 90 ? 'bg-success' : t.rate > 70 ? 'bg-primary' : 'bg-amber-400'}`} 
                       />
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Skill Distribution */}
         <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-6">
               <TrendingUp className="text-primary" size={32} />
            </div>
            <h4 className="text-xl font-bold tracking-tight text-slate-900 mb-2 italic">Skill Growth detected.</h4>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mb-8 font-medium">
               Your team has shown a 24% increase in "Technical Objection Handling" proficiency this quarter.
            </p>
            <div className="grid grid-cols-2 gap-4 w-full">
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Best Team</p>
                  <p className="text-sm font-bold text-slate-800">APAC North</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Most Improved</p>
                  <p className="text-sm font-bold text-slate-800">EMEA West</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, change, trend, icon }: any) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
    <div className="flex justify-between items-start mb-4">
      <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-white transition-colors flex items-center justify-center shadow-inner group-hover:shadow-md border border-slate-100">
        {icon}
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-bold ${trend === 'up' ? 'text-success' : 'text-rose-500'}`}>
        {trend === 'up' ? <ArrowUpRight size={12} /> : <BarChart3 size={12} className="rotate-180" />}
        {change}
      </div>
    </div>
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
    <h3 className="text-2xl font-bold text-slate-900 leading-none">{value}</h3>
  </div>
);
