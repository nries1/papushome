// Ported from html/index.html's inline SVG + setPose()/onRecognition() logic.
// Shared by the Home page nav-hub and (later) the Robot page — both drove
// this same head from the same MQTT topics in the old static pages.
interface RobotHeadProps {
  pan: number // [-0.5, 0.5], positive = right
  tilt: number // [-0.5, 0.5], positive = down
  mouthWidth: number // 10 (closed) .. 106 (Math.max(10, confidence * 96) + base)
  antennaColor: string
}

const RobotHead = ({ pan, tilt, mouthWidth, antennaColor }: RobotHeadProps) => {
  const eyeTransform = `translate(${pan * 10}px, ${tilt * 7}px)`

  return (
    <div style={{ perspective: '700px' }}>
      <svg
        width="220"
        height="260"
        viewBox="0 0 220 260"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: `rotateY(${pan * 60}deg) rotateX(${-tilt * 40}deg)`,
          transformOrigin: '110px 140px',
          transition: 'transform 180ms ease-out',
          display: 'block',
        }}
      >
        <line x1="110" y1="10" x2="110" y2="36" stroke="#2a4a7a" strokeWidth="3" strokeLinecap="round" />
        <circle cx="110" cy="8" r="7" fill="#0c1828" stroke="#3a6aaa" strokeWidth="1.5" />
        <circle cx="110" cy="8" r="3.5" fill={antennaColor} style={{ transition: 'fill 180ms ease-out' }} />
        <rect x="20" y="36" width="180" height="196" rx="18" fill="#0c1828" stroke="#2a4a7a" strokeWidth="1.5" />
        <rect x="8" y="86" width="14" height="36" rx="4" fill="#0c1828" stroke="#2a4a7a" strokeWidth="1.5" />
        <rect x="198" y="86" width="14" height="36" rx="4" fill="#0c1828" stroke="#2a4a7a" strokeWidth="1.5" />
        <circle cx="78" cy="126" r="32" fill="#060d18" stroke="#1e3860" strokeWidth="1.5" />
        <circle cx="142" cy="126" r="32" fill="#060d18" stroke="#1e3860" strokeWidth="1.5" />
        <g style={{ transform: eyeTransform, transition: 'transform 180ms ease-out' }}>
          <circle cx="78" cy="126" r="18" fill="#1260a0" />
          <circle cx="78" cy="126" r="9" fill="#061018" />
          <circle cx="83" cy="120" r="5" fill="#50b0ff" opacity="0.85" />
        </g>
        <g style={{ transform: eyeTransform, transition: 'transform 180ms ease-out' }}>
          <circle cx="142" cy="126" r="18" fill="#1260a0" />
          <circle cx="142" cy="126" r="9" fill="#061018" />
          <circle cx="147" cy="120" r="5" fill="#50b0ff" opacity="0.85" />
        </g>
        <rect x="60" y="192" width="100" height="14" rx="7" fill="#060d18" stroke="#1e3860" strokeWidth="1.5" />
        <rect
          x="62"
          y="194"
          width={mouthWidth}
          height="10"
          rx="5"
          fill="#1260a0"
          style={{ transition: 'width 180ms ease-out' }}
        />
      </svg>
    </div>
  )
}

export default RobotHead
