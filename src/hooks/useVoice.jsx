import { useState, useRef, useCallback, useEffect } from 'react'
import { API_URL, getAuthFetchOptions } from '../lib/api'

/**
 * Hook useVoice - Gestion complète du flux audio vocal
 * 
 * Fonctionnalités :
 * - Micro toujours actif (même pendant réponse IA)
 * - Interruption bidirectionnelle (user ↔ IA)
 * - Lip-sync audio basé sur volume
 * - Support mobile + desktop
 * - Gestion robuste des erreurs
 */
export function useVoice() {
  // État
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0) // Pour lip-sync
  
  // Références
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioContextRef = useRef(null)
  const audioElementRef = useRef(null)
  const streamRef = useRef(null)
  const analyserRef = useRef(null)
  const analyserForLipSyncRef = useRef(null)
  const maxRecordingTimeoutRef = useRef(null)
  const silenceDetectionRef = useRef(null)
  const isCheckingSilenceRef = useRef(false)
  
  // Préchargement des voix TTS du navigateur
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const loadVoices = () => {
          const voices = window.speechSynthesis.getVoices()
          if (voices && voices.length) {
            // Warmup silencieux
            const u = new SpeechSynthesisUtterance(' ')
            u.lang = 'fr-FR'
            u.volume = 0
            try { window.speechSynthesis.speak(u) } catch {}
            setTimeout(() => {
              try { window.speechSynthesis.cancel() } catch {}
            }, 0)
          }
        }
        loadVoices()
        window.speechSynthesis.onvoiceschanged = loadVoices
      }
    } catch (e) {
      console.warn('[useVoice] Erreur préchargement voix:', e)
    }
  }, [])

  /**
   * Déverrouille l'audio (contourne Autoplay Policy sur mobile)
   */
  const unlockAudio = useCallback(() => {
    if (audioUnlocked) return
    
    try {
      // Créer AudioContext
      if (!audioContextRef.current && typeof window !== 'undefined' && window.AudioContext) {
        audioContextRef.current = new window.AudioContext()
      }
      
      // Resume si suspended (Safari iOS)
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(err => {
          console.warn('[useVoice] AudioContext.resume() failed:', err)
        })
      }
      
      // Jouer audio silencieux pour déverrouiller
      const silentAudio = new Audio()
      silentAudio.volume = 0
      const playPromise = silentAudio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          console.warn('[useVoice] Silent audio play failed (expected)')
        })
      }
      
      setAudioUnlocked(true)
      console.log('[useVoice] Audio déverrouillé')
    } catch (e) {
      console.error('[useVoice] Erreur déverrouillage audio:', e)
    }
  }, [audioUnlocked])

  /**
   * Arrête l'audio IA en cours (pour interruption utilisateur)
   */
  const stopAudio = useCallback(() => {
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause()
        audioElementRef.current.currentTime = 0
        audioElementRef.current = null
        setIsPlaying(false)
        console.log('[useVoice] Audio arrêté (interruption utilisateur)')
      } catch (e) {
        console.warn('[useVoice] Erreur arrêt audio:', e)
      }
    }
  }, [])

  /**
   * Détecte le silence et arrête l'enregistrement
   */
  const startSilenceDetection = useCallback((analyser, mediaRecorder) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let lastSoundTime = Date.now()
    const SILENCE_THRESHOLD = 30
    const SILENCE_DURATION = 1200 // 1.2s de silence
    
    const checkSilence = () => {
      if (!isCheckingSilenceRef.current || !mediaRecorder || mediaRecorder.state !== 'recording') {
        return
      }

      try {
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        
        // Mettre à jour le niveau audio pour lip-sync
        setAudioLevel(Math.min(average / 255, 1))

        if (average > SILENCE_THRESHOLD) {
          lastSoundTime = Date.now()
        } else if (Date.now() - lastSoundTime > SILENCE_DURATION) {
          console.log('[useVoice] Silence détecté, arrêt enregistrement')
          isCheckingSilenceRef.current = false
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop()
          }
          return
        }
      } catch (e) {
        console.warn('[useVoice] Erreur détection silence:', e)
      }

      silenceDetectionRef.current = requestAnimationFrame(checkSilence)
    }

    isCheckingSilenceRef.current = true
    silenceDetectionRef.current = requestAnimationFrame(checkSilence)
  }, [])

  /**
   * Démarre l'enregistrement du micro
   */
  const startRecording = useCallback(async (onTranscriptionComplete) => {
    console.log('[useVoice] startRecording()')
    
    // Déverrouiller l'audio
    unlockAudio()
    
    // Arrêter l'audio IA en cours (interruption)
    stopAudio()
    
    try {
      // Demander accès au micro
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1
        }
      })
      
      streamRef.current = stream
      
      // Choisir le format audio compatible
      const preferredTypes = [
        'audio/wav',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4'
      ]
      
      let chosenType = ''
      if (typeof window !== 'undefined' && window.MediaRecorder?.isTypeSupported) {
        for (const t of preferredTypes) {
          if (MediaRecorder.isTypeSupported(t)) {
            chosenType = t
            break
          }
        }
      }
      
      const mediaRecorder = chosenType 
        ? new MediaRecorder(stream, { mimeType: chosenType })
        : new MediaRecorder(stream)
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      // Créer AudioContext pour détection silence
      const AudioCtx = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null
      const audioContext = AudioCtx ? new AudioCtx() : new (window.AudioContext)()
      
      try { await audioContext.resume?.() } catch {}
      audioContextRef.current = audioContext
      
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      
      // Gestion des données audio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      // Gestion de la fin d'enregistrement
      mediaRecorder.onstop = async () => {
        isCheckingSilenceRef.current = false
        if (silenceDetectionRef.current) {
          cancelAnimationFrame(silenceDetectionRef.current)
        }
        
        setIsRecording(false)
        
        // Fermer le stream
        stream.getTracks().forEach(track => track.stop())
        
        // Transcrire l'audio
        try {
          const currentType = mediaRecorder.mimeType || 'audio/wav'
          const audioBlob = new Blob(audioChunksRef.current, { type: currentType })
          
          console.log('[useVoice] Transcription en cours...')
          const transcript = await transcribeAudio(audioBlob)
          
          if (transcript) {
            console.log('[useVoice] Transcription reçue:', transcript)
            
            // Émettre événement
            try {
              window.dispatchEvent(new CustomEvent('voice:transcription', { 
                detail: { transcript } 
              }))
            } catch (e) {
              console.warn('[useVoice] Erreur dispatch event:', e)
            }
            
            // Appeler callback
            if (onTranscriptionComplete) {
              setTimeout(() => onTranscriptionComplete(transcript), 0)
            }
          }
        } catch (e) {
          console.error('[useVoice] Erreur transcription:', e)
        }
      }
      
      // Démarrer l'enregistrement
      mediaRecorder.start()
      setIsRecording(true)
      
      // Démarrer détection silence
      startSilenceDetection(analyser, mediaRecorder)
      
      // Timeout de sécurité (30s max)
      maxRecordingTimeoutRef.current = setTimeout(() => {
        console.log('[useVoice] Timeout 30s atteint')
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
        }
      }, 30000)
      
    } catch (error) {
      console.error('[useVoice] Erreur démarrage enregistrement:', error)
      setIsRecording(false)
      alert('Impossible d\'accéder au microphone. Veuillez autoriser l\'accès.')
    }
  }, [unlockAudio, stopAudio, startSilenceDetection])

  /**
   * Arrête l'enregistrement
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (maxRecordingTimeoutRef.current) {
        clearTimeout(maxRecordingTimeoutRef.current)
      }
      
      if (silenceDetectionRef.current) {
        cancelAnimationFrame(silenceDetectionRef.current)
      }
      
      isCheckingSilenceRef.current = false
    }
  }, [])

  /**
   * Transcrit l'audio via le backend
   */
  const transcribeAudio = async (audioBlob) => {
    try {
      const formData = new FormData()
      const ext = audioBlob?.type?.includes('mp4') ? 'mp4' : 
                  audioBlob?.type?.includes('webm') ? 'webm' : 'wav'
      formData.append('audio', audioBlob, `recording.${ext}`)

      const authOptions = getAuthFetchOptions({
        method: 'POST',
        body: formData
      })
      delete authOptions.headers['Content-Type']
      
      const response = await fetch(`${API_URL}/speech-to-text`, authOptions)
      
      if (!response.ok) {
        throw new Error(`STT failed: ${response.status}`)
      }
      
      const data = await response.json()
      return data.transcript || ''
    } catch (error) {
      console.error('[useVoice] Erreur transcription:', error)
      return ''
    }
  }

  /**
   * Joue l'audio de la réponse IA
   */
  const playAudio = useCallback(async (audioUrl) => {
    try {
      // Vérifier que c'est une URL audio
      const isAudioUrl = audioUrl && (
        typeof audioUrl === 'string' && (
          audioUrl.includes('/api/audio') ||
          audioUrl.endsWith('.mp3') ||
          audioUrl.endsWith('.wav') ||
          audioUrl.endsWith('.m4a') ||
          (audioUrl.startsWith('http') && (
            audioUrl.includes('audio') || 
            audioUrl.includes('.mp3') || 
            audioUrl.includes('.wav')
          ))
        )
      )
      
      if (!isAudioUrl) {
        console.warn('[useVoice] URL audio invalide:', audioUrl)
        return
      }
      
      console.log('[useVoice] playAudio: MP3 détecté:', audioUrl)
      
      // Déverrouiller l'audio
      if (!audioUnlocked) {
        unlockAudio()
      }
      
      // Resume AudioContext si suspended
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(err => {
          console.warn('[useVoice] AudioContext.resume() failed:', err)
        })
      }
      
      // Construire l'URL complète
      let fullAudioUrl = audioUrl
      if (audioUrl.startsWith('/')) {
        if (audioUrl.startsWith('/api/')) {
          const audioPath = audioUrl.substring(4)
          fullAudioUrl = `${API_URL}${audioPath}`
        } else {
          fullAudioUrl = `${API_URL}${audioUrl}`
        }
      }
      
      console.log('[useVoice] Chargement audio depuis:', fullAudioUrl)
      
      // Créer élément audio
      const audio = new Audio()
      audio.crossOrigin = 'anonymous'
      audio.src = fullAudioUrl
      audio.volume = 1.0
      
      audioElementRef.current = audio
      
      // Créer AnalyserNode pour lip-sync
      if (audioContextRef.current) {
        try {
          const mediaElementSource = audioContextRef.current.createMediaElementAudioSource(audio)
          analyserForLipSyncRef.current = audioContextRef.current.createAnalyser()
          analyserForLipSyncRef.current.fftSize = 256
          mediaElementSource.connect(analyserForLipSyncRef.current)
          analyserForLipSyncRef.current.connect(audioContextRef.current.destination)
        } catch (e) {
          console.warn('[useVoice] Erreur création AnalyserNode:', e)
        }
      }
      
      // Gestion des événements audio
      audio.onplay = () => {
        console.log('[useVoice] Audio en cours de lecture')
        setIsPlaying(true)
        
        // Démarrer lip-sync
        if (analyserForLipSyncRef.current) {
          const dataArray = new Uint8Array(analyserForLipSyncRef.current.frequencyBinCount)
          const updateLipSync = () => {
            if (!audioElementRef.current || audioElementRef.current.paused) {
              return
            }
            try {
              analyserForLipSyncRef.current.getByteFrequencyData(dataArray)
              const average = dataArray.reduce((a, b) => a + b) / dataArray.length
              setAudioLevel(Math.min(average / 255, 1))
            } catch (e) {
              console.warn('[useVoice] Erreur lip-sync:', e)
            }
            requestAnimationFrame(updateLipSync)
          }
          updateLipSync()
        }
      }
      
      const handleAudioEnd = () => {
        console.log('[useVoice] Audio terminé')
        setIsPlaying(false)
        setAudioLevel(0)
        audioElementRef.current = null
      }
      
      audio.onended = handleAudioEnd
      audio.onerror = (err) => {
        console.error('[useVoice] Erreur audio:', err)
        handleAudioEnd()
      }
      
      // Timeout de sécurité
      const timeoutId = setTimeout(() => {
        console.warn('[useVoice] Audio timeout')
        audio.pause()
        handleAudioEnd()
      }, 60000)
      
      audio.onended = () => {
        clearTimeout(timeoutId)
        handleAudioEnd()
      }
      
      // Jouer l'audio
      try {
        await audio.play()
        console.log('[useVoice] Audio play() réussi')
      } catch (err) {
        console.error('[useVoice] Audio play() échoué:', err)
        handleAudioEnd()
      }
      
    } catch (error) {
      console.error('[useVoice] Erreur playAudio:', error)
      setIsPlaying(false)
    }
  }, [audioUnlocked, unlockAudio])

  return {
    isRecording,
    isPlaying,
    audioLevel, // Pour lip-sync
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
    unlockAudio
  }
}
