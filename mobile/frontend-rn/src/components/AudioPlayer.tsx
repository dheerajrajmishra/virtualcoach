import { useEffect, useRef, useState } from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Audio } from 'expo-av'
import { Ionicons } from '@expo/vector-icons'

interface Props {
  uri: string | null
  autoPlay?: boolean
}

export default function AudioPlayer({ uri, autoPlay = true }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync()
    }
  }, [])

  useEffect(() => {
    if (!uri) return
    loadAudio(uri)
  }, [uri])

  async function loadAudio(audioUri: string) {
    await soundRef.current?.unloadAsync()
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true })

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: autoPlay },
      (status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying)
          setPosition(status.positionMillis)
          setDuration(status.durationMillis ?? 0)
        }
      }
    )
    soundRef.current = sound
    setIsPlaying(autoPlay)
  }

  async function togglePlayPause() {
    if (!soundRef.current) return
    const status = await soundRef.current.getStatusAsync()
    if (status.isLoaded) {
      if (status.isPlaying) {
        await soundRef.current.pauseAsync()
      } else {
        await soundRef.current.playAsync()
      }
    }
  }

  function formatTime(ms: number) {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  if (!uri) return null

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={togglePlayPause} style={styles.button}>
        <Ionicons
          name={isPlaying ? 'pause-circle' : 'play-circle'}
          size={36}
          color="#3b82f6"
        />
      </TouchableOpacity>
      <View style={styles.info}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' },
            ]}
          />
        </View>
        <Text style={styles.time}>
          {formatTime(position)} / {formatTime(duration)}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  button: { padding: 2 },
  info: { flex: 1 },
  progressBar: {
    height: 4,
    backgroundColor: '#bfdbfe',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  time: { fontSize: 11, color: '#6b7280', marginTop: 4 },
})
