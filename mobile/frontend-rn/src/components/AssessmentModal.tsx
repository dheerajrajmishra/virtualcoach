import { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { Audio } from 'expo-av'
import { Camera, CameraType } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { QuizData, useTrainingStore } from '../store/useTrainingStore'
import { useSubmitTextQuiz, useSubmitMediaQuiz } from '../api/mobileApi'

interface Props {
  quiz: QuizData
  visible: boolean
  onClose: () => void
}

type EvaluationResult = {
  score: number
  maxScore: number
  scorePercent: number
  feedback: string
  strengths: string
  improvements: string
}

export default function AssessmentModal({ quiz, visible, onClose }: Props) {
  const { trainingId, preferredLocale } = useTrainingStore()
  const [textAnswer, setTextAnswer] = useState('')
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingUri, setRecordingUri] = useState<string | null>(null)

  const submitText = useSubmitTextQuiz()
  const submitMedia = useSubmitMediaQuiz()

  const question = quiz.questions[preferredLocale] ?? quiz.questions['en'] ?? ''

  async function startRecording() {
    await Audio.requestPermissionsAsync()
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    )
    setRecording(rec)
    setIsRecording(true)
  }

  async function stopRecording() {
    if (!recording) return
    await recording.stopAndUnloadAsync()
    const uri = recording.getURI()
    setRecordingUri(uri)
    setRecording(null)
    setIsRecording(false)
  }

  async function handleSubmit() {
    if (!trainingId) return

    let res
    if (quiz.inputType === 'text') {
      res = await submitText.mutateAsync({
        trainingId,
        quizId: quiz.id,
        locale: preferredLocale,
        response: textAnswer,
      })
    } else {
      if (!recordingUri) return
      // In production, upload recordingUri to GCS first, then pass the GCS URL.
      res = await submitMedia.mutateAsync({
        trainingId,
        quizId: quiz.id,
        inputType: quiz.inputType,
        locale: preferredLocale,
        mediaGcsUrl: recordingUri,
      })
    }
    setResult(res)
  }

  const isPending = submitText.isPending || submitMedia.isPending

  function handleClose() {
    setTextAnswer('')
    setResult(null)
    setRecordingUri(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Assessment</Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View style={styles.questionCard}>
            <Text style={styles.questionLabel}>Question</Text>
            <Text style={styles.questionText}>{question}</Text>
            <View style={styles.badge}>
              <Ionicons
                name={
                  quiz.inputType === 'text'
                    ? 'chatbubble-outline'
                    : quiz.inputType === 'audio'
                    ? 'mic-outline'
                    : 'videocam-outline'
                }
                size={12}
                color="#6b7280"
              />
              <Text style={styles.badgeText}>{quiz.inputType} response</Text>
            </View>
          </View>

          {!result ? (
            <>
              {quiz.inputType === 'text' && (
                <TextInput
                  style={styles.textArea}
                  value={textAnswer}
                  onChangeText={setTextAnswer}
                  placeholder="Type your answer here..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              )}

              {(quiz.inputType === 'audio' || quiz.inputType === 'video') && (
                <View style={styles.recordingSection}>
                  <TouchableOpacity
                    style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
                    onPress={isRecording ? stopRecording : startRecording}
                  >
                    <Ionicons
                      name={isRecording ? 'stop-circle' : 'mic'}
                      size={28}
                      color="#fff"
                    />
                    <Text style={styles.recordBtnText}>
                      {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Text>
                  </TouchableOpacity>
                  {recordingUri && (
                    <Text style={styles.recordingReady}>Recording ready to submit</Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (isPending ||
                    (quiz.inputType === 'text' && !textAnswer.trim()) ||
                    (quiz.inputType !== 'text' && !recordingUri)) &&
                    styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit for Evaluation</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.resultCard}>
              <Text style={styles.scoreText}>
                {result.score} / {result.maxScore}
              </Text>
              <Text style={styles.scorePercent}>{result.scorePercent.toFixed(0)}%</Text>

              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Feedback</Text>
                <Text style={styles.resultText}>{result.feedback}</Text>
              </View>
              <View style={styles.resultSection}>
                <Text style={[styles.resultLabel, { color: '#059669' }]}>Strengths</Text>
                <Text style={styles.resultText}>{result.strengths}</Text>
              </View>
              <View style={styles.resultSection}>
                <Text style={[styles.resultLabel, { color: '#d97706' }]}>Areas to Improve</Text>
                <Text style={styles.resultText}>{result.improvements}</Text>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleClose}>
                <Text style={styles.submitBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  body: { padding: 20, gap: 16 },
  questionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 8 },
  questionLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' },
  questionText: { fontSize: 16, color: '#111827', lineHeight: 24 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, color: '#6b7280' },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    minHeight: 120,
  },
  recordingSection: { alignItems: 'center', gap: 12, paddingVertical: 20 },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 32,
  },
  recordBtnActive: { backgroundColor: '#dc2626' },
  recordBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  recordingReady: { color: '#059669', fontSize: 13, fontWeight: '500' },
  submitBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: '#bfdbfe' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 16 },
  scoreText: { fontSize: 48, fontWeight: '800', color: '#111827', textAlign: 'center' },
  scorePercent: { fontSize: 18, color: '#6b7280', textAlign: 'center', marginTop: -8 },
  resultSection: { gap: 4 },
  resultLabel: { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase' },
  resultText: { fontSize: 14, color: '#374151', lineHeight: 22 },
})
