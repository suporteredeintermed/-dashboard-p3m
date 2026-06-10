import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

function parseDate(str) {
  if (!str) return null
  const m = String(str).match(/(\d{2})\/(\d{2})\/(\d{2,4})/)
  if (!m) return null
  const year = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${year}-${m[2]}-${m[1]}`
}

function parseBRL(str) {
  if (!str) return 0
  const clean = String(str).replace(/\./g, '').replace(',', '.')
  const val = parseFloat(clean)
  return isNaN(val) ? 0 : val
}

// Detect report header info
function extractHeader(lines) {
  const info = { competencia: null, medico: null, descricao: null, dataRepasse: null }
  for (const line of lines) {
    const compMatch = line.match(/Compet[eê]ncia:\s*(\d{2}\/\d{4})/i)
    if (compMatch) info.competencia = compMatch[1]

    const medicoMatch = line.match(/Prestador:\s*\d+\s*-\s*(.+)/)
    if (medicoMatch) info.medico = medicoMatch[1].trim()

    const descMatch = line.match(/Descri[cç][aã]o:(.+?)(?:Grupo|$)/i)
    if (descMatch) info.descricao = descMatch[1].trim()

    const repMatch = line.match(/Dt\.\s*Repasse:(\d{2}\/\d{2}\/\d{4})/)
    if (repMatch) info.dataRepasse = repMatch[1]
  }
  return info
}

// Each data line looks like:
// [remessa] [conta] [atend] NOME CP [ATIVIDADE] CONVENIO DD/MM/YY 1 [QT.CH] VL_TOTAL
// We detect lines that end with a number (the value)
function parseDataLine(line, currentProcedimento) {
  // Lines with total values end with a decimal number like 13,75 or 3.016,48
  const valMatch = line.match(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/)
  if (!valMatch) return null

  // Skip total lines
  if (/^Total\s/i.test(line.trim())) return null

  const vl_total = parseBRL(valMatch[1])

  // Extract date DD/MM/YY or DD/MM/YYYY
  const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{2,4})/)
  const data_exame = dateMatch ? parseDate(dateMatch[1]) : null

  // Extract convênio — known list
  const convMatch = line.match(/(AMOR SAUDE|PARTICULAR|IASEP|UNIMED BELEM|GRUPO LIDER|SUL AMERICA|CSI\s*-?\s*CON[VW]?[ÊE]NIO|CLIMILE|CLIBEN|MED\s*\+|HAPVIDA|BRADESCO|UNIMED|IASEP)/i)
  const convenio = convMatch ? convMatch[1].trim().toUpperCase() : 'OUTROS'

  if (!data_exame || vl_total <= 0) return null

  return {
    procedimento_cod:  currentProcedimento?.cod || null,
    procedimento_desc: currentProcedimento?.desc || null,
    convenio,
    data_exame,
    quantidade: 1,
    vl_repasse: vl_total, // Vl.Total no PDF = receita da P3M (Vl.Repasse)
    vl_total,
  }
}

export async function parseMvSaudePDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const pdfData = new Uint8Array(e.target.result)
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise

        const allLines = []
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p)
          const content = await page.getTextContent()
          const pageText = content.items.map(i => i.str).join(' ')
          allLines.push(...pageText.split(/\n/).map(l => l.trim()).filter(Boolean))
        }

        // Also get full text per page as single string for line detection
        const fullLines = []
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p)
          const content = await page.getTextContent()

          // Group items by approximate Y position to reconstruct lines
          const items = content.items
          const byY = {}
          for (const item of items) {
            const y = Math.round(item.transform[5])
            if (!byY[y]) byY[y] = []
            byY[y].push(item.str)
          }
          const ys = Object.keys(byY).map(Number).sort((a, b) => b - a)
          for (const y of ys) {
            fullLines.push(byY[y].join(' ').trim())
          }
        }

        const header = extractHeader(fullLines)
        if (!header.medico) throw new Error('Não foi possível identificar o médico no PDF. Verifique se é um relatório do MV Saúde (SoulMV).')

        const records = []
        let currentProcedimento = null

        for (const line of fullLines) {
          if (!line) continue

          // Detect procedimento line: "Procedimento: 40801063 - SEIOS DA FACE"
          const procMatch = line.match(/Procedimento:\s*(\d+)\s*-\s*(.+)/i)
          if (procMatch) {
            currentProcedimento = { cod: procMatch[1], desc: procMatch[2].trim() }
            continue
          }

          const record = parseDataLine(line, currentProcedimento)
          if (record) {
            records.push({
              ...record,
              medico: header.medico,
              competencia: header.competencia,
            })
          }
        }

        // Extract grand total
        let totalRepasse = 0
        for (const line of fullLines) {
          const totalMatch = line.match(/Total\s+(?:Geral\s+do\s+Repasse|do\s+Repasse):\s*([\d.,]+)/i)
          if (totalMatch) {
            totalRepasse = parseBRL(totalMatch[1])
            break
          }
        }

        // If no records parsed from lines, try fallback with totals
        if (records.length === 0) {
          throw new Error('Nenhum registro extraído do PDF. O formato pode ter mudado. Verifique o arquivo.')
        }

        resolve({
          records,
          medico: header.medico,
          competencia: header.competencia,
          descricao: header.descricao,
          totalRepasse: records.reduce((s, r) => s + r.vl_repasse, 0),
          totalBruto: totalRepasse || records.reduce((s, r) => s + r.vl_total, 0),
          procedimentos: [...new Set(records.map(r => r.procedimento_desc).filter(Boolean))],
          convenios: [...new Set(records.map(r => r.convenio))],
        })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler o PDF.'))
    reader.readAsArrayBuffer(file)
  })
}
