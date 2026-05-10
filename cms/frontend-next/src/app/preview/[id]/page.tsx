"use client"

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, RotateCcw, Repeat, Loader2,
  AlertCircle, Eye, ChevronRight, Mic, MonitorPlay, ChevronDown,
  Pencil, Check, X, Send, ChevronLeft, BookOpen,
  Smartphone, RefreshCw, Sparkles, Upload,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  useTraining, useTrainingSlides, useTrainings,
  useUpdateSlideTranscript, usePublishTraining, useRegenerateSlideAudio,
  Slide,
} from '@/api/trainingApi'
// ── Language meta ──────────────────────────────────────────────────────────────
const LANG_META: Record<string, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇬🇧' },
  hi: { name: 'Hindi',   flag: '🇮🇳' },
  ta: { name: 'Tamil',   flag: '🇮🇳' },
  te: { name: 'Telugu',  flag: '🇮🇳' },
  mr: { name: 'Marathi', flag: '🇮🇳' },
  bn: { name: 'Bengali', flag: '🇧🇩' },
}

function fmt(sec: number) {
  if (!isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Avatar types & presets ─────────────────────────────────────────────────────
type AvatarConfig = { type: 'default' } | { type: 'url'; src: string }

const AVATAR_PRESETS = [
  {
    id: 'professional',
    label: 'Professional',
    src: 'https://api.dicebear.com/8.x/personas/svg?seed=trainer&backgroundColor=b6e3f4',
  },
  {
    id: 'illustrated',
    label: 'Illustrated',
    src: 'https://api.dicebear.com/8.x/avataaars/svg?seed=presenter&backgroundColor=d1d4f9',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    src: 'https://api.dicebear.com/8.x/lorelei/svg?seed=admin&backgroundColor=ffd5dc',
  },
]

// ── Avatar display component ───────────────────────────────────────────────────
function AvatarDisplay({ config, size }: { config: AvatarConfig; size: number }) {
  if (config.type === 'url') {
    return (
      <img
        src={config.src}
        alt="Presenter avatar"
        style={{ width: size, height: size }}
        className="object-cover w-full h-full"
      />
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="avatarBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="28" cy="28" r="28" fill="url(#avatarBg)" />
      <circle cx="28" cy="21" r="9" fill="rgba(255,255,255,0.95)" />
      <path d="M8 52 C8 36 48 36 48 52" fill="rgba(255,255,255,0.95)" />
    </svg>
  )
}

// ── Avatar Picker Modal ────────────────────────────────────────────────────────
function AvatarPickerModal({
  current, onSelect, onClose,
}: { current: AvatarConfig; onSelect: (c: AvatarConfig) => void; onClose: () => void }) {
  const [customUrl, setCustomUrl] = useState(current.type === 'url' ? current.src : '')
  const [preview, setPreview] = useState<AvatarConfig>(current)

  const apply = () => { onSelect(preview); onClose() }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={18} className="text-primary-500" /> Choose Avatar
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center mb-5">
          <div className="w-20 h-20 rounded-full border-4 border-primary-200 shadow-lg overflow-hidden">
            <AvatarDisplay config={preview} size={80} />
          </div>
        </div>

        {/* Default option */}
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Default</p>
        <button
          onClick={() => setPreview({ type: 'default' })}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border mb-4 transition-all ${
            preview.type === 'default' ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            <AvatarDisplay config={{ type: 'default' }} size={40} />
          </div>
          <span className="text-sm font-medium text-gray-700">Purple gradient avatar</span>
          {preview.type === 'default' && <Check size={14} className="ml-auto text-primary-500" />}
        </button>

        {/* Preset options */}
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Presets</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {AVATAR_PRESETS.map(p => {
            const selected = preview.type === 'url' && preview.src === p.src
            return (
              <button
                key={p.id}
                onClick={() => setPreview({ type: 'url', src: p.src })}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                  selected ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100">
                  <img src={p.src} alt={p.label} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-gray-500 font-medium">{p.label}</span>
                {selected && <Check size={10} className="text-primary-500" />}
              </button>
            )
          })}
        </div>

        {/* Custom GIF / Image URL */}
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
          <Upload size={10} /> Custom GIF / Image URL
        </p>
        <p className="text-[10px] text-gray-400 mb-2">
          Paste any image or animated GIF URL for a lifelike presenter experience.
        </p>
        <div className="flex gap-2 mb-5">
          <input
            type="url"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            placeholder="https://example.com/avatar.gif"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <button
            onClick={() => { if (customUrl.trim()) setPreview({ type: 'url', src: customUrl.trim() }) }}
            disabled={!customUrl.trim()}
            className="px-3 py-2 rounded-lg bg-primary-100 text-primary-700 text-sm font-medium hover:bg-primary-200 disabled:opacity-40 transition-colors"
          >
            Preview
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={apply} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors">
            Apply Avatar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Phone Preview Modal ────────────────────────────────────────────────────────
function PhonePreviewModal({
  slide, slides, currentIndex, locale, transcript, avatarConfig, onClose, goTo,
}: {
  slide: Slide | null
  slides: Slide[]
  currentIndex: number
  locale: string
  transcript: string
  avatarConfig: AvatarConfig
  onClose: () => void
  goTo: (i: number) => void
}) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [isLandscape, setIsLandscape]       = useState(false)

  // ── Shared sub-components used in both orientations ───────────────────────
  const AppHeader = () => (
    <div className="px-4 py-2.5 bg-primary-700 flex items-center gap-2 flex-shrink-0">
      <div className="w-6 h-6 rounded-full overflow-hidden border border-white/40 flex-shrink-0">
        <AvatarDisplay config={avatarConfig} size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-[11px] font-bold truncate">Pitch Perfect</p>
        <p className="text-white/60 text-[9px]">{LANG_META[locale]?.name ?? locale}</p>
      </div>
      <span className="text-white/60 text-[10px] flex-shrink-0">{currentIndex + 1}/{slides.length}</span>
    </div>
  )

  const SlideImage = ({ fill = false }: { fill?: boolean }) => (
    <div
      className={`relative bg-gray-900 ${fill ? 'flex-1 min-h-0' : 'flex-shrink-0'}`}
      style={fill ? undefined : { aspectRatio: '16/9' }}
    >
      {slide?.imageGcsUrl ? (
        <img src={slide.imageGcsUrl} alt="" className="absolute inset-0 w-full h-full object-contain" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 to-indigo-900">
          <MonitorPlay size={fill ? 28 : 20} className="text-white/40 mb-2" />
          <p className="text-white/80 text-xs font-medium text-center px-4 leading-snug">{slide?.title}</p>
        </div>
      )}
      <div className={`absolute bottom-2 right-2 rounded-full border-2 border-white shadow-lg overflow-hidden ${fill ? 'w-12 h-12' : 'w-9 h-9'}`}>
        <AvatarDisplay config={avatarConfig} size={fill ? 48 : 36} />
      </div>
    </div>
  )

  const TranscriptSection = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex-shrink-0 border-t border-gray-100 ${compact ? 'mx-0' : 'mx-3 mt-1'}`}>
      <button
        onClick={() => setTranscriptOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${transcript ? 'bg-primary-400' : 'bg-gray-300'}`} />
          Transcript
          {transcript && (
            <span className="text-[9px] font-normal text-gray-400 ml-0.5">
              · {transcript.split(' ').length}w
            </span>
          )}
        </span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform flex-shrink-0 ${transcriptOpen ? 'rotate-180' : ''}`} />
      </button>
      {transcriptOpen && (
        <div className={`px-3 pb-3 overflow-y-auto ${compact ? 'max-h-20' : 'max-h-28'}`}>
          {transcript
            ? <p className="text-[11px] text-gray-600 leading-relaxed">{transcript}</p>
            : <p className="text-[11px] text-gray-400 italic">No transcript available.</p>}
        </div>
      )}
    </div>
  )

  const AudioBar = () => (
    <div className="px-3 py-2.5 border-t border-gray-100 flex-shrink-0">
      <div className="flex items-center gap-2.5 bg-primary-50 rounded-xl px-3 py-2">
        <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
          <Play size={10} className="text-white ml-0.5" />
        </div>
        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-0 bg-primary-400 rounded-full" />
        </div>
        <span className="text-[10px] text-gray-400 flex-shrink-0">0:00</span>
      </div>
    </div>
  )

  const NavBar = () => (
    <div className="px-3 pb-3 flex items-center justify-between flex-shrink-0">
      <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
        className="text-[11px] text-gray-400 disabled:opacity-30 flex items-center gap-0.5">
        <ChevronLeft size={11} /> Prev
      </button>
      <div className="flex items-center gap-1">
        {slides.slice(0, 7).map((_, i) => (
          <div key={i} className={`rounded-full transition-all ${i === currentIndex ? 'w-3 h-1.5 bg-primary-500' : 'w-1.5 h-1.5 bg-gray-200'}`} />
        ))}
        {slides.length > 7 && <span className="text-[9px] text-gray-400">+{slides.length - 7}</span>}
      </div>
      <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === slides.length - 1}
        className="text-[11px] text-primary-600 disabled:opacity-30 flex items-center gap-0.5">
        Next <ChevronRight size={11} />
      </button>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>

        {/* Top controls row */}
        <div className="flex items-center justify-between w-full" style={{ minWidth: isLandscape ? 660 : 340 }}>
          <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
            <Smartphone size={15} /> Mobile Preview
          </div>
          {/* Orientation toggle */}
          <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setIsLandscape(false)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                !isLandscape ? 'bg-white/25 text-white' : 'text-white/50 hover:text-white/75'
              }`}
            >
              <Smartphone size={11} /> Portrait
            </button>
            <button
              onClick={() => setIsLandscape(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                isLandscape ? 'bg-white/25 text-white' : 'text-white/50 hover:text-white/75'
              }`}
            >
              <Smartphone size={11} className="rotate-90" /> Landscape
            </button>
          </div>
        </div>

        {/* ── Portrait frame ── */}
        {!isLandscape && (
          <div className="w-[340px] bg-gray-950 rounded-[2.8rem] p-[10px] border-[6px] border-gray-800 shadow-2xl">
            {/* Status bar */}
            <div className="flex items-center justify-between px-5 py-1.5 text-white/70">
              <span className="text-[10px] font-semibold">9:41</span>
              <div className="w-20 h-5 bg-gray-950 rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-800 border border-gray-700" />
              </div>
              <span className="text-[10px]">▊ 100%</span>
            </div>

            {/* Screen — flex-col, fixed height */}
            <div className="bg-white rounded-[2.2rem] overflow-hidden flex flex-col" style={{ height: 580 }}>
              <AppHeader />

              {/* Image grows to fill space when transcript is collapsed */}
              <SlideImage fill={!transcriptOpen} />

              {/* Slide title — always visible */}
              <div className="px-4 pt-2.5 pb-1 flex-shrink-0">
                <h3 className="text-sm font-bold text-gray-900 truncate">
                  {slide?.title || `Slide ${slide?.slideIndex}`}
                </h3>
                <p className="text-[10px] text-gray-400">
                  {LANG_META[locale]?.flag} {LANG_META[locale]?.name ?? locale}
                </p>
              </div>

              <TranscriptSection />

              {/* Push audio + nav to bottom when transcript is collapsed */}
              {!transcriptOpen && <div className="flex-1" />}

              <AudioBar />
              <NavBar />
            </div>

            <div className="w-24 h-1 bg-gray-700 rounded-full mx-auto mt-2.5" />
          </div>
        )}

        {/* ── Landscape frame ── */}
        {isLandscape && (
          <div className="relative" style={{ width: 660, height: 312 }}>
            {/* Phone hardware chrome */}
            {/* Power button — top edge */}
            <div className="absolute top-0 right-20 w-12 h-[4px] bg-gray-600 rounded-full z-10" style={{ top: -2 }} />
            {/* Volume up — bottom edge */}
            <div className="absolute left-16 w-9 h-[4px] bg-gray-600 rounded-full z-10" style={{ bottom: -2 }} />
            {/* Volume down — bottom edge */}
            <div className="absolute left-28 w-6 h-[4px] bg-gray-600 rounded-full z-10" style={{ bottom: -2 }} />
            {/* Camera — right side center */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-gray-500 border border-gray-400 z-10" style={{ right: -1 }} />

            {/* Frame shell */}
            <div
              className="w-full h-full bg-gray-900 shadow-2xl overflow-hidden flex flex-row"
              style={{ borderRadius: '2.2rem', border: '7px solid #111827' }}
            >
              {/* Left: slide image — 58% */}
              <div className="relative bg-gray-950 flex-shrink-0 overflow-hidden" style={{ width: '58%' }}>
                {/* Status bar overlaid on slide */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-1.5 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                  <span className="text-[9px] text-white/90 font-semibold">9:41</span>
                  <span className="text-[9px] text-white/80 font-medium">▊ 100%</span>
                </div>

                {slide?.imageGcsUrl ? (
                  <img src={slide.imageGcsUrl} alt="" className="absolute inset-0 w-full h-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 to-indigo-900">
                    <MonitorPlay size={26} className="text-white/40 mb-2" />
                    <p className="text-white/80 text-[11px] font-medium text-center px-4 leading-snug">{slide?.title}</p>
                  </div>
                )}

                {/* Avatar — smaller in landscape */}
                <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full border-2 border-white/90 shadow-lg overflow-hidden">
                  <AvatarDisplay config={avatarConfig} size={32} />
                </div>
              </div>

              {/* Right: app content — 42% */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">

                {/* Compact app header */}
                <div className="px-3 py-2 bg-primary-700 flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-white/40 flex-shrink-0">
                    <AvatarDisplay config={avatarConfig} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[10px] font-bold leading-none truncate">Pitch Perfect</p>
                    <p className="text-white/60 text-[8px] mt-0.5">{LANG_META[locale]?.name ?? locale}</p>
                  </div>
                  <span className="text-white/60 text-[9px] flex-shrink-0 font-medium">{currentIndex + 1}/{slides.length}</span>
                </div>

                {/* Slide title */}
                <div className="px-3 pt-2 pb-1 flex-shrink-0">
                  <h3 className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-2">
                    {slide?.title || `Slide ${slide?.slideIndex}`}
                  </h3>
                  <p className="text-[8px] text-gray-400 mt-0.5">
                    {LANG_META[locale]?.flag} {LANG_META[locale]?.name ?? locale}
                  </p>
                </div>

                {/* Transcript */}
                <div className="flex-shrink-0 border-t border-gray-100">
                  <button
                    onClick={() => setTranscriptOpen(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-left"
                  >
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-600">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${transcript ? 'bg-primary-400' : 'bg-gray-300'}`} />
                      Transcript
                      {transcript && <span className="text-[8px] font-normal text-gray-400">· {transcript.split(' ').length}w</span>}
                    </span>
                    <ChevronDown size={11} className={`text-gray-400 transition-transform flex-shrink-0 ${transcriptOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {transcriptOpen && (
                    <div className="px-3 pb-2 overflow-y-auto max-h-[60px]">
                      {transcript
                        ? <p className="text-[10px] text-gray-600 leading-relaxed">{transcript}</p>
                        : <p className="text-[10px] text-gray-400 italic">No transcript.</p>}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-h-0" />

                {/* Compact audio bar */}
                <div className="px-3 py-1.5 border-t border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-primary-50 rounded-lg px-2.5 py-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                      <Play size={8} className="text-white ml-0.5" />
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full w-0 bg-primary-400 rounded-full" />
                    </div>
                    <span className="text-[9px] text-gray-400 flex-shrink-0">0:00</span>
                  </div>
                </div>

                {/* Compact nav bar */}
                <div className="px-3 pb-2.5 pt-1 flex items-center justify-between flex-shrink-0">
                  <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
                    className="text-[10px] text-gray-400 disabled:opacity-30 flex items-center gap-0.5 font-medium">
                    <ChevronLeft size={10} /> Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {slides.slice(0, 6).map((_, i) => (
                      <div key={i} className={`rounded-full transition-all ${i === currentIndex ? 'w-2.5 h-1 bg-primary-500' : 'w-1 h-1 bg-gray-200'}`} />
                    ))}
                    {slides.length > 6 && <span className="text-[8px] text-gray-400">+{slides.length - 6}</span>}
                  </div>
                  <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === slides.length - 1}
                    className="text-[10px] text-primary-600 disabled:opacity-30 flex items-center gap-0.5 font-medium">
                    Next <ChevronRight size={10} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <button onClick={onClose}
          className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
          <X size={14} /> Close preview
        </button>
      </div>
    </div>
  )
}

// ── Audio Player ───────────────────────────────────────────────────────────────
export interface AudioPlayerHandle { toggle: () => void }

interface AudioPlayerProps {
  src: string | null; autoPlay: boolean; onEnded: () => void; onPlayingChange?: (p: boolean) => void
}

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
function AudioPlayer({ src, autoPlay, onEnded, onPlayingChange }, ref) {
  const audioRef  = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying]   = useState(false)
  const [muted, setMuted]       = useState(false)
  const [current, setCurrent]   = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading]   = useState(false)

  useEffect(() => { onPlayingChange?.(playing) }, [playing, onPlayingChange])
  useImperativeHandle(ref, () => ({ toggle }))
  useEffect(() => {
    const el = audioRef.current; if (!el) return
    el.load(); setCurrent(0); setDuration(0); setPlaying(false)
    if (src && autoPlay) el.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [src, autoPlay])

  const toggle = () => {
    const el = audioRef.current; if (!el || !src) return
    if (playing) { el.pause(); setPlaying(false) }
    else         { el.play().then(() => setPlaying(true)).catch(() => {}) }
  }
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current; if (!el) return
    el.currentTime = Number(e.target.value); setCurrent(Number(e.target.value))
  }
  const restart = () => {
    const el = audioRef.current; if (!el) return
    el.currentTime = 0; setCurrent(0); el.play().then(() => setPlaying(true)).catch(() => {})
  }

  if (!src) return (
    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400">
      <Mic size={16} /> No audio available for this locale
    </div>
  )
  return (
    <div className="bg-gradient-to-r from-brand to-brand-light rounded-xl p-4 text-white shadow-md">
      <audio ref={audioRef} src={src} muted={muted}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => { setPlaying(false); onEnded() }}
        onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)}
      />
      <div className="mb-3">
        <input type="range" min={0} max={duration || 1} step={0.1} value={current} onChange={seek}
          className="w-full h-1.5 accent-primary-400 cursor-pointer rounded-full" />
        <div className="flex justify-between text-[11px] text-gray-300 mt-1">
          <span>{fmt(current)}</span><span>{fmt(duration)}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button onClick={restart} className="opacity-70 hover:opacity-100 transition-opacity"><RotateCcw size={17} /></button>
        <button onClick={toggle}
          className="w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
          {loading ? <Loader2 size={20} className="animate-spin" />
            : playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>
        <button onClick={() => setMuted(m => !m)} className="opacity-70 hover:opacity-100 transition-opacity">
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      </div>
    </div>
  )
})

// ── Slide List Item ────────────────────────────────────────────────────────────
function SlideItem({ slide, active, locale, onClick }:
  { slide: Slide; active: boolean; locale: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={['w-full text-left px-3 py-2.5 rounded-lg border transition-all',
        active ? 'bg-primary-50 border-primary-300 shadow-sm'
               : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200',
      ].join(' ')}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          active ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
          {slide.slideIndex}
        </span>
        {slide.imageGcsUrl && (
          <img src={slide.imageGcsUrl} alt=""
            className="w-10 h-6 object-cover rounded flex-shrink-0 border border-gray-100" />
        )}
        <span className={`text-sm font-medium truncate flex-1 ${active ? 'text-primary-700' : 'text-gray-700'}`}>
          {slide.title || `Slide ${slide.slideIndex}`}
        </span>
        {!!slide.audioUrls?.[locale] && (
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-400" />
        )}
      </div>
    </button>
  )
}

// TrainingPicker removed as it's now in preview/page.tsx
// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PreviewPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  // All hooks unconditionally before any conditional returns
  const { data: training, isLoading: trainingLoading } = useTraining(id ?? null)
  const { data: slides,   isLoading: slidesLoading   } = useTrainingSlides(id ?? null)
  const updateTranscript  = useUpdateSlideTranscript()
  const publishTraining   = usePublishTraining()
  const regenAudio        = useRegenerateSlideAudio()

  const [currentIndex, setCurrentIndex]         = useState(0)
  const [locale, setLocale]                     = useState('en')
  const [autoAdvance, setAutoAdvance]           = useState(false)
  const [transcriptOpen, setTranscriptOpen]     = useState(true)
  const [slideListOpen, setSlideListOpen]       = useState(true)
  const [isAudioPlaying, setIsAudioPlaying]     = useState(false)
  const [editingTranscript, setEditingTranscript] = useState(false)
  const [draftTranscript, setDraftTranscript]   = useState('')
  const [pendingAudioRegen, setPendingAudioRegen] = useState<{ slideId: string; locale: string } | null>(null)
  const [phonePreviewOpen, setPhonePreviewOpen] = useState(false)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const [avatarConfig, setAvatarConfig]         = useState<AvatarConfig>({ type: 'default' })
  const audioPlayerRef = useRef<AudioPlayerHandle>(null)

  useEffect(() => {
    if (training?.supportedLocales?.length) setLocale(training.supportedLocales[0])
  }, [training])

  useEffect(() => {
    setEditingTranscript(false)
    setDraftTranscript('')
    setPendingAudioRegen(null)
  }, [currentIndex, locale])

  const goTo = useCallback((idx: number) => {
    if (!slides) return
    setCurrentIndex(Math.max(0, Math.min(idx, slides.length - 1)))
  }, [slides])

  const handleAudioEnded = useCallback(() => {
    if (!autoAdvance || !slides) return
    if (currentIndex < slides.length - 1) goTo(currentIndex + 1)
  }, [autoAdvance, currentIndex, slides, goTo])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') goTo(currentIndex + 1)
      if (e.key === 'ArrowLeft')  goTo(currentIndex - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentIndex, goTo])

  // ── After all hooks ────────────────────────────────────────────────────────
  if (!id) return null

  const isLoading  = trainingLoading || slidesLoading
  const slide      = slides?.[currentIndex] ?? null
  const audioUrl   = slide?.audioUrls?.[locale] ?? null
  const transcript = slide?.transcripts?.[locale] ?? ''

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center gap-3 text-gray-500 p-8">
      <Loader2 size={22} className="animate-spin" /> Loading training preview…
    </div>
  )
  if (!training) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-gray-500">
      <AlertCircle size={36} className="text-red-400" />
      <p>Training not found.</p>
      <button onClick={() => router.back()} className="btn-primary text-sm px-4 py-2">Go back</button>
    </div>
  )

  const locales    = training.supportedLocales ?? ['en']
  const hasSlides  = slides && slides.length > 0
  const isPublished = !!training.publishedAt

  const handleSaveTranscript = async () => {
    if (!slide) return
    await updateTranscript.mutateAsync({ trainingId: id, slideId: slide.id, locale, transcript: draftTranscript })
    toast.success('Transcript saved')
    setEditingTranscript(false)
    setPendingAudioRegen({ slideId: slide.id, locale })
  }

  const handleRegenAudio = async () => {
    if (!pendingAudioRegen || !slide) return
    const promise = regenAudio.mutateAsync({ trainingId: id, slideId: pendingAudioRegen.slideId, locale: pendingAudioRegen.locale })
    toast.promise(promise, { loading: 'Regenerating audio…', success: 'Audio regenerated!', error: 'Failed to regenerate audio' })
    await promise
    setPendingAudioRegen(null)
  }

  const handlePublish = async () => {
    await publishTraining.mutateAsync(id)
    toast.success('Training published!')
  }

  // Shared nav helpers
  const navBtn = (onClick: () => void, disabled: boolean, children: React.ReactNode, lg = false) => (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg border border-gray-200 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all ${lg ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-sm'}`}>
      {children}
    </button>
  )
  const playBtn = () => (
    <button onClick={() => audioPlayerRef.current?.toggle()} title={isAudioPlaying ? 'Pause' : 'Play'}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors">
      {isAudioPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
    </button>
  )
  const dotNav = () => (
    <div className="flex items-center gap-1.5">
      {slides!.map((_, i) => (
        <button key={i} onClick={() => goTo(i)}
          className={['rounded-full transition-all',
            i === currentIndex ? 'w-4 h-2 bg-primary-500' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300',
          ].join(' ')} />
      ))}
    </div>
  )

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-900 truncate">{training.name}</h1>
            {isPublished && (
              <span className="text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full flex-shrink-0">
                ✓ Published
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">{training.category} · {training.product}</p>
        </div>

        {/* Locale selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
          {locales.map(lc => {
            const meta = LANG_META[lc] ?? { name: lc.toUpperCase(), flag: '🌐' }
            return (
              <button key={lc} onClick={() => setLocale(lc)}
                className={['flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  locale === lc ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}>
                <span>{meta.flag}</span>
                <span className="hidden lg:inline">{meta.name}</span>
                <span className="lg:hidden">{lc.toUpperCase()}</span>
              </button>
            )
          })}
        </div>

        {/* Auto-advance */}
        <button onClick={() => setAutoAdvance(v => !v)}
          className={['flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-all flex-shrink-0',
            autoAdvance ? 'bg-primary-50 border-primary-300 text-primary-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
          ].join(' ')}>
          <Repeat size={14} /> Auto
        </button>

        {/* Phone preview */}
        <button onClick={() => setPhonePreviewOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:text-primary-700 transition-all flex-shrink-0">
          <Smartphone size={14} /> Preview
        </button>

        {/* Publish */}
        {!isPublished ? (
          <button onClick={handlePublish} disabled={publishTraining.isPending}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow transition-colors disabled:opacity-60 flex-shrink-0">
            {publishTraining.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Publish
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium flex-shrink-0">
            <Check size={14} /> Published
          </div>
        )}
      </div>

      {!hasSlides ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 p-8">
          <AlertCircle size={32} className="text-amber-400" />
          <p className="font-medium text-gray-600">No slides yet</p>
          <p className="text-sm text-center">
            Processing in progress — check back once status is{' '}
            <span className="font-medium text-green-600">READY</span>.
          </p>
          <Link href="/processing" className="btn-primary text-sm px-4 py-2 mt-2">View Pipeline</Link>        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Course index (collapsible) ── */}
          {slideListOpen ? (
            <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-white flex-shrink-0">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  <BookOpen size={12} /> Course Index
                </span>
                <button onClick={() => setSlideListOpen(false)}
                  className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                  <ChevronLeft size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <p className="text-[11px] text-gray-400 px-1 mb-2">{slides.length} slides</p>
                {slides.map((s, i) => (
                  <SlideItem key={s.id} slide={s} active={i === currentIndex}
                    locale={locale} onClick={() => goTo(i)} />
                ))}
              </div>
            </aside>
          ) : (
            <button onClick={() => setSlideListOpen(true)}
              className="w-8 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors group"
              title="Expand course index">
              <div className="flex flex-col items-center gap-1">
                <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600" />
                <span className="text-[9px] font-semibold text-gray-400 group-hover:text-gray-600 uppercase tracking-wide"
                  style={{ writingMode: 'vertical-rl' }}>Index</span>
              </div>
            </button>
          )}

          {/* ── Main content — expands when sidebar is collapsed ── */}
          <main className="flex-1 overflow-y-auto p-6 min-w-0">
            <div className={`${slideListOpen ? 'max-w-3xl' : 'max-w-5xl'} mx-auto space-y-4 transition-all duration-200`}>

              {/* Slide header */}
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {slide?.slideIndex}
                </span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{slide?.title || `Slide ${slide?.slideIndex}`}</h2>
                  <p className="text-xs text-gray-400">Slide {currentIndex + 1} of {slides.length}</p>
                </div>
              </div>

              {/* Navigation above slide */}
              <div className="flex items-center justify-between">
                {navBtn(() => goTo(currentIndex - 1), currentIndex === 0, <><SkipBack size={14} /> Previous</>)}
                {dotNav()}
                <div className="flex items-center gap-2">
                  {playBtn()}
                  {navBtn(() => goTo(currentIndex + 1), currentIndex === slides.length - 1, <>Next <SkipForward size={14} /></>)}
                </div>
              </div>

              {/* Slide visual */}
              <div className="relative w-full rounded-2xl overflow-hidden bg-gray-900 shadow-xl border border-gray-800"
                style={{ aspectRatio: '16 / 9' }}>
                {slide?.imageGcsUrl ? (
                  <img src={slide.imageGcsUrl} alt={`Slide ${slide?.slideIndex}`} className="w-full h-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                      <MonitorPlay size={32} className="text-white/60" />
                    </div>
                    <h3 className="text-white/90 font-semibold text-lg text-center px-12 leading-snug">
                      {slide?.title || `Slide ${slide?.slideIndex}`}
                    </h3>
                    <p className="text-white/40 text-xs">Upload a .pptx to generate slide images</p>
                  </div>
                )}
                {/* Avatar — clickable to change */}
                <button
                  onClick={() => setAvatarPickerOpen(true)}
                  className="absolute bottom-3 right-3 rounded-full border-2 border-white/80 shadow-2xl overflow-hidden hover:ring-2 hover:ring-primary-400 hover:ring-offset-1 transition-all"
                  title="Change avatar"
                >
                  <AvatarDisplay config={avatarConfig} size={60} />
                </button>
              </div>

              {/* Transcript panel */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <button onClick={() => setTranscriptOpen(v => !v)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 inline-block flex-shrink-0" />
                    Transcript · {LANG_META[locale]?.flag} {LANG_META[locale]?.name ?? locale}
                    {transcript && <span className="ml-1 text-xs font-normal text-gray-400">({transcript.split(' ').length} words)</span>}
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${transcriptOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {transcriptOpen && !editingTranscript && (
                    <button
                      onClick={() => { setDraftTranscript(transcript); setEditingTranscript(true) }}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 px-2 py-1 rounded hover:bg-primary-50 transition-colors">
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                  {editingTranscript && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={handleSaveTranscript} disabled={updateTranscript.isPending}
                        className="flex items-center gap-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 px-2.5 py-1 rounded disabled:opacity-60 transition-colors">
                        {updateTranscript.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        Save
                      </button>
                      <button onClick={() => setEditingTranscript(false)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                        <X size={11} /> Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Body */}
                {transcriptOpen && (
                  <div className="px-5 pb-4 pt-4 space-y-3">
                    {editingTranscript ? (
                      <textarea
                        value={draftTranscript} onChange={e => setDraftTranscript(e.target.value)}
                        rows={6} autoFocus
                        className="w-full text-gray-800 text-base leading-relaxed border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300" />
                    ) : transcript ? (
                      <p className="text-gray-800 leading-relaxed text-base whitespace-pre-wrap">{transcript}</p>
                    ) : (
                      <p className="text-gray-400 italic text-sm">No transcript available for {LANG_META[locale]?.name ?? locale}.</p>
                    )}

                    {/* Regenerate audio prompt after saving transcript */}
                    {pendingAudioRegen && !editingTranscript && (
                      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="text-xs text-amber-700 flex-1">
                          Transcript updated — audio may be out of sync.
                        </span>
                        <button onClick={handleRegenAudio} disabled={regenAudio.isPending}
                          className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 flex-shrink-0">
                          {regenAudio.isPending
                            ? <Loader2 size={11} className="animate-spin" />
                            : <RefreshCw size={11} />}
                          Regenerate Audio
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Audio player */}
              <AudioPlayer ref={audioPlayerRef} src={audioUrl} autoPlay={autoAdvance}
                onEnded={handleAudioEnded} onPlayingChange={setIsAudioPlaying} />

              {/* Bottom navigation */}
              <div className="flex items-center justify-between pb-2">
                {navBtn(() => goTo(currentIndex - 1), currentIndex === 0, <><SkipBack size={16} /> Previous</>, true)}
                {dotNav()}
                <div className="flex items-center gap-2">
                  {playBtn()}
                  {navBtn(() => goTo(currentIndex + 1), currentIndex === slides.length - 1, <>Next <SkipForward size={16} /></>, true)}
                </div>
              </div>

            </div>
          </main>

          {/* ── Right panel ── */}
          <aside className="hidden lg:flex w-52 flex-shrink-0 border-l border-gray-200 bg-gray-50 flex-col p-4 gap-4">
            {/* Avatar card — click to change */}
            <div className="flex flex-col items-center gap-2 py-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <button
                onClick={() => setAvatarPickerOpen(true)}
                className="rounded-full border-2 border-primary-200 shadow-md overflow-hidden hover:ring-2 hover:ring-primary-400 hover:ring-offset-2 transition-all"
                title="Change avatar">
                <AvatarDisplay config={avatarConfig} size={64} />
              </button>
              <p className="text-xs font-semibold text-gray-700">Presenter</p>
              <button onClick={() => setAvatarPickerOpen(true)}
                className="flex items-center gap-1 text-[10px] text-primary-500 hover:text-primary-700 transition-colors">
                <Sparkles size={9} /> Change avatar
              </button>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Audio Status</p>
              <div className="space-y-1">
                {locales.map(lc => {
                  const hasSrc = !!slide?.audioUrls?.[lc]
                  const meta = LANG_META[lc] ?? { name: lc, flag: '🌐' }
                  return (
                    <div key={lc} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasSrc ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <span>{meta.flag} {meta.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Transcript Status</p>
              <div className="space-y-1">
                {locales.map(lc => {
                  const hasText = !!(slide?.transcripts?.[lc])
                  const meta = LANG_META[lc] ?? { name: lc, flag: '🌐' }
                  return (
                    <div key={lc} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasText ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <span>{meta.flag} {meta.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-auto space-y-2">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Navigation</p>
              <p className="text-xs text-gray-500">
                <kbd className="bg-gray-200 text-gray-600 rounded px-1 py-0.5 font-mono text-[10px]">←</kbd>{' '}
                <kbd className="bg-gray-200 text-gray-600 rounded px-1 py-0.5 font-mono text-[10px]">→</kbd>{' '}
                arrow keys
              </p>
              <button onClick={() => setPhonePreviewOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 border border-primary-200 rounded-lg py-1.5 hover:bg-primary-50 transition-colors">
                <Smartphone size={12} /> Mobile preview
              </button>
            </div>
          </aside>

        </div>
      )}

      {/* ── Modals ── */}
      {avatarPickerOpen && (
        <AvatarPickerModal
          current={avatarConfig}
          onSelect={setAvatarConfig}
          onClose={() => setAvatarPickerOpen(false)}
        />
      )}
      {phonePreviewOpen && slide && (
        <PhonePreviewModal
          slide={slide}
          slides={slides!}
          currentIndex={currentIndex}
          locale={locale}
          transcript={transcript}
          avatarConfig={avatarConfig}
          onClose={() => setPhonePreviewOpen(false)}
          goTo={goTo}
        />
      )}
    </div>
  )
}
