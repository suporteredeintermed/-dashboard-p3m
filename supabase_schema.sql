-- ============================================================
-- Dashboard P3M — Schema Supabase
-- Execute este SQL no painel do Supabase:
-- SQL Editor → New Query → Cole tudo → Run
-- ============================================================

-- Laudos do Mobilemed (todas as unidades exceto Saúde e Imagem)
CREATE TABLE IF NOT EXISTS exam_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            UUID,
  empresa             TEXT NOT NULL,
  estudo_descricao    TEXT,
  modalidade          TEXT,
  prioridade          TEXT,
  medico              TEXT,
  duplicado           BOOLEAN DEFAULT false,
  data_realizacao     DATE,
  data_laudo          DATE,
  data_prazo          DATE,
  status              TEXT,
  segunda_assinatura  TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_empresa        ON exam_records(empresa);
CREATE INDEX IF NOT EXISTS idx_exam_medico         ON exam_records(medico);
CREATE INDEX IF NOT EXISTS idx_exam_modalidade     ON exam_records(modalidade);
CREATE INDEX IF NOT EXISTS idx_exam_data_realizacao ON exam_records(data_realizacao);
CREATE INDEX IF NOT EXISTS idx_exam_batch          ON exam_records(batch_id);

-- Dados do MV Saúde PDF (exclusivo Saúde e Imagem)
CREATE TABLE IF NOT EXISTS mv_saude_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID,
  competencia     TEXT,
  medico          TEXT,
  procedimento_cod TEXT,
  procedimento_desc TEXT,
  convenio        TEXT,
  data_exame      DATE,
  quantidade      INTEGER DEFAULT 1,
  vl_repasse      NUMERIC(10,2),
  vl_total        NUMERIC(10,2),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mv_medico   ON mv_saude_records(medico);
CREATE INDEX IF NOT EXISTS idx_mv_convenio ON mv_saude_records(convenio);
CREATE INDEX IF NOT EXISTS idx_mv_data     ON mv_saude_records(data_exame);
CREATE INDEX IF NOT EXISTS idx_mv_batch    ON mv_saude_records(batch_id);

-- Tabela de preços contratuais por unidade × modalidade
CREATE TABLE IF NOT EXISTS pricing (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa     TEXT NOT NULL,
  modalidade  TEXT NOT NULL,
  preco       NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa, modalidade)
);

-- SLA por prioridade (dias ou horas)
CREATE TABLE IF NOT EXISTS sla_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prioridade  TEXT NOT NULL UNIQUE,
  valor       NUMERIC(6,1) NOT NULL,
  unidade     TEXT NOT NULL DEFAULT 'dias',  -- 'horas' ou 'dias'
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Valores padrão de SLA
INSERT INTO sla_config (prioridade, valor, unidade) VALUES
  ('Rotina',      5,   'dias'),
  ('Urgência',    24,  'horas'),
  ('Internado',   48,  'horas'),
  ('Ambulatório', 5,   'dias'),
  ('Emergência',  4,   'horas')
ON CONFLICT (prioridade) DO NOTHING;

-- Histórico de uploads
CREATE TABLE IF NOT EXISTS upload_batches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte       TEXT NOT NULL,  -- 'mobilemed' | 'mv_saude'
  filename    TEXT,
  competencia TEXT,
  qtd_registros INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS (Row Level Security) mas liberar acesso para anon
-- (ajuste conforme sua necessidade de autenticação futura)
ALTER TABLE exam_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mv_saude_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_batches   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read"  ON exam_records     FOR SELECT USING (true);
CREATE POLICY "public write" ON exam_records     FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete" ON exam_records    FOR DELETE USING (true);

CREATE POLICY "public read"  ON mv_saude_records FOR SELECT USING (true);
CREATE POLICY "public write" ON mv_saude_records FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete" ON mv_saude_records FOR DELETE USING (true);

CREATE POLICY "public read"  ON pricing          FOR SELECT USING (true);
CREATE POLICY "public write" ON pricing          FOR ALL   USING (true);

CREATE POLICY "public read"  ON sla_config       FOR SELECT USING (true);
CREATE POLICY "public write" ON sla_config       FOR ALL   USING (true);

CREATE POLICY "public read"  ON upload_batches   FOR SELECT USING (true);
CREATE POLICY "public write" ON upload_batches   FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete" ON upload_batches  FOR DELETE USING (true);
