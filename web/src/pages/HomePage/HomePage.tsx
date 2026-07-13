import { useCallback, useEffect, useRef, useState } from 'react'

import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import LatestAiSummaryCell from 'src/components/LatestAiSummaryCell'
import RobotHead from 'src/components/RobotHead/RobotHead'
import { useConfig } from 'src/hooks/useConfig'
import { useVisionStream } from 'src/hooks/useVisionStream'

// Ported from html/index.html. That page drove the head from a direct
// browser->MQTT websocket connection; this drives it from /vision/stream
// (SSE) instead — see useVisionStream for why.
const GREET_COOLDOWN_MS = 2 * 60 * 1000
const GREETING_DISPLAY_MS = 5000
const RETURN_TO_CENTER_MS = 800
const HOVER_RETURN_MS = 400
const DEFAULT_ANTENNA_COLOR = '#2a4a6a'

interface NavItem {
  to: string
  label: string
  border: string
  text: string
  pan: number
  tilt: number
}

const LEFT_FLANK: NavItem = {
  to: routes.photoGallery(),
  label: 'Photo Gallery',
  border: 'border-blue-500',
  text: 'text-blue-400',
  pan: -0.5,
  tilt: 0,
}

const RIGHT_FLANK: NavItem = {
  to: routes.robot(),
  label: 'Private AI',
  border: 'border-purple-500',
  text: 'text-purple-400',
  pan: 0.5,
  tilt: 0,
}

const BOTTOM_ROW: NavItem[] = [
  { to: routes.plantCare(), label: 'Plant Care', border: 'border-emerald-500', text: 'text-emerald-400', pan: -0.25, tilt: 0.4 },
  { to: routes.devices(), label: 'Devices', border: 'border-amber-500', text: 'text-amber-400', pan: 0, tilt: 0.3 },
  { to: routes.systemHealth(), label: 'System Health', border: 'border-cyan-500', text: 'text-cyan-400', pan: 0.25, tilt: 0.4 },
  { to: routes.homeKnowledge(), label: "Papu's Memory", border: 'border-violet-500', text: 'text-violet-400', pan: 0.5, tilt: 0.4 },
]

const truncate = (text: string) => (text.length > 120 ? `${text.slice(0, 117)}…` : text)

const NavBubble = ({ item, onEnter, onLeave }: { item: NavItem; onEnter: () => void; onLeave: () => void }) => (
  <Link
    to={item.to}
    onMouseEnter={onEnter}
    onMouseLeave={onLeave}
    className={`inline-block px-[18px] py-2 rounded-full border ${item.border} bg-slate-900/80 ${item.text} text-[0.7rem] uppercase tracking-wider whitespace-nowrap transition hover:bg-slate-800/95 hover:shadow-[0_0_12px_currentColor]`}
  >
    {item.label}
  </Link>
)

const HomePage = () => {
  const { config } = useConfig()
  const { tracking, result } = useVisionStream()
  const [rawSummary, setRawSummary] = useState<string | null>(null)
  const onSummary = useCallback((summary: string | null) => setRawSummary(summary), [])

  const [pose, setPoseState] = useState({ pan: 0, tilt: 0 })
  const [mouthWidth, setMouthWidth] = useState(10)
  const [antennaColor, setAntennaColor] = useState(DEFAULT_ANTENNA_COLOR)
  const [speechText, setSpeechText] = useState('...')

  const navHoverActive = useRef(false)
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const greetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const greetedAt = useRef<Record<string, number>>({})
  const summaryTextRef = useRef('...')

  const setPose = (pan: number, tilt: number) => setPoseState({ pan, tilt })

  // Real AI summary once loaded, config's placeholder while loading/absent —
  // same fetch-then-fallback ordering as the old page's loadAiSummary().
  // Skipped while a greeting bubble is showing so it doesn't get stomped.
  useEffect(() => {
    const summary = rawSummary || config?.aiPlaceholder || 'Hi! How can I help?'
    summaryTextRef.current = summary
    if (!greetTimer.current) setSpeechText(truncate(summary))
  }, [rawSummary, config])

  // Fast pan/tilt tracking -> head pose, unless a nav bubble hover is
  // overriding it (matches the old page's navHoverActive guard).
  useEffect(() => {
    if (navHoverActive.current || !tracking) return
    if (returnTimer.current) {
      clearTimeout(returnTimer.current)
      returnTimer.current = null
    }
    const face = tracking.faces[0]
    if (!face) {
      returnTimer.current = setTimeout(() => setPose(0, 0), RETURN_TO_CENTER_MS)
      return
    }
    setPose(face.pan_delta, face.tilt_delta)
  }, [tracking])

  // Recognition result -> mouth/antenna + a one-off greeting bubble, each
  // name (or "unknown") on its own 2-minute cooldown.
  useEffect(() => {
    if (!result) return
    const face = result.faces[0]
    if (!face) {
      setMouthWidth(10)
      setAntennaColor(DEFAULT_ANTENNA_COLOR)
      return
    }
    setMouthWidth(Math.max(10, Math.round(face.confidence * 96)))
    setAntennaColor(face.name === 'unknown' ? '#aa7020' : '#20aa60')

    const key = face.name === 'unknown' ? '__unknown__' : face.name
    const now = Date.now()
    if (now - (greetedAt.current[key] ?? 0) > GREET_COOLDOWN_MS) {
      greetedAt.current[key] = now
      setSpeechText(face.name === 'unknown' ? 'Hi, stranger!' : `Hello, ${face.name}!`)
      if (greetTimer.current) clearTimeout(greetTimer.current)
      greetTimer.current = setTimeout(() => {
        greetTimer.current = null
        setSpeechText(truncate(summaryTextRef.current))
      }, GREETING_DISPLAY_MS)
    }
  }, [result])

  const handleNavEnter = (item: NavItem) => {
    navHoverActive.current = true
    if (returnTimer.current) {
      clearTimeout(returnTimer.current)
      returnTimer.current = null
    }
    setPose(item.pan, item.tilt)
  }

  const handleNavLeave = () => {
    navHoverActive.current = false
    returnTimer.current = setTimeout(() => setPose(0, 0), HOVER_RETURN_MS)
  }

  return (
    <>
      <Metadata title="Home" description="Papu Home dashboard" />

      <LatestAiSummaryCell onSummary={onSummary} />

      <div className="max-w-6xl mx-auto p-8 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="relative mb-3">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 max-w-[280px] text-center">
              <p className="text-sm text-slate-300">{speechText}</p>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-2.5 h-0 w-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-slate-700" />
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 h-0 w-0 border-l-[9px] border-r-[9px] border-t-[9px] border-l-transparent border-r-transparent border-t-slate-800" />
          </div>

          <div className="flex items-center gap-10">
            <NavBubble item={LEFT_FLANK} onEnter={() => handleNavEnter(LEFT_FLANK)} onLeave={handleNavLeave} />
            <RobotHead pan={pose.pan} tilt={pose.tilt} mouthWidth={mouthWidth} antennaColor={antennaColor} />
            <NavBubble item={RIGHT_FLANK} onEnter={() => handleNavEnter(RIGHT_FLANK)} onLeave={handleNavLeave} />
          </div>

          <div className="flex gap-8 mt-8">
            {BOTTOM_ROW.map((item) => (
              <NavBubble key={item.label} item={item} onEnter={() => handleNavEnter(item)} onLeave={handleNavLeave} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default HomePage
