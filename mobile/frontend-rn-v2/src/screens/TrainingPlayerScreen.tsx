import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, LayoutAnimation, Platform, UIManager,
  useWindowDimensions, Modal, TextInput, KeyboardAvoidingView,
  PanResponder, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { fetchSlides, resolveMediaUrl, askFaq, transcribeAudio, Slide, Training } from '../api';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function ExpandIcon({ size, color }: { size: number; color: string }) {
  const arm = Math.round(size * 0.42);
  const t = 2;
  const c = { position: 'absolute' as const, width: arm, height: arm, borderColor: color };
  return (
    <View style={{ width: size, height: size }}>
      <View style={[c, { top: 0, left: 0, borderTopWidth: t, borderLeftWidth: t }]} />
      <View style={[c, { top: 0, right: 0, borderTopWidth: t, borderRightWidth: t }]} />
      <View style={[c, { bottom: 0, left: 0, borderBottomWidth: t, borderLeftWidth: t }]} />
      <View style={[c, { bottom: 0, right: 0, borderBottomWidth: t, borderRightWidth: t }]} />
    </View>
  );
}

function CompressIcon({ size, color }: { size: number; color: string }) {
  const arm = Math.round(size * 0.38);
  const t = 2;
  const off = Math.round(size * 0.28);
  const c = { position: 'absolute' as const, width: arm, height: arm, borderColor: color };
  return (
    <View style={{ width: size, height: size }}>
      <View style={[c, { top: off, left: off, borderTopWidth: t, borderLeftWidth: t }]} />
      <View style={[c, { top: off, right: off, borderTopWidth: t, borderRightWidth: t }]} />
      <View style={[c, { bottom: off, left: off, borderBottomWidth: t, borderLeftWidth: t }]} />
      <View style={[c, { bottom: off, right: off, borderBottomWidth: t, borderRightWidth: t }]} />
    </View>
  );
}

interface ChatMessage { id: string; role: 'user' | 'assistant'; text: string }
interface Props { training: Training; onBack: () => void }

