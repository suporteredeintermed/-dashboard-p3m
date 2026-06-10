import { useState, useEffect, useMemo } from 'react'
import { Bell, Clock, FileX, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
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

function AlertGroup({ icon: Icon, color, title, count, severity, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const severityBg = severity === 'high' ? 'border-red-500/30 bg-red-500/5'
    : severity === 'medium' ? 'border-amber-500/30 bg-amber-500/5'
    : 'border-p3m-teal/20 bg-p3m-teal/5'

  return (
    <div className={`card border ${severityBg}`}>
      <button className="w-full flex items-center justify-between text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <Icon size={16} className={color} />
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-p3m-muted mt-0.5">{count} ocorrências</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {severity === 'high'   && <span className="badge-red">Crítico</span>}
          {severity === 'medium' && <span className="badge-amber">Atenção</span>}
          {severity === 'low'    && <span className="badge-teal">Info</span>}
          <span className="text-p3m-muted text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && count > 0 && <div className="mt-3 pt-3 border-t border-p3m-border/40">{children}</div>}
      {open && count === 0 && <p className="mt-3 pt-3 border-t border-p3m-border/40 text-xs text-p3m-muted text-center py-2">Nenhuma ocorrência neste período.</p>}
    </div>
  )
}

export default function Alertas() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = () => {
    setRefreshing(true)
    fetchExamRecords().then(setRecords).catch(console.error).finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { load() }, [])

  // 1. Laudos Não Assinados
  const naoAssinados = useMemo(() => records.filter(r => r.status === 'Não Assinado'), [records])

  // 2. Fora do prazo (DATA_LAUDO > DATA_PRAZO)
  const foraPrazo = useMemo(() =>
    records.filter(r => r.data_laudo && r.data_prazo && r.data_laudo > r.data_prazo)
      .map(r => ({ ...r, atraso: diffDays(r.data_prazo, r.data_laudo) }))
      .sort((a, b) => b.atraso - a.atraso)
  , [records])

  // 3. Turnaround > 7 dias
  const turnaroundLongo = useMemo(() =>
    records.filter(r => {
      const d = diffDays(r.data_realizacao, r.data_laudo)
      return d !== null && d > 7
    }).map(r => ({ ...r, turnaround: diffDays(r.data_realizacao, r.data_laudo) }))
      .sort((a, b) => b.turnaround - a.turnaround)
  , [records])

  // 4. Concentração por médico > 40%
  const concentracaoAlerta = useMemo(() => {
    const m = {}
    records.forEach(r => { m[r.medico] = (m[r.medico] || 0) + 1 })
    const total = records.length
    return Object.entries(m)
      .filter(([, n]) => total && n / total > 0.40)
      .map(([nome, total_medico]) => ({ nome, total_medico, pct: Math.round(100 * total_medico / total) }))
  }, [records])

  // 5. Reassinados acima da média
  const totalReass = records.filter(r => r.status === 'Reassinado').length
  const mediaReass = records.length ? (totalReass / records.length) * 100 : 0
  const reassPorEmpresa = useMemo(() => {
    const m = {}
    records.forEach(r => {
      if (!m[r.empresa]) m[r.empresa] = { total: 0, reass: 0 }
      m[r.empresa].total++
      if (r.status === 'Reassinado') m[r.empresa].reass++
    })
    return Object.entries(m)
      .map(([emp, { total, reass }]) => ({ emp, reass, pct: total ? 100 * reass / total : 0 }))
      .filter(e => e.pct > mediaReass * 1.5 && e.reass > 0)
      .sort((a, b) => b.pct - a.pct)
  }, [records, mediaReass])

  const totalAlertas = naoAssinados.length + foraPrazo.length + turnaroundLongo.length + concentracaoAlerta.length + reassPorEmpresa.length

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-p3m-teal border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Sistema de Alertas"
        subtitle={`${totalAlertas} ocorrências ativas`}
        actions={
          <button className={`btn-ghost text-xs py-1 px-3 flex items-center gap-1.5 ${refreshing ? 'opacity-50' : ''}`} onClick={load} disabled={refreshing}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Atualizar
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {totalAlertas === 0 && (
          <div className="card text-center py-12">
            <CheckCircle size={32} className="text-p3m-teal mx-auto mb-3" />
            <p className="text-white font-medium">Tudo em ordem!</p>
            <p className="text-p3m-muted text-sm mt-1">Nenhum alerta ativo no momento.</p>
          </div>
        )}

        {/* Crítico: Não assinados */}
        <AlertGroup icon={FileX} color="text-red-400" title="Laudos Não Assinados" count={naoAssinados.length} severity={naoAssinados.length > 0 ? 'high' : 'low'} defaultOpen={naoAssinados.length > 0}>
          <table className="w-full text-xs">
            <thead><tr className="text-p3m-muted border-b border-p3m-border">
              <th className="text-left pb-1.5 font-medium">Médico</th>
              <th className="text-left pb-1.5 font-medium">Exame</th>
              <th className="text-left pb-1.5 font-medium">Unidade</th>
              <th className="text-center pb-1.5 font-medium">Realização</th>
              <th className="text-center pb-1.5 font-medium">Prazo</th>
            </tr></thead>
            <tbody>{naoAssinados.slice(0, 30).map((r, i) => (
              <tr key={i} className="border-b border-p3m-border/30">
                <td className="py-1 text-white truncate max-w-[140px]">{r.medico}</td>
                <td className="py-1 text-p3m-muted truncate max-w-[160px]">{r.estudo_descricao}</td>
                <td className="py-1 text-p3m-muted truncate max-w-[120px]">{r.empresa}</td>
                <td className="py-1 text-center text-p3m-muted">{fmtDate(r.data_realizacao)}</td>
                <td className="py-1 text-center text-red-400 font-medium">{fmtDate(r.data_prazo)}</td>
              </tr>
            ))}</tbody>
          </table>
        </AlertGroup>

        {/* Alto: Fora do prazo */}
        <AlertGroup icon={Clock} color="text-amber-400" title="Laudos Fora do Prazo" count={foraPrazo.length} severity={foraPrazo.length > 100 ? 'high' : foraPrazo.length > 0 ? 'medium' : 'low'} defaultOpen={foraPrazo.length > 0 && naoAssinados.length === 0}>
          <table className="w-full text-xs">
            <thead><tr className="text-p3m-muted border-b border-p3m-border">
              <th className="text-left pb-1.5 font-medium">Médico</th>
              <th className="text-left pb-1.5 font-medium">Unidade</th>
              <th className="text-center pb-1.5 font-medium">Prazo</th>
              <th className="text-center pb-1.5 font-medium">Laudo</th>
              <th className="text-right pb-1.5 font-medium">Atraso</th>
            </tr></thead>
            <tbody>{foraPrazo.slice(0, 30).map((r, i) => (
              <tr key={i} className="border-b border-p3m-border/30">
                <td className="py-1 text-white truncate max-w-[150px]">{r.medico}</td>
                <td className="py-1 text-p3m-muted truncate max-w-[130px]">{r.empresa}</td>
                <td className="py-1 text-center text-p3m-muted">{fmtDate(r.data_prazo)}</td>
                <td className="py-1 text-center text-p3m-muted">{fmtDate(r.data_laudo)}</td>
                <td className="py-1 text-right text-amber-400 font-semibold">+{r.atraso}d</td>
              </tr>
            ))}</tbody>
          </table>
          {foraPrazo.length > 30 && <p className="text-xs text-p3m-muted text-center mt-2">Mostrando 30 de {fmt(foraPrazo.length)}. Veja todos em Prazos.</p>}
        </AlertGroup>

        {/* Médio: Turnaround longo */}
        <AlertGroup icon={AlertTriangle} color="text-orange-400" title="Turnaround Acima de 7 Dias" count={turnaroundLongo.length} severity={turnaroundLongo.length > 50 ? 'medium' : 'low'}>
          <table className="w-full text-xs">
            <thead><tr className="text-p3m-muted border-b border-p3m-border">
              <th className="text-left pb-1.5 font-medium">Médico</th>
              <th className="text-left pb-1.5 font-medium">Exame</th>
              <th className="text-center pb-1.5 font-medium">Realização</th>
              <th className="text-center pb-1.5 font-medium">Laudo</th>
              <th className="text-right pb-1.5 font-medium">Dias</th>
            </tr></thead>
            <tbody>{turnaroundLongo.slice(0, 20).map((r, i) => (
              <tr key={i} className="border-b border-p3m-border/30">
                <td className="py-1 text-white truncate max-w-[150px]">{r.medico}</td>
                <td className="py-1 text-p3m-muted truncate max-w-[160px]">{r.estudo_descricao}</td>
                <td className="py-1 text-center text-p3m-muted">{fmtDate(r.data_realizacao)}</td>
                <td className="py-1 text-center text-p3m-muted">{fmtDate(r.data_laudo)}</td>
                <td className="py-1 text-right text-orange-400 font-semibold">{r.turnaround}d</td>
              </tr>
            ))}</tbody>
          </table>
        </AlertGroup>

        {/* Info: Concentração médico */}
        {concentracaoAlerta.length > 0 && (
          <AlertGroup icon={AlertTriangle} color="text-amber-400" title="Concentração de Produção — Risco Operacional" count={concentracaoAlerta.length} severity="medium" defaultOpen>
            {concentracaoAlerta.map(m => (
              <div key={m.nome} className="flex items-center justify-between py-1.5 border-b border-p3m-border/30 last:border-0">
                <span className="text-xs text-white">{m.nome}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-p3m-muted">{fmt(m.total_medico)} laudos</span>
                  <span className="badge-amber">{m.pct}% da produção</span>
                </div>
              </div>
            ))}
            <p className="text-xs text-amber-300/70 mt-2">Médico com mais de 40% da produção total representa risco se ficar indisponível.</p>
          </AlertGroup>
        )}

        {/* Info: Reassinados acima da média */}
        {reassPorEmpresa.length > 0 && (
          <AlertGroup icon={Bell} color="text-p3m-rose" title="Taxa de Reassinatura Acima da Média" count={reassPorEmpresa.length} severity="low">
            {reassPorEmpresa.map(e => (
              <div key={e.emp} className="flex items-center justify-between py-1.5 border-b border-p3m-border/30 last:border-0">
                <span className="text-xs text-white truncate max-w-[200px]">{e.emp}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-p3m-muted">{fmt(e.reass)} reassinados</span>
                  <span className="badge-rose">{e.pct.toFixed(1)}%</span>
                </div>
              </div>
            ))}
            <p className="text-xs text-p3m-muted mt-2">Média geral: {mediaReass.toFixed(1)}% de reassinaturas.</p>
          </AlertGroup>
        )}
      </div>
    </div>
  )
}
