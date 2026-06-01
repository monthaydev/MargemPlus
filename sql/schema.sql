-- ================================================================
-- MARGEM+ — SCHEMA DEFINITIVO v10
-- Última atualização: 2026-05-27
--
-- INSTRUÇÕES:
--   Cole este arquivo INTEIRO no SQL Editor do Supabase e clique Run.
--   É seguro rodar múltiplas vezes (idempotente via DROP CASCADE).
--   Após rodar: abra o app e cadastre-se como Dono.
--
-- HISTÓRICO CONSOLIDADO:
--   v1–v6 — Fundação: empresas, perfis, cargos, produtos, compras,
--            estoques, financas_semanais, saidas_avulsas, lotes FEFO,
--            canais de venda, fichas técnicas, vendas_pratos,
--            3 motores premium (ruptura, compras, cardápio BCG).
--   v7    — RESET TOTAL: limpa auth.users. Plano default = 'completo'.
--   v8    — empresas: +senha_desbloqueio, +imposto_padrao_pct,
--            +dias_alerta_lote.
--   v9    — Nova tabela locais_estoque (almoxarifado/cozinha/outro).
--            lotes: +local_id FK para locais_estoque.
--   v10   — 3 Motores turbinados:
--            • previsao_ruptura: média ponderada, tendência, data_ruptura,
--              confiança, risco_perda (FEFO cruzado).
--            • plano_compras: parâmetro p_dias_cobertura, is_perecivel,
--              dias_cobertura_efetiva.
--            • engenharia_cardapio: preco_sugerido via Markup Divisor.
--   v11   — lotes_em_risco turbinado: nome/unidade do insumo, número do
--            lote, local, valor_em_risco (R$) e severidade (vencido/
--            crítico/alerta). Migração: sql/migracao-lotes-em-risco.sql.
--   v12   — Hardening (PARTE 17): PIN com hash bcrypt + validação no
--            servidor, cadastro de funcionário sem brecha de privilégio,
--            INSERT direto fechado em empresas/perfis, CHECKs de
--            integridade e RPC salvar_contagem atômica.
--            Migração: sql/migracao-hardening.sql.
-- ================================================================


-- ================================================================
-- PARTE 0: LIMPEZA TOTAL
-- ================================================================

DELETE FROM auth.users;

DROP TABLE IF EXISTS vendas_pratos          CASCADE;
DROP TABLE IF EXISTS transferencias_estoque CASCADE;
DROP TABLE IF EXISTS lotes                  CASCADE;
DROP TABLE IF EXISTS locais_estoque         CASCADE;
DROP TABLE IF EXISTS ficha_ingredientes     CASCADE;
DROP TABLE IF EXISTS fichas_tecnicas        CASCADE;
DROP TABLE IF EXISTS canais_venda           CASCADE;
DROP TABLE IF EXISTS saidas_avulsas         CASCADE;
DROP TABLE IF EXISTS financas_semanais      CASCADE;
DROP TABLE IF EXISTS estoques               CASCADE;
DROP TABLE IF EXISTS compras                CASCADE;
DROP TABLE IF EXISTS produtos               CASCADE;
DROP TABLE IF EXISTS cargos                 CASCADE;
DROP TABLE IF EXISTS perfis                 CASCADE;
DROP TABLE IF EXISTS empresas               CASCADE;

DROP FUNCTION IF EXISTS minha_empresa_id()                                           CASCADE;
DROP FUNCTION IF EXISTS sou_dono()                                                   CASCADE;
DROP FUNCTION IF EXISTS set_empresa_id()                                             CASCADE;
DROP FUNCTION IF EXISTS validar_codigo_convite(TEXT)                                 CASCADE;
DROP FUNCTION IF EXISTS criar_conta_dono(TEXT, TEXT)                                 CASCADE;
DROP FUNCTION IF EXISTS criar_conta_funcionario(TEXT, TEXT)                          CASCADE;
DROP FUNCTION IF EXISTS definir_pin_desbloqueio(TEXT)                                CASCADE;
DROP FUNCTION IF EXISTS remover_pin_desbloqueio()                                    CASCADE;
DROP FUNCTION IF EXISTS validar_pin_desbloqueio(TEXT)                                CASCADE;
DROP FUNCTION IF EXISTS salvar_contagem(TEXT, DATE, DATE, JSONB)                     CASCADE;
DROP FUNCTION IF EXISTS salvar_ficha_ingredientes(UUID, JSONB)                       CASCADE;
DROP FUNCTION IF EXISTS seed_empresa_defaults(UUID)                                  CASCADE;
DROP FUNCTION IF EXISTS lotes_em_risco(INT)                                          CASCADE;
DROP FUNCTION IF EXISTS previsao_ruptura_estoque()                                   CASCADE;
DROP FUNCTION IF EXISTS plano_compras_inteligente()                                  CASCADE;
DROP FUNCTION IF EXISTS plano_compras_inteligente(INT)                               CASCADE;
DROP FUNCTION IF EXISTS engenharia_cardapio()                                        CASCADE;
DROP FUNCTION IF EXISTS realizar_transferencia(UUID,INT,UUID,UUID,NUMERIC,UUID,TEXT) CASCADE;


-- ================================================================
-- PARTE 1: FUNÇÕES AUXILIARES
-- ================================================================

CREATE OR REPLACE FUNCTION minha_empresa_id()
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
BEGIN
  RETURN (SELECT empresa_id FROM perfis WHERE id = auth.uid() LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION sou_dono()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'dono');
END;
$$;

CREATE OR REPLACE FUNCTION set_empresa_id()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := minha_empresa_id();
  END IF;
  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada.';
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION minha_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION sou_dono()         TO authenticated;


-- ================================================================
-- PARTE 2: EMPRESAS
-- ================================================================

