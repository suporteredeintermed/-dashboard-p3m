import * as XLSX from 'xlsx'

// Colunas que devem ser REMOVIDAS do relatório bruto do Mobilemed
const COLS_REMOVER = new Set([
  'NOME_PACIENTE', 'CODIGO_PACIENTE', 'ACCESSION_NUMBER',
  'VALORES', 'HORA_REALIZACAO', 'DATA_TRANSFERENCIA',
  'HORA_TRANSFERENCIA',
])

// Unidade que usa EXCLUSIVAMENTE o relatório MV Saúde — ignorar no Mobilemed
const EMPRESA_MV = 'SAUDE E IMAGEM'

function parseDate(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  const s = String(val).trim()
  // DD/MM/YYYY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

function normalizeRow(raw) {
  return {
    empresa:            String(raw['EMPRESA'] || '').trim(),
    estudo_descricao:   String(raw['ESTUDO_DESCRICAO'] || '').trim(),
    modalidade:         String(raw['MODALIDADE'] || '').trim(),
    prioridade:         String(raw['PRIORIDADE'] || '').trim(),
    medico:             String(raw['MEDICO'] || '').trim(),
    duplicado:          String(raw['DUPLICADO'] || '').toLowerCase() === 'sim',
    data_realizacao:    parseDate(raw['DATA_REALIZACAO']),
    data_laudo:         parseDate(raw['DATA_LAUDO']),
    data_prazo:         parseDate(raw['DATA_PRAZO']),
    status:             String(raw['STATUS'] || '').trim(),
    segunda_assinatura: raw['SEGUNDA_ASSINATURA'] ? String(raw['SEGUNDA_ASSINATURA']).trim() : null,
  }
}

export function parseMobilemedicXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { defval: null })

        if (!raw.length) throw new Error('Planilha vazia ou sem dados na primeira aba.')

        // Validate expected columns
        const firstRow = raw[0]
        if (!('EMPRESA' in firstRow) || !('MEDICO' in firstRow)) {
          throw new Error('Planilha não parece ser do Mobilemed. Colunas EMPRESA e MEDICO não encontradas.')
        }

        const records = []
        const removidas = []
        const empresasMV = []

        for (const row of raw) {
          const empresa = String(row['EMPRESA'] || '').trim().toUpperCase()

          // Skip Saúde e Imagem — comes from MV Saúde PDF
          if (empresa.includes('SAUDE E IMAGEM') || empresa.includes('SAÚDE E IMAGEM')) {
            empresasMV.push(row)
            continue
          }

          const norm = normalizeRow(row)
          if (!norm.empresa || !norm.medico) continue
          records.push(norm)
        }

        resolve({
          records,
          totalRaw: raw.length,
          removedMV: empresasMV.length,
          colunasRemovidas: [...COLS_REMOVER],
          empresas: [...new Set(records.map(r => r.empresa))].sort(),
          medicos: [...new Set(records.map(r => r.medico).filter(Boolean))].sort(),
          modalidades: [...new Set(records.map(r => r.modalidade).filter(Boolean))].sort(),
        })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'))
    reader.readAsArrayBuffer(file)
  })
}
