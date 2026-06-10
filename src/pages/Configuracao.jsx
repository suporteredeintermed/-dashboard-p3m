import { useState, useEffect, useMemo } from 'react'
import { Save, Settings, DollarSign, Clock, History, Trash2 } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import { fetchPricing, upsertPricing, fetchSlaConfig, upsertSlaConfig, fetchBatches, deleteBatch, deleteExamBatch, fetchExamRecords } from '../lib/supabase.js'

const MODALIDADES = ['CR', 'CT', 'DX', 'MG', 'MR', 'US', 'XA']
const EMPRESAS = [
  'Policlínica Metropolitana de Belém',
  'Hospital Regional de Marabá - MICROLILOS',
  'Unidade Móvel de Saúde',
  'Hospital Oncológico Infantil Otávio Lobo',
  'Hospital Oncológico Infantil Emergência',
]

const fmtBRL = v => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'
const fmt = n => n?.toLocaleString('pt-BR') ?? '0'

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active ? 'bg-p3m-teal/15 text-p3m-teal' : 'text-p3m-muted hover:text-white'}`}
    >
      {label}
    </button>
  )
}

export default function Configuracao() {
  const [tab, setTab] = useState('pricing')
  const [pricing, setPricing] = useState({})   // { "empresa|modalidade": price }
  const [sla, setSla] = useState({})            // { "Rotina": { valor, unidade } }
  const [batches, setBatches] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchPricing(), fetchSlaConfig(), fetchBatches()])
      .then(([pr, sl, bt]) => {
        const pm = {}; pr.forEach(p => { pm[`${p.empresa}|${p.modalidade}`] = p.preco })
        const sm = {}; sl.forEach(s => { sm[s.prioridade] = { valor: s.valor, unidade: s.unidade } })
        setPricing(pm); setSla(sm); setBatches(bt)
      }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const setPriceVal = (empresa, modalidade, value) => {
    const key = `${empresa}|${modalidade}`
    const num = parseFloat(String(value).replace(',', '.'))
    setPricing(prev => ({ ...prev, [key]: isNaN(num) ? 0 : num }))
  }

  const savePricing = async () => {
    setSaving(true); setSaved(false)
    try {
      const rows = []
      EMPRESAS.forEach(emp => {
        MODALIDADES.forEach(mod => {
          const key = `${emp}|${mod}`
          if (pricing[key] != null) rows.push({ empresa: emp, modalidade: mod, preco: pricing[key] })
        })
      })
      await upsertPricing(rows)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (err) { alert('Erro ao salvar: ' + err.message) }
    setSaving(false)
  }

  const saveSla = async () => {
    setSaving(true)
    try {
      const rows = Object.entries(sla).map(([prioridade, { valor, unidade }]) => ({ prioridade, valor: parseFloat(valor), unidade }))
      await upsertSlaConfig(rows)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (err) { alert('Erro ao salvar: ' + err.message) }
    setSaving(false)
  }

  const handleDeleteBatch = async (batch) => {
    if (!confirm(`Remover upload "${batch.filename}"?`)) return
    try {
      if (batch.fonte === 'mobilemed') await deleteExamBatch(batch.id)
      await deleteBatch(batch.id)
      setBatches(prev => prev.filter(b => b.id !== batch.id))
    } catch (err) { alert('Erro: ' + err.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-7 h-7 border-2 border-p3m-teal border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Configuração" subtitle="Preços contratuais, SLA e histórico de dados" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1">
          <Tab label="Tabela de Preços" active={tab === 'pricing'} onClick={() => setTab('pricing')} />
          <Tab label="SLA por Prioridade" active={tab === 'sla'} onClick={() => setTab('sla')} />
          <Tab label="Histórico de Uploads" active={tab === 'history'} onClick={() => setTab('history')} />
        </div>

        {/* Pricing tab */}
        {tab === 'pricing' && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-2"><DollarSign size={14} className="text-p3m-teal" /> Tabela de Preços por Unidade × Modalidade</p>
                <p className="text-xs text-p3m-muted mt-0.5">Preço em R$ por exame laudado. Usado para calcular o faturamento.</p>
              </div>
              <button className="btn-primary flex items-center gap-2" onClick={savePricing} disabled={saving}>
                <Save size={13} />{saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="text-p3m-muted border-b border-p3m-border">
                    <th className="text-left pb-2 font-medium">Unidade</th>
                    {MODALIDADES.map(m => <th key={m} className="text-center pb-2 font-medium w-20">{m}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {EMPRESAS.map(emp => (
                    <tr key={emp} className="border-b border-p3m-border/40">
                      <td className="py-2 text-white pr-4 text-xs max-w-[200px]">{emp}</td>
                      {MODALIDADES.map(mod => {
                        const key = `${emp}|${mod}`
                        return (
                          <td key={mod} className="py-1.5 px-1 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="input w-full text-center text-xs py-1 px-2"
                              value={pricing[key] ?? ''}
                              onChange={e => setPriceVal(emp, mod, e.target.value)}
                              placeholder="0,00"
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-p3m-muted">💡 Saúde e Imagem usa dados do MV Saúde PDF — o valor de repasse já vem calculado no PDF.</p>
          </div>
        )}

        {/* SLA tab */}
        {tab === 'sla' && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-2"><Clock size={14} className="text-p3m-teal" /> SLA por Prioridade</p>
                <p className="text-xs text-p3m-muted mt-0.5">Tempo máximo para emitir o laudo após realização do exame.</p>
              </div>
              <button className="btn-primary flex items-center gap-2" onClick={saveSla} disabled={saving}>
                <Save size={13} />{saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>

            <div className="space-y-3">
              {['Rotina', 'Urgência', 'Internado', 'Ambulatório', 'Emergência'].map(pri => {
                const cfg = sla[pri] || { valor: '', unidade: 'dias' }
                return (
                  <div key={pri} className="flex items-center gap-4 py-2 border-b border-p3m-border/40">
                    <span className="text-sm text-white w-28 flex-shrink-0">{pri}</span>
                    <input
                      type="number"
                      min="0"
                      className="input w-24 text-center"
                      value={cfg.valor}
                      onChange={e => setSla(prev => ({ ...prev, [pri]: { ...cfg, valor: e.target.value } }))}
                    />
                    <select
                      className="select"
                      value={cfg.unidade}
                      onChange={e => setSla(prev => ({ ...prev, [pri]: { ...cfg, unidade: e.target.value } }))}
                    >
                      <option value="horas">horas</option>
                      <option value="dias">dias</option>
                    </select>
                    <span className="text-xs text-p3m-muted">
                      {cfg.valor && `Máximo: ${cfg.valor} ${cfg.unidade} após realização`}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-p3m-muted">💡 O campo DATA_PRAZO do Mobilemed já calcula o prazo por exame. Este SLA é exibido como referência no dashboard de Prazos.</p>
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div className="card">
            <p className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><History size={14} className="text-p3m-teal" /> Histórico de Uploads</p>
            {batches.length === 0
              ? <p className="text-xs text-p3m-muted text-center py-6">Nenhum upload realizado ainda.</p>
              : <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-p3m-muted border-b border-p3m-border">
                        <th className="text-left pb-2 font-medium">Fonte</th>
                        <th className="text-left pb-2 font-medium">Arquivo</th>
                        <th className="text-left pb-2 font-medium">Competência</th>
                        <th className="text-right pb-2 font-medium">Registros</th>
                        <th className="text-right pb-2 font-medium">Data upload</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map(b => (
                        <tr key={b.id} className="border-b border-p3m-border/40 table-row-hover">
                          <td className="py-2">
                            <span className={b.fonte === 'mv_saude' ? 'badge-amber' : 'badge-teal'}>
                              {b.fonte === 'mobilemed' ? 'Mobilemed' : 'MV Saúde'}
                            </span>
                          </td>
                          <td className="py-2 text-p3m-muted max-w-[220px] truncate">{b.filename}</td>
                          <td className="py-2 text-p3m-muted">{b.competencia || '—'}</td>
                          <td className="py-2 text-right text-white">{fmt(b.qtd_registros)}</td>
                          <td className="py-2 text-right text-p3m-muted">{new Date(b.created_at).toLocaleString('pt-BR')}</td>
                          <td className="py-2 text-right">
                            <button onClick={() => handleDeleteBatch(b)} className="text-p3m-muted hover:text-red-400 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        )}
      </div>
    </div>
  )
}
