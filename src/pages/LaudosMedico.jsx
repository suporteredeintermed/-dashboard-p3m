import { useState, useEffect, useMemo } from 'react'
import { FileText, Search, Download } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import FilterBar from '../components/FilterBar.jsx'
import { fetchExamRecords } from '../lib/supabase.js'

const STATUS_BADGE = {
  'Assinado':     'badge-teal',
  'Reassinado':   'badge-rose',
  'Não Assinado': 'badge-red',
}

const fmt = n => n?.toLocaleString('pt-BR') ?? '—'

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function LaudosMedico() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ empresa: '', medico: '', modalidade: '', dataInicio: '', dataFim: '' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => {
    fetchExamRecords().then(setRecords).catch(console.error).finally(() => setLoading(false))
  }, [])

  const empresas    = useMemo(() => [...new Set(records.map(r => r.empresa).filter(Boolean))].sort(), [records])
  const medicos     = useMemo(() => [...new Set(records.map(r => r.medico).filter(Boolean))].sort(), [records])
  const modalidades = useMemo(() => [...new Set(records.map(r => r.modalidade).filter(Boolean))].sort(), [records])

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return records.filter(r => {
      if (filters.empresa    && r.empresa    !== filters.empresa)    return false
      if (filters.medico     && r.medico     !== filters.medico)     return false
      if (filters.modalidade && r.modalidade !== filters.modalidade) return false
      if (filters.dataInicio && r.data_realizacao < filters.dataInicio) return false
      if (filters.dataFim    && r.data_realizacao > filters.dataFim)    return false
      if (s && ![r.medico, r.estudo_descricao, r.empresa, r.modalidade].some(v => v?.toLowerCase().includes(s))) return false
      return true
    })
  }, [records, filters, search])

  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page])
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const exportCSV = () => {
    const headers = ['Empresa','Descrição','Modalidade','Prioridade','Médico','Duplicado','Realização','Data Laudo','Prazo','Status','2ª Assinatura']
    const rows = filtered.map(r => [
      r.empresa, r.estudo_descricao, r.modalidade, r.prioridade, r.medico,
      r.duplicado ? 'Sim' : 'Não', fmtDate(r.data_realizacao), fmtDate(r.data_laudo),
      fmtDate(r.data_prazo), r.status, r.segunda_assinatura || ''
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'laudos_p3m.csv'; a.click()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-p3m-teal border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Laudos por Médico"
        subtitle={`${fmt(filtered.length)} registros`}
        actions={
          <button className="btn-ghost text-xs py-1 px-3 flex items-center gap-1.5" onClick={exportCSV}>
            <Download size={12} /> Exportar CSV
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Filters + search */}
        <div className="card space-y-2">
          <FilterBar filters={filters} onChange={f => { setFilters(f); setPage(0) }} empresas={empresas} medicos={medicos} modalidades={modalidades} />
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p3m-muted" />
            <input
              className="input w-full pl-8 text-xs py-1.5"
              placeholder="Buscar por médico, exame, modalidade..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-x-auto">
          {filtered.length === 0
            ? <p className="text-xs text-p3m-muted text-center py-8">Nenhum registro encontrado.</p>
            : <>
                <table className="w-full text-xs min-w-[800px]">
                  <thead>
                    <tr className="text-p3m-muted border-b border-p3m-border">
                      <th className="text-left pb-2 font-medium">Médico</th>
                      <th className="text-left pb-2 font-medium">Exame</th>
                      <th className="text-left pb-2 font-medium">Unidade</th>
                      <th className="text-center pb-2 font-medium">Mod.</th>
                      <th className="text-center pb-2 font-medium">Prioridade</th>
                      <th className="text-center pb-2 font-medium">Realização</th>
                      <th className="text-center pb-2 font-medium">Laudo</th>
                      <th className="text-center pb-2 font-medium">Prazo</th>
                      <th className="text-center pb-2 font-medium">Status</th>
                      <th className="text-center pb-2 font-medium">2ª Ass.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r, i) => {
                      const foraDosPrazos = r.data_laudo && r.data_prazo && r.data_laudo > r.data_prazo
                      return (
                        <tr key={r.id || i} className={`border-b border-p3m-border/40 table-row-hover ${foraDosPrazos ? 'bg-amber-500/5' : ''}`}>
                          <td className="py-1.5 text-white max-w-[160px] truncate">{r.medico}</td>
                          <td className="py-1.5 text-p3m-muted max-w-[180px] truncate">{r.estudo_descricao}</td>
                          <td className="py-1.5 text-p3m-muted max-w-[140px] truncate">{r.empresa}</td>
                          <td className="py-1.5 text-center">
                            <span className="badge-teal text-[10px] px-1.5">{r.modalidade}</span>
                          </td>
                          <td className="py-1.5 text-center text-p3m-muted">{r.prioridade}</td>
                          <td className="py-1.5 text-center text-p3m-muted">{fmtDate(r.data_realizacao)}</td>
                          <td className="py-1.5 text-center text-p3m-muted">{fmtDate(r.data_laudo)}</td>
                          <td className={`py-1.5 text-center ${foraDosPrazos ? 'text-amber-400 font-semibold' : 'text-p3m-muted'}`}>
                            {fmtDate(r.data_prazo)}
                            {foraDosPrazos && ' ⚠'}
                          </td>
                          <td className="py-1.5 text-center">
                            <span className={STATUS_BADGE[r.status] || 'badge-teal'}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-1.5 text-center text-p3m-muted">
                            {r.segunda_assinatura ? <span className="text-emerald-400">✓</span> : <span className="text-p3m-border">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-p3m-border">
                    <span className="text-xs text-p3m-muted">
                      Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {fmt(filtered.length)}
                    </span>
                    <div className="flex gap-1">
                      <button className="btn-ghost text-xs py-1 px-2" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ Ant</button>
                      <span className="text-xs text-p3m-muted px-2 py-1">{page + 1}/{totalPages}</span>
                      <button className="btn-ghost text-xs py-1 px-2" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próx ›</button>
                    </div>
                  </div>
                )}
              </>
          }
        </div>
      </div>
    </div>
  )
}
