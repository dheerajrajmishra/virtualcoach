import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, LayoutAnimation, Platform, UIManager,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { fetchSlides, resolveMediaUrl, Slide, Training } from '../api';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface Props { training: Training; onBack: () => void }

export default function TrainingPlayerScreen({ training, onBack }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = W > H;

  const [slides, setSlides]               = useState<Slide[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [slideError, setSlideError]       = useState<string | null>(null);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [locale, setLocale]               = useState(training.supportedLocales?.[0] ?? 'en');
  const [showTranscript, setShowTranscript] = useState(false);
  const [imageError, setImageError]       = useState(false);

  const soundRef                        = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [positionMs, setPositionMs]     = useState(0);
  const [durationMs, setDurationMs]     = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError]     = useState<string | null>(null);

  const slide = slides[currentIndex];

  // ── Load slides ───────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingSlides(true);
    fetchSlides(training.id)
      .then(setSlides)
      .catch(e => setSlideError(e.message ?? 'Failed to load slides'))
      .finally(() => setLoadingSlides(false));
  }, [training.id]);

  // ── Load audio ────────────────────────────────────────────────────────────
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
            if (st.didJustFinish) { setIsPlaying(false); setPositionMs(0); }
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

  async function togglePlay() {
    if (!soundRef.current) return;
    try {
      isPlaying ? await soundRef.current.pauseAsync() : await soundRef.current.playAsync();
    } catch (e: any) { setAudioError(e.message); }
  }

  async function seekTo(ratio: number) {
    if (!soundRef.current || !durationMs) return;
    await soundRef.current.setPositionAsync(Math.floor(ratio * durationMs)).catch(() => {});
  }

  function goTo(i: number) {
    if (i < 0 || i >= slides.length) return;
    setShowTranscript(false);
    setCurrentIndex(i);
  }

  function toggleTranscript() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowTranscript(o => !o);
  }

  const audioUrl   = resolveMediaUrl(slide?.audioUrls?.[locale]);
  const imageUrl   = resolveMediaUrl(slide?.imageGcsUrl);
  const transcript = slide?.transcripts?.[locale];
  const progress   = durationMs > 0 ? positionMs / durationMs : 0;

  if (loadingSlides) return (
    <View style={[s.center, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={s.hint}>Loading slides…</Text>
    </View>
  );

  if (slideError) return (
    <View style={[s.center, { paddingTop: insets.top }]}>
      <Text style={s.errTxt}>⚠️ {slideError}</Text>
      <TouchableOpacity style={s.outlineBtn} onPress={onBack}>
        <Text style={s.outlineTxt}>← Back</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Shared sub-components ─────────────────────────────────────────────────

  // Audio bar rendered inside the image area overlay
  const AudioBar = () => (
    <View style={s.audioBarOverlay}>
      <TouchableOpacity style={s.playBtn} onPress={togglePlay} disabled={audioLoading || !audioUrl}>
        {audioLoading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={s.playIcon}>{!audioUrl ? '🔇' : isPlaying ? '⏸' : '▶'}</Text>}
      </TouchableOpacity>

      <View style={s.trackWrap}>
        {audioError ? (
          <Text style={s.audioErrTxt} numberOfLines={1}>{audioError}</Text>
        ) : (
          <>
            <View style={s.track}>
              <View style={[s.trackFill, { width: `${Math.min(progress * 100, 100)}%` as any }]} />
              <View style={[s.thumb, { left: `${Math.min(progress * 100, 98)}%` as any }]} />
            </View>
            <View style={s.seekStrip}>
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map(p => (
                <TouchableOpacity key={p} style={s.seekZone} onPress={() => seekTo(p)} />
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
  );

  // Slide image with audio bar pinned to bottom and transcript overlaid above it
  const SlideImage = () => (
    <View style={[
      s.imgWrap,
      isLandscape
        ? { width: W * 0.60, height: H - insets.top - insets.bottom }
        : { width: W, height: Math.round(H * 0.62) },
    ]}>
      {imageUrl && !imageError ? (
        <Image source={{ uri: imageUrl }} style={s.img} resizeMode="contain"
          onError={() => setImageError(true)} />
      ) : (
        <View style={s.imgFallback}>
          <Text style={s.imgFallbackIcon}>🖼</Text>
          <Text style={s.imgFallbackTxt}>
            {imageError ? 'Could not load image' : 'No image'}
          </Text>
          {imageError && imageUrl
            ? <Text style={s.debugUrl} numberOfLines={2}>{imageUrl}</Text>
            : null}
        </View>
      )}

      {/* Counter top-right */}
      <View style={s.counterOverlay}>
        <Text style={s.counterTxt}>{currentIndex + 1} / {slides.length}</Text>
      </View>

      {/* Transcript scrollable overlay, sits above audio bar */}
      {showTranscript && (
        <ScrollView style={s.transcriptOverlay} showsVerticalScrollIndicator={false}
          contentContainerStyle={s.transcriptOverlayContent}>
          <Text style={s.transcriptOverlayTxt}>
            {transcript ?? `No transcript for ${locale.toUpperCase()}`}
          </Text>
        </ScrollView>
      )}

      {/* Audio bar pinned to bottom of image area */}
      <AudioBar />
    </View>
  );

  const NavBar = ({ horizontal = false }) => (
    <View style={[
      s.navBar,
      horizontal ? s.navBarHorizontal : s.navBarVertical,
      { paddingBottom: isLandscape ? insets.bottom + 4 : insets.bottom + 6 },
    ]}>
      <TouchableOpacity
        style={[s.navBtn, currentIndex === 0 && s.navBtnOff]}
        onPress={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
        <Text style={[s.navBtnTxt, currentIndex === 0 && s.navBtnTxtOff]}>‹ Prev</Text>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.dotsRow}>
        {slides.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <View style={[s.dot, i === currentIndex && s.dotActive]} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[s.navBtn, currentIndex === slides.length - 1 && s.navBtnOff]}
        onPress={() => goTo(currentIndex + 1)} disabled={currentIndex === slides.length - 1}>
        <Text style={[s.navBtnTxt, currentIndex === slides.length - 1 && s.navBtnTxtOff]}>
          Next ›
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── Header (shared) ───────────────────────────────────────────────────────
  const Header = ({ extraTop = 0, extraLeft = 0 }) => (
    <View style={[s.header, { paddingTop: insets.top + extraTop, paddingLeft: insets.left + extraLeft + 14 }]}>
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={s.backArrow}>←</Text>
      </TouchableOpacity>
      <Text style={s.headerTitle} numberOfLines={1}>{training.name}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.localePills}>
        {(training.supportedLocales ?? []).map(l => (
          <TouchableOpacity key={l} style={[s.lPill, locale === l && s.lPillActive]}
            onPress={() => setLocale(l)}>
            <Text style={[s.lPillTxt, locale === l && s.lPillTxtActive]}>{l.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity onPress={toggleTranscript} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[s.transcriptIconBtn, showTranscript && s.transcriptIconActive]}>
        <Text style={s.transcriptIconTxt}>📝</Text>
      </TouchableOpacity>
    </View>
  );

  // ── LANDSCAPE layout ──────────────────────────────────────────────────────
  if (isLandscape) {
    return (
      <View style={s.root}>
        <Header extraTop={4} />
        <View style={s.landscapeBody}>
          <SlideImage />
          <View style={[s.rightPanel, { paddingRight: insets.right + 12 }]}>
            {slide?.title
              ? <Text style={s.slideTitleLandscape} numberOfLines={3}>{slide.title}</Text>
              : null}
            <View style={{ flex: 1 }} />
            <NavBar horizontal />
          </View>
        </View>
      </View>
    );
  }

  // ── PORTRAIT layout ───────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <Header extraTop={6} />
      <SlideImage />
      {slide?.title
        ? <Text style={s.slideTitle} numberOfLines={2}>{slide.title}</Text>
        : null}
      <View style={{ flex: 1 }} />
      <NavBar />
    </View>
  );
}

const THUMB = 14;

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#111827' },
  hint:   { marginTop: 10, color: '#9ca3af', fontSize: 15 },
  errTxt: { color: '#ef4444', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  outlineBtn: { borderWidth: 1.5, borderColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  outlineTxt: { color: '#6366f1', fontWeight: '700' },

  header: {
    backgroundColor: '#6366f1', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 10, gap: 10,
  },
  backArrow:  { fontSize: 26, color: '#fff', lineHeight: 30 },
  headerTitle:{ fontSize: 15, fontWeight: '700', color: '#fff', flex: 1 },
  localePills:{ flexGrow: 0, flexShrink: 0 },
  lPill:      { marginLeft: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)' },
  lPillActive:{ backgroundColor: '#fff' },
  lPillTxt:   { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  lPillTxtActive: { color: '#6366f1' },

  // Image container
  imgWrap:         { backgroundColor: '#1e1b4b', overflow: 'hidden' },
  img:             { width: '100%', height: '100%' },
  imgFallback:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  imgFallbackIcon: { fontSize: 40 },
  imgFallbackTxt:  { color: '#c7d2fe', fontSize: 14 },
  debugUrl:        { color: '#818cf8', fontSize: 10, textAlign: 'center', paddingHorizontal: 20 },
  counterOverlay:  {
    position: 'absolute', top: 10, right: 12,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  counterTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Audio bar — overlaid at bottom of image
  audioBarOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(10,8,40,0.78)',
    paddingHorizontal: 14, paddingVertical: 10, gap: 12,
  },
  playBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  playIcon:   { fontSize: 17, color: '#fff' },
  trackWrap:  { flex: 1, gap: 5 },
  audioErrTxt:{ fontSize: 12, color: '#fca5a5' },
  track:      { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'visible', position: 'relative' },
  trackFill:  { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: '#818cf8', borderRadius: 2 },
  thumb:      { position: 'absolute', top: -(THUMB / 2 - 2), width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: '#a5b4fc', marginLeft: -(THUMB / 2) },
  seekStrip:  { position: 'absolute', top: -10, left: 0, right: 0, height: 24, flexDirection: 'row' },
  seekZone:   { flex: 1, height: '100%' },
  timesRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  timeTxt:    { fontSize: 10, color: 'rgba(255,255,255,0.55)' },

  // Transcript overlay on image blank area
  transcriptOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 62,
    backgroundColor: 'rgba(10,8,40,0.82)',
  },
  transcriptOverlayContent: { padding: 18, paddingBottom: 8 },
  transcriptOverlayTxt: { fontSize: 15, color: '#e0e7ff', lineHeight: 27 },

  // Transcript icon in header
  transcriptIconBtn:    { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  transcriptIconActive: { backgroundColor: '#fff' },
  transcriptIconTxt:    { fontSize: 16 },

  // Slide title strip (below image, above nav)
  slideTitle: { fontSize: 16, fontWeight: '700', color: '#e5e7eb', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },

  // Landscape
  landscapeBody:       { flex: 1, flexDirection: 'row' },
  rightPanel:          { flex: 1, backgroundColor: '#111827', paddingHorizontal: 14 },
  slideTitleLandscape: { fontSize: 15, fontWeight: '700', color: '#e5e7eb', paddingTop: 16, paddingBottom: 4 },

  // Nav bar
  navBar:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderTopWidth: 1, borderTopColor: '#1f2937', paddingHorizontal: 12, paddingTop: 8 },
  navBarVertical:   {},
  navBarHorizontal: { borderTopWidth: 1, borderTopColor: '#1f2937' },
  navBtn:           { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#6366f1', borderRadius: 10 },
  navBtnOff:        { backgroundColor: '#1f2937' },
  navBtnTxt:        { color: '#fff', fontWeight: '700', fontSize: 14 },
  navBtnTxtOff:     { color: '#4b5563' },
  dotsRow:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 6 },
  dot:              { width: 6, height: 6, borderRadius: 3, backgroundColor: '#374151' },
  dotActive:        { width: 22, height: 6, backgroundColor: '#6366f1', borderRadius: 3 },
});
