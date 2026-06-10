import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Users, AlertTriangle } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import FilterBar from '../components/FilterBar.jsx'
import KpiCard from '../components/KpiCard.jsx'
import { fetchExamRecords } from '../lib/supabase.js'

const MODALIDADES = ['CR', 'CT', 'DX', 'MG', 'MR', 'US', 'XA']
const COLORS = { CR: '#378ADD', CT: '#00BFA5', DX: '#C084B8', MG: '#F59E0B', MR: '#10A48A', US: '#0D7B6B', XA: '#EF4444' }
const fmt = n => n?.toLocaleString('pt-BR') ?? '0'

export default function Producao() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ empresa: '', medico: '', modalidade: '', dataInicio: '', dataFim: '' })

  useEffect(() => {
    fetchExamRecords().then(setRecords).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => records.filter(r => {
    if (filters.empresa    && r.empresa    !== filters.empresa)    return false
    if (filters.medico     && r.medico     !== filters.medico)     return false
    if (filters.modalidade && r.modalidade !== filters.modalidade) return false
    if (filters.dataInicio && r.data_realizacao < filters.dataInicio) return false
    if (filters.dataFim    && r.data_realizacao > filters.dataFim)    return false
    return true
  }), [records, filters])

  const empresas    = useMemo(() => [...new Set(records.map(r => r.empresa).filter(Boolean))].sort(), [records])
  const medicos     = useMemo(() => [...new Set(records.map(r => r.medico).filter(Boolean))].sort(), [records])
  const modalidades = useMemo(() => [...new Set(records.map(r => r.modalidade).filter(Boolean))].sort(), [records])

  // Médico × modalidade matrix
  const medicoData = useMemo(() => {
    const map = {}
    filtered.forEach(r => {
      if (!r.medico) return
      if (!map[r.medico]) map[r.medico] = { medico: r.medico, total: 0, por_modalidade: {} }
      map[r.medico].total++
      map[r.medico].por_modalidade[r.modalidade] = (map[r.medico].por_modalidade[r.modalidade] || 0) + 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [filtered])

  const totalGeral = filtered.length
  const topMedico = medicoData[0]
  const concentracaoTop = topMedico && totalGeral ? Math.round(100 * topMedico.total / totalGeral) : 0

  // Chart data: top 8 médicos
  const chartData = medicoData.slice(0, 8).map(m => ({
    name: m.medico.split(' ').slice(0, 2).join(' '),
    total: m.total,
    pct: totalGeral ? Math.round(100 * m.total / totalGeral) : 0,
  }))

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-p3m-teal border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Produção Médica" subtitle="Exames por médico, modalidade e unidade" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="card">
          <FilterBar filters={filters} onChange={setFilters} empresas={empresas} medicos={medicos} modalidades={modalidades} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total de exames" value={fmt(totalGeral)} icon={Users} accent />
          <KpiCard label="Médicos" value={fmt(medicoData.length)} icon={Users} color="text-blue-400" />
          <KpiCard label="Médico mais produtivo" value={topMedico ? topMedico.medico.split(' ')[0] + ' ' + topMedico.medico.split(' ')[1] : '—'} sub={topMedico ? `${fmt(topMedico.total)} exames` : ''} icon={Users} color="text-p3m-teal" />
          <KpiCard
            label="Concentração top médico"
            value={`${concentracaoTop}%`}
            sub={concentracaoTop > 35 ? '⚠ Risco operacional' : 'Distribuição saudável'}
            icon={AlertTriangle}
            color={concentracaoTop > 35 ? 'text-amber-400' : 'text-emerald-400'}
          />
        </div>

        {concentracaoTop > 35 && (
          <div className="card border-amber-500/20 bg-amber-500/5 flex gap-3">
            <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/80">
              <strong>{topMedico?.medico}</strong> concentra {concentracaoTop}% de toda a produção. Risco operacional se este médico estiver indisponível.
            </p>
          </div>
        )}

        {/* Bar chart top médicos */}
        {chartData.length > 0 && (
          <div className="card">
            <p className="text-xs font-semibold text-white mb-3">Ranking de Produção — Top 8 Médicos</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#152A3A', border: '1px solid rgba(0,191,165,0.18)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(0,191,165,0.05)' }} formatter={(v, n, p) => [`${v} exames (${p.payload.pct}%)`, 'Total']} />
                <Bar dataKey="total" fill="#00BFA5" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Matriz médico × modalidade */}
        <div className="card overflow-x-auto">
          <p className="text-xs font-semibold text-white mb-3">Produção por Médico × Modalidade</p>
          {medicoData.length === 0
            ? <p className="text-xs text-p3m-muted text-center py-6">Sem dados. Faça upload de um relatório.</p>
            : <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="text-p3m-muted border-b border-p3m-border">
                    <th className="text-left pb-2 font-medium">Médico</th>
                    {MODALIDADES.filter(m => modalidades.includes(m)).map(m => (
                      <th key={m} className="text-center pb-2 font-medium w-12" style={{ color: COLORS[m] }}>{m}</th>
                    ))}
                    <th className="text-right pb-2 font-medium">Total</th>
                    <th className="text-right pb-2 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {medicoData.map(m => (
                    <tr key={m.medico} className="border-b border-p3m-border/40 table-row-hover">
                      <td className="py-1.5 text-white pr-4 max-w-[200px] truncate">{m.medico}</td>
                      {MODALIDADES.filter(mod => modalidades.includes(mod)).map(mod => (
                        <td key={mod} className="text-center py-1.5">
                          {m.por_modalidade[mod]
                            ? <span className="font-semibold" style={{ color: COLORS[mod] }}>{fmt(m.por_modalidade[mod])}</span>
                            : <span className="text-p3m-muted/30">—</span>
                          }
                        </td>
                      ))}
                      <td className="py-1.5 text-right font-semibold text-white">{fmt(m.total)}</td>
                      <td className="py-1.5 text-right text-p3m-muted">
                        {totalGeral ? `${Math.round(100 * m.total / totalGeral)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="border-t-2 border-p3m-teal/30">
                    <td className="py-2 font-semibold text-p3m-teal">TOTAL</td>
                    {MODALIDADES.filter(mod => modalidades.includes(mod)).map(mod => {
                      const sum = filtered.filter(r => r.modalidade === mod).length
                      return <td key={mod} className="text-center py-2 font-semibold text-white">{sum || '—'}</td>
                    })}
                    <td className="py-2 text-right font-bold text-p3m-teal">{fmt(totalGeral)}</td>
                    <td className="py-2 text-right text-p3m-muted">100%</td>
                  </tr>
                </tbody>
              </table>
          }
        </div>
      </div>
    </div>
  )
}
