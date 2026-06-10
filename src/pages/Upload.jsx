import { useState, useRef, useEffect } from 'react'
import { Upload as UploadIcon, FileSpreadsheet, FileText, CheckCircle, XCircle, Trash2, AlertTriangle } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import { parseMobilemedicXLSX } from '../lib/excelParser.js'
import { parseMvSaudePDF } from '../lib/pdfParser.js'
import { insertExamRecords, insertMvRecords, insertBatch, fetchBatches, deleteBatch, deleteExamBatch } from '../lib/supabase.js'

function DropZone({ accept, label, icon: Icon, color, onFile, loading }) {
  const ref = useRef()
  const [dragging, setDragging] = useState(false)

  const handleDrop = e => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
        ${dragging ? 'border-p3m-teal bg-p3m-teal/5' : 'border-p3m-border hover:border-p3m-teal/50'}
        ${loading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onClick={() => ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      <Icon size={36} className={`mx-auto mb-3 ${color}`} />
      <p className="text-sm font-medium text-white mb-1">{label}</p>
      <p className="text-xs text-p3m-muted">Arraste o arquivo ou clique para selecionar</p>
    </div>
  )
}

function ResultCard({ result, type }) {
  if (!result) return null
  const isError = result.error
  return (
    <div className={`card border ${isError ? 'border-red-500/30 bg-red-500/5' : 'border-p3m-teal/30 bg-p3m-teal/5'}`}>
      <div className="flex items-start gap-3">
        {isError
          ? <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          : <CheckCircle size={18} className="text-p3m-teal flex-shrink-0 mt-0.5" />
        }
        <div className="flex-1 min-w-0">
          {isError
            ? <p className="text-sm text-red-400 whitespace-pre-line">{result.error}</p>
            : type === 'mobilemed'
              ? <>
                  <p className="text-sm font-medium text-white">{result.totalRaw?.toLocaleString('pt-BR')} linhas processadas</p>
                  <p className="text-xs text-p3m-muted mt-0.5">{result.records?.length?.toLocaleString('pt-BR')} registros importados · {result.removedMV} ignorados (Saúde e Imagem)</p>
                  <p className="text-xs text-p3m-muted">Unidades: {result.empresas?.join(', ')}</p>
                  <p className="text-xs text-p3m-muted">Colunas removidas: {result.colunasRemovidas?.join(', ')}</p>
                </>
              : <>
                  <p className="text-sm font-medium text-white">PDF processado — {result.medico}</p>
                  <p className="text-xs text-p3m-muted mt-0.5">Competência: {result.competencia} · {result.records?.length} procedimentos</p>
                  <p className="text-xs text-p3m-muted">Receita P3M: R$ {result.totalRepasse?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-p3m-muted">Convênios: {result.convenios?.join(', ')}</p>
                </>
          }
        </div>
      </div>
    </div>
  )
}

export default function Upload() {
  const [mobiResult, setMobiResult]   = useState(null)
  const [mvResult,   setMvResult]     = useState(null)
  const [mobiLoading, setMobiLoading] = useState(false)
  const [mvLoading,   setMvLoading]   = useState(false)
  const [batches,    setBatches]      = useState([])
  const [loadingBatches, setLoadingBatches] = useState(false)

  const loadBatches = () => {
    setLoadingBatches(true)
    fetchBatches().then(setBatches).catch(console.error).finally(() => setLoadingBatches(false))
  }

  useEffect(() => { loadBatches() }, [])

  function friendlyError(err) {
    const msg = err?.message || String(err)
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch'))
      return '❌ Erro de conexão com o banco de dados.\n\nPasso obrigatório: execute o arquivo supabase_schema.sql no painel do Supabase (SQL Editor → New Query → cole o conteúdo → Run), depois tente novamente.'
    if (msg.includes('relation') && msg.includes('does not exist'))
      return '❌ Tabelas não encontradas no Supabase.\n\nExecute o supabase_schema.sql no SQL Editor do Supabase antes de fazer upload.'
    if (msg.includes('JWT') || msg.includes('unauthorized') || msg.includes('401'))
      return '❌ Credenciais do Supabase inválidas. Verifique a chave anon em src/lib/supabase.js.'
    return '❌ ' + msg
  }

  const handleMobilemed = async (file) => {
    setMobiLoading(true); setMobiResult(null)
    try {
      const result = await parseMobilemedicXLSX(file)
      const batch = await insertBatch({ fonte: 'mobilemed', filename: file.name, qtd_registros: result.records.length })
      await insertExamRecords(result.records.map(r => ({ ...r, batch_id: batch.id })))
      setMobiResult(result)
      loadBatches()
    } catch (err) {
      setMobiResult({ error: friendlyError(err) })
    } finally {
      setMobiLoading(false)
    }
  }

  const handleMvSaude = async (file) => {
    setMvLoading(true); setMvResult(null)
    try {
      const result = await parseMvSaudePDF(file)
      const batch = await insertBatch({ fonte: 'mv_saude', filename: file.name, competencia: result.competencia, qtd_registros: result.records.length })
      await insertMvRecords(result.records.map(r => ({ ...r, batch_id: batch.id })))
      setMvResult(result)
      loadBatches()
    } catch (err) {
      setMvResult({ error: friendlyError(err) })
    } finally {
      setMvLoading(false)
    }
  }

  const handleDeleteBatch = async (batch) => {
    if (!confirm(`Remover upload "${batch.filename}"? Os dados serão apagados do banco.`)) return
    try {
      if (batch.fonte === 'mobilemed') await deleteExamBatch(batch.id)
      await deleteBatch(batch.id)
      loadBatches()
    } catch (err) {
      alert('Erro ao remover: ' + err.message)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Upload de Relatórios" subtitle="Importe planilhas Mobilemed ou PDFs do MV Saúde" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Alertas */}
        <div className="card border-amber-500/20 bg-amber-500/5 flex gap-3">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-300/80 space-y-0.5">
            <p><strong>Regra Saúde e Imagem:</strong> Dados desta unidade são automaticamente ignorados no Mobilemed. Use sempre o PDF do MV Saúde para ela.</p>
            <p><strong>Colunas removidas automaticamente:</strong> NOME_PACIENTE, CODIGO_PACIENTE, ACCESSION_NUMBER, VALORES, HORA_REALIZACAO, DATA_TRANSFERENCIA, HORA_TRANSFERENCIA.</p>
          </div>
        </div>

        {/* Drop zones */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <DropZone
              accept=".xlsx,.xls"
              label="Relatório Mobilemed (.xlsx)"
              icon={FileSpreadsheet}
              color="text-emerald-400"
              onFile={handleMobilemed}
              loading={mobiLoading}
            />
            {mobiLoading && <div className="text-center text-xs text-p3m-muted animate-pulse">Processando planilha...</div>}
            <ResultCard result={mobiResult} type="mobilemed" />
          </div>

          <div className="space-y-3">
            <DropZone
              accept=".pdf"
              label="Relatório MV Saúde (.pdf) — Saúde e Imagem"
              icon={FileText}
              color="text-amber-400"
              onFile={handleMvSaude}
              loading={mvLoading}
            />
            {mvLoading && <div className="text-center text-xs text-p3m-muted animate-pulse">Processando PDF...</div>}
            <ResultCard result={mvResult} type="mv_saude" />
          </div>
        </div>

        {/* Histórico */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-white">Histórico de Uploads</p>
            <button className="btn-ghost text-xs py-1 px-3" onClick={loadBatches}>Atualizar</button>
          </div>
          {loadingBatches
            ? <p className="text-xs text-p3m-muted text-center py-4">Carregando...</p>
            : batches.length === 0
              ? <p className="text-xs text-p3m-muted text-center py-4">Nenhum upload realizado ainda.</p>
              : <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-p3m-muted border-b border-p3m-border">
                        <th className="text-left pb-2 font-medium">Fonte</th>
                        <th className="text-left pb-2 font-medium">Arquivo</th>
                        <th className="text-left pb-2 font-medium">Competência</th>
                        <th className="text-right pb-2 font-medium">Registros</th>
                        <th className="text-right pb-2 font-medium">Data</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map(b => (
                        <tr key={b.id} className="border-b border-p3m-border/40 table-row-hover">
                          <td className="py-2">
                            <span className={`badge-teal ${b.fonte === 'mv_saude' ? 'text-amber-400 bg-amber-400/10 border-amber-400/30' : ''}`}>
                              {b.fonte === 'mobilemed' ? 'Mobilemed' : 'MV Saúde'}
                            </span>
                          </td>
                          <td className="py-2 text-p3m-muted max-w-[200px] truncate">{b.filename}</td>
                          <td className="py-2 text-p3m-muted">{b.competencia || '—'}</td>
                          <td className="py-2 text-right text-white">{b.qtd_registros?.toLocaleString('pt-BR')}</td>
                          <td className="py-2 text-right text-p3m-muted">{new Date(b.created_at).toLocaleDateString('pt-BR')}</td>
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
      </div>
    </div>
  )
}
