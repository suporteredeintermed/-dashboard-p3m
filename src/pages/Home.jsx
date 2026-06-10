import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { Activity, FileText, Clock, DollarSign, AlertTriangle, Users, Building2 } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import KpiCard from '../components/KpiCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import { fetchExamRecords } from '../lib/supabase.js'

const MODALIDADE_COLORS = {
  CT: '#00BFA5', MR: '#10A48A', US: '#0D7B6B',
  CR: '#378ADD', DX: '#C084B8', MG: '#F59E0B', XA: '#EF4444',
}

const fmt = n => n?.toLocaleString('pt-BR') ?? '—'
const fmtBRL = n => n != null ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

export default function Home() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ empresa: '', medico: '', modalidade: '', dataInicio: '', dataFim: '' })

  useEffect(() => {
    fetchExamRecords().then(setRecords).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filters.empresa    && r.empresa    !== filters.empresa)    return false
      if (filters.medico     && r.medico     !== filters.medico)     return false
      if (filters.modalidade && r.modalidade !== filters.modalidade) return false
      if (filters.dataInicio && r.data_realizacao < filters.dataInicio) return false
      if (filters.dataFim    && r.data_realizacao > filters.dataFim)    return false
      return true
    })
  }, [records, filters])

  const empresas    = useMemo(() => [...new Set(records.map(r => r.empresa).filter(Boolean))].sort(), [records])
  const medicos     = useMemo(() => [...new Set(records.map(r => r.medico).filter(Boolean))].sort(), [records])
  const modalidades = useMemo(() => [...new Set(records.map(r => r.modalidade).filter(Boolean))].sort(), [records])

  // KPIs
  const totalExames    = filtered.length
  const assinados      = filtered.filter(r => r.status === 'Assinado' || r.status === 'Reassinado').length
  const naoAssinados   = filtered.filter(r => r.status === 'Não Assinado').length
  const foraDosPrazos  = filtered.filter(r => r.data_laudo && r.data_prazo && r.data_laudo > r.data_prazo).length
  const reassinados    = filtered.filter(r => r.status === 'Reassinado').length
  const comSegAssin    = filtered.filter(r => r.segunda_assinatura).length
  const unicosMedicos  = new Set(filtered.map(r => r.medico)).size

  // Prod por empresa
  const porEmpresa = useMemo(() => {
    const m = {}
    filtered.forEach(r => { m[r.empresa] = (m[r.empresa] || 0) + 1 })
    return Object.entries(m).map(([name, total]) => ({ name: name.split(' ').slice(0,3).join(' '), total }))
      .sort((a, b) => b.total - a.total)
  }, [filtered])

  // Prod por modalidade
  const porModalidade = useMemo(() => {
    const m = {}
    filtered.forEach(r => { m[r.modalidade] = (m[r.modalidade] || 0) + 1 })
    return Object.entries(m).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
  }, [filtered])

  // Tendência diária (últimos 30 dias)
  const tendenciaDiaria = useMemo(() => {
    const m = {}
    filtered.forEach(r => {
      if (r.data_realizacao) m[r.data_realizacao] = (m[r.data_realizacao] || 0) + 1
    })
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, total]) => ({
      date: date.slice(5), total
    }))
  }, [filtered])

  // Top médicos
  const topMedicos = useMemo(() => {
    const m = {}
    filtered.forEach(r => { m[r.medico] = (m[r.medico] || 0) + 1 })
    return Object.entries(m).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [filtered])

  if (loading) return (
    <div className="flex items-center justify-center h-full text-p3m-muted">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-p3m-teal border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Carregando dados...</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Visão Geral" subtitle="Dashboard de produção e indicadores P3M" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Filters */}
        <div className="card">
          <FilterBar filters={filters} onChange={setFilters} empresas={empresas} medicos={medicos} modalidades={modalidades} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total de exames" value={fmt(totalExames)} icon={FileText} accent />
          <KpiCard label="Laudos assinados" value={fmt(assinados)} sub={`${totalExames ? Math.round(100*assinados/totalExames) : 0}% do total`} icon={Activity} color="text-p3m-teal" />
          <KpiCard label="Médicos ativos" value={fmt(unicosMedicos)} icon={Users} color="text-blue-400" />
          <KpiCard label="Fora do prazo" value={fmt(foraDosPrazos)} sub={`${totalExames ? Math.round(100*foraDosPrazos/totalExames) : 0}% do total`} icon={Clock} color="text-amber-400" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Não assinados" value={fmt(naoAssinados)} icon={AlertTriangle} color="text-red-400" />
          <KpiCard label="Reassinados" value={fmt(reassinados)} sub="Laudos reabertos" icon={FileText} color="text-p3m-rose" />
          <KpiCard label="Unidades" value={fmt(empresas.length)} icon={Building2} color="text-p3m-teal" />
          <KpiCard label="2ª Assinatura" value={fmt(comSegAssin)} sub={`${totalExames ? Math.round(100*comSegAssin/totalExames) : 0}% auditados`} icon={Activity} color="text-emerald-400" />
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Por empresa */}
          <div className="card">
            <p className="text-xs font-semibold text-white mb-3">Produção por Unidade</p>
            {porEmpresa.length === 0
              ? <p className="text-xs text-p3m-muted text-center py-6">Sem dados. Faça upload de um relatório.</p>
              : <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={porEmpresa} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#152A3A', border: '1px solid rgba(0,191,165,0.18)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(0,191,165,0.05)' }} />
                    <Bar dataKey="total" fill="#00BFA5" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>

          {/* Por modalidade */}
          <div className="card">
            <p className="text-xs font-semibold text-white mb-3">Produção por Modalidade</p>
            {porModalidade.length === 0
              ? <p className="text-xs text-p3m-muted text-center py-6">Sem dados.</p>
              : <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={porModalidade} margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#152A3A', border: '1px solid rgba(0,191,165,0.18)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(0,191,165,0.05)' }} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {porModalidade.map((entry) => (
                        <rect key={entry.name} fill={MODALIDADE_COLORS[entry.name] || '#00BFA5'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>
        </div>

        {/* Tendência diária */}
        {tendenciaDiaria.length > 0 && (
          <div className="card">
            <p className="text-xs font-semibold text-white mb-3">Tendência Diária de Produção</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={tendenciaDiaria} margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,191,165,0.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#152A3A', border: '1px solid rgba(0,191,165,0.18)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="total" stroke="#00BFA5" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#00BFA5' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top médicos */}
        {topMedicos.length > 0 && (
          <div className="card">
            <p className="text-xs font-semibold text-white mb-3">Top 5 Médicos por Produção</p>
            <div className="space-y-2">
              {topMedicos.map((m, i) => {
                const pct = totalExames ? Math.round(100 * m.total / totalExames) : 0
                return (
                  <div key={m.nome} className="flex items-center gap-3">
                    <span className="text-xs text-p3m-muted w-4 flex-shrink-0">#{i + 1}</span>
                    <span className="text-xs text-white flex-1 truncate">{m.nome}</span>
                    <div className="flex-1 max-w-[120px] h-1.5 bg-p3m-mid rounded-full overflow-hidden">
                      <div className="h-full bg-p3m-teal rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-white w-12 text-right">{fmt(m.total)}</span>
                    <span className="text-[10px] text-p3m-muted w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {records.length === 0 && (
          <div className="card text-center py-12">
            <FileText size={32} className="text-p3m-muted mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Nenhum dado disponível</p>
            <p className="text-p3m-muted text-sm">Vá em <strong>Upload</strong> para importar o relatório do Mobilemed ou MV Saúde.</p>
          </div>
        )}
      </div>
    </div>
  )
}
