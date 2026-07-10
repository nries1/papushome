import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-7 w-[400px] max-w-[90vw]">
        <h2 className="text-base text-white mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}
