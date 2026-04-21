import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  MessageSquare, 
  HelpCircle, 
  StickyNote, 
  Volume2, 
  Mic, 
  CheckCircle2, 
  ArrowRight,
  ChevronLeft,
  Settings,
  MoreVertical,
  X,
  Send,
  Loader2,
  Menu,
  FileText,
  List
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { geminiService } from "../services/geminiService";

export const LearnerPlayer: React.FC = () => {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const [training, setTraining] = useState<any>(null);
  const [slides, setSlides] = useState<any[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedLang, setSelectedLang] = useState("en");
  const [activeTab, setActiveTab] = useState<"qa" | "faqs" | "quiz" | "notes">("qa");
  
  // Mobile responsive state
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Tabs state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState("");
  const [quizData, setQuizData] = useState<any>(null);
  const [userNote, setUserNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchTraining = async () => {
      if (!trainingId) return;
      const tDoc = await getDoc(doc(db, "trainings", trainingId));
      if (tDoc.exists()) {
        setTraining(tDoc.data());
        
        const data = tDoc.data();
        
        // If real files were uploaded, show the slide deck
        if (data.assetUrls && data.assetUrls.slides) {
          setSlides([{
            id: 1,
            title: "Main Slide Deck",
            fileUrl: data.assetUrls.slides
          }]);
        } else {
          // Fallback to mock slides if no files were attached
          const slideCount = data.slideCount || 5;
          const mockSlides = Array.from({ length: slideCount }, (_, i) => ({
            id: i + 1,
            title: `Focus Topic: Section ${i + 1}`,
            imageUrl: `https://picsum.photos/seed/training-${trainingId}-${i}/1200/800`,
          }));
          setSlides(mockSlides);
        }
      }
    };
    fetchTraining();
  }, [trainingId]);

  const currentSlide = slides[currentSlideIndex];

  // Media Playback Logic
  useEffect(() => {
    // Reset audio state on slide change
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    // Set a placeholder MP3 URL for the prototype based on the slide index
    setAudioUrl(`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(currentSlideIndex % 15) + 1}.mp3`);
  }, [currentSlideIndex]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(e => {
        console.error("Audio playback failed:", e);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioUrl]);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "00:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      audioRef.current.currentTime = pos * duration;
    }
  };

  const cyclePlaybackRate = () => {
    const nextRate = playbackRate >= 2 ? 1 : playbackRate + 0.25;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // Q&A logic
  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    const msg = { role: "user", text: userInput };
    setChatMessages(prev => [...prev, msg]);
    setUserInput("");
    setIsProcessing(true);

    try {
      // In a real app, we'd fetch actual FAQs for this training/slide
      const faqs = [
        { question: "What is CloudConnect?", answer: "CloudConnect is our enterprise CRM synchronization tool." },
        { question: "How safe is the data?", answer: "All data is encrypted using AES-256 both in transit and at rest." }
      ];
      const answer = await geminiService.matchFAQ(userInput, faqs);
      setChatMessages(prev => [...prev, { role: "coach", text: answer }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-100 flex flex-col overflow-hidden text-slate-900 font-sans">
      {/* Hidden Audio Engine */}
      <audio
        ref={audioRef}
        src={audioUrl || ""}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
          setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100);
        }}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          if (audioRef.current) audioRef.current.volume = volume;
        }}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Header */}
      <header className="h-16 px-4 lg:px-6 bg-white border-b border-slate-200 flex items-center justify-between z-30 shrink-0 shadow-sm">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <button onClick={() => navigate("/learn/dashboard")} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-900 shrink-0">
            <ChevronLeft size={24} />
          </button>
          <button onClick={() => setIsLeftMenuOpen(!isLeftMenuOpen)} className="lg:hidden p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-900 shrink-0">
            <Menu size={20} />
          </button>
          <div className="hidden md:block h-8 w-[1px] bg-slate-200 shrink-0" />
          <div className="min-w-0 flex-1 pr-4">
            <h1 className="text-xs md:text-sm font-semibold text-slate-900 leading-tight uppercase tracking-tight truncate">{training?.name}</h1>
            <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight truncate">
               Slide {currentSlideIndex + 1} of {slides.length} • {currentSlide?.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
             <Settings size={14} className="text-slate-400" />
             <select 
               value={selectedLang} 
               onChange={(e) => setSelectedLang(e.target.value)}
               className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer text-slate-700"
             >
               {training?.languages?.map((l: string) => (
                 <option key={l} value={l} className="bg-white">{l}</option>
               )) || <option value="en">English</option>}
             </select>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-success font-bold text-[10px] uppercase">
             <div className="w-1.5 h-1.5 rounded-full bg-success" />
             AI Coach Ready
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Overlay for Left Sidebar */}
        {isLeftMenuOpen && (
          <div 
            className="absolute inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsLeftMenuOpen(false)}
          />
        )}

        {/* LEFT: Slides List */}
        <aside className={`absolute lg:static inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 transform transition-transform duration-300 ${isLeftMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
           <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
             <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Training Modules</h2>
             <button onClick={() => setIsLeftMenuOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200">
               <X size={16} />
             </button>
           </div>
           <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
             {slides.map((s, idx) => (
               <button
                key={s.id}
                onClick={() => {
                  setCurrentSlideIndex(idx);
                  setIsLeftMenuOpen(false);
                }}
                className={`w-full group relative rounded-xl overflow-hidden aspect-video border transition-all ${
                  idx === currentSlideIndex 
                  ? "border-primary ring-4 ring-primary/10 shadow-lg" 
                  : "border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300 shadow-sm"
                }`}
               >
                 {s.fileUrl ? (
                   <div className="w-full h-full bg-slate-100 flex items-center justify-center text-primary">
                     <FileText size={32} opacity={0.5} />
                   </div>
                 ) : (
                   <img src={s.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent flex items-end p-2 transition-opacity group-hover:opacity-100">
                   <p className="text-[8px] font-bold uppercase tracking-wide truncate text-white">S.{s.id} {s.title}</p>
                 </div>
               </button>
             ))}
           </div>
        </aside>

        {/* CENTER: Viewer */}
        <main className="flex-1 flex flex-col bg-slate-100 relative overflow-hidden">
          <div className="flex-1 relative flex items-center justify-center p-4 lg:p-8">
             <div className="w-full max-w-5xl aspect-[16/10] bg-white rounded-2xl overflow-hidden shadow-2xl relative border border-slate-200 group">
                <div className="absolute top-6 left-6 text-slate-400 font-mono text-[9px] tracking-widest uppercase z-10">Proprietary Training Material</div>
                {currentSlide && (
                  currentSlide.fileUrl ? (
                    <iframe 
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(currentSlide.fileUrl)}&embedded=true`} 
                      className="w-full h-full border-none z-0 relative"
                      title={currentSlide.title}
                    />
                  ) : (
                    <img 
                      src={currentSlide.imageUrl} 
                      className="w-full h-full object-contain z-0 relative" 
                      referrerPolicy="no-referrer"
                    />
                  )
                )}
                
                {/* Overlay Navigation */}
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-8 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent translate-y-0 lg:translate-y-full lg:group-hover:translate-y-0 transition-transform flex justify-between items-center z-20">
                   <div className="flex gap-2">
                     <button 
                      disabled={currentSlideIndex === 0}
                      onClick={() => setCurrentSlideIndex(s => s - 1)}
                      className="px-3 md:px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 transition-all text-white disabled:opacity-30 text-[10px] md:text-xs font-bold uppercase tracking-widest"
                     >
                       Previous
                     </button>
                     <button 
                      disabled={currentSlideIndex === slides.length - 1}
                      onClick={() => setCurrentSlideIndex(s => s + 1)}
                      className="px-3 md:px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 transition-all text-white disabled:opacity-30 text-[10px] md:text-xs font-bold uppercase tracking-widest"
                     >
                       Next
                     </button>
                   </div>
                   <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
                   >
                     {isPlaying ? <Pause size={24} className="md:w-8 md:h-8" /> : <Play size={24} className="md:w-8 md:h-8" fill="currentColor" />}
                   </button>
                </div>
             </div>
             
             {/* Floating Mobile FAQ Button */}
             <button 
               onClick={() => setIsRightMenuOpen(true)}
               className="lg:hidden absolute bottom-4 right-4 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(24,95,165,0.4)] z-30 active:scale-95 transition-transform"
             >
               <HelpCircle size={24} />
             </button>
          </div>

          {/* Footer Controls */}
          <div className="h-auto min-h-[5rem] py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between px-4 lg:px-10 gap-4 lg:gap-8 shrink-0 shadow-sm relative z-20">
             <div className="flex items-center gap-2 lg:gap-4 w-full lg:w-auto flex-1 order-2 lg:order-1">
               <div className="text-[10px] font-bold text-slate-400 uppercase min-w-[32px]">
                 {formatTime(currentTime)}
               </div>
               <div 
                 className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-visible group cursor-pointer"
                 onClick={handleSeek}
               >
                  <div className="absolute inset-y-0 left-0 bg-primary group-hover:bg-primary/80 transition-colors shadow-[0_0_8px_rgba(24,95,165,0.4)] rounded-full" style={{ width: `${progress || 0}%` }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${progress || 0}% - 8px)` }} />
               </div>
               <div className="text-[10px] font-bold text-slate-400 uppercase min-w-[32px]">
                 {formatTime(duration)}
               </div>
             </div>

             <div className="flex items-center gap-4 lg:gap-6 order-1 lg:order-2 w-full lg:w-auto justify-between lg:justify-end">
                <div className="flex items-center gap-2 group cursor-pointer">
                   <Volume2 size={18} className="text-slate-400 group-hover:text-primary transition-colors" />
                   <div 
                     className="w-20 lg:w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden cursor-pointer"
                     onClick={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const newVol = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                       setVolume(newVol);
                       if (audioRef.current) audioRef.current.volume = newVol;
                     }}
                   >
                      <div className="h-full bg-primary/40" style={{ width: `${volume * 100}%` }} />
                   </div>
                </div>
                <div className="hidden lg:block h-8 w-[1px] bg-slate-200" />
                <button onClick={cyclePlaybackRate} className="w-12 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-600 hover:text-primary transition-colors">
                   {playbackRate}x
                </button>
             </div>
          </div>
        </main>

        {/* Mobile Overlay for Right Sidebar */}
        {isRightMenuOpen && (
          <div 
            className="absolute inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsRightMenuOpen(false)}
          />
        )}

        {/* RIGHT: Tabs */}
        <aside className={`absolute lg:static inset-y-0 right-0 z-40 w-[85vw] max-w-sm lg:w-96 lg:max-w-none border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden transform transition-transform duration-300 ${isRightMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
           {/* Tab Headers */}
           <div className="flex border-b border-slate-200 bg-white shrink-0 overflow-x-auto custom-scrollbar">
              <TabButton active={activeTab === "qa"} onClick={() => setActiveTab("qa")} icon={<MessageSquare size={16} />} title="Coach" />
              <TabButton active={activeTab === "faqs"} onClick={() => setActiveTab("faqs")} icon={<List size={16} />} title="FAQs" />
              <TabButton active={activeTab === "quiz"} onClick={() => setActiveTab("quiz")} icon={<HelpCircle size={16} />} title="Quiz" />
              <TabButton active={activeTab === "notes"} onClick={() => setActiveTab("notes")} icon={<StickyNote size={16} />} title="Notes" />
              <button onClick={() => setIsRightMenuOpen(false)} className="lg:hidden shrink-0 px-4 text-slate-400 hover:text-slate-600 bg-slate-50 border-l border-slate-200 flex items-center justify-center">
                 <X size={16} />
              </button>
           </div>

           {/* Tab Content */}
           <div className="flex-1 relative overflow-hidden bg-slate-50/30">
              <AnimatePresence mode="wait">
                {activeTab === "qa" && (
                   <motion.div 
                    key="qa"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute inset-0 flex flex-col"
                   >
                     <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar">
                        <div className="flex gap-2">
                           <div className="w-8 h-8 rounded-full bg-accent flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">AI</div>
                           <div className="max-w-[85%] bg-white border border-slate-200 shadow-sm p-4 rounded-2xl rounded-tl-none text-sm text-slate-700 leading-relaxed font-medium">
                              Hi, I'm your virtual coach. Ask me anything about the current slide or product category.
                           </div>
                        </div>
                        
                        {chatMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                            {msg.role !== 'user' && (
                              <div className="w-8 h-8 rounded-full bg-accent flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">AI</div>
                            )}
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed font-medium shadow-sm transition-all ${
                              msg.role === 'user' 
                              ? 'bg-primary text-white rounded-tr-none' 
                              : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        
                        {isProcessing && (
                          <div className="flex justify-start gap-2">
                             <div className="w-8 h-8 rounded-full bg-accent flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold shadow-sm opacity-50">AI</div>
                             <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-2xl rounded-tl-none">
                                <Loader2 size={16} className="animate-spin text-primary" />
                             </div>
                          </div>
                        )}
                     </div>

                     <div className="shrink-0 p-4 border-t border-slate-200 bg-white">
                        <div className="relative flex items-center mb-4">
                           <input 
                             placeholder="Ask a follow-up..."
                             value={userInput}
                             onChange={(e) => setUserInput(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                             className="w-full pl-4 pr-12 py-3.5 bg-slate-100 border-none rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-900"
                           />
                           <div className="absolute right-2 flex items-center gap-1">
                              <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                                 <Mic size={18} />
                              </button>
                              <button 
                                onClick={handleSendMessage}
                                className="p-2 text-primary hover:scale-110 transition-transform"
                              >
                                 <Send size={18} />
                              </button>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg cursor-pointer hover:bg-white hover:text-primary transition-colors">Compare weights</div>
                           <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg cursor-pointer hover:bg-white hover:text-primary transition-colors">Show formula</div>
                        </div>
                     </div>
                   </motion.div>
                )}

                {activeTab === "faqs" && (
                   <motion.div 
                    key="faqs"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute inset-0 p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar bg-slate-50/30"
                   >
                     <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Frequently Asked Questions</h4>
                     </div>
                     <div className="space-y-4">
                        {[
                          { q: "What is CloudConnect?", a: "CloudConnect is our enterprise CRM synchronization tool." },
                          { q: "How safe is the data?", a: "All data is encrypted using AES-256 both in transit and at rest." },
                          { q: "Can I use it offline?", a: "Yes, the mobile app caches your changes and syncs when reconnected." }
                        ].map((faq, idx) => (
                           <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                              <p className="text-sm font-bold text-slate-900 mb-2">{faq.q}</p>
                              <p className="text-xs font-medium text-slate-600 leading-relaxed">{faq.a}</p>
                           </div>
                        ))}
                     </div>
                   </motion.div>
                )}

                {activeTab === "quiz" && (
                   <motion.div 
                    key="quiz"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute inset-0 p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar"
                   >
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-amber-400 block" />
                           Knowledge Check
                        </h4>
                        <p className="text-lg font-bold leading-tight text-slate-900">Which security standard is used for data at rest in CloudConnect Pro?</p>
                     </div>

                     <div className="space-y-3">
                        {["AES-256", "RSA-4096", "SHA-512", "TLS 1.3"].map((opt) => (
                          <button key={opt} className="w-full text-left p-5 rounded-2xl border border-slate-200 hover:border-primary/40 bg-white hover:bg-slate-50 transition-all group relative overflow-hidden shadow-sm">
                             <div className="absolute inset-y-0 left-0 w-1.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                             <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-tight">{opt}</span>
                          </button>
                        ))}
                     </div>

                     <button className="w-full bg-primary text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        Submit Answer
                        <ArrowRight size={16} />
                     </button>
                   </motion.div>
                )}

                {activeTab === "notes" && (
                   <motion.div 
                    key="notes"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute inset-0 flex flex-col bg-white rounded-t-3xl border-t border-slate-200 mt-4 overflow-hidden"
                   >
                      <div className="shrink-0 p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                         <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">My Study Notes</h4>
                         <div className="text-[8px] font-bold uppercase text-success tracking-widest flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-success" />
                            Auto-syncing
                         </div>
                      </div>
                      <textarea 
                        className="flex-1 bg-transparent p-6 outline-none text-sm leading-relaxed font-medium text-slate-700 resize-none h-full custom-scrollbar selection:bg-primary/10"
                        placeholder="Start typing your notes for this slide here. They'll be automatically saved to your profile for later review."
                      />
                   </motion.div>
                )}
              </AnimatePresence>
           </div>
        </aside>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, title }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 transition-all relative border-b-2 min-w-[70px] ${
      active ? "text-primary border-primary bg-slate-50/50" : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50/50"
    }`}
  >
    {React.cloneElement(icon as React.ReactElement, { size: 16 } as any)}
    <span className="text-[9px] font-bold uppercase tracking-tight">{title}</span>
  </button>
);