CREATE TABLE empresas (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                TEXT         NOT NULL,
  meta_cmv            NUMERIC      NOT NULL DEFAULT 35,
  categorias_custos   JSONB        NOT NULL DEFAULT '["Embalagens","Material de Limpeza","Gás","Descartáveis"]',
  categorias_produtos JSONB        NOT NULL DEFAULT '[]',
  unidades            JSONB        NOT NULL DEFAULT '["KG","UN","L","G","ML","CX","PCT","DZ","SC"]',
  logo_url            TEXT,
  cor_principal       TEXT         NOT NULL DEFAULT 'petroleo',
  plano               TEXT         NOT NULL DEFAULT 'completo' CHECK (plano IN ('basico','completo')),
  -- v8: PIN para desbloquear ciclos fechados (≠ senha de login do Supabase)
  -- v12: armazenado como HASH bcrypt (pgcrypto) — nunca em texto plano.
  senha_desbloqueio   TEXT         DEFAULT NULL,
  -- v12: flag derivada (a UI sabe se há PIN sem nunca receber o hash)
  pin_configurado     BOOLEAN      GENERATED ALWAYS AS (senha_desbloqueio IS NOT NULL) STORED,
  -- v8: Alíquota fiscal padrão — pré-preenche novas Fichas Técnicas
  imposto_padrao_pct  NUMERIC      NOT NULL DEFAULT 0,
  -- v8: Janela de alerta de validade de lotes (usado no RPC lotes_em_risco)
  dias_alerta_lote    INT          NOT NULL DEFAULT 7,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresas_select" ON empresas FOR SELECT TO authenticated
  USING (id = minha_empresa_id());
-- v12: sem policy de INSERT direto — empresa só nasce via criar_conta_dono (SECURITY DEFINER).
CREATE POLICY "empresas_update" ON empresas FOR UPDATE TO authenticated
  USING  (id = minha_empresa_id() AND sou_dono())
  WITH CHECK (id = minha_empresa_id() AND sou_dono());


-- ================================================================
-- PARTE 3: PERFIS
-- ================================================================

CREATE TABLE perfis (
  id            UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id    UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome_completo TEXT         NOT NULL DEFAULT '',
  cargo         TEXT         DEFAULT NULL,
  role          TEXT         NOT NULL DEFAULT 'funcionario' CHECK (role IN ('dono','funcionario')),
  cargo_id      UUID         DEFAULT NULL,
  ativo         BOOLEAN      NOT NULL DEFAULT true,
  ultimo_acesso TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perfis_empresa ON perfis(empresa_id);

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfis_select" ON perfis FOR SELECT TO authenticated
  USING (empresa_id = minha_empresa_id());
-- v12: sem policy de INSERT direto — perfil de dono nasce via criar_conta_dono e o de
--      funcionário via criar_conta_funcionario (ambas SECURITY DEFINER, sempre role correto).
CREATE POLICY "perfis_update_proprio" ON perfis FOR UPDATE TO authenticated
  USING     (id = auth.uid())
  WITH CHECK (id = auth.uid());
CREATE POLICY "perfis_update_dono" ON perfis FOR UPDATE TO authenticated
  USING     (empresa_id = minha_empresa_id() AND sou_dono())
  WITH CHECK (empresa_id = minha_empresa_id() AND sou_dono());


-- ================================================================
-- PARTE 4: CARGOS
-- ================================================================

CREATE TABLE cargos (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome           TEXT         NOT NULL,
  permissoes     JSONB        NOT NULL DEFAULT '{}',
  codigo_convite TEXT         UNIQUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cargos_empresa ON cargos(empresa_id);
CREATE INDEX idx_cargos_codigo  ON cargos(codigo_convite);

ALTER TABLE perfis ADD CONSTRAINT fk_perfis_cargo
  FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE SET NULL;

CREATE TRIGGER trg_cargos_empresa BEFORE INSERT ON cargos
  FOR EACH ROW EXECUTE FUNCTION set_empresa_id();

ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cargos_select" ON cargos FOR SELECT TO authenticated
  USING (empresa_id = minha_empresa_id());
CREATE POLICY "cargos_insert" ON cargos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = minha_empresa_id() AND sou_dono());
CREATE POLICY "cargos_update" ON cargos FOR UPDATE TO authenticated
  USING     (empresa_id = minha_empresa_id() AND sou_dono())
  WITH CHECK (empresa_id = minha_empresa_id() AND sou_dono());
CREATE POLICY "cargos_delete" ON cargos FOR DELETE TO authenticated
  USING (empresa_id = minha_empresa_id() AND sou_dono());


-- ================================================================
-- PARTE 5: PRODUTOS (insumos do estoque)
-- ================================================================

CREATE TABLE produtos (
  id               INT          PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  empresa_id       UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome             TEXT         NOT NULL,
  unidade          TEXT         NOT NULL DEFAULT 'KG',
  grupo            TEXT         NOT NULL DEFAULT '',
  producao_interna BOOLEAN      NOT NULL DEFAULT false,
  -- Yield Factor: % de aproveitamento líquido após limpeza/preparo
  rendimento       NUMERIC(5,2) NOT NULL DEFAULT 100,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_produtos_empresa ON produtos(empresa_id);

CREATE TRIGGER trg_produtos_empresa BEFORE INSERT ON produtos
  FOR EACH ROW EXECUTE FUNCTION set_empresa_id();

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produtos_select" ON produtos FOR SELECT TO authenticated
  USING     (empresa_id = minha_empresa_id());
CREATE POLICY "produtos_insert" ON produtos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "produtos_update" ON produtos FOR UPDATE TO authenticated
  USING     (empresa_id = minha_empresa_id())
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "produtos_delete" ON produtos FOR DELETE TO authenticated
  USING (empresa_id = minha_empresa_id());


-- ================================================================
-- PARTE 6: CANAIS DE VENDA
-- ================================================================

CREATE TABLE canais_venda (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome        TEXT         NOT NULL,
  taxa_pct    NUMERIC      NOT NULL DEFAULT 0,
  ativo       BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canais_empresa ON canais_venda(empresa_id);

CREATE TRIGGER trg_canais_empresa BEFORE INSERT ON canais_venda
  FOR EACH ROW EXECUTE FUNCTION set_empresa_id();

ALTER TABLE canais_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "canais_select" ON canais_venda FOR SELECT TO authenticated
  USING     (empresa_id = minha_empresa_id());
CREATE POLICY "canais_insert" ON canais_venda FOR INSERT TO authenticated
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "canais_update" ON canais_venda FOR UPDATE TO authenticated
  USING     (empresa_id = minha_empresa_id())
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "canais_delete" ON canais_venda FOR DELETE TO authenticated
  USING (empresa_id = minha_empresa_id());


-- ================================================================
-- PARTE 7: FICHAS TÉCNICAS + INGREDIENTES
-- ================================================================

CREATE TABLE fichas_tecnicas (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome              TEXT         NOT NULL,
  categoria         TEXT         NOT NULL DEFAULT '',
  preco_venda       NUMERIC      NOT NULL DEFAULT 0,
  margem_desejada   NUMERIC      NOT NULL DEFAULT 30,
  custo_fixo_porcao NUMERIC      NOT NULL DEFAULT 0,
  impostos_pct      NUMERIC      NOT NULL DEFAULT 0,
  canal_venda_id    UUID         REFERENCES canais_venda(id) ON DELETE SET NULL,
  porcoes           INTEGER      NOT NULL DEFAULT 1,
  embalagem_custo   NUMERIC      NOT NULL DEFAULT 0,
  modo_preparo      TEXT         NOT NULL DEFAULT '',
  tempo_preparo     INTEGER      NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fichas_empresa ON fichas_tecnicas(empresa_id);

CREATE TRIGGER trg_fichas_empresa BEFORE INSERT ON fichas_tecnicas
  FOR EACH ROW EXECUTE FUNCTION set_empresa_id();

ALTER TABLE fichas_tecnicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fichas_select" ON fichas_tecnicas FOR SELECT TO authenticated
  USING     (empresa_id = minha_empresa_id());
CREATE POLICY "fichas_insert" ON fichas_tecnicas FOR INSERT TO authenticated
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "fichas_update" ON fichas_tecnicas FOR UPDATE TO authenticated
  USING     (empresa_id = minha_empresa_id())
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "fichas_delete" ON fichas_tecnicas FOR DELETE TO authenticated
  USING (empresa_id = minha_empresa_id());

CREATE TABLE ficha_ingredientes (
  id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id    UUID     NOT NULL REFERENCES fichas_tecnicas(id) ON DELETE CASCADE,
  produto_id  INT      NOT NULL REFERENCES produtos(id)        ON DELETE CASCADE,
  quantidade  NUMERIC  NOT NULL DEFAULT 1
);

CREATE INDEX idx_fi_ficha   ON ficha_ingredientes(ficha_id);
CREATE INDEX idx_fi_produto ON ficha_ingredientes(produto_id);

ALTER TABLE ficha_ingredientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fi_select" ON ficha_ingredientes FOR SELECT TO authenticated
  USING  (ficha_id IN (SELECT id FROM fichas_tecnicas WHERE empresa_id = minha_empresa_id()));
CREATE POLICY "fi_insert" ON ficha_ingredientes FOR INSERT TO authenticated
  WITH CHECK (ficha_id IN (SELECT id FROM fichas_tecnicas WHERE empresa_id = minha_empresa_id()));
CREATE POLICY "fi_update" ON ficha_ingredientes FOR UPDATE TO authenticated
  USING  (ficha_id IN (SELECT id FROM fichas_tecnicas WHERE empresa_id = minha_empresa_id()));
CREATE POLICY "fi_delete" ON ficha_ingredientes FOR DELETE TO authenticated
  USING  (ficha_id IN (SELECT id FROM fichas_tecnicas WHERE empresa_id = minha_empresa_id()));


-- ================================================================
-- PARTE 8: COMPRAS
-- ================================================================

CREATE TABLE compras (
  id             INT          PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  empresa_id     UUID         NOT NULL REFERENCES empresas(id)  ON DELETE CASCADE,
  produto_id     INT          NOT NULL REFERENCES produtos(id)  ON DELETE CASCADE,
  quantidade     NUMERIC      NOT NULL,
  valor_unitario NUMERIC      NOT NULL,
  data_compra    DATE         NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compras_empresa ON compras(empresa_id);
CREATE INDEX idx_compras_produto ON compras(produto_id);
CREATE INDEX idx_compras_data    ON compras(data_compra);

CREATE TRIGGER trg_compras_empresa BEFORE INSERT ON compras
  FOR EACH ROW EXECUTE FUNCTION set_empresa_id();

ALTER TABLE compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compras_select" ON compras FOR SELECT TO authenticated
  USING     (empresa_id = minha_empresa_id());
CREATE POLICY "compras_insert" ON compras FOR INSERT TO authenticated
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "compras_update" ON compras FOR UPDATE TO authenticated
  USING     (empresa_id = minha_empresa_id())
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "compras_delete" ON compras FOR DELETE TO authenticated
  USING (empresa_id = minha_empresa_id());


-- ================================================================
-- PARTE 9: ESTOQUES (contagens Inicial e Final por semana)
-- ================================================================

CREATE TABLE estoques (
  id             INT          PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  empresa_id     UUID         NOT NULL REFERENCES empresas(id)  ON DELETE CASCADE,
  produto_id     INT          NOT NULL REFERENCES produtos(id)  ON DELETE CASCADE,
  quantidade     NUMERIC      NOT NULL DEFAULT 0,
  valor_unitario NUMERIC      NOT NULL DEFAULT 0,
  tipo_contagem  TEXT         NOT NULL CHECK (tipo_contagem IN ('Inicial','Final')),
  data_contagem  DATE         NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_estoques_empresa ON estoques(empresa_id);
CREATE INDEX idx_estoques_produto ON estoques(produto_id);
CREATE INDEX idx_estoques_data    ON estoques(data_contagem);

CREATE TRIGGER trg_estoques_empresa BEFORE INSERT ON estoques
  FOR EACH ROW EXECUTE FUNCTION set_empresa_id();

ALTER TABLE estoques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoques_select" ON estoques FOR SELECT TO authenticated
  USING     (empresa_id = minha_empresa_id());
CREATE POLICY "estoques_insert" ON estoques FOR INSERT TO authenticated
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "estoques_update" ON estoques FOR UPDATE TO authenticated
  USING     (empresa_id = minha_empresa_id())
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "estoques_delete" ON estoques FOR DELETE TO authenticated
  USING (empresa_id = minha_empresa_id());


-- ================================================================
-- PARTE 10: FINANÇAS SEMANAIS
-- ================================================================

CREATE TABLE financas_semanais (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  data_inicio   DATE         NOT NULL,
  data_fim      DATE         NOT NULL,
  faturamento   NUMERIC      NOT NULL DEFAULT 0,
  outros_custos JSONB        NOT NULL DEFAULT '{}',
  status        TEXT         NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, data_inicio)
);

CREATE INDEX idx_financas_empresa ON financas_semanais(empresa_id);
CREATE INDEX idx_financas_inicio  ON financas_semanais(data_inicio);

CREATE TRIGGER trg_financas_empresa BEFORE INSERT ON financas_semanais
  FOR EACH ROW EXECUTE FUNCTION set_empresa_id();

ALTER TABLE financas_semanais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financas_select" ON financas_semanais FOR SELECT TO authenticated
  USING     (empresa_id = minha_empresa_id());
CREATE POLICY "financas_insert" ON financas_semanais FOR INSERT TO authenticated
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "financas_update" ON financas_semanais FOR UPDATE TO authenticated
  USING     (empresa_id = minha_empresa_id())
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "financas_delete" ON financas_semanais FOR DELETE TO authenticated
  USING (empresa_id = minha_empresa_id());


-- ================================================================
-- PARTE 11: SAÍDAS AVULSAS (quebras, desperdícios, doações)
-- ================================================================

CREATE TABLE saidas_avulsas (
  id               INT          PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  empresa_id       UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id       INT          REFERENCES produtos(id) ON DELETE SET NULL,
  quantidade       NUMERIC      NOT NULL DEFAULT 1,
  valor_total      NUMERIC      NOT NULL DEFAULT 0,
  motivo           TEXT         NOT NULL DEFAULT 'Quebra/Desperdício',
  descricao_manual TEXT,
  data_saida       DATE         NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saidas_empresa ON saidas_avulsas(empresa_id);
CREATE INDEX idx_saidas_data    ON saidas_avulsas(data_saida);

CREATE TRIGGER trg_saidas_empresa BEFORE INSERT ON saidas_avulsas
  FOR EACH ROW EXECUTE FUNCTION set_empresa_id();

ALTER TABLE saidas_avulsas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saidas_select" ON saidas_avulsas FOR SELECT TO authenticated
  USING     (empresa_id = minha_empresa_id());
CREATE POLICY "saidas_insert" ON saidas_avulsas FOR INSERT TO authenticated
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "saidas_update" ON saidas_avulsas FOR UPDATE TO authenticated
  USING     (empresa_id = minha_empresa_id())
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "saidas_delete" ON saidas_avulsas FOR DELETE TO authenticated
  USING (empresa_id = minha_empresa_id());


-- ================================================================
-- PARTE 12: LOCAIS DE ESTOQUE (v9)
-- Almoxarifado, cozinha ou outro local físico de armazenagem
-- ================================================================

CREATE TABLE locais_estoque (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID         NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome       TEXT         NOT NULL,
  tipo       TEXT         NOT NULL DEFAULT 'almoxarifado'
               CHECK (tipo IN ('almoxarifado', 'cozinha', 'outro')),
  ativo      BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locais_empresa ON locais_estoque(empresa_id);

CREATE TRIGGER trg_locais_empresa BEFORE INSERT ON locais_estoque
  FOR EACH ROW EXECUTE FUNCTION set_empresa_id();

ALTER TABLE locais_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locais_select" ON locais_estoque FOR SELECT TO authenticated
  USING (empresa_id = minha_empresa_id());
CREATE POLICY "locais_insert" ON locais_estoque FOR INSERT TO authenticated
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "locais_update" ON locais_estoque FOR UPDATE TO authenticated
  USING     (empresa_id = minha_empresa_id())
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "locais_delete" ON locais_estoque FOR DELETE TO authenticated
  USING (empresa_id = minha_empresa_id());


-- ================================================================
-- PARTE 13: LOTES (rastreio FEFO — First Expired, First Out)
-- ================================================================

CREATE TABLE lotes (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID         NOT NULL REFERENCES empresas(id)      ON DELETE CASCADE,
  produto_id       INT          NOT NULL REFERENCES produtos(id)      ON DELETE CASCADE,
  compra_id        INT          REFERENCES compras(id)                ON DELETE SET NULL,
  -- v9: local físico onde o lote está armazenado
  local_id         UUID         REFERENCES locais_estoque(id)         ON DELETE SET NULL,
  numero_lote      TEXT,
  data_entrada     DATE         NOT NULL DEFAULT CURRENT_DATE,
  data_validade    DATE,
  quantidade_orig  NUMERIC      NOT NULL,
  quantidade_atual NUMERIC      NOT NULL,
  custo_unitario   NUMERIC      NOT NULL,
  fornecedor       TEXT,
  nota_fiscal      TEXT,
  status           TEXT         NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','esgotado','vencido')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lotes_empresa  ON lotes(empresa_id);
CREATE INDEX idx_lotes_produto  ON lotes(produto_id);
CREATE INDEX idx_lotes_local    ON lotes(local_id);
CREATE INDEX idx_lotes_validade ON lotes(data_validade) WHERE status = 'ativo';

CREATE TRIGGER trg_lotes_empresa BEFORE INSERT ON lotes
  FOR EACH ROW EXECUTE FUNCTION set_empresa_id();

ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lotes_select" ON lotes FOR SELECT TO authenticated
  USING     (empresa_id = minha_empresa_id());
CREATE POLICY "lotes_insert" ON lotes FOR INSERT TO authenticated
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "lotes_update" ON lotes FOR UPDATE TO authenticated
  USING     (empresa_id = minha_empresa_id())
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "lotes_delete" ON lotes FOR DELETE TO authenticated
  USING (empresa_id = minha_empresa_id());


-- ================================================================
-- PARTE 14: VENDAS DE PRATOS (Motor de Engenharia de Cardápio)
-- ================================================================

CREATE TABLE vendas_pratos (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         UUID         NOT NULL REFERENCES empresas(id)          ON DELETE CASCADE,
  ficha_id           UUID         NOT NULL REFERENCES fichas_tecnicas(id)   ON DELETE CASCADE,
  semana_inicio      DATE         NOT NULL,
  semana_fim         DATE         NOT NULL,
  quantidade_vendida INTEGER      NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, ficha_id, semana_inicio)
);

CREATE INDEX idx_vendas_empresa ON vendas_pratos(empresa_id);
CREATE INDEX idx_vendas_ficha   ON vendas_pratos(ficha_id);

CREATE TRIGGER trg_vendas_empresa BEFORE INSERT ON vendas_pratos
  FOR EACH ROW EXECUTE FUNCTION set_empresa_id();

ALTER TABLE vendas_pratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendas_select" ON vendas_pratos FOR SELECT TO authenticated
  USING     (empresa_id = minha_empresa_id());
CREATE POLICY "vendas_insert" ON vendas_pratos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "vendas_update" ON vendas_pratos FOR UPDATE TO authenticated
  USING     (empresa_id = minha_empresa_id())
  WITH CHECK (empresa_id = minha_empresa_id());
CREATE POLICY "vendas_delete" ON vendas_pratos FOR DELETE TO authenticated
  USING (empresa_id = minha_empresa_id());


-- ================================================================
-- PARTE 15: GRANTS
-- ================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  empresas, perfis, cargos, produtos, canais_venda,
  fichas_tecnicas, ficha_ingredientes,
  compras, estoques, financas_semanais, saidas_avulsas,
  locais_estoque, lotes, vendas_pratos
TO authenticated;

GRANT SELECT ON empresas, cargos TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;


-- ================================================================
-- PARTE 16: RPCs
-- ================================================================

-- -------------------------------------------------------------
-- RPC 1: validar_codigo_convite
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_codigo_convite(codigo TEXT)
RETURNS TABLE(id UUID, empresa_id UUID, nome TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT c.id, c.empresa_id, c.nome
    FROM cargos c
    WHERE c.codigo_convite = UPPER(TRIM(codigo))
    LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION validar_codigo_convite(TEXT) TO anon, authenticated;


-- -------------------------------------------------------------
-- RPC 2: seed_empresa_defaults
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_empresa_defaults(p_empresa_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO canais_venda (empresa_id, nome, taxa_pct) VALUES
    (p_empresa_id, 'Balcão / Dinheiro',      0),
    (p_empresa_id, 'Cartão Crédito/Débito',  3),
    (p_empresa_id, 'iFood',                 12),
    (p_empresa_id, 'Rappi',                 12),
    (p_empresa_id, 'Uber Eats',             15)
  ON CONFLICT DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION seed_empresa_defaults(UUID) TO authenticated;


-- -------------------------------------------------------------
-- RPC 3: criar_conta_dono
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION criar_conta_dono(
  p_nome_restaurante TEXT,
  p_nome_completo    TEXT
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'erro', 'Usuário não autenticado.');
  END IF;

  IF EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid()) THEN
    RETURN json_build_object('ok', false, 'erro', 'Usuário já possui conta.');
  END IF;

  INSERT INTO empresas (nome)
  VALUES (p_nome_restaurante)
  RETURNING id INTO v_empresa_id;

  INSERT INTO perfis (id, empresa_id, nome_completo, cargo, role, ativo)
  VALUES (auth.uid(), v_empresa_id, p_nome_completo, 'Dono', 'dono', true);

  PERFORM seed_empresa_defaults(v_empresa_id);

  RETURN json_build_object('ok', true, 'empresa_id', v_empresa_id);
END;
$$;
GRANT EXECUTE ON FUNCTION criar_conta_dono(TEXT, TEXT) TO authenticated;


-- -------------------------------------------------------------
-- RPC 4: lotes_em_risco
-- -------------------------------------------------------------
-- v11: turbinado — nome/unidade do insumo, lote, local, valor em risco (R$) e severidade
CREATE OR REPLACE FUNCTION lotes_em_risco(dias_aviso INT DEFAULT 7)
RETURNS TABLE(
  id               UUID,
  produto_id       INT,
  nome_produto     TEXT,
  unidade          TEXT,
  numero_lote      TEXT,
  local_nome       TEXT,
  data_validade    DATE,
  quantidade_atual NUMERIC,
  custo_unitario   NUMERIC,
  valor_em_risco   NUMERIC,
  dias_para_vencer INT,
  severidade       TEXT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      l.id,
      l.produto_id,
      p.nome                                          AS nome_produto,
      p.unidade,
      l.numero_lote,
      loc.nome                                        AS local_nome,
      l.data_validade,
      l.quantidade_atual,
      l.custo_unitario,
      ROUND(l.quantidade_atual * l.custo_unitario, 2) AS valor_em_risco,
      (l.data_validade - CURRENT_DATE)::INT           AS dias_para_vencer,
      CASE
        WHEN (l.data_validade - CURRENT_DATE) <  0 THEN 'vencido'
        WHEN (l.data_validade - CURRENT_DATE) <= 2 THEN 'critico'
        ELSE 'alerta'
      END                                             AS severidade
    FROM lotes l
    JOIN produtos p
      ON p.id = l.produto_id AND p.empresa_id = minha_empresa_id()
    LEFT JOIN locais_estoque loc
      ON loc.id = l.local_id
    WHERE l.empresa_id    = minha_empresa_id()
      AND l.status        = 'ativo'
      AND l.data_validade IS NOT NULL
      AND l.data_validade <= CURRENT_DATE + (dias_aviso || ' days')::INTERVAL
      AND l.quantidade_atual > 0
    ORDER BY l.data_validade ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION lotes_em_risco(INT) TO authenticated;


-- -------------------------------------------------------------
-- RPC 5: previsao_ruptura_estoque (v10)
-- Média PONDERADA + tendência + data_ruptura + confiança + risco_perda
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION previsao_ruptura_estoque()
RETURNS TABLE(
  produto_id        INT,
  nome_produto      TEXT,
  unidade           TEXT,
  grupo             TEXT,
  estoque_atual     NUMERIC,
  consumo_medio_sem NUMERIC,
  dias_restantes    NUMERIC,
  data_ruptura      DATE,
  tendencia         TEXT,
  semanas_historico INT,
  confianca         TEXT,
  risco_perda       BOOLEAN,
  status_ruptura    TEXT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH contagens_final AS (
    SELECT
      e.produto_id,
      e.data_contagem,
      e.quantidade,
      ROW_NUMBER() OVER (PARTITION BY e.produto_id ORDER BY e.data_contagem DESC) AS rn
    FROM estoques e
    WHERE e.empresa_id    = minha_empresa_id()
      AND e.tipo_contagem = 'Final'
  ),
  estoque_recente AS (
    SELECT cf.produto_id, cf.quantidade AS estoque_atual
    FROM contagens_final cf
    WHERE cf.rn = 1
  ),
  consumo_semanas AS (
    SELECT
      ef.produto_id,
      ef.rn,
      (5 - ef.rn)::NUMERIC                                               AS peso,
      GREATEST(
        ei.quantidade + COALESCE(SUM(c.quantidade), 0) - ef.quantidade,
        0
      )                                                                   AS consumo
    FROM contagens_final ef
    JOIN contagens_final ei
      ON ei.produto_id = ef.produto_id AND ei.rn = ef.rn + 1
    LEFT JOIN compras c
      ON c.produto_id  = ef.produto_id
     AND c.empresa_id  = minha_empresa_id()
     AND c.data_compra BETWEEN ei.data_contagem AND ef.data_contagem
    WHERE ef.rn <= 4
    GROUP BY ef.produto_id, ef.rn, ei.quantidade, ef.quantidade
  ),
  media_consumo AS (
    SELECT
      cs.produto_id,
      SUM(cs.consumo * cs.peso) / NULLIF(SUM(cs.peso), 0)          AS consumo_medio,
      COUNT(*)::INT                                                   AS semanas_historico,
      AVG(CASE WHEN cs.rn <= 2 THEN cs.consumo ELSE NULL END)       AS media_recente,
      AVG(CASE WHEN cs.rn  > 2 THEN cs.consumo ELSE NULL END)       AS media_antiga
    FROM consumo_semanas cs
    GROUP BY cs.produto_id
  ),
  proxima_validade AS (
    SELECT
      l.produto_id,
      MIN(l.data_validade) AS min_validade
    FROM lotes l
    WHERE l.empresa_id    = minha_empresa_id()
      AND l.status        = 'ativo'
      AND l.data_validade IS NOT NULL
      AND l.quantidade_atual > 0
    GROUP BY l.produto_id
  )
  SELECT
    p.id                                                              AS produto_id,
    p.nome                                                            AS nome_produto,
    p.unidade,
    p.grupo,
    COALESCE(er.estoque_atual, 0)                                     AS estoque_atual,
    ROUND(COALESCE(mc.consumo_medio, 0), 3)                           AS consumo_medio_sem,
    CASE
      WHEN COALESCE(mc.consumo_medio, 0) = 0 THEN NULL
      ELSE ROUND((COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7, 1)
    END                                                               AS dias_restantes,
    CASE
      WHEN COALESCE(mc.consumo_medio, 0) = 0 THEN NULL
      ELSE CURRENT_DATE
             + ROUND((COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7)::INT
    END                                                               AS data_ruptura,
    CASE
      WHEN mc.media_antiga IS NULL OR mc.media_antiga = 0 THEN 'estavel'
      WHEN mc.media_recente > mc.media_antiga * 1.15                THEN 'subindo'
      WHEN mc.media_recente < mc.media_antiga * 0.85                THEN 'caindo'
      ELSE 'estavel'
    END                                                               AS tendencia,
    COALESCE(mc.semanas_historico, 0)                                 AS semanas_historico,
    CASE
      WHEN COALESCE(mc.semanas_historico, 0) = 0 THEN 'sem_dados'
      WHEN COALESCE(mc.semanas_historico, 0) = 1 THEN 'baixa'
      WHEN COALESCE(mc.semanas_historico, 0) = 2 THEN 'media'
      ELSE 'alta'
    END                                                               AS confianca,
    CASE
      WHEN pv.min_validade IS NULL           THEN false
      WHEN COALESCE(mc.consumo_medio, 0) = 0 THEN false
      WHEN (pv.min_validade - CURRENT_DATE)
           < ROUND((COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7) THEN true
      ELSE false
    END                                                               AS risco_perda,
    CASE
      WHEN COALESCE(mc.consumo_medio, 0) = 0 THEN 'sem_historico'
      WHEN (COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7 <  3 THEN 'critico'
      WHEN (COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7 <  7 THEN 'alerta'
      WHEN (COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7 < 14 THEN 'atencao'
      ELSE 'ok'
    END                                                               AS status_ruptura
  FROM produtos p
  LEFT JOIN estoque_recente  er ON er.produto_id = p.id
  LEFT JOIN media_consumo    mc ON mc.produto_id = p.id
  LEFT JOIN proxima_validade pv ON pv.produto_id = p.id
  WHERE p.empresa_id        = minha_empresa_id()
    AND p.producao_interna  = false
  ORDER BY
    CASE
      WHEN COALESCE(mc.consumo_medio, 0) = 0 THEN 5
      WHEN (COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7 <  3 THEN 1
      WHEN (COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7 <  7 THEN 2
      WHEN (COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7 < 14 THEN 3
      ELSE 4
    END,
    p.nome;
END;
$$;
GRANT EXECUTE ON FUNCTION previsao_ruptura_estoque() TO authenticated;


-- -------------------------------------------------------------
-- RPC 6: plano_compras_inteligente (v10)
-- Cobertura configurável + is_perecivel + média ponderada
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION plano_compras_inteligente(p_dias_cobertura INT DEFAULT 14)
RETURNS TABLE(
  produto_id             INT,
  nome_produto           TEXT,
  unidade                TEXT,
  grupo                  TEXT,
  estoque_atual          NUMERIC,
  consumo_medio_sem      NUMERIC,
  dias_restantes         NUMERIC,
  ultimo_preco           NUMERIC,
  qtd_sugerida           NUMERIC,
  custo_estimado         NUMERIC,
  status_ruptura         TEXT,
  is_perecivel           BOOLEAN,
  dias_cobertura_efetiva INT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH contagens_final AS (
    SELECT
      e.produto_id,
      e.data_contagem,
      e.quantidade,
      ROW_NUMBER() OVER (PARTITION BY e.produto_id ORDER BY e.data_contagem DESC) AS rn
    FROM estoques e
    WHERE e.empresa_id    = minha_empresa_id()
      AND e.tipo_contagem = 'Final'
  ),
  estoque_recente AS (
    SELECT cf.produto_id, cf.quantidade AS estoque_atual
    FROM contagens_final cf
    WHERE cf.rn = 1
  ),
  consumo_semanas AS (
    SELECT
      ef.produto_id,
      ef.rn,
      (5 - ef.rn)::NUMERIC AS peso,
      GREATEST(
        ei.quantidade + COALESCE(SUM(c.quantidade), 0) - ef.quantidade,
        0
      ) AS consumo
    FROM contagens_final ef
    JOIN contagens_final ei
      ON ei.produto_id = ef.produto_id AND ei.rn = ef.rn + 1
    LEFT JOIN compras c
      ON c.produto_id  = ef.produto_id
     AND c.empresa_id  = minha_empresa_id()
     AND c.data_compra BETWEEN ei.data_contagem AND ef.data_contagem
    WHERE ef.rn <= 4
    GROUP BY ef.produto_id, ef.rn, ei.quantidade, ef.quantidade
  ),
  media_consumo AS (
    SELECT
      cs.produto_id,
      SUM(cs.consumo * cs.peso) / NULLIF(SUM(cs.peso), 0) AS consumo_medio
    FROM consumo_semanas cs
    GROUP BY cs.produto_id
  ),
  ultimo_preco_compra AS (
    SELECT DISTINCT ON (c2.produto_id)
      c2.produto_id,
      c2.valor_unitario AS ultimo_preco
    FROM compras c2
    WHERE c2.empresa_id = minha_empresa_id()
    ORDER BY c2.produto_id, c2.data_compra DESC, c2.id DESC
  ),
  validade_tipica AS (
    SELECT
      l.produto_id,
      AVG((l.data_validade - l.data_entrada)::NUMERIC) AS dias_validade_tipica
    FROM lotes l
    WHERE l.empresa_id    = minha_empresa_id()
      AND l.data_validade IS NOT NULL
    GROUP BY l.produto_id
  )
  SELECT
    p.id                                                                          AS produto_id,
    p.nome                                                                        AS nome_produto,
    p.unidade,
    p.grupo,
    COALESCE(er.estoque_atual, 0)                                                 AS estoque_atual,
    ROUND(COALESCE(mc.consumo_medio, 0), 3)                                       AS consumo_medio_sem,
    CASE
      WHEN COALESCE(mc.consumo_medio, 0) = 0 THEN NULL
      ELSE ROUND((COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7, 1)
    END                                                                           AS dias_restantes,
    COALESCE(up.ultimo_preco, 0)                                                  AS ultimo_preco,
    GREATEST(0, ROUND(
      COALESCE(mc.consumo_medio, 0)
      * (LEAST(p_dias_cobertura::NUMERIC,
               COALESCE(vt.dias_validade_tipica, p_dias_cobertura::NUMERIC)) / 7.0)
      - COALESCE(er.estoque_atual, 0),
    3))                                                                           AS qtd_sugerida,
    GREATEST(0, ROUND(
      (COALESCE(mc.consumo_medio, 0)
       * (LEAST(p_dias_cobertura::NUMERIC,
                COALESCE(vt.dias_validade_tipica, p_dias_cobertura::NUMERIC)) / 7.0)
       - COALESCE(er.estoque_atual, 0))
      * COALESCE(up.ultimo_preco, 0),
    2))                                                                           AS custo_estimado,
    CASE
      WHEN COALESCE(mc.consumo_medio, 0) = 0 THEN 'sem_historico'
      WHEN (COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7 <  3 THEN 'critico'
      WHEN (COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7 <  7 THEN 'alerta'
      WHEN (COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7 < 14 THEN 'atencao'
      ELSE 'ok'
    END                                                                           AS status_ruptura,
    (vt.dias_validade_tipica IS NOT NULL
     AND vt.dias_validade_tipica < p_dias_cobertura::NUMERIC)                    AS is_perecivel,
    LEAST(
      p_dias_cobertura::NUMERIC,
      COALESCE(vt.dias_validade_tipica, p_dias_cobertura::NUMERIC)
    )::INT                                                                        AS dias_cobertura_efetiva
  FROM produtos p
  LEFT JOIN estoque_recente     er ON er.produto_id = p.id
  LEFT JOIN media_consumo       mc ON mc.produto_id = p.id
  LEFT JOIN ultimo_preco_compra up ON up.produto_id = p.id
  LEFT JOIN validade_tipica     vt ON vt.produto_id = p.id
  WHERE p.empresa_id        = minha_empresa_id()
    AND p.producao_interna  = false
  ORDER BY
    CASE
      WHEN COALESCE(mc.consumo_medio, 0) = 0 THEN 5
      WHEN (COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7 <  3 THEN 1
      WHEN (COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7 <  7 THEN 2
      WHEN (COALESCE(er.estoque_atual, 0) / mc.consumo_medio) * 7 < 14 THEN 3
      ELSE 4
    END,
    p.nome;
END;
$$;
GRANT EXECUTE ON FUNCTION plano_compras_inteligente(INT) TO authenticated;


-- -------------------------------------------------------------
-- RPC 7: engenharia_cardapio (v10)
-- Markup Divisor + preco_sugerido + JOIN canais_venda
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION engenharia_cardapio()
RETURNS TABLE(
  ficha_id         UUID,
  nome_prato       TEXT,
  categoria        TEXT,
  preco_venda      NUMERIC,
  custo_porcao     NUMERIC,
  margem_real_pct  NUMERIC,
  vendas_total     NUMERIC,
  receita_total    NUMERIC,
  participacao_pct NUMERIC,
  quadrante        TEXT,
  preco_sugerido   NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ultimo_preco_compra AS (
    SELECT DISTINCT ON (c.produto_id)
      c.produto_id,
      c.valor_unitario AS ultimo_preco
    FROM compras c
    WHERE c.empresa_id = minha_empresa_id()
    ORDER BY c.produto_id, c.data_compra DESC, c.id DESC
  ),
  custo_ingredientes_ficha AS (
    SELECT
      fi.ficha_id,
      SUM(
        fi.quantidade
        * COALESCE(up.ultimo_preco, 0)
        / NULLIF(COALESCE(p.rendimento, 100) / 100.0, 0)
      ) AS custo_ingredientes
    FROM ficha_ingredientes fi
    JOIN produtos p
      ON p.id = fi.produto_id AND p.empresa_id = minha_empresa_id()
    LEFT JOIN ultimo_preco_compra up ON up.produto_id = fi.produto_id
    GROUP BY fi.ficha_id
  ),
  custo_por_porcao AS (
    SELECT
      ft.id AS ficha_id,
      ROUND(
        (COALESCE(ci.custo_ingredientes, 0) / NULLIF(ft.porcoes, 0))
        + ft.custo_fixo_porcao
        + ft.embalagem_custo,
      4) AS custo_porcao
    FROM fichas_tecnicas ft
    LEFT JOIN custo_ingredientes_ficha ci ON ci.ficha_id = ft.id
    WHERE ft.empresa_id = minha_empresa_id()
  ),
  vendas_por_ficha AS (
    SELECT
      vp.ficha_id,
      SUM(vp.quantidade_vendida)::NUMERIC AS vendas_total
    FROM vendas_pratos vp
    WHERE vp.empresa_id = minha_empresa_id()
    GROUP BY vp.ficha_id
  ),
  total_vendas AS (
    SELECT COALESCE(SUM(vpf.vendas_total), 0) AS total FROM vendas_por_ficha vpf
  ),
  dados_pratos AS (
    SELECT
      ft.id                                                             AS ficha_id,
      ft.nome                                                           AS nome_prato,
      ft.categoria,
      ft.preco_venda,
      COALESCE(cp.custo_porcao, 0)                                      AS custo_porcao,
      CASE
        WHEN ft.preco_venda > 0
        THEN ROUND(((ft.preco_venda - COALESCE(cp.custo_porcao, 0)) / ft.preco_venda) * 100, 1)
        ELSE 0
      END                                                               AS margem_real_pct,
      COALESCE(vf.vendas_total, 0)                                      AS vendas_total,
      COALESCE(vf.vendas_total, 0) * ft.preco_venda                     AS receita_total,
      CASE
        WHEN (SELECT total FROM total_vendas) > 0
        THEN ROUND((COALESCE(vf.vendas_total, 0) / (SELECT total FROM total_vendas)) * 100, 1)
        ELSE 0
      END                                                               AS participacao_pct,
      -- Markup Divisor: Preço Sugerido = custo / (1 − (impostos + taxa_canal + margem) / 100)
      CASE
        WHEN (COALESCE(ft.impostos_pct, 0)
              + COALESCE(cv.taxa_pct, 0)
              + COALESCE(ft.margem_desejada, 30)) >= 100
          THEN NULL
        ELSE ROUND(
          COALESCE(cp.custo_porcao, 0) /
          NULLIF(
            1.0 - (COALESCE(ft.impostos_pct, 0)
                   + COALESCE(cv.taxa_pct, 0)
                   + COALESCE(ft.margem_desejada, 30)) / 100.0,
            0
          ),
          2)
      END                                                               AS preco_sugerido
    FROM fichas_tecnicas ft
    LEFT JOIN custo_por_porcao cp ON cp.ficha_id = ft.id
    LEFT JOIN vendas_por_ficha vf ON vf.ficha_id = ft.id
    LEFT JOIN canais_venda     cv ON cv.id = ft.canal_venda_id
                                 AND cv.empresa_id = minha_empresa_id()
    WHERE ft.empresa_id = minha_empresa_id()
  ),
  medias AS (
    SELECT
      COALESCE(AVG(dp2.margem_real_pct),  0) AS media_margem,
      COALESCE(AVG(dp2.participacao_pct), 0) AS media_participacao
    FROM dados_pratos dp2
    WHERE dp2.vendas_total > 0
  )
  SELECT
    dp.ficha_id,
    dp.nome_prato,
    dp.categoria,
    dp.preco_venda,
    dp.custo_porcao,
    dp.margem_real_pct,
    dp.vendas_total,
    dp.receita_total,
    dp.participacao_pct,
    CASE
      WHEN dp.vendas_total = 0    THEN 'sem_dados'
      WHEN m.media_margem IS NULL THEN 'sem_dados'
      WHEN dp.margem_real_pct >= m.media_margem AND dp.participacao_pct >= m.media_participacao THEN 'estrela'
      WHEN dp.margem_real_pct <  m.media_margem AND dp.participacao_pct >= m.media_participacao THEN 'cavalo'
      WHEN dp.margem_real_pct >= m.media_margem AND dp.participacao_pct <  m.media_participacao THEN 'interrogacao'
      ELSE 'abacaxi'
    END AS quadrante,
    dp.preco_sugerido
  FROM dados_pratos dp
  CROSS JOIN medias m
  ORDER BY dp.vendas_total DESC, dp.nome_prato;
END;
$$;
GRANT EXECUTE ON FUNCTION engenharia_cardapio() TO authenticated;


-- ================================================================
-- PARTE 17: HARDENING (v12) — segurança, integridade e robustez
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 17.1 — Constraints de integridade (tabelas recém-criadas neste run)
ALTER TABLE produtos          ADD CONSTRAINT chk_produtos_rendimento   CHECK (rendimento > 0 AND rendimento <= 100);
ALTER TABLE compras           ADD CONSTRAINT chk_compras_qtd           CHECK (quantidade > 0);
ALTER TABLE compras           ADD CONSTRAINT chk_compras_valor         CHECK (valor_unitario >= 0);
ALTER TABLE estoques          ADD CONSTRAINT chk_estoques_qtd          CHECK (quantidade >= 0);
ALTER TABLE estoques          ADD CONSTRAINT chk_estoques_valor        CHECK (valor_unitario >= 0);
ALTER TABLE lotes             ADD CONSTRAINT chk_lotes_qtd_orig        CHECK (quantidade_orig > 0);
ALTER TABLE lotes             ADD CONSTRAINT chk_lotes_qtd_atual       CHECK (quantidade_atual >= 0);
ALTER TABLE lotes             ADD CONSTRAINT chk_lotes_qtd_coerente    CHECK (quantidade_atual <= quantidade_orig);
ALTER TABLE lotes             ADD CONSTRAINT chk_lotes_custo           CHECK (custo_unitario >= 0);
ALTER TABLE saidas_avulsas    ADD CONSTRAINT chk_saidas_qtd           CHECK (quantidade >= 0);
ALTER TABLE saidas_avulsas    ADD CONSTRAINT chk_saidas_valor         CHECK (valor_total >= 0);
ALTER TABLE fichas_tecnicas   ADD CONSTRAINT chk_fichas_porcoes        CHECK (porcoes >= 1);
ALTER TABLE fichas_tecnicas   ADD CONSTRAINT chk_fichas_margem         CHECK (margem_desejada >= 0 AND margem_desejada <= 100);
ALTER TABLE fichas_tecnicas   ADD CONSTRAINT chk_fichas_impostos       CHECK (impostos_pct >= 0 AND impostos_pct <= 100);
ALTER TABLE fichas_tecnicas   ADD CONSTRAINT chk_fichas_embalagem      CHECK (embalagem_custo >= 0);
ALTER TABLE fichas_tecnicas   ADD CONSTRAINT chk_fichas_custo_fixo     CHECK (custo_fixo_porcao >= 0);
ALTER TABLE ficha_ingredientes ADD CONSTRAINT chk_fi_qtd              CHECK (quantidade > 0);
ALTER TABLE canais_venda      ADD CONSTRAINT chk_canais_taxa           CHECK (taxa_pct >= 0 AND taxa_pct <= 100);
ALTER TABLE financas_semanais ADD CONSTRAINT chk_financas_faturamento  CHECK (faturamento >= 0);
ALTER TABLE financas_semanais ADD CONSTRAINT chk_financas_datas        CHECK (data_fim >= data_inicio);
ALTER TABLE empresas          ADD CONSTRAINT chk_empresas_meta_cmv     CHECK (meta_cmv >= 0 AND meta_cmv <= 100);
ALTER TABLE empresas          ADD CONSTRAINT chk_empresas_imposto      CHECK (imposto_padrao_pct >= 0 AND imposto_padrao_pct <= 100);
ALTER TABLE empresas          ADD CONSTRAINT chk_empresas_dias_alerta  CHECK (dias_alerta_lote >= 0);
ALTER TABLE vendas_pratos     ADD CONSTRAINT chk_vendas_qtd            CHECK (quantidade_vendida >= 0);

-- 17.2 — Cadastro de funcionário sem brecha de privilégio (força role='funcionario')
CREATE OR REPLACE FUNCTION criar_conta_funcionario(p_codigo TEXT, p_nome TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cargo cargos%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'erro', 'Usuário não autenticado.');
  END IF;
  IF EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid()) THEN
    RETURN json_build_object('ok', false, 'erro', 'Usuário já possui conta.');
  END IF;
  SELECT * INTO v_cargo FROM cargos WHERE codigo_convite = UPPER(TRIM(p_codigo)) LIMIT 1;
  IF v_cargo.id IS NULL THEN
    RETURN json_build_object('ok', false, 'erro', 'Código de convite inválido.');
  END IF;
  INSERT INTO perfis (id, empresa_id, nome_completo, cargo, cargo_id, role, ativo)
  VALUES (auth.uid(), v_cargo.empresa_id, COALESCE(NULLIF(TRIM(p_nome), ''), 'Funcionário'),
          v_cargo.nome, v_cargo.id, 'funcionario', true);
  RETURN json_build_object('ok', true, 'empresa_id', v_cargo.empresa_id, 'cargo', v_cargo.nome);
END;
$$;
GRANT EXECUTE ON FUNCTION criar_conta_funcionario(TEXT, TEXT) TO authenticated;

-- 17.3 — PIN de desbloqueio com hash bcrypt + validação no servidor
CREATE OR REPLACE FUNCTION definir_pin_desbloqueio(p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT sou_dono() THEN
    RETURN json_build_object('ok', false, 'erro', 'Apenas o dono pode definir o PIN.');
  END IF;
  IF p_pin IS NULL OR length(TRIM(p_pin)) < 4 THEN
    RETURN json_build_object('ok', false, 'erro', 'O PIN deve ter ao menos 4 caracteres.');
  END IF;
  UPDATE empresas SET senha_desbloqueio = crypt(TRIM(p_pin), gen_salt('bf')) WHERE id = minha_empresa_id();
  RETURN json_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION definir_pin_desbloqueio(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION remover_pin_desbloqueio()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT sou_dono() THEN
    RETURN json_build_object('ok', false, 'erro', 'Apenas o dono pode remover o PIN.');
  END IF;
  UPDATE empresas SET senha_desbloqueio = NULL WHERE id = minha_empresa_id();
  RETURN json_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION remover_pin_desbloqueio() TO authenticated;

CREATE OR REPLACE FUNCTION validar_pin_desbloqueio(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT senha_desbloqueio INTO v_hash FROM empresas WHERE id = minha_empresa_id();
  IF v_hash IS NULL OR p_pin IS NULL THEN RETURN false; END IF;
  RETURN v_hash = crypt(TRIM(p_pin), v_hash);
END;
$$;
GRANT EXECUTE ON FUNCTION validar_pin_desbloqueio(TEXT) TO authenticated;

-- 17.4 — Contagem de estoque atômica (delete + insert numa transação)
CREATE OR REPLACE FUNCTION salvar_contagem(p_tipo TEXT, p_data DATE, p_data_fim DATE, p_itens JSONB)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_item    JSONB;
  v_qtd     INT := 0;
BEGIN
  v_empresa := minha_empresa_id();
  IF v_empresa IS NULL THEN
    RETURN json_build_object('ok', false, 'erro', 'Usuário sem empresa vinculada.');
  END IF;
  IF p_tipo NOT IN ('Inicial', 'Final') THEN
    RETURN json_build_object('ok', false, 'erro', 'Tipo de contagem inválido.');
  END IF;

  DELETE FROM estoques
   WHERE empresa_id = v_empresa AND tipo_contagem = p_tipo
     AND data_contagem >= p_data AND data_contagem <= p_data_fim;

  IF p_itens IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
      INSERT INTO estoques (empresa_id, produto_id, quantidade, valor_unitario, tipo_contagem, data_contagem)
      VALUES (v_empresa, (v_item->>'produto_id')::INT,
              COALESCE((v_item->>'quantidade')::NUMERIC, 0),
              COALESCE((v_item->>'valor_unitario')::NUMERIC, 0), p_tipo, p_data);
      v_qtd := v_qtd + 1;
    END LOOP;
  END IF;

  RETURN json_build_object('ok', true, 'itens', v_qtd);
END;
$$;
GRANT EXECUTE ON FUNCTION salvar_contagem(TEXT, DATE, DATE, JSONB) TO authenticated;

-- 17.5 — Ingredientes da ficha técnica de forma atômica (delete + insert numa transação)
CREATE OR REPLACE FUNCTION salvar_ficha_ingredientes(p_ficha_id UUID, p_itens JSONB)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_dona    UUID;
  v_item    JSONB;
  v_qtd     INT := 0;
BEGIN
  v_empresa := minha_empresa_id();
  IF v_empresa IS NULL THEN
    RETURN json_build_object('ok', false, 'erro', 'Usuário sem empresa vinculada.');
  END IF;

  SELECT empresa_id INTO v_dona FROM fichas_tecnicas WHERE id = p_ficha_id;
  IF v_dona IS NULL OR v_dona <> v_empresa THEN
    RETURN json_build_object('ok', false, 'erro', 'Ficha não encontrada ou de outra empresa.');
  END IF;

  DELETE FROM ficha_ingredientes WHERE ficha_id = p_ficha_id;

  IF p_itens IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
      INSERT INTO ficha_ingredientes (ficha_id, produto_id, quantidade)
      VALUES (
        p_ficha_id,
        (v_item->>'produto_id')::INT,
        COALESCE((v_item->>'quantidade')::NUMERIC, 0)
      );
      v_qtd := v_qtd + 1;
    END LOOP;
  END IF;

  RETURN json_build_object('ok', true, 'itens', v_qtd);
END;
$$;
GRANT EXECUTE ON FUNCTION salvar_ficha_ingredientes(UUID, JSONB) TO authenticated;


-- ================================================================
-- CONCLUÍDO — SCHEMA v12 DEFINITIVO
-- 14 tabelas · 12 RPCs · RLS em todas as tabelas · CHECKs de integridade
-- Plano Básico:   CMV · Estoque · Fichas · Relatórios · Sistema
-- Plano Completo: + Ruptura (v10) · + Compras (v10) · + Cardápio BCG (v10)
-- Segurança v12: PIN com hash bcrypt, cadastro sem escalonamento de
--   privilégio, INSERT direto fechado em empresas/perfis.
-- DEV: plano default = 'completo' · usuários e dados zerados a cada run
-- ================================================================
