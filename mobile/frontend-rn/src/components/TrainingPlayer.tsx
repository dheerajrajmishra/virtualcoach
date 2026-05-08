import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { useTrainingStore } from '../store/useTrainingStore'
import AudioPlayer from './AudioPlayer'
import AiCoachFab from './AiCoachFab'
import { useUpdateSlide } from '../api/mobileApi'
import { Ionicons } from '@expo/vector-icons'

const { width } = Dimensions.get('window')

// GCS gs:// URLs need to be converted to HTTPS for display.
function toHttpsUrl(gcsUrl: string): string {
  return gcsUrl.replace('gs://', 'https://storage.googleapis.com/')
}

export default function TrainingPlayer() {
  const {
    trainingId,
    slides,
    currentSlideIndex,
    preferredLocale,
    setSlide,
  } = useTrainingStore()
  const updateSlide = useUpdateSlide()

  const slide = slides[currentSlideIndex]
  if (!slide || !trainingId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No training loaded</Text>
      </View>
    )
  }

  const audioUrl = slide.audioUrls[preferredLocale] ?? slide.audioUrls['en'] ?? null
  const imageUrl = toHttpsUrl(slide.imageGcsUrl)

  function goToSlide(index: number) {
    setSlide(index)
    updateSlide.mutate({ trainingId: trainingId!, slideIndex: index, totalSlides: slides.length })
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.slideCount}>
          {currentSlideIndex + 1} / {slides.length}
        </Text>
        <Text style={styles.title} numberOfLines={1}>{slide.title}</Text>
      </View>

      <Image
        source={{ uri: imageUrl }}
        style={styles.slideImage}
        resizeMode="contain"
      />

      <View style={styles.audioContainer}>
        <AudioPlayer uri={audioUrl ? toHttpsUrl(audioUrl) : null} autoPlay />
      </View>

      <View style={styles.nav}>
        <TouchableOpacity
          style={[styles.navBtn, currentSlideIndex === 0 && styles.navBtnDisabled]}
          onPress={() => goToSlide(currentSlideIndex - 1)}
          disabled={currentSlideIndex === 0}
        >
          <Ionicons name="chevron-back" size={20} color={currentSlideIndex === 0 ? '#d1d5db' : '#374151'} />
          <Text style={[styles.navText, currentSlideIndex === 0 && styles.navTextDisabled]}>Previous</Text>
        </TouchableOpacity>

        <View style={styles.dots}>
          {slides.slice(Math.max(0, currentSlideIndex - 2), currentSlideIndex + 3).map((_, i) => {
            const realIndex = Math.max(0, currentSlideIndex - 2) + i
            return (
              <View
                key={realIndex}
                style={[styles.dot, realIndex === currentSlideIndex && styles.dotActive]}
              />
            )
          })}
        </View>

        <TouchableOpacity
          style={[styles.navBtn, currentSlideIndex === slides.length - 1 && styles.navBtnDisabled]}
          onPress={() => goToSlide(currentSlideIndex + 1)}
          disabled={currentSlideIndex === slides.length - 1}
        >
          <Text style={[styles.navText, currentSlideIndex === slides.length - 1 && styles.navTextDisabled]}>
            Next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={currentSlideIndex === slides.length - 1 ? '#d1d5db' : '#374151'}
          />
        </TouchableOpacity>
      </View>

      <AiCoachFab />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 16 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  slideCount: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  title: { fontSize: 18, fontWeight: '600', color: '#111827' },
  slideImage: {
    width,
    height: width * 0.5625,
    backgroundColor: '#e5e7eb',
  },
  audioContainer: { paddingHorizontal: 20, paddingVertical: 12 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  navBtnDisabled: { opacity: 0.4 },
  navText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  navTextDisabled: { color: '#d1d5db' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d1d5db' },
  dotActive: { backgroundColor: '#3b82f6', width: 18 },
})
