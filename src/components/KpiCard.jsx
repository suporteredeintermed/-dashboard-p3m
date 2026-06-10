import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function KpiCard({ label, value, sub, trend, accent, icon: Icon, color }) {
  const trendIcon = trend === 'up'
    ? <TrendingUp size={11} />
    : trend === 'down'
      ? <TrendingDown size={11} />
      : <Minus size={11} />

  const trendColor = trend === 'up' ? 'text-p3m-teal' : trend === 'down' ? 'text-red-400' : 'text-p3m-muted'

  return (
    <div className={`card flex flex-col gap-2 ${accent ? 'border-p3m-teal/40 bg-p3m-teal/5' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-p3m-muted flex items-center gap-1.5 font-medium">
          {Icon && <Icon size={11} className={color || 'text-p3m-teal'} />}
          {label}
        </span>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[11px] ${trendColor}`}>
            {trendIcon}
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold text-white leading-none">{value}</div>
      {sub && <div className="text-[11px] text-p3m-muted">{sub}</div>}
    </div>
  )
}
