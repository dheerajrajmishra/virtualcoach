import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useTrainingStore } from '../../store/useTrainingStore'
import { useProgress } from '../../api/mobileApi'

export default function ProgressScreen() {
  const { trainingId } = useTrainingStore()
  const { data: progress, isLoading } = useProgress(trainingId ?? '')

  if (!trainingId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No active training.</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    )
  }

  const quizEntries = Object.entries(progress?.quizScores ?? {})

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overall Progress</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress?.completionPercent ?? 0}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{(progress?.completionPercent ?? 0).toFixed(0)}% complete</Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{progress?.currentSlideIndex ?? 0}</Text>
            <Text style={styles.metaLabel}>Current Slide</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{progress?.status ?? '—'}</Text>
            <Text style={styles.metaLabel}>Status</Text>
          </View>
        </View>
      </View>

      {quizEntries.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quiz Scores</Text>
          {quizEntries.map(([quizId, score]) => (
            <View key={quizId} style={styles.quizRow}>
              <Text style={styles.quizId}>{quizId}</Text>
              <Text style={styles.quizScore}>{score} pts</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressLabel: { fontSize: 13, color: '#6b7280' },
  meta: { flexDirection: 'row', gap: 24, marginTop: 4 },
  metaItem: { gap: 2 },
  metaValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  metaLabel: { fontSize: 12, color: '#9ca3af' },
  quizRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  quizId: { fontSize: 13, color: '#374151', fontFamily: 'monospace' },
  quizScore: { fontSize: 13, fontWeight: '600', color: '#059669' },
})
