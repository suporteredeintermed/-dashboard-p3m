import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zbwejouakcyfhhvreshb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpid2Vqb3Vha2N5ZmhodnJlc2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjcyNTYsImV4cCI6MjA5NjY0MzI1Nn0.qowD8qOh_DqIe_V2BDj8zWBp77KHGnX0h71wzxS_kPo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Exam Records (Mobilemed) ─────────────────────────────────────────────────

export async function insertExamRecords(records) {
  const { error } = await supabase.from('exam_records').insert(records)
  if (error) throw error
}

export async function fetchExamRecords({ empresa, medico, modalidade, status, dataInicio, dataFim } = {}) {
  let q = supabase.from('exam_records').select('*').order('data_realizacao', { ascending: false })
  if (empresa)    q = q.eq('empresa', empresa)
  if (medico)     q = q.eq('medico', medico)
  if (modalidade) q = q.eq('modalidade', modalidade)
  if (status)     q = q.eq('status', status)
  if (dataInicio) q = q.gte('data_realizacao', dataInicio)
  if (dataFim)    q = q.lte('data_realizacao', dataFim)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function deleteExamBatch(batchId) {
  const { error } = await supabase.from('exam_records').delete().eq('batch_id', batchId)
  if (error) throw error
}

// ── MV Saúde Records ────────────────────────────────────────────────────────

export async function insertMvRecords(records) {
  const { error } = await supabase.from('mv_saude_records').insert(records)
  if (error) throw error
}

export async function fetchMvRecords({ medico, convenio, dataInicio, dataFim } = {}) {
  let q = supabase.from('mv_saude_records').select('*').order('data_exame', { ascending: false })
  if (medico)     q = q.eq('medico', medico)
  if (convenio)   q = q.eq('convenio', convenio)
  if (dataInicio) q = q.gte('data_exame', dataInicio)
  if (dataFim)    q = q.lte('data_exame', dataFim)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

// ── Pricing ─────────────────────────────────────────────────────────────────

export async function fetchPricing() {
  const { data, error } = await supabase.from('pricing').select('*').order('empresa').order('modalidade')
  if (error) throw error
  return data || []
}

export async function upsertPricing(rows) {
  const { error } = await supabase.from('pricing').upsert(rows, { onConflict: 'empresa,modalidade' })
  if (error) throw error
}

// ── SLA Config ───────────────────────────────────────────────────────────────

export async function fetchSlaConfig() {
  const { data, error } = await supabase.from('sla_config').select('*')
  if (error) throw error
  return data || []
}

export async function upsertSlaConfig(rows) {
  const { error } = await supabase.from('sla_config').upsert(rows, { onConflict: 'prioridade' })
  if (error) throw error
}

// ── Upload Batches ───────────────────────────────────────────────────────────

export async function insertBatch(batch) {
  const { data, error } = await supabase.from('upload_batches').insert(batch).select().single()
  if (error) throw error
  return data
}

export async function fetchBatches() {
  const { data, error } = await supabase.from('upload_batches').select('*').order('created_at', { ascending: false }).limit(50)
  if (error) throw error
  return data || []
}

export async function deleteBatch(id) {
  const { error } = await supabase.from('upload_batches').delete().eq('id', id)
  if (error) throw error
}
