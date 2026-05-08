import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchTrainings, Training } from '../api';

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  READY:      { label: 'Ready',      color: '#059669', bg: '#d1fae5' },
  PROCESSING: { label: 'Processing', color: '#d97706', bg: '#fef3c7' },
  DRAFT:      { label: 'Draft',      color: '#6b7280', bg: '#f3f4f6' },
};

interface Props { onSelect: (t: Training) => void }

export default function TrainingListScreen({ onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function load(isRefresh = false) {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try   { setTrainings(await fetchTrainings()); }
    catch (e: any) { setError(e.message ?? 'Unknown error'); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <View style={[s.center, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={s.hint}>Loading trainings…</Text>
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

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <Text style={s.headerTitle}>My Trainings</Text>
        <View style={s.countBadge}>
          <Text style={s.countBadgeTxt}>{trainings.length}</Text>
        </View>
      </View>

      <FlatList
        data={trainings}
        keyExtractor={t => t.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#6366f1" />}
        ListEmptyComponent={<View style={s.center}><Text style={s.hint}>No trainings found.</Text></View>}
        renderItem={({ item }) => {
          const st = STATUS[item.status] ?? STATUS.DRAFT;
          const tappable = item.status === 'READY';
          return (
            <TouchableOpacity
              style={[s.card, !tappable && s.cardDim]}
              onPress={() => tappable && onSelect(item)}
              activeOpacity={tappable ? 0.72 : 1}
            >
              {/* Top row: name + status */}
              <View style={s.row}>
                <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              {/* Category / product */}
              <View style={s.metaRow}>
                <Text style={s.metaChip}>📁 {item.category}</Text>
                <Text style={s.metaChip}>🏷 {item.product}</Text>
              </View>

              {/* Slide count — prominent stat */}
              <View style={s.statsRow}>
                <View style={s.statBox}>
                  <Text style={s.statNum}>{item.totalSlides ?? '—'}</Text>
                  <Text style={s.statLbl}>slides</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.localeWrap}>
                  {(item.supportedLocales ?? []).map(l => (
                    <View key={l} style={s.langPill}>
                      <Text style={s.langTxt}>{l.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {!tappable && (
                <Text style={s.noteText}>
                  {item.status === 'PROCESSING' ? '⏳ Processing… check back soon' : '📝 Not yet published'}
                </Text>
              )}

              {tappable && (
                <View style={s.cardArrow}>
                  <Text style={s.cardArrowTxt}>Start →</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hint: { marginTop: 10, color: '#9ca3af', fontSize: 15 },
  errTxt: { color: '#ef4444', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryTxt: { color: '#fff', fontWeight: '700' },

  header: {
    backgroundColor: '#6366f1', paddingHorizontal: 20, paddingBottom: 18,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  countBadgeTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  list: { padding: 14, gap: 12 },

  card: {
    backgroundColor: '#fff', borderRadius: 18,
    padding: 16, gap: 12,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  cardDim: { opacity: 0.6 },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827', lineHeight: 22 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  statusTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },

  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: { fontSize: 12, color: '#6b7280', backgroundColor: '#f9fafb', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 12,
  },
  statBox: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 22, fontWeight: '800', color: '#6366f1' },
  statLbl: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  statDivider: { width: 1, height: 32, backgroundColor: '#e5e7eb' },
  localeWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  langPill: { backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  langTxt: { fontSize: 11, fontWeight: '700', color: '#6366f1' },

  noteText: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
  cardArrow: { alignSelf: 'flex-end' },
  cardArrowTxt: { fontSize: 13, fontWeight: '700', color: '#6366f1' },
});
