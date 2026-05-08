import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTrainingStore } from '../store/useTrainingStore'
import { useAskCoach } from '../api/mobileApi'

interface Message {
  role: 'user' | 'coach'
  text: string
}

export default function AiCoachFab() {
  const { isCoachOpen, toggleCoach, trainingId, currentSlideIndex, preferredLocale } =
    useTrainingStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const askCoach = useAskCoach()

  async function sendMessage() {
    const question = input.trim()
    if (!question || !trainingId) return

    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setInput('')

    const result = await askCoach.mutateAsync({
      trainingId,
      slideIndex: currentSlideIndex,
      question,
      locale: preferredLocale,
    })

    setMessages((prev) => [...prev, { role: 'coach', text: result.answer }])
  }

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={toggleCoach}>
        <Ionicons name={isCoachOpen ? 'close' : 'chatbubble-ellipses'} size={26} color="#fff" />
      </TouchableOpacity>

      {isCoachOpen && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.panel}
        >
          <View style={styles.panelHeader}>
            <Ionicons name="sparkles" size={18} color="#3b82f6" />
            <Text style={styles.panelTitle}>AI Coach</Text>
            <Text style={styles.panelSubtitle}>Ask anything about this slide</Text>
          </View>

          <ScrollView style={styles.messages} contentContainerStyle={{ gap: 8, padding: 12 }}>
            {messages.length === 0 && (
              <Text style={styles.emptyHint}>
                Ask a question about the current slide. The AI will answer using the training FAQ context.
              </Text>
            )}
            {messages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.bubble,
                  msg.role === 'user' ? styles.bubbleUser : styles.bubbleCoach,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextCoach,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            ))}
            {askCoach.isPending && (
              <View style={styles.bubbleCoach}>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Type your question..."
              placeholderTextColor="#9ca3af"
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!input.trim() || askCoach.isPending}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  panel: {
    position: 'absolute',
    bottom: 90,
    right: 12,
    left: 12,
    height: 380,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  panelTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  panelSubtitle: { fontSize: 12, color: '#9ca3af', marginLeft: 'auto' },
  messages: { flex: 1 },
  emptyHint: { color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 20 },
  bubble: { maxWidth: '80%', borderRadius: 14, padding: 10 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#3b82f6' },
  bubbleCoach: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    minWidth: 40,
    alignItems: 'center',
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextCoach: { color: '#111827' },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  textInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#bfdbfe' },
})
