import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchTrainings, fetchMyAssignments, fetchAllProgress,
  initProgress,
  Training, AssignmentItem, LearnerProgress,
} from '../api';

// ── Constants ─────────────────────────────────────────────────────────────────

const USER_ID = 'learner-uid';

const FILTERS = ['All', 'Not Started', 'In Progress', 'Completed'] as const;
type Filter = typeof FILTERS[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function deadlineInfo(deadline: string | null | undefined, completed: boolean) {
  if (completed || !deadline) return { label: '', urgent: false };
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return { label: '', urgent: false };
  const diff = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, urgent: true,  color: '#ef4444' };
  if (diff === 0) return { label: 'Due today',                  urgent: true,  color: '#f97316' };
  if (diff <= 3)  return { label: `${diff}d left`,              urgent: true,  color: '#f59e0b' };
  return            { label: `${diff}d left`,                   urgent: false, color: '#6b7280' };
}

function progressColor(pct: number) {
  if (pct >= 100) return '#10b981';
  if (pct >= 60)  return '#6366f1';
  if (pct >= 30)  return '#f59e0b';
  return '#e5e7eb';
}

// ── Combined data type ────────────────────────────────────────────────────────

interface AssignedTraining {
  training: Training;
  assignment: AssignmentItem;
  progress: LearnerProgress | null;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const [anim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct / 100,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={pb.track}>
      <Animated.View
        style={[pb.fill, {
          flex: anim as any,
          backgroundColor: progressColor(pct),
        }]}
      />
      <Animated.View style={{ flex: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) as any }} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden', flexDirection: 'row' },
  fill:  { borderRadius: 3 },
});

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    NOT_STARTED: { label: 'Not Started', bg: '#f3f4f6', color: '#6b7280' },
    IN_PROGRESS: { label: 'In Progress', bg: '#eef2ff', color: '#6366f1' },
    COMPLETED:   { label: 'Completed',   bg: '#d1fae5', color: '#059669' },
  }[status] ?? { label: status, bg: '#f3f4f6', color: '#6b7280' };

  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[s.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ── Training card ─────────────────────────────────────────────────────────────

function TrainingCard({
  item,
  onOpen,
}: {
  item: AssignedTraining;
  onOpen: () => void;
}) {
  const { training, assignment, progress } = item;
  const status    = progress?.status ?? 'NOT_STARTED';
  const completed = status === 'COMPLETED';
  const dl        = deadlineInfo(assignment.deadline, completed);
  const current   = progress?.currentSlideIndex ?? 0;
  const total     = progress?.totalSlides || training.totalSlides || 0;
  const pct       = completed ? 100 : total > 0 ? Math.round(current / total * 100) : 0;

  const btnLabel    = completed ? 'Review' : status === 'IN_PROGRESS' ? 'Resume' : 'Start';
  const btnStyle    = completed ? s.btnOutline : s.btnPrimary;
  const btnTxtStyle = completed ? s.btnOutlineTxt : s.btnPrimaryTxt;

  return (
    <View style={s.card}>

      {/* Top row */}
      <View style={s.cardTopRow}>
        <Text style={s.cardName} numberOfLines={2}>{training.name}</Text>
        <StatusBadge status={status} />
      </View>

      {/* Meta chips */}
      <View style={s.metaRow}>
        <Text style={s.metaChip}>📁 {training.category}</Text>
        <Text style={s.metaChip}>🏷 {training.product}</Text>
      </View>

      {/* Progress section */}
      <View style={s.progressSection}>
        <View style={s.progressHeader}>
          <Text style={s.progressLabel}>Progress</Text>
          <Text style={[s.progressPct, { color: progressColor(pct) }]}>
            {Math.round(pct)}%
          </Text>
        </View>
        <ProgressBar pct={pct} />
        <View style={s.slideCountRow}>
          <Text style={s.slideCountTxt}>
            {completed
              ? `✓ All ${total} slides completed`
              : total > 0
                ? `Slide ${current} of ${total}`
                : `${training.totalSlides ?? 0} slides`}
          </Text>
          {(training.supportedLocales ?? []).length > 0 && (
            <View style={s.localeRow}>
              {(training.supportedLocales ?? []).slice(0, 4).map((l, idx) => (
                <View key={`${l}-${idx}`} style={s.langPill}>
                  <Text style={s.langTxt}>{l.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Deadline / completion */}
      <View style={s.deadlineRow}>
        {completed && progress?.completedAt ? (
          <View style={s.completedInfo}>
            <Text style={s.completedIcon}>✅</Text>
            <Text style={s.completedTxt}>Completed {fmtDate(progress.completedAt)}</Text>
          </View>
        ) : (
          <View style={s.deadlineInfo}>
            <Text style={[s.deadlineLabel, dl.urgent && { color: dl.color }]}>
              📅 Due {fmtDate(assignment.deadline)}
            </Text>
            {dl.label ? (
              <View style={[s.urgencyBadge, { backgroundColor: dl.urgent ? (dl.color + '20') : '#f3f4f6' }]}>
                <Text style={[s.urgencyTxt, { color: dl.color ?? '#6b7280' }]}>{dl.label}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={s.actionRow}>
        <TouchableOpacity style={[s.btn, btnStyle, { flex: 1 }]} onPress={onOpen}>
          <Text style={btnTxtStyle}>{btnLabel} →</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props { onSelect: (t: Training, assignmentId: string, isReview: boolean, initialSlide: number) => void }

export default function TrainingListScreen({ onSelect }: Props) {
  const insets = useSafeAreaInsets();

  const [items, setItems]         = useState<AssignedTraining[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefresh]  = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [filter, setFilter]       = useState<Filter>('All');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefresh(true) : setLoading(true);
    setError(null);
    try {
      const [assignments, trainings, progressList] = await Promise.all([
        fetchMyAssignments(USER_ID),
        fetchTrainings(),
        fetchAllProgress(),
      ]);

      const trainingMap = Object.fromEntries(trainings.map(t => [t.id, t]));
      const progressMap = Object.fromEntries(progressList.map(p => [p.trainingId, p]));

      let merged: AssignedTraining[];

      if (assignments.length > 0) {
        merged = assignments
          .map(a => ({
            training:   trainingMap[a.trainingId],
            assignment: a,
            progress:   progressMap[a.trainingId] ?? null,
          }))
          .filter(x => !!x.training);
      } else {
        // Fallback: no assignments yet — show all published trainings
        merged = trainings.map(t => ({
          training:   t,
          assignment: { id: '', userId: USER_ID, trainingId: t.id, product: t.product,
                        status: 'ASSIGNED', deadline: '', assignedAt: t.publishedAt ?? '',
                        assignedBy: '' },
          progress:   progressMap[t.id] ?? null,
        }));
      }

      // Sort: in-progress first, then not started, then completed
      merged.sort((a, b) => {
        const order = { IN_PROGRESS: 0, NOT_STARTED: 1, COMPLETED: 2 };
        return (order[a.progress?.status ?? 'NOT_STARTED'] ?? 1)
             - (order[b.progress?.status ?? 'NOT_STARTED'] ?? 1);
      });

      setItems(merged);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load trainings');
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(item => {
    const status = item.progress?.status ?? 'NOT_STARTED';
    if (filter === 'All')         return true;
    if (filter === 'Not Started') return status === 'NOT_STARTED';
    if (filter === 'In Progress') return status === 'IN_PROGRESS';
    if (filter === 'Completed')   return status === 'COMPLETED';
    return true;
  });

  const counts = {
    'All':         items.length,
    'Not Started': items.filter(i => (i.progress?.status ?? 'NOT_STARTED') === 'NOT_STARTED').length,
    'In Progress': items.filter(i => i.progress?.status === 'IN_PROGRESS').length,
    'Completed':   items.filter(i => i.progress?.status === 'COMPLETED').length,
  };

  async function handleOpen(item: AssignedTraining) {
    const isReview = item.progress?.status === 'COMPLETED';
    if (!isReview && item.assignment.id) {
      await initProgress(item.training.id, item.assignment.id);
    }
    // currentSlideIndex is 1-based; convert to 0-based for the player
    const initialSlide = item.progress?.status === 'IN_PROGRESS'
      ? Math.max(0, (item.progress.currentSlideIndex || 1) - 1)
      : 0;
    onSelect(item.training, item.assignment.id, isReview, initialSlide);
  }


  if (loading) return (
    <View style={[s.center, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={s.hint}>Loading your trainings…</Text>
    </View>
  );

  if (error) return (
    <View style={[s.center, { paddingTop: insets.top }]}>
      <Text style={s.errTxt}>⚠️ {error}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
        <Text style={s.retryTxt}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const completed = items.filter(i => i.progress?.status === 'COMPLETED').length;
  const completionPct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  return (
    <View style={s.root}>

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>My Trainings</Text>
            <Text style={s.headerSub}>
              {completed}/{items.length} completed
            </Text>
          </View>
          <View style={s.overallBadge}>
            <Text style={s.overallPct}>{completionPct}%</Text>
            <Text style={s.overallLbl}>done</Text>
          </View>
        </View>

        {/* Overall progress bar */}
        <View style={s.headerProgressTrack}>
          <View style={[s.headerProgressFill, { width: `${completionPct}%` as any }]} />
        </View>

        {/* Filter tabs */}
        <View style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterTab, filter === f && s.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>
                {f} {counts[f] > 0 ? `(${counts[f]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.assignment.id || i.training.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#6366f1" />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>
              {filter === 'All' ? 'No trainings assigned yet' : `No ${filter.toLowerCase()} trainings`}
            </Text>
            <Text style={s.emptyHint}>
              {filter === 'All'
                ? 'Your manager will assign training modules here.'
                : 'Try a different filter.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TrainingCard
            item={item}
            onOpen={() => handleOpen(item)}
          />
        )}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hint:   { marginTop: 10, color: '#9ca3af', fontSize: 14 },
  errTxt: { color: '#ef4444', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryTxt: { color: '#fff', fontWeight: '700' },

  // Header
  header: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 12,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting:  { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  overallBadge: {
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
  },
  overallPct: { fontSize: 20, fontWeight: '800', color: '#fff' },
  overallLbl: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  headerProgressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2 },
  headerProgressFill:  { height: 4, backgroundColor: '#fff', borderRadius: 2 },

  filterRow: { flexDirection: 'row', gap: 6 },
  filterTab: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  filterTabActive: { backgroundColor: '#fff' },
  filterTxt:       { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  filterTxtActive: { color: '#6366f1' },

  list: { padding: 14, gap: 14 },

  // Empty
  emptyWrap:  { alignItems: 'center', padding: 48, gap: 10, marginTop: 40 },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', textAlign: 'center' },
  emptyHint:  { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardName:   { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827', lineHeight: 22 },

  badge:    { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  metaRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    fontSize: 12, color: '#6b7280', backgroundColor: '#f9fafb',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },

  // Progress
  progressSection: { gap: 8 },
  progressHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel:   { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  progressPct:     { fontSize: 13, fontWeight: '800' },

  slideCountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slideCountTxt: { fontSize: 12, color: '#9ca3af' },
  localeRow:     { flexDirection: 'row', gap: 4 },
  langPill:      { backgroundColor: '#eef2ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  langTxt:       { fontSize: 10, fontWeight: '700', color: '#6366f1' },

  // Deadline
  deadlineRow:  { flexDirection: 'row', alignItems: 'center' },
  deadlineInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  deadlineLabel:{ fontSize: 12, color: '#6b7280', fontWeight: '500' },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  urgencyTxt:   { fontSize: 11, fontWeight: '700' },

  completedInfo:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  completedIcon:{ fontSize: 14 },
  completedTxt: { fontSize: 12, color: '#059669', fontWeight: '600' },

  // Actions
  actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  markBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  markBtnTxt: { fontSize: 13, fontWeight: '600', color: '#6b7280' },

  btn:         { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimary:  { backgroundColor: '#6366f1' },
  btnOutline:  { borderWidth: 1.5, borderColor: '#6366f1' },
  btnPrimaryTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnOutlineTxt: { fontSize: 14, fontWeight: '700', color: '#6366f1' },
});
