import { useCallback, useEffect, useRef, useState } from 'react'

import { Link, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import type { ChatHistoryMessage } from 'src/components/ChatHistoryCell'
import ChatHistoryCell from 'src/components/ChatHistoryCell'
import type { DisplayUser } from 'src/components/DisplayNamesCell'
import DisplayNamesCell from 'src/components/DisplayNamesCell'
import LatestAiSummaryCell from 'src/components/LatestAiSummaryCell'
import RobotHead from 'src/components/RobotHead/RobotHead'
import { useChatSession } from 'src/hooks/useChatSession'
import { useConfig } from 'src/hooks/useConfig'
import { useVisionStream } from 'src/hooks/useVisionStream'

import { UPDATE_CHAT_EVAL_RATING_MUTATION } from './mutations'
import { useVoiceChat } from './useVoiceChat'

// Ported from html/robot.html. Two things dropped on purpose, not by
// oversight:
// - The browser-side camera capture + MediaPipe face detection + MQTT frame
//   publishing. Diff 6 of the migration already scoped this out: the camera
//   role was "temporary MVP" scaffolding standing in for a real robot camera
//   that doesn't exist yet, and won't be ported — only the *viewer* role
//   (rendering tracking/recognition results) survives, sourced from
//   /vision/stream (SSE) instead of a direct browser->MQTT connection (that
//   broker allows anonymous read/write to every topic, including the pump
//   command topic).
// - The raw MQTT websocket connection itself, replaced by useVisionStream
//   for the same reason.
const GREET_COOLDOWN_MS = 2 * 60 * 1000
const RETURN_TO_CENTER_MS = 800
const DEFAULT_ANTENNA_COLOR = '#2a4a6a'

interface ChatEntry {
  sender: 'you' | 'papu' | 'err'
  text: string
}

const resolveName = (name: string | null, users: DisplayUser[]): string | null => {
  if (!name) return name
  const match = users.find(
    (u) => u.email.split('@')[0].toLowerCase() === name.toLowerCase() || u.displayName.toLowerCase() === name.toLowerCase()
  )
  return match?.displayName ?? name
}

const speakBtnClass: Record<string, string> = {
  idle: 'border-[#2a4a7a] bg-[#0c1420] text-[#7ab0e0] hover:border-[#4a7aaa]',
  listening: 'border-[#3a9a6a] bg-[#0c1a14] text-[#3a9a6a]',
  thinking: 'border-[#9a8a20] bg-[#141208] text-[#9a8a20]',
  speaking: 'border-[#1a6aaa] bg-[#0c1420] text-[#50b0ff]',
}

const speechStateLabel: Record<string, string> = {
  idle: '',
  listening: 'listening…',
  thinking: 'thinking…',
  speaking: 'speaking…',
}

const RobotPage = () => {
  const { config } = useConfig()
  const { tracking, result, connected } = useVisionStream()
  const { sessionKey } = useChatSession()

  const [users, setUsers] = useState<DisplayUser[]>([])
  const onUsers = useCallback((u: DisplayUser[]) => setUsers(u), [])

  const [pose, setPose] = useState({ pan: 0, tilt: 0 })
  const [antennaColor, setAntennaColor] = useState(DEFAULT_ANTENNA_COLOR)
  const [recognitionMouthWidth, setRecognitionMouthWidth] = useState(10)
  const [recognizedName, setRecognizedName] = useState<string | null>(null)
  const [confidencePct, setConfidencePct] = useState<string | null>(null)

  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [transcript, setTranscript] = useState<{ userText: string; robotText: string } | null>(null)
  const [chatInput, setChatInput] = useState('')

  const [currentEvalId, setCurrentEvalId] = useState<number | null>(null)
  const [evalRatings, setEvalRatings] = useState<{ quality?: boolean; correctness?: boolean }>({})
  const [updateChatEvalRating] = useMutation(UPDATE_CHAT_EVAL_RATING_MUTATION)

  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const greetedAt = useRef<Record<string, number>>({})

  // ChatHistoryCell's query can't even start until useChatSession resolves
  // a sessionKey, while LatestAiSummaryCell's fires immediately on mount —
  // so the summary reliably arrives *before* history does. Racing two
  // one-shot callbacks (whichever fires last decides whether to show a
  // greeting) means the summary's callback sees "history not seeded yet"
  // and bails, and nothing ever re-triggers it once history actually loads.
  // Tracking both as pending/resolved state and deciding once in a single
  // effect — once, when both are in — avoids the race entirely.
  const [historyResult, setHistoryResult] = useState<ChatHistoryMessage[] | 'pending'>('pending')
  const [summaryResult, setSummaryResult] = useState<string | null | 'pending'>('pending')
  const greetingAddedRef = useRef(false)

  const onHistory = useCallback((history: ChatHistoryMessage[]) => setHistoryResult(history), [])
  const onSummary = useCallback((summary: string | null) => setSummaryResult(summary), [])

  // Only shows a greeting if history genuinely came back empty — matches
  // the old page's `!historyLoaded || chatLog.children.length === 0` check.
  useEffect(() => {
    if (greetingAddedRef.current) return
    if (historyResult === 'pending' || summaryResult === 'pending') return
    greetingAddedRef.current = true
    if (historyResult.length > 0) {
      setMessages(historyResult.map((m) => ({ sender: m.role === 'user' ? 'you' : 'papu', text: m.content })))
    } else {
      setMessages([{ sender: 'papu', text: summaryResult || config?.aiPlaceholder || 'How can I help?' }])
    }
  }, [historyResult, summaryResult, config])

  const onTranscriptUpdate = useCallback((t: { userText: string; robotText: string }) => setTranscript(t), [])
  const onEvalReady = useCallback((evalId: number | null) => {
    setCurrentEvalId(evalId)
    setEvalRatings({})
  }, [])

  const { voiceState, mouthWidth: speakingMouthWidth, micUnsupported, toggleMic, sendMessage, speak } = useVoiceChat({
    sessionKey,
    personName: recognizedName,
    onTranscriptUpdate,
    onEvalReady,
  })

  // Fast pan/tilt tracking -> head pose. Pan is negated relative to the
  // Home page's RobotHead usage — matches the old page's own sign
  // convention (`rotateY(-pan * 60deg)`), presumably so the head mirrors a
  // live camera preview the way index.html's abstract nav-hub head never
  // needed to.
  useEffect(() => {
    if (!tracking) return
    if (returnTimer.current) {
      clearTimeout(returnTimer.current)
      returnTimer.current = null
    }
    const face = tracking.faces[0]
    if (!face) {
      returnTimer.current = setTimeout(() => setPose({ pan: 0, tilt: 0 }), RETURN_TO_CENTER_MS)
      return
    }
    setPose({ pan: face.pan_delta, tilt: face.tilt_delta })
  }, [tracking])

  // Recognition -> antenna/mouth + a spoken (not just text) greeting on a
  // 2-minute cooldown per name.
  useEffect(() => {
    if (!result) return
    const face = result.faces[0]
    if (!face) {
      setAntennaColor(DEFAULT_ANTENNA_COLOR)
      setRecognitionMouthWidth(10)
      setRecognizedName(null)
      setConfidencePct(null)
      return
    }

    setAntennaColor(face.name === 'unknown' ? '#aa7020' : '#20aa60')
    setRecognitionMouthWidth(Math.max(10, Math.round(face.confidence * 96)))
    setConfidencePct(`${Math.round(face.confidence * 100)}%`)

    if (face.name === 'unknown') {
      setRecognizedName(null)
      return
    }

    const resolved = resolveName(face.name, users)
    setRecognizedName(resolved)

    const now = Date.now()
    if (now - (greetedAt.current[face.name] ?? 0) > GREET_COOLDOWN_MS) {
      greetedAt.current[face.name] = now
      const greeting = `Hello, ${resolved}!`
      setTranscript((prev) => ({ userText: prev?.userText ?? '', robotText: greeting }))
      speak(greeting)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, users])

  const handleSendChat = async () => {
    const message = chatInput.trim()
    if (!message) return
    setChatInput('')
    setMessages((prev) => [...prev, { sender: 'you', text: message }])
    try {
      const { reply, evalId } = await sendMessage(message)
      setMessages((prev) => [...prev, { sender: 'papu', text: reply }])
      onEvalReady(evalId)
    } catch {
      setMessages((prev) => [...prev, { sender: 'err', text: 'error: could not reach the GPU.' }])
    }
  }

  const rateEval = (field: 'QUALITY' | 'CORRECTNESS', value: boolean) => {
    if (currentEvalId == null) return
    setEvalRatings((prev) => ({ ...prev, [field === 'QUALITY' ? 'quality' : 'correctness']: value }))
    updateChatEvalRating({ variables: { id: currentEvalId, field, value } }).catch(() => {})
  }

  const mouthWidth = voiceState === 'speaking' ? speakingMouthWidth : recognitionMouthWidth

  return (
    <>
      <Metadata title="Robot" description="Vision, voice, and chat" />

      <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[#080c14] py-10 font-mono text-[#c8d8f0]">
        <Link
          to={routes.home()}
          className="self-start pl-4 text-[10px] uppercase tracking-widest text-[#3a5a8a] hover:text-[#7ab0e0]"
        >
          ← back to home
        </Link>

        <header className="text-[11px] uppercase tracking-[4px] text-[#3a5a8a]">Robot Vision Monitor</header>

        <RobotHead pan={-pose.pan} tilt={pose.tilt} mouthWidth={mouthWidth} antennaColor={antennaColor} />

        <div className="grid w-[380px] grid-cols-4 gap-3">
          <div className="rounded-md border border-[#1a2a40] bg-[#0c1420] p-2.5 text-center">
            <div className="mb-1.5 text-[8px] tracking-[2px] text-[#3a5a8a]">NAME</div>
            <div className="text-[15px] font-bold text-[#7ab0e0]">{recognizedName ?? '—'}</div>
          </div>
          <div className="rounded-md border border-[#1a2a40] bg-[#0c1420] p-2.5 text-center">
            <div className="mb-1.5 text-[8px] tracking-[2px] text-[#3a5a8a]">CONF</div>
            <div className="text-[15px] font-bold text-[#7ab0e0]">{confidencePct ?? '—'}</div>
          </div>
          <div className="rounded-md border border-[#1a2a40] bg-[#0c1420] p-2.5 text-center">
            <div className="mb-1.5 text-[8px] tracking-[2px] text-[#3a5a8a]">PAN</div>
            <div className="text-[15px] font-bold text-[#7ab0e0]">
              {tracking?.faces[0] ? `${pose.pan >= 0 ? '+' : ''}${pose.pan.toFixed(3)}` : '—'}
            </div>
          </div>
          <div className="rounded-md border border-[#1a2a40] bg-[#0c1420] p-2.5 text-center">
            <div className="mb-1.5 text-[8px] tracking-[2px] text-[#3a5a8a]">TILT</div>
            <div className="text-[15px] font-bold text-[#7ab0e0]">
              {tracking?.faces[0] ? `${pose.tilt >= 0 ? '+' : ''}${pose.tilt.toFixed(3)}` : '—'}
            </div>
          </div>
        </div>

        <div className="flex w-[380px] flex-col items-center gap-3.5">
          <button
            onClick={toggleMic}
            className={`h-[72px] w-[72px] rounded-full border-2 text-[9px] uppercase tracking-[2px] outline-none transition-colors duration-200 ${speakBtnClass[voiceState]}`}
          >
            mic
          </button>
          <div className="min-h-[14px] text-[9px] uppercase tracking-[3px] text-[#3a5a8a]">
            {micUnsupported ? 'speech recognition not supported in this browser' : speechStateLabel[voiceState]}
          </div>
        </div>

        {transcript && (
          <div className="flex w-[380px] flex-col gap-2">
            <div className="rounded-md border border-[#1a2a40] bg-[#0c1420] px-3.5 py-2.5 text-xs leading-relaxed">
              <div className="mb-1 text-[8px] tracking-[2px] text-[#3a5a8a]">You said</div>
              <div>{transcript.userText}</div>
            </div>
            <div className="rounded-md border border-[#1a2a40] bg-[#0c1420] px-3.5 py-2.5 text-xs leading-relaxed">
              <div className="mb-1 text-[8px] tracking-[2px] text-[#3a5a8a]">Robot</div>
              <div>{transcript.robotText}</div>
            </div>
          </div>
        )}

        {currentEvalId != null && (
          <div className="flex w-[380px] items-center gap-1.5 rounded-md border border-[#1a2a40] bg-[#0c1420] px-3 py-1.5">
            <span className="text-[8px] uppercase tracking-wide text-[#3a5a8a]">quality</span>
            <button
              onClick={() => rateEval('QUALITY', true)}
              className={`rounded border px-2 py-0.5 text-xs transition-colors ${evalRatings.quality === true ? 'border-[#20aa60] text-[#20aa60]' : 'border-[#1a2a40] text-[#3a5a8a] hover:border-[#2a4a7a] hover:text-[#7ab0e0]'}`}
            >
              ✓
            </button>
            <button
              onClick={() => rateEval('QUALITY', false)}
              className={`rounded border px-2 py-0.5 text-xs transition-colors ${evalRatings.quality === false ? 'border-[#aa4020] text-[#aa4020]' : 'border-[#1a2a40] text-[#3a5a8a] hover:border-[#2a4a7a] hover:text-[#7ab0e0]'}`}
            >
              ✗
            </button>
            <span className="flex-1" />
            <span className="text-[8px] uppercase tracking-wide text-[#3a5a8a]">correct</span>
            <button
              onClick={() => rateEval('CORRECTNESS', true)}
              className={`rounded border px-2 py-0.5 text-xs transition-colors ${evalRatings.correctness === true ? 'border-[#20aa60] text-[#20aa60]' : 'border-[#1a2a40] text-[#3a5a8a] hover:border-[#2a4a7a] hover:text-[#7ab0e0]'}`}
            >
              ✓
            </button>
            <button
              onClick={() => rateEval('CORRECTNESS', false)}
              className={`rounded border px-2 py-0.5 text-xs transition-colors ${evalRatings.correctness === false ? 'border-[#aa4020] text-[#aa4020]' : 'border-[#1a2a40] text-[#3a5a8a] hover:border-[#2a4a7a] hover:text-[#7ab0e0]'}`}
            >
              ✗
            </button>
          </div>
        )}

        <div className={`text-[9px] uppercase tracking-[3px] ${connected ? 'text-[#3a9a6a]' : 'text-[#9a3a3a]'}`}>
          ● {connected ? 'connected' : 'disconnected'}
        </div>

        <div className="flex w-[380px] flex-col gap-2.5">
          <div className="flex h-[180px] flex-col gap-1.5 overflow-y-auto rounded-md border border-[#1a2a40] bg-[#0c1420] px-3.5 py-3 text-xs leading-relaxed">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.sender === 'you' ? 'text-[#c8d8f0]' : m.sender === 'papu' ? 'text-[#7ab0e0]' : 'text-[10px] text-[#9a3a3a]'}
              >
                {m.sender !== 'err' && (
                  <span className="mr-1 text-[9px] uppercase tracking-[2px] text-[#3a5a8a]">
                    {m.sender === 'you' ? 'you' : 'papu'}
                  </span>
                )}
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendChat()
              }}
              placeholder="Type a message…"
              className="flex-1 rounded-md border border-[#1a2a40] bg-[#0c1420] px-3 py-2 font-mono text-xs text-[#c8d8f0] outline-none focus:border-[#2a4a7a]"
            />
            <button
              onClick={handleSendChat}
              className="rounded-md border border-[#2a4a7a] bg-[#0c1420] px-4 py-2 text-[9px] uppercase tracking-[2px] text-[#7ab0e0] transition-colors hover:border-[#4a7aaa]"
            >
              send
            </button>
          </div>
        </div>
      </div>

      <DisplayNamesCell onUsers={onUsers} />
      <LatestAiSummaryCell onSummary={onSummary} />
      {sessionKey && <ChatHistoryCell sessionKey={sessionKey} onHistory={onHistory} />}
    </>
  )
}

export default RobotPage
