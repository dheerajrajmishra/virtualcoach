import { NativeModules, Platform } from 'react-native'

// TurboModule spec — replaces the native bridge once New Architecture is fully active.
// Falls back to expo-av for Expo Go compatibility.
const LINKING_ERROR =
  'AudioRecorderModule is not linked. Run `expo run:android` or `expo run:ios` to build natively.'

const AudioRecorderNative: AudioRecorderSpec =
  NativeModules.AudioRecorderModule ??
  new Proxy(
    {},
    { get: () => { throw new Error(LINKING_ERROR) } }
  )

export interface AudioRecorderSpec {
  startRecording(outputPath: string): Promise<void>
  stopRecording(): Promise<string>  // returns final file URI
  pauseRecording(): Promise<void>
  resumeRecording(): Promise<void>
  getAmplitude(): Promise<number>   // 0.0 – 1.0
}

export default AudioRecorderNative
