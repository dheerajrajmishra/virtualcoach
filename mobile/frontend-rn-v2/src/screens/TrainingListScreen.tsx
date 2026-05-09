import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchTrainings, Training } from '../api';

function formatPublishedDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props { onSelect: (t: Training) => void }

export default function TrainingListScreen({ onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [trainings, setTrainings]   = useState<Training[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

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
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>📚</Text>
            <Text style={s.emptyTitle}>No trainings available</Text>
            <Text style={s.emptyHint}>Check back later — your admin will publish new trainings here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => onSelect(item)} activeOpacity={0.72}>

            {/* Top row: name + published badge */}
            <View style={s.row}>
              <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
              <View style={s.publishedBadge}>
                <Text style={s.publishedBadgeTxt}>Published</Text>
              </View>
            </View>

            {/* Category / product */}
            <View style={s.metaRow}>
              <Text style={s.metaChip}>📁 {item.category}</Text>
              <Text style={s.metaChip}>🏷 {item.product}</Text>
            </View>

            {/* Stats row */}
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

            {/* Footer: publish date + CTA */}
            <View style={s.cardFooter}>
              {item.publishedAt
                ? <Text style={s.publishedDate}>🗓 {formatPublishedDate(item.publishedAt)}</Text>
                : <View />}
              <Text style={s.cardArrowTxt}>Start →</Text>
            </View>

          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#f3f4f6' },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hint:     { marginTop: 10, color: '#9ca3af', fontSize: 15 },
  errTxt:   { color: '#ef4444', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryTxt: { color: '#fff', fontWeight: '700' },

  header: {
    backgroundColor: '#6366f1', paddingHorizontal: 20, paddingBottom: 18,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  headerTitle:   { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  countBadge:    { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countBadgeTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  list: { padding: 14, gap: 12 },

  // Empty state
  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10, marginTop: 60 },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', textAlign: 'center' },
  emptyHint:  { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },

  row:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827', lineHeight: 22 },

  publishedBadge:    { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: '#d1fae5' },
  publishedBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#059669', letterSpacing: 0.4 },

  metaRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: { fontSize: 12, color: '#6b7280', backgroundColor: '#f9fafb', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  statsRow:    { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 },
  statBox:     { alignItems: 'center', gap: 2 },
  statNum:     { fontSize: 22, fontWeight: '800', color: '#6366f1' },
  statLbl:     { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  statDivider: { width: 1, height: 32, backgroundColor: '#e5e7eb' },
  localeWrap:  { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  langPill:    { backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  langTxt:     { fontSize: 11, fontWeight: '700', color: '#6366f1' },

  cardFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  publishedDate: { fontSize: 12, color: '#9ca3af' },
  cardArrowTxt:  { fontSize: 13, fontWeight: '700', color: '#6366f1' },
});
