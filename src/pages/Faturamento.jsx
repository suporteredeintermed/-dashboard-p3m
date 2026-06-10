import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import FilterBar from '../components/FilterBar.jsx'
import KpiCard from '../components/KpiCard.jsx'
import { fetchExamRecords, fetchMvRecords, fetchPricing } from '../lib/supabase.js'

const COLORS = ['#00BFA5','#10A48A','#0D7B6B','#378ADD','#C084B8','#F59E0B','#EF4444']
const fmtBRL = n => n != null ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00'
const fmt = n => n?.toLocaleString('pt-BR') ?? '0'

export default function Faturamento() {
  const [examRecords, setExamRecords] = useState([])
  const [mvRecords,   setMvRecords]   = useState([])
  const [pricing,     setPricing]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filters, setFilters] = useState({ empresa: '', modalidade: '', dataInicio: '', dataFim: '' })

  useEffect(() => {
    Promise.all([fetchExamRecords(), fetchMvRecords(), fetchPricing()])
      .then(([ex, mv, pr]) => { setExamRecords(ex); setMvRecords(mv); setPricing(pr) })
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  // Build pricing lookup: empresa+modalidade → price
  const priceMap = useMemo(() => {
    const m = {}
    pricing.forEach(p => { m[`${p.empresa}|${p.modalidade}`] = p.preco })
    return m
  }, [pricing])

  const empresas    = useMemo(() => [...new Set(examRecords.map(r => r.empresa).filter(Boolean))].sort(), [examRecords])
  const modalidades = useMemo(() => [...new Set(examRecords.map(r => r.modalidade).filter(Boolean))].sort(), [examRecords])

  // Filter exam records
  const filteredExams = useMemo(() => examRecords.filter(r => {
    if (filters.empresa    && r.empresa    !== filters.empresa)    return false
    if (filters.modalidade && r.modalidade !== filters.modalidade) return false
    if (filters.dataInicio && r.data_realizacao < filters.dataInicio) return false
    if (filters.dataFim    && r.data_realizacao > filters.dataFim)    return false
    return true
  }), [examRecords, filters])

  // Filter MV records
  const filteredMv = useMemo(() => mvRecords.filter(r => {
    if (filters.dataInicio && r.data_exame < filters.dataInicio) return false
    if (filters.dataFim    && r.data_exame > filters.dataFim)    return false
    return true
  }), [mvRecords, filters])

  // Faturamento por empresa (Mobilemed)
  const fatPorEmpresa = useMemo(() => {
    const m = {}
    filteredExams.forEach(r => {
      const price = priceMap[`${r.empresa}|${r.modalidade}`] || 0
      m[r.empresa] = (m[r.empresa] || 0) + price
    })
    return Object.entries(m).map(([name, valor]) => ({ name: name.split(' ').slice(0,3).join(' '), valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [filteredExams, priceMap])

  // Faturamento por modalidade
  const fatPorModalidade = useMemo(() => {
    const m = {}
    filteredExams.forEach(r => {
      const price = priceMap[`${r.empresa}|${r.modalidade}`] || 0
      m[r.modalidade] = (m[r.modalidade] || 0) + price
    })
    return Object.entries(m).map(([name, valor]) => ({ name, valor })).sort((a, b) => b.valor - a.valor)
  }, [filteredExams, priceMap])

  // MV Saúde por convênio
  const mvPorConvenio = useMemo(() => {
    const m = {}
    filteredMv.forEach(r => { m[r.convenio] = (m[r.convenio] || 0) + (r.vl_repasse || 0) })
    return Object.entries(m).map(([name, valor]) => ({ name, valor })).sort((a, b) => b.valor - a.valor)
  }, [filteredMv])

  const totalMobilemed = fatPorEmpresa.reduce((s, e) => s + e.valor, 0)
  const totalMvSaude   = filteredMv.reduce((s, r) => s + (r.vl_repasse || 0), 0)
  const totalGeral     = totalMobilemed + totalMvSaude

  const semPrecoCadastrado = [...new Set(
    filteredExams.filter(r => !priceMap[`${r.empresa}|${r.modalidade}`]).map(r => `${r.empresa} / ${r.modalidade}`)
  )].slice(0, 5)

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-p3m-teal border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Faturamento" subtitle="Conciliação financeira por unidade e modalidade" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="card">
          <FilterBar filters={filters} onChange={setFilters} empresas={empresas} modalidades={modalidades} />
        </div>

        {semPrecoCadastrado.length > 0 && (
          <div className="card border-amber-500/20 bg-amber-500/5 flex gap-3">
            <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-300">Preços não cadastrados — faturamento incompleto</p>
              <p className="text-xs text-amber-300/70 mt-0.5">Vá em Configuração para cadastrar: {semPrecoCadastrado.join(' · ')}</p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KpiCard label="Total Geral" value={fmtBRL(totalGeral)} icon={DollarSign} accent />
          <KpiCard label="Mobilemed (5 unidades)" value={fmtBRL(totalMobilemed)} sub={`${fmt(filteredExams.length)} exames`} icon={TrendingUp} color="text-p3m-teal" />
          <KpiCard label="MV Saúde (Saúde e Imagem)" value={fmtBRL(totalMvSaude)} sub={`${fmt(filteredMv.length)} procedimentos`} icon={DollarSign} color="text-amber-400" />
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Por empresa */}
          <div className="card">
            <p className="text-xs font-semibold text-white mb-3">Faturamento por Unidade (Mobilemed)</p>
            {fatPorEmpresa.length === 0
              ? <p className="text-xs text-p3m-muted text-center py-6">Cadastre preços em Configuração para calcular.</p>
              : <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={fatPorEmpresa} layout="vertical" margin={{ left: 0, right: 60 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#152A3A', border: '1px solid rgba(0,191,165,0.18)', borderRadius: 8, fontSize: 12 }} formatter={v => [fmtBRL(v), 'Faturamento']} cursor={{ fill: 'rgba(0,191,165,0.05)' }} />
                    <Bar dataKey="valor" fill="#00BFA5" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 9, fill: 'rgba(255,255,255,0.4)', formatter: v => fmtBRL(v) }} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>

          {/* Por modalidade */}
          <div className="card">
            <p className="text-xs font-semibold text-white mb-3">Faturamento por Modalidade</p>
            {fatPorModalidade.filter(m => m.valor > 0).length === 0
              ? <p className="text-xs text-p3m-muted text-center py-6">Cadastre preços em Configuração para calcular.</p>
              : <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={fatPorModalidade.filter(m => m.valor > 0)} cx="50%" cy="50%" outerRadius={75} dataKey="valor" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}>
                      {fatPorModalidade.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#152A3A', border: '1px solid rgba(0,191,165,0.18)', borderRadius: 8, fontSize: 12 }} formatter={v => [fmtBRL(v), 'Faturamento']} />
                  </PieChart>
                </ResponsiveContainer>
            }
          </div>
        </div>

        {/* MV Saúde por convênio */}
        {mvPorConvenio.length > 0 && (
          <div className="card">
            <p className="text-xs font-semibold text-white mb-3">MV Saúde — Receita por Convênio</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-p3m-muted border-b border-p3m-border">
                    <th className="text-left pb-2 font-medium">Convênio</th>
                    <th className="text-right pb-2 font-medium">Valor Repasse</th>
                    <th className="text-right pb-2 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {mvPorConvenio.map((c, i) => (
                    <tr key={c.name} className="border-b border-p3m-border/40 table-row-hover">
                      <td className="py-1.5 text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        {c.name}
                      </td>
                      <td className="py-1.5 text-right text-p3m-teal font-semibold">{fmtBRL(c.valor)}</td>
                      <td className="py-1.5 text-right text-p3m-muted">{totalMvSaude ? `${Math.round(100*c.valor/totalMvSaude)}%` : '—'}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-p3m-teal/30">
                    <td className="py-2 font-semibold text-p3m-teal">TOTAL MV SAÚDE</td>
                    <td className="py-2 text-right font-bold text-p3m-teal">{fmtBRL(totalMvSaude)}</td>
                    <td className="py-2 text-right text-p3m-muted">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabela consolidada por empresa */}
        <div className="card overflow-x-auto">
          <p className="text-xs font-semibold text-white mb-3">Consolidado de Faturamento</p>
          <table className="w-full text-xs min-w-[500px]">
            <thead>
              <tr className="text-p3m-muted border-b border-p3m-border">
                <th className="text-left pb-2 font-medium">Unidade</th>
                <th className="text-right pb-2 font-medium">Exames</th>
                <th className="text-right pb-2 font-medium">Faturamento</th>
                <th className="text-right pb-2 font-medium">% do total</th>
              </tr>
            </thead>
            <tbody>
              {fatPorEmpresa.map(e => (
                <tr key={e.name} className="border-b border-p3m-border/40 table-row-hover">
                  <td className="py-1.5 text-white">{e.name}</td>
                  <td className="py-1.5 text-right text-p3m-muted">{fmt(filteredExams.filter(r => r.empresa.startsWith(e.name.split(' ')[0])).length)}</td>
                  <td className="py-1.5 text-right text-p3m-teal font-semibold">{fmtBRL(e.valor)}</td>
                  <td className="py-1.5 text-right text-p3m-muted">{totalGeral ? `${Math.round(100*e.valor/totalGeral)}%` : '—'}</td>
                </tr>
              ))}
              {totalMvSaude > 0 && (
                <tr className="border-b border-p3m-border/40 table-row-hover">
                  <td className="py-1.5 text-amber-300">Saúde e Imagem (MV Saúde)</td>
                  <td className="py-1.5 text-right text-p3m-muted">{fmt(filteredMv.length)}</td>
                  <td className="py-1.5 text-right text-amber-400 font-semibold">{fmtBRL(totalMvSaude)}</td>
                  <td className="py-1.5 text-right text-p3m-muted">{totalGeral ? `${Math.round(100*totalMvSaude/totalGeral)}%` : '—'}</td>
                </tr>
              )}
              <tr className="border-t-2 border-p3m-teal/30">
                <td className="py-2 font-bold text-p3m-teal">TOTAL GERAL</td>
                <td className="py-2 text-right font-semibold text-white">{fmt(filteredExams.length + filteredMv.length)}</td>
                <td className="py-2 text-right font-bold text-p3m-teal">{fmtBRL(totalGeral)}</td>
                <td className="py-2 text-right text-p3m-muted">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
