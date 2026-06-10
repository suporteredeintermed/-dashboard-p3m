import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Clock, CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import FilterBar from '../components/FilterBar.jsx'
import KpiCard from '../components/KpiCard.jsx'
import { fetchExamRecords } from '../lib/supabase.js'

const fmt = n => n?.toLocaleString('pt-BR') ?? '0'
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
function diffDays(a, b) {
  if (!a || !b) return null
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

export default function Prazos() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ empresa: '', medico: '', modalidade: '', dataInicio: '', dataFim: '' })

  useEffect(() => {
    fetchExamRecords().then(setRecords).catch(console.error).finally(() => setLoading(false))
  }, [])

  const empresas    = useMemo(() => [...new Set(records.map(r => r.empresa).filter(Boolean))].sort(), [records])
  const medicos     = useMemo(() => [...new Set(records.map(r => r.medico).filter(Boolean))].sort(), [records])
  const modalidades = useMemo(() => [...new Set(records.map(r => r.modalidade).filter(Boolean))].sort(), [records])

  const filtered = useMemo(() => records.filter(r => {
    if (filters.empresa    && r.empresa    !== filters.empresa)    return false
    if (filters.medico     && r.medico     !== filters.medico)     return false
    if (filters.modalidade && r.modalidade !== filters.modalidade) return false
    if (filters.dataInicio && r.data_realizacao < filters.dataInicio) return false
    if (filters.dataFim    && r.data_realizacao > filters.dataFim)    return false
    return true
  }), [records, filters])

  // Prazo analysis
  const comPrazo = filtered.filter(r => r.data_laudo && r.data_prazo)
  const dentroPrazo = comPrazo.filter(r => r.data_laudo <= r.data_prazo)
  const foraPrazo   = comPrazo.filter(r => r.data_laudo >  r.data_prazo)

  // Turnaround (realizacao → laudo)
  const comTurnaround = filtered.filter(r => r.data_realizacao && r.data_laudo)
  const turnarounds   = comTurnaround.map(r => diffDays(r.data_realizacao, r.data_laudo)).filter(d => d != null && d >= 0)
  const avgTurnaround = turnarounds.length ? (turnarounds.reduce((s, d) => s + d, 0) / turnarounds.length).toFixed(1) : null
  const acima7dias    = turnarounds.filter(d => d > 7).length

  // Segunda assinatura por empresa
  const segAssinPorEmpresa = useMemo(() => {
    const m = {}
    filtered.forEach(r => {
      if (!m[r.empresa]) m[r.empresa] = { total: 0, com: 0 }
      m[r.empresa].total++
      if (r.segunda_assinatura) m[r.empresa].com++
    })
    return Object.entries(m).map(([name, { total, com }]) => ({
      name: name.split(' ').slice(0, 3).join(' '),
      total, com,
      pct: Math.round(100 * com / total),
    })).sort((a, b) => b.pct - a.pct)
  }, [filtered])

  // Fora do prazo por empresa
  const foraPrazoPorEmpresa = useMemo(() => {
    const m = {}
    comPrazo.forEach(r => {
      if (!m[r.empresa]) m[r.empresa] = { total: 0, fora: 0 }
      m[r.empresa].total++
      if (r.data_laudo > r.data_prazo) m[r.empresa].fora++
    })
    return Object.entries(m).map(([name, { total, fora }]) => ({
      name: name.split(' ').slice(0, 3).join(' '),
      fora,
      dentro: total - fora,
    })).sort((a, b) => b.fora - a.fora)
  }, [comPrazo])

  // Reassinado por médico
  const reassinadoPorMedico = useMemo(() => {
    const m = {}
    filtered.forEach(r => {
      if (!m[r.medico]) m[r.medico] = { total: 0, reassinado: 0 }
      m[r.medico].total++
      if (r.status === 'Reassinado') m[r.medico].reassinado++
    })
    return Object.entries(m).map(([nome, { total, reassinado }]) => ({ nome, total, reassinado, pct: Math.round(100 * reassinado / total) }))
      .filter(m => m.reassinado > 0).sort((a, b) => b.reassinado - a.reassinado).slice(0, 8)
  }, [filtered])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-p3m-teal border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Prazos e Qualidade" subtitle="Controle de SLA, turnaround e auditoria" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="card">
          <FilterBar filters={filters} onChange={setFilters} empresas={empresas} medicos={medicos} modalidades={modalidades} />
        </div>

        {/* KPIs prazo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Dentro do prazo" value={fmt(dentroPrazo.length)} sub={comPrazo.length ? `${Math.round(100*dentroPrazo.length/comPrazo.length)}% do total` : ''} icon={CheckCircle} color="text-emerald-400" accent />
          <KpiCard label="Fora do prazo" value={fmt(foraPrazo.length)} sub={comPrazo.length ? `${Math.round(100*foraPrazo.length/comPrazo.length)}% do total` : ''} icon={XCircle} color="text-red-400" />
          <KpiCard label="Turnaround médio" value={avgTurnaround ? `${avgTurnaround} dias` : '—'} sub="Realização → laudo" icon={Clock} color="text-blue-400" />
          <KpiCard label="Acima de 7 dias" value={fmt(acima7dias)} sub="Turnaround prolongado" icon={AlertTriangle} color="text-amber-400" />
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Fora do prazo por empresa */}
          <div className="card">
            <p className="text-xs font-semibold text-white mb-3">Cumprimento de Prazo por Unidade</p>
            {foraPrazoPorEmpresa.length === 0
              ? <p className="text-xs text-p3m-muted text-center py-6">Sem dados com DATA_PRAZO.</p>
              : <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={foraPrazoPorEmpresa} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#152A3A', border: '1px solid rgba(0,191,165,0.18)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(0,191,165,0.05)' }} />
                    <Bar dataKey="dentro" name="Dentro do prazo" stackId="a" fill="#00BFA5" />
                    <Bar dataKey="fora"   name="Fora do prazo"   stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>

          {/* Segunda assinatura */}
          <div className="card">
            <p className="text-xs font-semibold text-white mb-3">Cobertura de 2ª Assinatura por Unidade</p>
            <div className="space-y-2.5">
              {segAssinPorEmpresa.map(e => (
                <div key={e.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-p3m-muted truncate max-w-[200px]">{e.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white font-semibold">{e.pct}%</span>
                      <span className="text-[10px] text-p3m-muted">({fmt(e.com)}/{fmt(e.total)})</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-p3m-mid rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${e.pct}%`, background: e.pct > 10 ? '#00BFA5' : e.pct > 5 ? '#F59E0B' : '#EF4444' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reassinados por médico */}
        {reassinadoPorMedico.length > 0 && (
          <div className="card">
            <p className="text-xs font-semibold text-white mb-3">Taxa de Reassinatura por Médico</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-p3m-muted border-b border-p3m-border">
                  <th className="text-left pb-2 font-medium">Médico</th>
                  <th className="text-right pb-2 font-medium">Total laudos</th>
                  <th className="text-right pb-2 font-medium">Reassinados</th>
                  <th className="text-right pb-2 font-medium">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {reassinadoPorMedico.map(m => (
                  <tr key={m.nome} className="border-b border-p3m-border/40 table-row-hover">
                    <td className="py-1.5 text-white">{m.nome}</td>
                    <td className="py-1.5 text-right text-p3m-muted">{fmt(m.total)}</td>
                    <td className="py-1.5 text-right text-p3m-rose">{fmt(m.reassinado)}</td>
                    <td className="py-1.5 text-right">
                      <span className={m.pct > 3 ? 'text-amber-400' : 'text-p3m-muted'}>{m.pct}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Laudos fora do prazo - listagem */}
        {foraPrazo.length > 0 && (
          <div className="card overflow-x-auto">
            <p className="text-xs font-semibold text-white mb-3">Laudos Fora do Prazo — Detalhamento</p>
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="text-p3m-muted border-b border-p3m-border">
                  <th className="text-left pb-2 font-medium">Médico</th>
                  <th className="text-left pb-2 font-medium">Exame</th>
                  <th className="text-left pb-2 font-medium">Unidade</th>
                  <th className="text-center pb-2 font-medium">Mod.</th>
                  <th className="text-center pb-2 font-medium">Prazo</th>
                  <th className="text-center pb-2 font-medium">Laudo</th>
                  <th className="text-right pb-2 font-medium">Atraso</th>
                </tr>
              </thead>
              <tbody>
                {foraPrazo.slice(0, 50).map((r, i) => {
                  const atraso = diffDays(r.data_prazo, r.data_laudo)
                  return (
                    <tr key={r.id || i} className="border-b border-p3m-border/40 table-row-hover">
                      <td className="py-1.5 text-white max-w-[150px] truncate">{r.medico}</td>
                      <td className="py-1.5 text-p3m-muted max-w-[160px] truncate">{r.estudo_descricao}</td>
                      <td className="py-1.5 text-p3m-muted max-w-[120px] truncate">{r.empresa}</td>
                      <td className="py-1.5 text-center"><span className="badge-teal text-[10px] px-1.5">{r.modalidade}</span></td>
                      <td className="py-1.5 text-center text-p3m-muted">{fmtDate(r.data_prazo)}</td>
                      <td className="py-1.5 text-center text-p3m-muted">{fmtDate(r.data_laudo)}</td>
                      <td className="py-1.5 text-right text-red-400 font-semibold">+{atraso}d</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {foraPrazo.length > 50 && (
              <p className="text-xs text-p3m-muted text-center mt-2">Mostrando 50 de {fmt(foraPrazo.length)} registros. Use os filtros para refinar.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
