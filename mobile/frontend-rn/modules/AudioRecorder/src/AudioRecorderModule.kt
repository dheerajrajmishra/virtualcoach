package com.pitchperfect.audiorecorder

import android.media.MediaRecorder
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = AudioRecorderModule.NAME)
class AudioRecorderModule(reactContext: ReactApplicationContext) :
    NativeAudioRecorderModuleSpec(reactContext) {

    companion object {
        const val NAME = "AudioRecorderModule"
    }

    private var recorder: MediaRecorder? = null
    private var outputPath: String? = null

    override fun getName() = NAME

    override fun startRecording(outputPath: String, promise: Promise) {
        try {
            this.outputPath = outputPath
            recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(reactApplicationContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }
            recorder!!.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setAudioEncodingBitRate(128000)
                setOutputFile(outputPath)
                prepare()
                start()
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("RECORD_ERROR", e.message, e)
        }
    }

    override fun stopRecording(promise: Promise) {
        try {
            recorder?.apply {
                stop()
                release()
            }
            recorder = null
            promise.resolve(outputPath)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    override fun pauseRecording(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                recorder?.pause()
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("PAUSE_ERROR", e.message, e)
        }
    }

    override fun resumeRecording(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                recorder?.resume()
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("RESUME_ERROR", e.message, e)
        }
    }

    override fun getAmplitude(promise: Promise) {
        try {
            val max = recorder?.maxAmplitude?.toFloat() ?: 0f
            promise.resolve((max / 32767.0).toFloat())
        } catch (e: Exception) {
            promise.resolve(0.0)
        }
    }
}
