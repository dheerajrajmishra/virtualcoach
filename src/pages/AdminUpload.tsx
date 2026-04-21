import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { 
  FileUp, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  FileText, 
  Table, 
  HelpCircle,
  X
} from "lucide-react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";

const CATEGORIES = {
  "Enterprise Software": ["CRM", "ERP", "Cloud Infrastructure"],
  "Financial Services": ["Banking", "Insurance", "Wealth Management"],
  "Healthcare": ["Pharmaceuticals", "Medical Devices", "Telehealth"]
};

const LANGUAGES = [
  { id: "hi", name: "Hindi" },
  { id: "en", name: "English" },
  { id: "mr", name: "Marathi" },
  { id: "ta", name: "Tamil" },
  { id: "te", name: "Telugu" },
  { id: "kn", name: "Kannada" },
  { id: "bn", name: "Bengali" },
  { id: "gu", name: "Gujarati" }
];

export const AdminUpload: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    subCategory: "",
    productName: ""
  });
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en"]);
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    slides: null,
    transcripts: null,
    faqs: null,
    quizzes: null
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const onDrop = (key: string) => (acceptedFiles: File[]) => {
    setFiles(f => ({ ...f, [key]: acceptedFiles[0] }));
  };

  const toggleLanguage = (id: string) => {
    setSelectedLanguages(current =>
      current.includes(id) ? current.filter(l => l !== id) : [...current, id]
    );
  };

  const handleUpload = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate backend processing
      const data = new FormData();
      data.append("name", formData.name as string);
      data.append("category", formData.category as string);
      data.append("subCategory", formData.subCategory as string);
      data.append("productName", formData.productName as string);
      data.append("languages", JSON.stringify(selectedLanguages));
      
      Object.entries(files).forEach(([key, file]) => {
        if (file instanceof File) data.append(key, file);
      });

      const response = await axios.post("/api/trainings/upload", data);
      
      // Create Firestore doc
      await addDoc(collection(db, "trainings"), {
        ...formData,
        languages: selectedLanguages,
        status: "draft",
        createdBy: auth.currentUser?.uid || "unknown",
        createdAt: serverTimestamp(),
        tempId: response.data.trainingId
      });

      setStep(3); // Success step
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 md:mb-12 px-2 md:px-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${
              step === s ? "bg-primary text-white scale-110 shadow-primary/20" : 
              step > s ? "bg-success text-white" : "bg-slate-200 text-slate-500"
            }`}>
              {step > s ? <CheckCircle2 size={20} /> : s}
            </div>
            {s < 3 && (
              <div className={`h-[2px] flex-1 mx-4 transition-all ${
                step > s ? "bg-success" : "bg-slate-200"
              }`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100"
          >
            <div className="mb-10">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-2">Training Details</h2>
              <p className="text-slate-500">Provide basic metadata for the new sales training module.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Training Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Sales Expansion"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. CloudConnect Pro"
                  value={formData.productName}
                  onChange={e => setFormData({ ...formData, productName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value, subCategory: "" })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none"
                >
                  <option value="">Select Category</option>
                  {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Sub-category</label>
                <select
                  disabled={!formData.category}
                  value={formData.subCategory}
                  onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none disabled:bg-slate-50"
                >
                  <option value="">Select Sub-category</option>
                  {(CATEGORIES as any)[formData.category]?.map((sc: string) => <option key={sc} value={sc}>{sc}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-4 mb-10">
               <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Target Languages</label>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {LANGUAGES.map(lang => (
                   <button
                    key={lang.id}
                    onClick={() => toggleLanguage(lang.id)}
                    className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                      selectedLanguages.includes(lang.id) 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                   >
                     {lang.name}
                   </button>
                 ))}
               </div>
            </div>

            <div className="flex justify-end">
              <button
                disabled={!formData.name || !formData.category}
                onClick={nextStep}
                className="w-full md:w-auto bg-primary text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20 active:scale-[0.98]"
              >
                Next Step
                <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100">
              <div className="mb-10">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-2">Upload Assets</h2>
                <p className="text-slate-500">Attach slide decks, transcripts, and quizzes for processing.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <FileBox 
                  label="Slide Deck (.pptx, .pdf)" 
                  icon={<FileUp className="text-primary" size={24} />} 
                  onDrop={onDrop("slides")} 
                  file={files.slides} 
                />
                <FileBox 
                  label="Transcript Excel (.xlsx)" 
                  icon={<FileText className="text-accent" size={24} />} 
                  onDrop={onDrop("transcripts")} 
                  file={files.transcripts} 
                />
                <FileBox 
                  label="FAQ Excel (.xlsx)" 
                  icon={<HelpCircle className="text-amber-500" size={24} />} 
                  onDrop={onDrop("faqs")} 
                  file={files.faqs} 
                />
                <FileBox 
                  label="Quiz Excel (.xlsx)" 
                  icon={<Table className="text-success" size={24} />} 
                  onDrop={onDrop("quizzes")} 
                  file={files.quizzes} 
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <button onClick={prevStep} className="order-2 md:order-1 text-slate-500 font-bold hover:text-slate-700 underline underline-offset-4">
                  Go Back
                </button>
                <button
                  disabled={loading || !files.slides}
                  onClick={handleUpload}
                  className="order-1 md:order-2 w-full md:w-auto bg-primary text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                  {loading ? "Processing..." : "Generate Assets"}
                </button>
              </div>
              
              {error && (
                <div className="mt-6 flex items-center gap-2 text-rose-500 font-semibold text-sm bg-rose-50 p-4 rounded-xl border border-rose-100">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-16 shadow-sm border border-slate-100 text-center"
          >
            <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-8 border-[8px] border-white shadow-inner">
               <CheckCircle2 size={48} className="text-success" />
            </div>
            <h2 className="text-4xl font-bold tracking-tighter text-slate-900 mb-4 uppercase">Upload Complete</h2>
            <p className="text-slate-500 text-lg mb-10 max-w-sm mx-auto">
              Your training files have been received. AI is currently generating translations and voice assets.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button
                onClick={() => setStep(1)}
                className="bg-slate-100 text-slate-700 px-8 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Upload Another
              </button>
              <button
                onClick={() => window.location.href = "/admin/assign"}
                className="bg-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
              >
                Assign Training
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FileBoxProps {
  label: string;
  icon: React.ReactNode;
  onDrop: (files: File[]) => void;
  file: File | null;
}

const FileBox: React.FC<FileBoxProps> = ({ label, icon, onDrop, file }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => onDrop(acceptedFiles),
    multiple: false
  } as any);

  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{label}</label>
      <div
        {...getRootProps()}
        className={`relative h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 transition-all cursor-pointer group ${
          isDragActive ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/40 hover:bg-slate-50"
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} className="text-success" />
            </div>
            <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{file.name}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white group-hover:scale-110 transition-all shadow-sm group-hover:shadow-md border border-slate-100">
              {icon}
            </div>
            <p className="text-sm font-bold text-slate-600">Drop file here</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">or click to browse</p>
          </div>
        )}
      </div>
    </div>
  );
};
