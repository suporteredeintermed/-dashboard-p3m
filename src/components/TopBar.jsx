import { Bell, RefreshCw } from 'lucide-react'

export default function TopBar({ title, subtitle, actions }) {
  return (
    <header className="flex items-center justify-between px-5 py-3 bg-p3m-mid border-b border-p3m-border min-h-[56px] flex-shrink-0">
      <div>
        <h1 className="text-sm font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-[11px] text-p3m-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <div className="w-7 h-7 rounded-full bg-p3m-teal-mid flex items-center justify-center text-[10px] font-semibold text-white border-2 border-p3m-teal ml-2">
          P3
        </div>
      </div>
    </header>
  )
}
