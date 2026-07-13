import { useRef, useState } from 'react'

import { useMutation } from '@redwoodjs/web'

const SEND_CHAT_MESSAGE_MUTATION = gql`
  mutation SendChatMessageMutation($sessionKey: String, $message: String!, $personName: String) {
    sendChatMessage(sessionKey: $sessionKey, message: $message, personName: $personName) {
      reply
      evalId
    }
  }
`

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'

// The Web Speech API has no types in TS's DOM lib.
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

interface UseVoiceChatOptions {
  sessionKey: string | null
  personName: string | null
  onTranscriptUpdate: (transcript: { userText: string; robotText: string }) => void
  onEvalReady: (evalId: number | null) => void
}

export function useVoiceChat({ sessionKey, personName, onTranscriptUpdate, onEvalReady }: UseVoiceChatOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [mouthWidth, setMouthWidth] = useState(10)
  const [micUnsupported, setMicUnsupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mouthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [sendChatMessageMutation] = useMutation(SEND_CHAT_MESSAGE_MUTATION)

  const sendMessage = async (message: string) => {
    const { data } = await sendChatMessageMutation({ variables: { sessionKey, message, personName } })
    return {
      reply: data?.sendChatMessage.reply ?? "Sorry, I couldn't think of a response.",
      evalId: data?.sendChatMessage.evalId ?? null,
    }
  }

  const stopMouthAnimation = () => {
    if (mouthTimerRef.current) {
      clearInterval(mouthTimerRef.current)
      mouthTimerRef.current = null
    }
    setMouthWidth(10)
  }

  const startMouthAnimation = (isDone: () => boolean) => {
    if (mouthTimerRef.current) clearInterval(mouthTimerRef.current)
    mouthTimerRef.current = setInterval(() => {
      if (isDone()) {
        stopMouthAnimation()
        setVoiceState('idle')
        return
      }
      setMouthWidth(Math.round(12 + Math.random() * 70))
    }, 90)
  }

  const speak = async (text: string) => {
    stopMouthAnimation()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    window.speechSynthesis?.cancel()
    setVoiceState('speaking')

    try {
      const res = await fetch(`${globalThis.RWJS_API_URL}/tts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error(`TTS ${res.status}`)

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        stopMouthAnimation()
        setVoiceState('idle')
        URL.revokeObjectURL(url)
        if (audioRef.current === audio) audioRef.current = null
      }

      startMouthAnimation(() => audio.ended || (audio.paused && audio.currentTime === 0))
      await audio.play()
    } catch {
      // Fallback to browser TTS if Kokoro is unavailable, matching the old page.
      const utter = new SpeechSynthesisUtterance(text)
      utter.rate = 1.0
      utter.pitch = 1.0
      startMouthAnimation(() => !window.speechSynthesis?.speaking)
      window.speechSynthesis?.speak(utter)
    }
  }

  // Voice interactions show in a transient "last exchange" transcript, not
  // the persistent chat log — matches the old page's separate #transcript
  // vs. #chat-log surfaces (voice replies are spoken aloud + shown
  // transiently; only text-chat sends persist to the visible scrolling log,
  // even though both hit the same session server-side).
  const ask = async (userText: string) => {
    onTranscriptUpdate({ userText, robotText: '…' })
    setVoiceState('thinking')
    try {
      const { reply, evalId } = await sendMessage(userText)
      onTranscriptUpdate({ userText, robotText: reply })
      onEvalReady(evalId)
      await speak(reply)
    } catch {
      setVoiceState('idle')
    }
  }

  const toggleMic = () => {
    if (voiceState === 'listening') {
      recognitionRef.current?.stop()
      return
    }
    if (voiceState !== 'idle') return

    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const SpeechRecognitionImpl = w.SpeechRecognition ?? w.webkitSpeechRecognition

    if (!SpeechRecognitionImpl) {
      setMicUnsupported(true)
      return
    }

    const recognition = new SpeechRecognitionImpl()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setVoiceState('listening')
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript.trim()
      ask(text)
    }
    recognition.onerror = () => setVoiceState('idle')
    recognition.onend = () => setVoiceState((s) => (s === 'listening' ? 'idle' : s))
    recognitionRef.current = recognition
    recognition.start()
  }

  return { voiceState, mouthWidth, micUnsupported, toggleMic, sendMessage, speak }
}