export default function TrainingPlayerScreen({ training, onBack }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = W > H;
  const chatScrollRef = useRef<ScrollView>(null);

  const [slides, setSlides]                 = useState<Slide[]>([]);
  const [loadingSlides, setLoadingSlides]   = useState(true);
  const [slideError, setSlideError]         = useState<string | null>(null);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [locale, setLocale]                 = useState(training.supportedLocales?.[0] ?? 'en');
  const [showTranscript, setShowTranscript] = useState(false);
  const [imageError, setImageError]         = useState(false);

  const soundRef                        = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [positionMs, setPositionMs]     = useState(0);
  const [durationMs, setDurationMs]     = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError]     = useState<string | null>(null);

  const [autoPlay, setAutoPlay]             = useState(false);
  const [autoAdvanceSec, setAutoAdvanceSec] = useState<number | null>(null);
  const autoPlayRef                         = useRef(false);
  const autoAdvanceTimer                    = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  const [isFullscreen, setIsFullscreen]     = useState(false);
  const [showFsControls, setShowFsControls] = useState(true);
  const [showPlayFlash, setShowPlayFlash]   = useState(false);
  const [showFsLangPicker, setShowFsLangPicker] = useState(false);
  const fsControlsTimer                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playFlashTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIndexRef                     = useRef(0);
  const slidesLenRef                        = useRef(0);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { slidesLenRef.current = slides.length; }, [slides.length]);

  useEffect(() => {
    StatusBar.setHidden(isFullscreen, 'fade');
    return () => { if (isFullscreen) StatusBar.setHidden(false, 'none'); };
  }, [isFullscreen]);

  const [showBottomTranscript, setShowBottomTranscript] = useState(false);

  const [showChat, setShowChat]         = useState(false);
  const [chatInput, setChatInput]       = useState('');
  const [chatLoading, setChatLoading]   = useState(false);
  const [chatMode, setChatMode]         = useState<'text' | 'voice' | 'video'>('text');
  const [isRecording, setIsRecording]   = useState(false);
  const recordingRef                    = useRef<Audio.Recording | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    id: '0', role: 'assistant',
    text: `Hi! I'm your AI Coach for "${training.name}". Ask me anything about this training!`,
  }]);

  const slide         = slides[currentIndex];
  const slideProgress = slides.length > 0 ? (currentIndex + 1) / slides.length : 0;

  useEffect(() => {
    setLoadingSlides(true);
    fetchSlides(training.id)
      .then(setSlides)
      .catch(e => setSlideError(e.message ?? 'Failed to load slides'))
      .finally(() => setLoadingSlides(false));
  }, [training.id]);

  useEffect(() => {
    const url = resolveMediaUrl(slides[currentIndex]?.audioUrls?.[locale]);
    let cancelled = false;

    async function setup() {
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      setIsPlaying(false); setPositionMs(0); setDurationMs(0);
      setAudioError(null); setImageError(false);
      if (!url) return;
      setAudioLoading(true);
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false, progressUpdateIntervalMillis: 250 },
          (st: AVPlaybackStatus) => {
            if (cancelled || !st.isLoaded) return;
            setIsPlaying(st.isPlaying);
            setPositionMs(st.positionMillis ?? 0);
            setDurationMs(st.durationMillis ?? 0);
            if (st.didJustFinish) {
              setIsPlaying(false); setPositionMs(0);
              if (autoPlayRef.current && currentIndex < slides.length - 1) {
                let count = 3;
                setAutoAdvanceSec(count);
                autoAdvanceTimer.current = setInterval(() => {
                  count--;
                  if (count <= 0) {
                    clearInterval(autoAdvanceTimer.current!);
                    autoAdvanceTimer.current = null;
                    setAutoAdvanceSec(null);
                    setShowTranscript(false);
                    setCurrentIndex(currentIndex + 1);
                  } else { setAutoAdvanceSec(count); }
                }, 1000);
              }
            }
          }
        );
        if (!cancelled) soundRef.current = sound;
        else sound.unloadAsync().catch(() => {});
      } catch (e: any) {
        if (!cancelled) setAudioError(e.message ?? 'Playback error');
      } finally {
        if (!cancelled) setAudioLoading(false);
      }
    }
    setup();
    return () => {
      cancelled = true;
      soundRef.current?.stopAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [currentIndex, locale, slides]);

  useEffect(() => () => {
    if (autoAdvanceTimer.current) clearInterval(autoAdvanceTimer.current);
    if (fsControlsTimer.current) clearTimeout(fsControlsTimer.current);
    if (playFlashTimer.current) clearTimeout(playFlashTimer.current);
  }, []);

  const fsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        const fastSwipe = Math.abs(g.vx) > 0.4;
        const bigSwipe  = Math.abs(g.dx) > 55;
        if (g.dx > 0 && (fastSwipe || bigSwipe)) {
          if (autoAdvanceTimer.current) { clearInterval(autoAdvanceTimer.current); autoAdvanceTimer.current = null; }
          setAutoAdvanceSec(null);
          setShowTranscript(false);
          setCurrentIndex(prev => Math.max(0, prev - 1));
        } else if (g.dx < 0 && (fastSwipe || bigSwipe)) {
          if (autoAdvanceTimer.current) { clearInterval(autoAdvanceTimer.current); autoAdvanceTimer.current = null; }
          setAutoAdvanceSec(null);
          setShowTranscript(false);
          setCurrentIndex(prev => Math.min(slidesLenRef.current - 1, prev + 1));
        }
      },
    })
  ).current;

  function cancelAutoAdvance() {
    if (autoAdvanceTimer.current) { clearInterval(autoAdvanceTimer.current); autoAdvanceTimer.current = null; }
    setAutoAdvanceSec(null);
  }

  function showFsControlsAndScheduleHide() {
    setShowFsControls(true);
    if (fsControlsTimer.current) clearTimeout(fsControlsTimer.current);
    fsControlsTimer.current = setTimeout(() => setShowFsControls(false), 3000);
  }

  function handleFsTap() {
    togglePlay();
    setShowPlayFlash(true);
    if (playFlashTimer.current) clearTimeout(playFlashTimer.current);
    playFlashTimer.current = setTimeout(() => setShowPlayFlash(false), 650);
    showFsControlsAndScheduleHide();
  }

  function exitFullscreen() {
    setIsFullscreen(false);
    setShowFsLangPicker(false);
  }

  function enterFullscreen() {
    setIsFullscreen(true);
    showFsControlsAndScheduleHide();
  }

  async function togglePlay() {
    if (!soundRef.current) return;
    try { isPlaying ? await soundRef.current.pauseAsync() : await soundRef.current.playAsync(); }
    catch (e: any) { setAudioError(e.message); }
  }

  async function seekTo(ratio: number) {
    if (!soundRef.current || !durationMs) return;
    await soundRef.current.setPositionAsync(Math.floor(ratio * durationMs)).catch(() => {});
  }

  function goTo(i: number) {
    if (i < 0 || i >= slides.length) return;
    cancelAutoAdvance();
    setShowTranscript(false);
    setCurrentIndex(i);
  }

  function toggleTranscriptOverlay() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowTranscript(o => !o);
  }

  async function sendChatMessage(textOrEvent?: string | any) {
    const text = (typeof textOrEvent === 'string' ? textOrEvent : chatInput).trim();
    if (!text) return;
    setChatMessages(prev => [...prev, { id: `u${Date.now()}`, role: 'user', text }]);
    if (typeof textOrEvent !== 'string') setChatInput('');
    setChatLoading(true);
    try {
      const result = await askFaq(training.id, {
        question: text,
        locale,
        slideIndex: currentIndex,
      });
      setChatMessages(prev => [...prev, { id: `a${Date.now()}`, role: 'assistant', text: result.answer }]);
    } catch {
      setChatMessages(prev => [...prev, {
        id: `a${Date.now()}`,
        role: 'assistant',
        text: "Sorry, I couldn't reach the AI Coach right now. Please try again shortly.",
      }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        alert('Microphone permission is required to use voice chat.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        setChatInput('Listening...');
        setChatLoading(true);
        const text = await transcribeAudio(uri, locale);
        setChatInput(text);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setChatInput('');
    } finally {
      setChatLoading(false);
    }
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  const audioUrl   = resolveMediaUrl(slide?.audioUrls?.[locale]);
  const imageUrl   = resolveMediaUrl(slide?.imageGcsUrl);
  const transcript = slide?.transcripts?.[locale];
  const progress   = durationMs > 0 ? positionMs / durationMs : 0;

  if (loadingSlides) return (
    <View style={[s.center, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color="#6366f1" /><Text style={s.hint}>Loading slides…</Text>
    </View>
  );
  if (slideError) return (
    <View style={[s.center, { paddingTop: insets.top }]}>
      <Text style={s.errTxt}>⚠️ {slideError}</Text>
      <TouchableOpacity style={s.outlineBtn} onPress={onBack}><Text style={s.outlineTxt}>← Back</Text></TouchableOpacity>
    </View>
  );

  // ── Reusable audio track ───────────────────────────────────────────────────
  const AudioTrack = ({ onInteract }: { onInteract?: () => void }) => (
    <View style={s.trackWrap}>
      {audioError ? <Text style={s.audioErrTxt} numberOfLines={1}>{audioError}</Text> : (
        <>
          <View style={s.track}>
            <View style={[s.trackFill, { width: `${Math.min(progress * 100, 100)}%` as any }]} />
            <View style={[s.thumb, { left: `${Math.min(progress * 100, 98)}%` as any }]} />
          </View>
          <View style={s.seekStrip}>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map(p => (
              <TouchableOpacity key={p} style={s.seekZone}
                onPress={() => { seekTo(p); onInteract?.(); }} />
            ))}
          </View>
          <View style={s.timesRow}>
            <Text style={s.timeTxt}>{fmt(positionMs)}</Text>
            <Text style={s.timeTxt}>{fmt(durationMs)}</Text>
          </View>
        </>
      )}
    </View>
  );

  const AudioBar = ({ onFullscreen }: { onFullscreen?: () => void }) => (
    <View style={s.audioBarOverlay}>
      <TouchableOpacity style={s.playBtn} onPress={togglePlay} disabled={audioLoading || !audioUrl}>
        {audioLoading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={s.playIcon}>{!audioUrl ? '🔇' : isPlaying ? '⏸' : '▶'}</Text>}
      </TouchableOpacity>
      <AudioTrack />
      {onFullscreen && (
        <TouchableOpacity style={s.fsToggleBtn} onPress={onFullscreen} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ExpandIcon size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );

  const SlideImage = ({ height }: { height: number }) => (
    <View style={[s.imgWrap, { width: isLandscape ? W * 0.56 : W, height }]}>
      {imageUrl && !imageError ? (
        <Image source={{ uri: imageUrl }} style={s.img} resizeMode="contain"
          onError={() => setImageError(true)} />
      ) : (
        <View style={s.imgFallback}>
          <Text style={s.imgFallbackIcon}>🖼</Text>
          <Text style={s.imgFallbackTxt}>{imageError ? 'Could not load image' : 'No image'}</Text>
          {imageError && imageUrl ? <Text style={s.debugUrl} numberOfLines={2}>{imageUrl}</Text> : null}
        </View>
      )}
      <View style={s.counterOverlay}>
        <Text style={s.counterTxt}>{currentIndex + 1} / {slides.length}</Text>
      </View>
      {showTranscript && (
        <ScrollView style={s.transcriptOverlay} showsVerticalScrollIndicator={false}
          contentContainerStyle={s.transcriptOverlayContent}>
          <Text style={s.transcriptOverlayTxt}>
            {transcript ?? `No transcript for ${locale.toUpperCase()}`}
          </Text>
        </ScrollView>
      )}
      <AudioBar onFullscreen={enterFullscreen} />
    </View>
  );

  const NavBar = () => (
    <View style={[s.navBar, { paddingBottom: insets.bottom + 2 }]}>
      <TouchableOpacity style={[s.navBtn, currentIndex === 0 && s.navBtnOff]}
        onPress={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
        <Text style={[s.navBtnTxt, currentIndex === 0 && s.navBtnTxtOff]}>‹ Prev</Text>
      </TouchableOpacity>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dotsRow}>
        {slides.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <View style={[s.dot, i === currentIndex && s.dotActive]} />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={[s.navBtn, currentIndex === slides.length - 1 && s.navBtnOff]}
        onPress={() => goTo(currentIndex + 1)} disabled={currentIndex === slides.length - 1}>
        <Text style={[s.navBtnTxt, currentIndex === slides.length - 1 && s.navBtnTxtOff]}>Next ›</Text>
      </TouchableOpacity>
    </View>
  );

  const ProgressChips = () => (
    <>
      <View style={s.progressRow}>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${Math.round(slideProgress * 100)}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>{Math.round(slideProgress * 100)}%</Text>
      </View>
      <View style={s.chipsRow}>
        {training.category ? <View style={s.chip}><Text style={s.chipTxt}>{training.category}</Text></View> : null}
        {training.product ? <View style={[s.chip, s.chipAlt]}><Text style={[s.chipTxt, s.chipTxtAlt]}>{training.product}</Text></View> : null}
      </View>
    </>
  );

  const AutoPlayRow = ({ compact = false }) => (
    <View style={[s.autoPlayRow, compact && s.autoPlayRowCompact]}>
      <View style={s.autoPlayLeft}>
        {!compact && <Text style={s.autoPlayRowIcon}>▶▶</Text>}
        <View>
          <Text style={s.autoPlayLabel}>Auto-advance{compact ? '' : ' slides'}</Text>
          {!compact && <Text style={s.autoPlayDesc}>Move to next slide when audio finishes</Text>}
        </View>
      </View>
      <TouchableOpacity style={[s.toggle, autoPlay && s.toggleOn]}
        onPress={() => { if (autoPlay) cancelAutoAdvance(); setAutoPlay(o => !o); }} activeOpacity={0.8}>
        <View style={[s.toggleThumb, autoPlay && s.toggleThumbOn]} />
      </TouchableOpacity>
    </View>
  );

  const Header = ({ compact = false }) => (
    <View style={[
      s.header,
      { paddingTop: insets.top + (compact ? 2 : 6), paddingLeft: insets.left + 14, paddingRight: insets.right + 8 },
      compact && s.headerCompact,
    ]}>
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={s.backArrow}>←</Text>
      </TouchableOpacity>
      <Text style={s.headerTitle} numberOfLines={1}>{training.name}</Text>
      <View style={s.localePillsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.localePillsContent}>
          {(training.supportedLocales ?? []).map(l => (
            <TouchableOpacity key={l} style={[s.lPill, locale === l && s.lPillActive]} onPress={() => setLocale(l)}>
              <Text style={[s.lPillTxt, locale === l && s.lPillTxtActive]}>{l.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <TouchableOpacity onPress={toggleTranscriptOverlay}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[s.transcriptIconBtn, showTranscript && s.transcriptIconActive]}>
        <Text style={s.transcriptIconTxt}>📝</Text>
      </TouchableOpacity>
    </View>
  );

  // ── FULLSCREEN MODAL ───────────────────────────────────────────────────────
  const fsModal = (
    <Modal
      visible={isFullscreen}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={exitFullscreen}>

      <View style={s.fsRoot} {...fsPanResponder.panHandlers}>
        <View style={[StyleSheet.absoluteFill, s.fsBg]} />

        {imageUrl && !imageError ? (
          <Image source={{ uri: imageUrl }} style={[StyleSheet.absoluteFill, s.fsImg]}
            resizeMode="contain" onError={() => setImageError(true)} />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.imgFallback]}>
            <Text style={s.imgFallbackIcon}>🖼</Text>
            <Text style={[s.imgFallbackTxt, { color: '#9ca3af' }]}>
              {imageError ? 'Could not load image' : 'No image'}
            </Text>
          </View>
        )}

        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleFsTap}>
          {showPlayFlash && (
            <View style={s.fsCenterIndicator} pointerEvents="none">
              <View style={s.fsCenterCircle}>
                {audioLoading
                  ? <ActivityIndicator color="#fff" size="large" />
                  : <Text style={s.fsCenterIcon}>{!audioUrl ? '🔇' : isPlaying ? '⏸' : '▶'}</Text>}
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Controls overlay — opacity-driven, no remount */}
        <View
          style={[StyleSheet.absoluteFill, { opacity: showFsControls ? 1 : 0 }]}
          pointerEvents={showFsControls ? 'box-none' : 'none'}>

          {/* Top bar */}
          <View style={[s.fsTopBar, { paddingTop: insets.top + 10, paddingHorizontal: insets.left + 16 }]}
            pointerEvents="box-none">
            <View style={s.fsCounterBadge}>
              <Text style={s.fsCounterTxt}>{currentIndex + 1} / {slides.length}</Text>
            </View>
            <Text style={s.fsTitleTxt} numberOfLines={1}>{slide?.title ?? training.name}</Text>

            {/* Language switcher button */}
            {(training.supportedLocales ?? []).length > 1 && (
              <TouchableOpacity
                style={[s.fsLangBtn, showFsLangPicker && s.fsLangBtnActive]}
                onPress={() => { setShowFsLangPicker(o => !o); showFsControlsAndScheduleHide(); }}>
                <Text style={s.fsLangBtnIcon}>🌐</Text>
                <Text style={s.fsLangBtnTxt}>{locale.toUpperCase()}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.fsExitBtn} onPress={exitFullscreen}>
              <CompressIcon size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Language picker panel */}
          {showFsLangPicker && (
            <View style={[s.fsLangPicker, { top: insets.top + 60 }]}>
              <Text style={s.fsLangPickerLabel}>AUDIO LANGUAGE</Text>
              <View style={s.fsLangPillRow}>
                {(training.supportedLocales ?? []).map(l => (
                  <TouchableOpacity key={l}
                    style={[s.fsLangPill, locale === l && s.fsLangPillActive]}
                    onPress={() => { setLocale(l); setShowFsLangPicker(false); showFsControlsAndScheduleHide(); }}>
                    <Text style={[s.fsLangPillTxt, locale === l && s.fsLangPillTxtActive]}>
                      {l.toUpperCase()}
                    </Text>
                    {locale === l && <Text style={s.fsLangPillCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Swipe hints */}
          {currentIndex > 0 && (
            <View style={s.fsPrevHint} pointerEvents="none">
              <Text style={s.fsNavArrow}>‹</Text>
            </View>
          )}
          {currentIndex < slides.length - 1 && (
            <View style={s.fsNextHint} pointerEvents="none">
              <Text style={s.fsNavArrow}>›</Text>
            </View>
          )}

          {/* Slide dots */}
          <View style={s.fsDotsRow} pointerEvents="none">
            {slides.map((_, i) => (
              <View key={i} style={[s.fsDot, i === currentIndex && s.fsDotActive]} />
            ))}
          </View>

          {/* FAQ floating button */}
          <TouchableOpacity
            style={[s.fsFaqBtn, { bottom: insets.bottom + 80, right: insets.right + 16 }]}
            onPress={() => { setShowChat(true); showFsControlsAndScheduleHide(); }}>
            <Text style={s.fsFaqIcon}>❓</Text>
            <Text style={s.fsFaqLabel}>FAQ</Text>
          </TouchableOpacity>

          {/* Bottom audio bar — AudioTrack inlined to avoid sub-component remount */}
          <View style={[s.fsBottomBar, { paddingBottom: insets.bottom + 12, paddingHorizontal: insets.left + 14 }]}
            pointerEvents="box-none">
            <TouchableOpacity style={s.fsPlayBtn} onPress={togglePlay} disabled={audioLoading || !audioUrl}>
              {audioLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.playIcon}>{!audioUrl ? '🔇' : isPlaying ? '⏸' : '▶'}</Text>}
            </TouchableOpacity>
            <View style={s.trackWrap}>
              {audioError ? <Text style={s.audioErrTxt} numberOfLines={1}>{audioError}</Text> : (
                <>
                  <View style={s.track}>
                    <View style={[s.trackFill, { width: `${Math.min(progress * 100, 100)}%` as any }]} />
                    <View style={[s.thumb, { left: `${Math.min(progress * 100, 98)}%` as any }]} />
                  </View>
                  <View style={s.seekStrip}>
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map(p => (
                      <TouchableOpacity key={p} style={s.seekZone}
                        onPress={() => { seekTo(p); showFsControlsAndScheduleHide(); }} />
                    ))}
                  </View>
                  <View style={s.timesRow}>
                    <Text style={s.timeTxt}>{fmt(positionMs)}</Text>
                    <Text style={s.timeTxt}>{fmt(durationMs)}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ── AI Coach FAB ───────────────────────────────────────────────────────────
  const fab = (
    <TouchableOpacity style={[s.fab, { bottom: insets.bottom + 72 }]}
      onPress={() => setShowChat(true)} activeOpacity={0.85}>
      <Text style={s.fabIcon}>🤖</Text>
    </TouchableOpacity>
  );

  // ── Chat / FAQ modal (Minimalist Redesign) ───────────────────────────────
  const chatModal = (
    <Modal visible={showChat} animationType="slide" transparent onRequestClose={() => setShowChat(false)}>
      <KeyboardAvoidingView style={s.chatOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.chatSheet}>

          {/* Drag handle */}
          <View style={s.chatHandleWrap}>
            <View style={s.chatHandle} />
          </View>

          {/* Header */}
          <View style={s.chatHeader}>
            <Text style={s.chatTitle}>AI Coach</Text>
            <TouchableOpacity style={s.chatCloseBtn} onPress={() => setShowChat(false)}>
              <Text style={s.chatCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView ref={chatScrollRef} style={s.chatMessages} contentContainerStyle={s.chatMessagesContent}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}>
            {chatMessages.map(msg => (
              <View key={msg.id} style={[s.msgRow, msg.role === 'user' ? s.msgRowUser : s.msgRowBot]}>
                <View style={[s.msgBubble, msg.role === 'user' ? s.msgUser : s.msgBot]}>
                  <Text style={[s.msgText, msg.role === 'user' ? s.msgTextUser : s.msgTextBot]}>{msg.text}</Text>
                </View>
              </View>
            ))}
            {chatLoading && (
              <View style={[s.msgRow, s.msgRowBot]}>
                <View style={[s.msgBubble, s.msgBot]}>
                  <View style={s.typingRow}><ActivityIndicator size="small" color="#6366f1" /></View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Context / Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={s.faqChipsScroll} contentContainerStyle={s.faqChipsContent}>
            {['Summarise slide', 'Key takeaways', 'Explain simply', 'Next steps'].map(q => (
              <TouchableOpacity key={q} style={s.faqChip} onPress={() => sendChatMessage(q)}>
                <Text style={s.faqChipTxt}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input Area */}
          <View style={[s.chatInputRow, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12 }]}>
            <TouchableOpacity style={[s.iconActionBtn, isRecording && s.iconActionBtnActive]} onPress={toggleRecording}>
              <Text style={s.iconActionTxt}>{isRecording ? '⏹️' : '🎤'}</Text>
            </TouchableOpacity>
            <TextInput style={s.chatInput} value={chatInput} onChangeText={setChatInput}
              placeholder={`Ask about slide ${currentIndex + 1}…`} placeholderTextColor="#6b7280"
              multiline maxLength={500} returnKeyType="send" blurOnSubmit onSubmitEditing={() => sendChatMessage()} />
            <TouchableOpacity style={[s.sendBtn, !chatInput.trim() && s.sendBtnOff]}
              onPress={() => sendChatMessage()} disabled={!chatInput.trim() || chatLoading}>
              <Text style={s.sendBtnTxt}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // LANDSCAPE
  // ══════════════════════════════════════════════════════════════════════════
  if (isLandscape) {
    const imgH = H - insets.top - insets.bottom;
    return (
      <View style={s.root}>
        <Header compact />
        <View style={s.landscapeBody}>
          <SlideImage height={imgH} />
          <View style={[s.rightPanel, { paddingRight: insets.right + 10 }]}>
            <View style={s.rightTop}>
              <View style={s.rightTitleRow}>
                {slide?.title
                  ? <Text style={s.slideTitleLandscape} numberOfLines={2}>{slide.title}</Text>
                  : <View style={{ flex: 1 }} />}
                <TouchableOpacity style={s.aiBtn} onPress={() => setShowChat(true)}>
                  <Text style={s.aiBtnIcon}>🤖</Text>
                  <Text style={s.aiBtnTxt}>Ask AI</Text>
                </TouchableOpacity>
              </View>
              <ProgressChips />
              <AutoPlayRow compact />
            </View>
            <View style={s.rightDivider} />
            <ScrollView style={s.transcriptPanel} showsVerticalScrollIndicator={false}
              contentContainerStyle={s.transcriptPanelContent}>
              <Text style={s.transcriptPanelLabel}>TRANSCRIPT</Text>
              {transcript
                ? <Text style={s.transcriptPanelTxt}>{transcript}</Text>
                : <Text style={s.transcriptPanelEmpty}>No transcript for {locale.toUpperCase()}</Text>}
            </ScrollView>
            <View style={[s.navBarLandscape, { paddingBottom: insets.bottom + 2 }]}>
              <TouchableOpacity style={[s.navBtn, currentIndex === 0 && s.navBtnOff]}
                onPress={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
                <Text style={[s.navBtnTxt, currentIndex === 0 && s.navBtnTxtOff]}>‹ Prev</Text>
              </TouchableOpacity>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dotsRow}>
                {slides.map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                    <View style={[s.dot, i === currentIndex && s.dotActive]} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[s.navBtn, currentIndex === slides.length - 1 && s.navBtnOff]}
                onPress={() => goTo(currentIndex + 1)} disabled={currentIndex === slides.length - 1}>
                <Text style={[s.navBtnTxt, currentIndex === slides.length - 1 && s.navBtnTxtOff]}>Next ›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {fsModal}
        {chatModal}
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PORTRAIT
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <View style={s.root}>
      <Header />
      <SlideImage height={Math.round(H * 0.45)} />
      <View style={s.infoPanel}>
        {slide?.title ? <Text style={s.slideTitle} numberOfLines={2}>{slide.title}</Text> : null}
        <ProgressChips />
      </View>
      <NavBar />

      <ScrollView style={s.bottomSection}
        contentContainerStyle={[s.bottomContent, { paddingBottom: insets.bottom + 12 }]}
        showsVerticalScrollIndicator={false}>
        {autoAdvanceSec !== null && (
          <TouchableOpacity style={s.countdownBanner} onPress={cancelAutoAdvance} activeOpacity={0.85}>
            <View style={s.countdownBar}>
              <View style={[s.countdownFill, { width: `${((3 - autoAdvanceSec) / 3) * 100}%` as any }]} />
            </View>
            <View style={s.countdownRow}>
              <Text style={s.countdownTxt}>▶▶  Next slide in {autoAdvanceSec}s</Text>
              <View style={s.countdownCancelChip}><Text style={s.countdownCancelTxt}>Cancel</Text></View>
            </View>
          </TouchableOpacity>
        )}
        <AutoPlayRow />
        <View style={s.bottomDivider} />
        <TouchableOpacity style={s.transcriptToggleRow}
          onPress={() => setShowBottomTranscript(o => !o)} activeOpacity={0.7}>
          <Text style={s.transcriptSectionLabel}>TRANSCRIPT</Text>
          <View style={s.transcriptTogglePill}>
            <Text style={s.transcriptTogglePillTxt}>{showBottomTranscript ? 'Hide ▲' : 'Show ▼'}</Text>
          </View>
        </TouchableOpacity>
        {showBottomTranscript
          ? (transcript
              ? <Text style={s.transcriptFullTxt}>{transcript}</Text>
              : <Text style={s.noTranscriptTxt}>No transcript for {locale.toUpperCase()}</Text>)
          : (transcript
              ? <Text style={s.transcriptPreviewTxt} numberOfLines={2}>{transcript}</Text>
              : <Text style={s.noTranscriptTxt}>No transcript for {locale.toUpperCase()}</Text>)}
      </ScrollView>

      {fab}
      {fsModal}
      {chatModal}
    </View>
  );
}

const THUMB = 14;

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#111827' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#111827' },
  hint:       { marginTop: 10, color: '#9ca3af', fontSize: 15 },
  errTxt:     { color: '#ef4444', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  outlineBtn: { borderWidth: 1.5, borderColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  outlineTxt: { color: '#6366f1', fontWeight: '700' },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#4f46e5', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 10, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6,
  },
  headerCompact:        { paddingBottom: 8 },
  backArrow:            { fontSize: 24, color: '#fff', lineHeight: 28 },
  headerTitle:          { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
  localePillsWrap:      { flexShrink: 1, maxWidth: 130 },
  localePillsContent:   { flexDirection: 'row', gap: 4 },
  lPill:                { paddingHorizontal: 8, height: 26, justifyContent: 'center', borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)' },
  lPillActive:          { backgroundColor: '#fff' },
  lPillTxt:             { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  lPillTxtActive:       { color: '#6366f1' },
  transcriptIconBtn:    { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  transcriptIconActive: { backgroundColor: '#fff' },
  transcriptIconTxt:    { fontSize: 15 },

  // ── Slide image ───────────────────────────────────────────────────────────────
  imgWrap:         { backgroundColor: '#1e1b4b', overflow: 'hidden' },
  img:             { width: '100%', height: '100%' },
  imgFallback:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  imgFallbackIcon: { fontSize: 38 },
  imgFallbackTxt:  { color: '#c7d2fe', fontSize: 14 },
  debugUrl:        { color: '#818cf8', fontSize: 10, textAlign: 'center', paddingHorizontal: 20 },
  counterOverlay:  { position: 'absolute', top: 10, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  counterTxt:      { color: '#fff', fontSize: 12, fontWeight: '700' },

  // ── Audio bar ─────────────────────────────────────────────────────────────────
  audioBarOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(10,8,40,0.88)',
    paddingHorizontal: 12, paddingVertical: 10, gap: 10,
  },
  playBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  playIcon:     { fontSize: 16, color: '#fff' },
  trackWrap:    { flex: 1, gap: 5 },
  audioErrTxt:  { fontSize: 12, color: '#fca5a5' },
  track:        { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'visible', position: 'relative' },
  trackFill:    { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: '#818cf8', borderRadius: 2 },
  thumb:        { position: 'absolute', top: -(THUMB / 2 - 2), width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: '#a5b4fc', marginLeft: -(THUMB / 2) },
  seekStrip:    { position: 'absolute', top: -10, left: 0, right: 0, height: 24, flexDirection: 'row' },
  seekZone:     { flex: 1, height: '100%' },
  timesRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  timeTxt:      { fontSize: 10, color: 'rgba(255,255,255,0.55)' },
  fsToggleBtn:  { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  // ── Transcript overlay ────────────────────────────────────────────────────────
  transcriptOverlay:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 62, backgroundColor: 'rgba(10,8,40,0.88)' },
  transcriptOverlayContent: { padding: 18, paddingBottom: 8 },
  transcriptOverlayTxt:     { fontSize: 15, color: '#e0e7ff', lineHeight: 27 },

  // ── FULLSCREEN ────────────────────────────────────────────────────────────────
  fsRoot: { flex: 1, backgroundColor: '#000' },
  fsBg:   { backgroundColor: '#000' },
  fsImg:  { width: '100%', height: '100%' },

  fsTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  fsCounterBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  fsCounterTxt:   { color: '#fff', fontSize: 12, fontWeight: '700' },
  fsTitleTxt:     { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  fsExitBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18 },

  // Fullscreen language switcher
  fsLangBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)' },
  fsLangBtnActive:     { backgroundColor: 'rgba(99,102,241,0.55)', borderWidth: 1, borderColor: '#818cf8' },
  fsLangBtnIcon:       { fontSize: 13 },
  fsLangBtnTxt:        { fontSize: 11, fontWeight: '800', color: '#fff' },
  fsLangPicker:        { position: 'absolute', left: 16, right: 16, backgroundColor: 'rgba(10,8,40,0.96)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(99,102,241,0.35)' },
  fsLangPickerLabel:   { fontSize: 10, fontWeight: '800', color: '#6366f1', letterSpacing: 1, marginBottom: 12 },
  fsLangPillRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fsLangPill:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  fsLangPillActive:    { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  fsLangPillTxt:       { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  fsLangPillTxtActive: { color: '#fff' },
  fsLangPillCheck:     { fontSize: 11, color: '#fff', fontWeight: '800' },

  // Center play indicator
  fsCenterIndicator: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  fsCenterCircle:    { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  fsCenterIcon:      { fontSize: 28, color: '#fff' },

  // Swipe hints
  fsPrevHint: { position: 'absolute', left: 0, top: '30%', bottom: '30%', width: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  fsNextHint: { position: 'absolute', right: 0, top: '30%', bottom: '30%', width: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  fsNavArrow: { color: 'rgba(255,255,255,0.8)', fontSize: 36, fontWeight: '300' },

  // Slide dots
  fsDotsRow:   { position: 'absolute', bottom: 80, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  fsDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  fsDotActive: { width: 20, height: 6, backgroundColor: '#fff', borderRadius: 3 },

  // FAQ floating button (fullscreen)
  fsFaqBtn:   { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(99,102,241,0.90)', alignItems: 'center', justifyContent: 'center', gap: 1, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 10 },
  fsFaqIcon:  { fontSize: 20 },
  fsFaqLabel: { fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  // Bottom audio bar
  fsBottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  fsPlayBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(99,102,241,0.85)', alignItems: 'center', justifyContent: 'center' },

  // ── Info panel ────────────────────────────────────────────────────────────────
  infoPanel:     { backgroundColor: '#161d2e', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1f2a3d' },
  slideTitle:    { fontSize: 16, fontWeight: '700', color: '#f1f5f9', marginBottom: 8, lineHeight: 22 },
  progressRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#2d3748', overflow: 'hidden' },
  progressFill:  { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: '#6366f1', borderRadius: 3 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: '#818cf8', minWidth: 34, textAlign: 'right' },
  chipsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(99,102,241,0.18)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.35)' },
  chipAlt:       { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' },
  chipTxt:       { fontSize: 11, fontWeight: '600', color: '#a5b4fc' },
  chipTxtAlt:    { color: '#6ee7b7' },

  // ── Nav bar ───────────────────────────────────────────────────────────────────
  navBar:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderTopWidth: 1, borderTopColor: '#1f2937', paddingHorizontal: 12, paddingTop: 6 },
  navBtn:       { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#6366f1', borderRadius: 10 },
  navBtnOff:    { backgroundColor: '#1f2937' },
  navBtnTxt:    { color: '#fff', fontWeight: '700', fontSize: 13 },
  navBtnTxtOff: { color: '#4b5563' },
  dotsRow:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  dot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: '#374151' },
  dotActive:    { width: 20, height: 6, backgroundColor: '#6366f1', borderRadius: 3 },

  // ── Bottom section ────────────────────────────────────────────────────────────
  bottomSection:           { flex: 1, backgroundColor: '#0d1420' },
  bottomContent:           { paddingHorizontal: 16, paddingTop: 10, gap: 4 },
  countdownBanner:         { backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)', overflow: 'hidden' },
  countdownBar:            { height: 3, backgroundColor: '#2d3748' },
  countdownFill:           { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: '#6366f1' },
  countdownRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  countdownTxt:            { fontSize: 13, fontWeight: '700', color: '#a5b4fc' },
  countdownCancelChip:     { backgroundColor: '#6366f1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countdownCancelTxt:      { fontSize: 11, fontWeight: '700', color: '#fff' },
  autoPlayRow:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  autoPlayRowCompact:      { paddingVertical: 4 },
  autoPlayLeft:            { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  autoPlayRowIcon:         { fontSize: 13, color: '#6366f1' },
  autoPlayLabel:           { fontSize: 13, fontWeight: '700', color: '#e2e8f0' },
  autoPlayDesc:            { fontSize: 11, color: '#4b5563', marginTop: 1 },
  toggle:                  { width: 44, height: 24, borderRadius: 12, backgroundColor: '#2d3748', justifyContent: 'center', padding: 2 },
  toggleOn:                { backgroundColor: '#6366f1' },
  toggleThumb:             { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn:           { alignSelf: 'flex-end' },
  bottomDivider:           { height: 1, backgroundColor: '#1a2235', marginVertical: 10 },
  transcriptToggleRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  transcriptSectionLabel:  { fontSize: 9, fontWeight: '800', color: '#6366f1', letterSpacing: 1 },
  transcriptTogglePill:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  transcriptTogglePillTxt: { fontSize: 11, fontWeight: '700', color: '#818cf8' },
  transcriptFullTxt:       { fontSize: 14, color: '#94a3b8', lineHeight: 22 },
  transcriptPreviewTxt:    { fontSize: 13, color: '#475569', lineHeight: 20 },
  noTranscriptTxt:         { fontSize: 12, color: '#374151', fontStyle: 'italic' },

  // ── FAB ───────────────────────────────────────────────────────────────────────
  fab:     { position: 'absolute', right: 16, width: 54, height: 54, borderRadius: 27, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 12 },
  fabIcon: { fontSize: 24 },

  // ── Landscape ─────────────────────────────────────────────────────────────────
  landscapeBody:          { flex: 1, flexDirection: 'row' },
  rightPanel:             { flex: 1, backgroundColor: '#0f1623', flexDirection: 'column' },
  rightTop:               { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  rightTitleRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  slideTitleLandscape:    { flex: 1, fontSize: 14, fontWeight: '700', color: '#f1f5f9', lineHeight: 20 },
  aiBtn:                  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.18)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)' },
  aiBtnIcon:              { fontSize: 15 },
  aiBtnTxt:               { fontSize: 11, fontWeight: '700', color: '#a5b4fc' },
  rightDivider:           { height: 1, backgroundColor: '#1a2235', marginHorizontal: 14 },
  transcriptPanel:        { flex: 1, marginTop: 4 },
  transcriptPanelContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  transcriptPanelLabel:   { fontSize: 9, fontWeight: '800', color: '#374151', letterSpacing: 1, marginBottom: 8 },
  transcriptPanelTxt:     { fontSize: 13, color: '#64748b', lineHeight: 20 },
  transcriptPanelEmpty:   { fontSize: 12, color: '#374151', fontStyle: 'italic' },
  navBarLandscape:        { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1a2235', paddingHorizontal: 14, paddingTop: 8 },

  // ── Chat modal ────────────────────────────────────────────────────────────────
  chatOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  chatSheet:         { backgroundColor: '#111827', borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '90%', overflow: 'hidden', borderWidth: 1, borderColor: '#1f2937' },

  // Handle
  chatHandleWrap:    { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  chatHandle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: '#374151' },

  // Header (Minimal)
  chatHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  chatTitle:         { fontSize: 16, fontWeight: '700', color: '#f1f5f9', letterSpacing: 0.5 },
  chatCloseBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1f2937', alignItems: 'center', justifyContent: 'center' },
  chatCloseTxt:      { color: '#9ca3af', fontSize: 14, fontWeight: '700' },

  // Quick FAQ chips
  faqChipsScroll:    { maxHeight: 44, flexGrow: 0 },
  faqChipsContent:   { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  faqChip:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#374151' },
  faqChipTxt:        { fontSize: 12, fontWeight: '500', color: '#9ca3af' },

  // Messages
  chatMessages:        { flex: 1 },
  chatMessagesContent: { padding: 16, gap: 12 },
  msgRow:              { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser:          { justifyContent: 'flex-end' },
  msgRowBot:           { justifyContent: 'flex-start' },
  msgBubble:           { maxWidth: '85%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  msgUser:             { backgroundColor: '#6366f1', borderBottomRightRadius: 4 },
  msgBot:              { backgroundColor: '#1f2937', borderBottomLeftRadius: 4 },
  msgText:             { fontSize: 14, lineHeight: 22 },
  msgTextUser:         { color: '#fff' },
  msgTextBot:          { color: '#cbd5e1' },
  typingRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },

  // Input
  chatInputRow:  { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#1f2937', gap: 10, backgroundColor: '#111827' },
  iconActionBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2937' },
  iconActionBtnActive: { backgroundColor: '#ef4444' },
  iconActionTxt: { fontSize: 18 },
  chatInput:     { flex: 1, minHeight: 44, maxHeight: 110, backgroundColor: '#1f2937', borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 14, color: '#f1f5f9' },
  sendBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  sendBtnOff:    { backgroundColor: '#374151' },
  sendBtnTxt:    { fontSize: 16, color: '#fff' },
});
