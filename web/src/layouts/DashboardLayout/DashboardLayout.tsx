import type { ReactNode } from 'react'

import { Link, routes } from '@redwoodjs/router'

interface DashboardLayoutProps {
  title: string
  children: ReactNode
  actions?: ReactNode
}

const DashboardLayout = ({
  title,
  children,
  actions,
}: DashboardLayoutProps) => (
  <div className="max-w-6xl mx-auto p-8">
    <div className="flex items-center justify-between mb-8">
      <div>
        <Link
          to={routes.home()}
          className="text-slate-400 hover:text-blue-400 text-sm transition"
        >
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-extrabold mt-1 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
          {title}
        </h1>
      </div>
      {actions}
    </div>
    {children}
  </div>
)

export default DashboardLayout
