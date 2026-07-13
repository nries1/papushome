import type { ReactNode } from 'react'

// Matches html/css/dashboard.css's `.card` — the styling for the pages
// (Plant Care, System Health) ported from the old Chart.js/dashboard.css
// dashboard rather than the Tailwind-CDN pages (Home/Devices/Photo Gallery).
// The `dash-*` color tokens in web/src/index.css already mirror that
// stylesheet's CSS custom properties for exactly this purpose.
interface CardProps {
  title: string
  className?: string
  children: ReactNode
}

const Card = ({ title, className = '', children }: CardProps) => (
  <div
    className={`rounded-2xl border border-white/10 bg-dash-card p-6 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-dash-accent-blue ${className}`}
  >
    <h3 className="mb-4 text-sm uppercase tracking-wide text-dash-text-dim">{title}</h3>
    {children}
  </div>
)

export default Card
