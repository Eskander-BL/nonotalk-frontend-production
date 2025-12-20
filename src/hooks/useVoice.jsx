import { useState, useRef, useCallback, useEffect } from 'react'
import { API_URL, getAuthFetchOptions } from '../lib/api'

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const silenceTimeoutRef = useRef(null)
  const audioContextRef = useRef(null)
  const audioElementRef = useRef(null)
  const activeUtterancesRef = useRef(0)
  const endGraceTimeoutRef = useRef(null)
  const speechRecRef = useRef(null)
  const voicesRef = useRef([])
  const latestPartialRef = useRef('')
  const didSendRef = useRef(false)
  
  // Préchargement et "warmup" des voix TTS du navigateur (réduit la latence du 1er utterance)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const loadVoices = () => {
          const vs = window.speechSynthesis.getVoices()
          if (vs && vs.length) {
            voicesRef.current = vs
            // Warmup: utterance silencieux pour initialiser le moteur TTS
            const u = new SpeechSynthesisUtterance(' ')
            u.lang = 'fr-FR'
            u.volume = 0
            u.rate = 1.0
            u.pitch = 1.0
            try { window.speechSynthesis.speak(u) } catch {}
            setTimeout(() => {
              try { window.speechSynthesis.cancel() } catch {}
            }, 0)
          }
        }
        loadVoices()
        window.speechSynthesis.onvoiceschanged = loadVoices
      }
    } catch {}
  }, [])

  // Déverrouiller l'audio au premier clic utilisateur (contourne Autoplay Policy sur mobile)
  const unlockAudio = useCallback(() => {
    if (audioUnlocked) return
    try {
      // Créer un AudioContext (déverrouille l'audio sur mobile)
      if (!audioContextRef.current && typeof window !== 'undefined' && window.AudioContext) {
        audioContextRef.current = new window.AudioContext()
      }
      // Créer un élément audio silencieux et le jouer pour déverrouiller
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio()
        audioElementRef.current.volume = 0
        audioElementRef.current.play().catch(() => {})
      }
      console.log("[AUDIO] unlockAudio called", audioUnlocked, audioContextRef.current?.state); setAudioUnlocked(true)
      console.log('[useVoice] Audio déverrouillé')
    } catch (e) {
      console.error('[useVoice] Erreur déverrouillage audio:', e)
    }
  }, [audioUnlocked])

  const startRecording = useCallback(async (onTranscriptionComplete) => {
    console.log('[useVoice] startRecording()')
    // Déverrouiller l'audio au premier clic
    unlockAudio()
    try {
      // Mode STT via MediaRecorder + backend (plus fiable sur tous les devices)
      const SpeechRec = false // Désactivé pour utiliser MediaRecorder partout
      if (SpeechRec) {
        const rec = new SpeechRec()
        speechRecRef.current = rec
        rec.lang = 'fr-FR'
        rec.interimResults = true
        rec.continuous = false
        rec.maxAlternatives = 1
        didSendRef.current = false
        latestPartialRef.current = ''

        rec.onstart = () => {
          setIsRecording(true)
        }

        rec.onresult = (event) => {
          try {
            let finalText = ''
            for (let i = 0; i < event.results.length; i++) {
              const res = event.results[i]
              const txt = (res[0] && res[0].transcript) || ''
              if (res.isFinal) {
                finalText += txt
              } else {
                latestPartialRef.current = txt || latestPartialRef.current || ''
              }
            }
            if (finalText) {
              latestPartialRef.current = finalText
            }
          } catch (e) {
            console.warn('[useVoice] SR onresult error', e)
          }
        }

        rec.onerror = (e) => {
          console.warn('[useVoice] SR error', e)
        }
        
        rec.onspeechend = () => {
          // Fin de parole détectée rapidement par l'API
          console.log('[useVoice] onspeechend déclenché')
          try {
            window.dispatchEvent(new CustomEvent('voice:speech_end'))
          } catch {}
          const transcript = (latestPartialRef.current || '').trim()
          console.log('[useVoice] Transcript capturé:', transcript)
          if (transcript && !didSendRef.current) {
            didSendRef.current = true
            console.log('[useVoice] Envoi du transcript via événement')
            try {
              window.dispatchEvent(new CustomEvent('voice:transcription', { detail: { transcript } }))
            } catch {}
            if (onTranscriptionComplete) {
              console.log('[useVoice] Appel de onTranscriptionComplete')
              setTimeout(() => onTranscriptionComplete(transcript), 0)
            }
          }
          try { rec.stop() } catch {}
        }

        rec.onend = () => {
          console.log('[useVoice] onend déclenché')
          setIsRecording(false)
          if (!didSendRef.current) {
            const transcript = (latestPartialRef.current || '').trim()
            console.log('[useVoice] onend - Transcript:', transcript)
            if (transcript) {
              didSendRef.current = true
              console.log('[useVoice] onend - Envoi du transcript')
              try {
                window.dispatchEvent(new CustomEvent('voice:transcription', { detail: { transcript } }))
              } catch {}
              if (onTranscriptionComplete) {
                setTimeout(() => onTranscriptionComplete(transcript), 0)
              }
            } else {
              console.warn('[useVoice] onend - Transcript vide !')
            }
          } else {
            console.log('[useVoice] onend - Transcript déjà envoyé')
          }
          speechRecRef.current = null
        }

        rec.start()
        // On utilise le mode SR natif: on ne continue pas avec getUserMedia + MediaRecorder
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1
        }
      })
      // Choisir un mimeType compatible (Safari iOS supporte parfois audio/mp4, Chrome audio/webm;codecs=opus)
      const preferredTypes = [
        'audio/wav',              // Safari iOS supporte WAV
        'audio/webm;codecs=opus', // Chrome desktop
        'audio/webm',             // Fallback webm
        'audio/mp4'               // Fallback mp4
      ]
      let chosenType = ''
      if (typeof window !== 'undefined' && window.MediaRecorder && typeof MediaRecorder.isTypeSupported === 'function') {
        for (const t of preferredTypes) {
          if (MediaRecorder.isTypeSupported(t)) { chosenType = t; break }
        }
      }
      const mediaRecorder = chosenType ? new MediaRecorder(stream, { mimeType: chosenType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      // Créer un contexte audio pour détecter le silence
      const AudioCtx = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null
      const audioContext = AudioCtx ? new AudioCtx() : new (window.AudioContext)()
      try { await audioContext.resume?.() } catch {}
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let lastSoundTime = Date.now()
      const SILENCE_THRESHOLD = 30
      const SILENCE_DURATION = 2000 // ~2.0s de silence (laisser le temps de parler)
      let isCheckingActive = true

      const checkSilence = () => {
        if (!isCheckingActive || !mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
          return
        }

        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length

        if (average > SILENCE_THRESHOLD) {
          lastSoundTime = Date.now()
        } else if (Date.now() - lastSoundTime > SILENCE_DURATION) {
          // Silence détecté pendant ~1.0s, arrêt enregistrement
          console.log('[useVoice] Silence détecté (>1.0s), arrêt enregistrement')
          isCheckingActive = false
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
          return
        }

        requestAnimationFrame(checkSilence)
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        isCheckingActive = false
        setIsRecording(false)
        console.log('[useVoice] onstop: chunks=', audioChunksRef.current.length)

        // Évènement immédiat à la fin de la parole pour déclencher une réponse vocale instantanée
        try {
          window.dispatchEvent(new CustomEvent('voice:speech_end'))
        } catch {}

        const currentType = (mediaRecorderRef.current && mediaRecorderRef.current.mimeType) || 'audio/wav'
        const audioBlob = new Blob(audioChunksRef.current, { type: currentType })
        console.log('[useVoice] audioBlob size=', audioBlob.size)
        const transcript = await transcribeAudio(audioBlob)
        console.log('[useVoice] Transcription reçue:', transcript)
        
        if (transcript) {
          try {
            window.dispatchEvent(new CustomEvent('voice:transcription', { detail: { transcript } }))
            console.log('[useVoice] Event voice:transcription dispatché')
          } catch (e) {
            console.warn('[useVoice] Erreur lors du dispatch de l\'event:', e)
          }
        }

        if (transcript && onTranscriptionComplete) {
          console.log('[useVoice] Appel du callback onTranscriptionComplete')
          // Décaler l'appel pour sortir du cycle onstop (évite d'éventuelles contraintes de timing)
          setTimeout(() => onTranscriptionComplete(transcript), 0)
        }
        
        // Nettoyer les ressources
        stream.getTracks().forEach(track => track.stop())
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      
      // Timeout de sécurité : arrêt automatique après 30s (laisser le temps de parler)
      const maxRecordingTimeout = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('[useVoice] Timeout 30s atteint, arrêt forcé')
          mediaRecorderRef.current.stop()
        }
      }, 30000)
      
      // Démarrer immédiatement la détection de silence
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        requestAnimationFrame(checkSilence)
      }
      
      // Nettoyer le timeout dans onstop
      const originalOnStop = mediaRecorder.onstop
      mediaRecorder.onstop = (e) => {
        clearTimeout(maxRecordingTimeout)
        if (originalOnStop) originalOnStop(e)
      }
      
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error)
      alert('Impossible d\'accéder au microphone. Veuillez autoriser l\'accès.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    // Si la Web Speech API est active, arrêter proprement
    if (speechRecRef.current && isRecording) {
      try {
        speechRecRef.current.stop()
      } catch {}
      setIsRecording(false)
      return
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
    }
  }, [isRecording])

  const transcribeAudio = async (audioBlob) => {
    try {
      const formData = new FormData()
      const ext = audioBlob?.type?.includes('mp4') ? 'mp4' : (audioBlob?.type?.includes('webm') ? 'webm' : 'wav')
      formData.append('audio', audioBlob, `recording.${ext}`)

      console.log('[useVoice] POST /api/speech-to-text ...')
      // Pour FormData, ne pas inclure Content-Type (auto-détecté)
      const authOptions = getAuthFetchOptions({
        method: 'POST',
        body: formData
      })
      delete authOptions.headers['Content-Type']  // Laisser le navigateur définir le boundary
      
      const response = await fetch(`${API_URL}/speech-to-text`, authOptions)

      if (response.ok) {
        const data = await response.json()
        console.log('[useVoice] STT OK')
        return data.transcript
      } else {
        const errText = await response.text().catch(() => '')
        console.error('[useVoice] Erreur transcription HTTP', response.status, errText)
        return null
      }
    } catch (error) {
      console.error('[useVoice] Exception transcription:', error)
      return null
    }
  }

  const playAudio = useCallback(async (audioUrl) => {
    try {
      // Vérifier si c'est une URL d'audio (fichier MP3 du backend)
      const isAudioUrl = audioUrl && (
        typeof audioUrl === 'string' && (
          audioUrl.includes('/api/audio') ||
          audioUrl.endsWith('.mp3') ||
          audioUrl.endsWith('.wav') ||
          audioUrl.endsWith('.m4a') ||
          audioUrl.startsWith('http') && (audioUrl.includes('audio') || audioUrl.includes('.mp3') || audioUrl.includes('.wav'))
        )
      )
      
      if (isAudioUrl) {
        console.log('[useVoice] playAudio: MP3 file detected:', audioUrl)
        
        // Déverrouiller l'audio s'il ne l'est pas déjà
        if (!audioUnlocked) {
          unlockAudio()
        }
        
        // Créer un nouvel élément audio et le stocker dans une référence persistante
        const audio = new Audio()
        audio.crossOrigin = 'anonymous'
        
        // Forcer l'URL complète du backend si c'est une URL relative
        let fullAudioUrl = audioUrl
        if (audioUrl.startsWith('/')) {
          fullAudioUrl = `${API_URL}${audioUrl}`
        }
        
        console.log('[useVoice] Loading audio from:', fullAudioUrl)
        audio.src = fullAudioUrl
        audio.volume = 1.0
        
        // Stocker la référence pour éviter le garbage collection
        audioElementRef.current = audio
        
        audio.onplay = () => {
          console.log('[useVoice] Audio playing:', audioUrl)
          setIsPlaying(true)
        }
        
        const handleDone = () => {
          console.log('[useVoice] Audio ended/error')
          setIsPlaying(false)
          audioElementRef.current = null
        }
        
        audio.onended = handleDone
        audio.onerror = (err) => {
          console.error('[useVoice] Audio error:', err)
          handleDone()
        }
        
        // Ajouter un timeout de sécurité (au cas où l'audio ne se termine pas)
        const timeoutId = setTimeout(() => {
          console.warn('[useVoice] Audio timeout - stopping playback')
          audio.pause()
          handleDone()
        }, 30000) // 30 secondes max
        
        audio.onended = () => {
          clearTimeout(timeoutId)
          handleDone()
        }
        
        try {
          await audio.play()
          console.log('[useVoice] Audio.play() resolved')
        } catch (playErr) {
          console.error('[useVoice] Audio.play() failed:', playErr)
          handleDone()
        }
        return
      }
      
      // Sinon, c'est du texte pour TTS (ancien comportement)
      console.log('[useVoice] Lecture TTS:', audioUrl)
      
      // Annuler un éventuel timer de fin gracieuse si une nouvelle phrase arrive
      if (endGraceTimeoutRef.current) {
        clearTimeout(endGraceTimeoutRef.current)
        endGraceTimeoutRef.current = null
      }

      const utterance = new SpeechSynthesisUtterance(audioUrl)
      utterance.lang = 'fr-FR'
      utterance.rate = 0.9
      // Choisir une voix FR si disponible pour éviter le délai de sélection implicite
      try {
        const list = (typeof window !== 'undefined' && window.speechSynthesis?.getVoices?.()) || voicesRef.current || []
        const frVoice = Array.isArray(list) ? (list.find(v => /fr/i.test(v.lang)) || list.find(v => /fr|french/i.test(v.name)) || list[0]) : null
        if (frVoice) utterance.voice = frVoice
      } catch {}

      utterance.onstart = () => {
        activeUtterancesRef.current += 1
        setIsPlaying(true)
      }
      const handleDone = () => {
        activeUtterancesRef.current = Math.max(0, activeUtterancesRef.current - 1)
        // Laisser une petite marge pour enchaîner la prochaine phrase sans couper la vidéo
        if (activeUtterancesRef.current === 0) {
          endGraceTimeoutRef.current = setTimeout(() => {
            if (activeUtterancesRef.current === 0) {
              setIsPlaying(false)
            }
          }, 200)
        }
      }
      utterance.onend = handleDone
      utterance.onerror = handleDone

      speechSynthesis.speak(utterance)
    } catch (error) {
      console.error('Erreur lors de la lecture audio:', error)
      setIsPlaying(false)
    }
  }, [audioUnlocked, unlockAudio])

  const stopAudio = useCallback(() => {
    try {
      speechSynthesis.cancel()
    } catch {}
    activeUtterancesRef.current = 0
    if (endGraceTimeoutRef.current) {
      clearTimeout(endGraceTimeoutRef.current)
      endGraceTimeoutRef.current = null
    }
    setIsPlaying(false)
  }, [])

  return {
    isRecording,
    isPlaying,
    startRecording,
    stopRecording,
    transcribeAudio,
    playAudio,
    stopAudio
  }
}
