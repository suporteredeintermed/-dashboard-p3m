import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Upload, Users, FileText,
  DollarSign, Clock, Bell, Settings, Menu, X
} from 'lucide-react'
import Logo from './Logo.jsx'

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Visão Geral'      },
  { to: '/upload',      icon: Upload,          label: 'Upload'            },
  { to: '/producao',    icon: Users,           label: 'Produção Médica'   },
  { to: '/laudos',      icon: FileText,        label: 'Laudos por Médico' },
  { to: '/faturamento', icon: DollarSign,      label: 'Faturamento'       },
  { to: '/prazos',      icon: Clock,           label: 'Prazos / Qualidade'},
  { to: '/alertas',     icon: Bell,            label: 'Alertas'           },
  { to: '/config',      icon: Settings,        label: 'Configuração'      },
]

export default function Sidebar({ open, onToggle }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative z-30 h-full flex flex-col
          bg-p3m-mid border-r border-p3m-border
          transition-all duration-300 ease-in-out
          ${open ? 'w-56' : 'w-14'}
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-p3m-border min-h-[60px]">
          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-p3m-teal/10 text-p3m-teal flex-shrink-0"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          {open && (
            <div className="flex items-center gap-2 overflow-hidden">
              <Logo size={28} />
              <div className="leading-tight">
                <p className="text-xs font-bold text-white tracking-wide">Redeintermed</p>
                <p className="text-[10px] text-p3m-muted">Dashboard P3M</p>
              </div>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-lg transition-colors group
                 ${isActive
                   ? 'bg-p3m-teal/15 text-p3m-teal'
                   : 'text-p3m-muted hover:text-white hover:bg-white/5'
                 }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {open && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        {open && (
          <div className="px-4 py-3 border-t border-p3m-border">
            <p className="text-[10px] text-p3m-muted">v1.0 · Dashboard P3M</p>
          </div>
        )}
      </aside>
    </>
  )
}
