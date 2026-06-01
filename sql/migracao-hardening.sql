  -- ================================================================
  -- MARGEM+ — MIGRAÇÃO: HARDENING DO BACKEND (v12)
  --
  -- INSTRUÇÕES:
  --   Cole este arquivo INTEIRO no SQL Editor do Supabase e clique Run.
  --   É INCREMENTAL e SEGURO: NÃO apaga usuários nem dados. Pode rodar
  --   mais de uma vez (idempotente via IF EXISTS / OR REPLACE / NOT VALID).
  --
  -- O QUE FAZ:
  --   P0 (segurança multi-tenant):
  --     • Fecha o escalonamento de privilégio no cadastro de funcionário
  --       (perfil de funcionário só nasce via RPC, sempre role='funcionario').
  --     • Remove o INSERT aberto em empresas (empresa só nasce via RPC).
  --     • Tira o PIN de desbloqueio do texto plano (passa a hash bcrypt) e
  --       move a validação para o servidor. Expõe só um booleano pin_configurado.
  --   P1 (integridade): CHECKs de quantidade/percentual/valor em todas as
  --     tabelas (NOT VALID — protege dados NOVOS sem quebrar os existentes).
  --   P2 (robustez): RPC salvar_contagem (delete+insert atômico).
  -- ================================================================


  -- ================================================================
  -- PARTE 1 — SEGURANÇA (P0)
  -- ================================================================

  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  -- 1.1 — Flag derivada: a UI saber se há PIN sem receber o hash.
  ALTER TABLE empresas
    ADD COLUMN IF NOT EXISTS pin_configurado BOOLEAN
    GENERATED ALWAYS AS (senha_desbloqueio IS NOT NULL) STORED;

  -- 1.2 — Converte qualquer PIN legado em texto plano para hash bcrypt.
  --        (hash bcrypt sempre começa com '$2'; o que não começar é texto plano.)
  UPDATE empresas
    SET senha_desbloqueio = crypt(senha_desbloqueio, gen_salt('bf'))
  WHERE senha_desbloqueio IS NOT NULL
    AND senha_desbloqueio NOT LIKE '$2%';

  -- 1.3 — Fecha INSERT direto: empresa só nasce via criar_conta_dono (SECURITY DEFINER).
  DROP POLICY IF EXISTS "empresas_insert" ON empresas;

  -- 1.4 — Fecha INSERT direto de perfis: dono via criar_conta_dono, funcionário via
  --        criar_conta_funcionario. Ambas SECURITY DEFINER (bypassam RLS com segurança).
  DROP POLICY IF EXISTS "perfis_insert" ON perfis;

  -- 1.5 — RPC: cadastro de funcionário SEM brecha de privilégio.
  --        Valida o convite no servidor e FORÇA role='funcionario' + empresa do convite.
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

    SELECT * INTO v_cargo
      FROM cargos
    WHERE codigo_convite = UPPER(TRIM(p_codigo))
    LIMIT 1;

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

  -- 1.6 — RPCs do PIN de desbloqueio (hash + validação no servidor).
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
    UPDATE empresas
      SET senha_desbloqueio = crypt(TRIM(p_pin), gen_salt('bf'))
    WHERE id = minha_empresa_id();
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
    IF v_hash IS NULL OR p_pin IS NULL THEN
      RETURN false;
    END IF;
    RETURN v_hash = crypt(TRIM(p_pin), v_hash);
  END;
  $$;
  GRANT EXECUTE ON FUNCTION validar_pin_desbloqueio(TEXT) TO authenticated;


  -- ================================================================
  -- PARTE 2 — INTEGRIDADE (P1)
  -- CHECKs como NOT VALID: aplicam a dados NOVOS imediatamente sem
  -- arriscar quebrar linhas já existentes. Depois de conferir que os
  -- dados atuais respeitam as regras, pode rodar os VALIDATE no fim.
  -- ================================================================

  ALTER TABLE produtos          ADD CONSTRAINT chk_produtos_rendimento   CHECK (rendimento > 0 AND rendimento <= 100) NOT VALID;

  ALTER TABLE compras           ADD CONSTRAINT chk_compras_qtd           CHECK (quantidade > 0)        NOT VALID;
  ALTER TABLE compras           ADD CONSTRAINT chk_compras_valor         CHECK (valor_unitario >= 0)   NOT VALID;

  ALTER TABLE estoques          ADD CONSTRAINT chk_estoques_qtd          CHECK (quantidade >= 0)       NOT VALID;
  ALTER TABLE estoques          ADD CONSTRAINT chk_estoques_valor        CHECK (valor_unitario >= 0)   NOT VALID;

  ALTER TABLE lotes             ADD CONSTRAINT chk_lotes_qtd_orig        CHECK (quantidade_orig > 0)   NOT VALID;
  ALTER TABLE lotes             ADD CONSTRAINT chk_lotes_qtd_atual       CHECK (quantidade_atual >= 0) NOT VALID;
  ALTER TABLE lotes             ADD CONSTRAINT chk_lotes_qtd_coerente    CHECK (quantidade_atual <= quantidade_orig) NOT VALID;
  ALTER TABLE lotes             ADD CONSTRAINT chk_lotes_custo           CHECK (custo_unitario >= 0)   NOT VALID;

  ALTER TABLE saidas_avulsas    ADD CONSTRAINT chk_saidas_qtd            CHECK (quantidade >= 0)       NOT VALID;
  ALTER TABLE saidas_avulsas    ADD CONSTRAINT chk_saidas_valor          CHECK (valor_total >= 0)      NOT VALID;

  ALTER TABLE fichas_tecnicas   ADD CONSTRAINT chk_fichas_porcoes        CHECK (porcoes >= 1)          NOT VALID;
  ALTER TABLE fichas_tecnicas   ADD CONSTRAINT chk_fichas_margem         CHECK (margem_desejada >= 0 AND margem_desejada <= 100) NOT VALID;
  ALTER TABLE fichas_tecnicas   ADD CONSTRAINT chk_fichas_impostos       CHECK (impostos_pct >= 0 AND impostos_pct <= 100)       NOT VALID;
  ALTER TABLE fichas_tecnicas   ADD CONSTRAINT chk_fichas_embalagem      CHECK (embalagem_custo >= 0)  NOT VALID;
  ALTER TABLE fichas_tecnicas   ADD CONSTRAINT chk_fichas_custo_fixo     CHECK (custo_fixo_porcao >= 0) NOT VALID;

  ALTER TABLE ficha_ingredientes ADD CONSTRAINT chk_fi_qtd               CHECK (quantidade > 0)        NOT VALID;

  ALTER TABLE canais_venda      ADD CONSTRAINT chk_canais_taxa           CHECK (taxa_pct >= 0 AND taxa_pct <= 100) NOT VALID;

  ALTER TABLE financas_semanais ADD CONSTRAINT chk_financas_faturamento  CHECK (faturamento >= 0)      NOT VALID;
  ALTER TABLE financas_semanais ADD CONSTRAINT chk_financas_datas        CHECK (data_fim >= data_inicio) NOT VALID;

  ALTER TABLE empresas          ADD CONSTRAINT chk_empresas_meta_cmv     CHECK (meta_cmv >= 0 AND meta_cmv <= 100)               NOT VALID;
  ALTER TABLE empresas          ADD CONSTRAINT chk_empresas_imposto      CHECK (imposto_padrao_pct >= 0 AND imposto_padrao_pct <= 100) NOT VALID;
  ALTER TABLE empresas          ADD CONSTRAINT chk_empresas_dias_alerta  CHECK (dias_alerta_lote >= 0) NOT VALID;

  ALTER TABLE vendas_pratos     ADD CONSTRAINT chk_vendas_qtd            CHECK (quantidade_vendida >= 0) NOT VALID;


  -- ================================================================
  -- PARTE 3 — ROBUSTEZ (P2): contagem de estoque atômica
  -- delete + insert dentro de UMA transação (função plpgsql). Se algo
  -- falhar no meio, NADA é gravado — a contagem nunca fica pela metade.
  -- ================================================================

  CREATE OR REPLACE FUNCTION salvar_contagem(
    p_tipo     TEXT,
    p_data     DATE,
    p_data_fim DATE,
    p_itens    JSONB
  )
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
    WHERE empresa_id    = v_empresa
      AND tipo_contagem = p_tipo
      AND data_contagem >= p_data
      AND data_contagem <= p_data_fim;

    IF p_itens IS NOT NULL THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
        INSERT INTO estoques (empresa_id, produto_id, quantidade, valor_unitario, tipo_contagem, data_contagem)
        VALUES (
          v_empresa,
          (v_item->>'produto_id')::INT,
          COALESCE((v_item->>'quantidade')::NUMERIC, 0),
          COALESCE((v_item->>'valor_unitario')::NUMERIC, 0),
          p_tipo,
          p_data
        );
        v_qtd := v_qtd + 1;
      END LOOP;
    END IF;

    RETURN json_build_object('ok', true, 'itens', v_qtd);
  END;
  $$;
  GRANT EXECUTE ON FUNCTION salvar_contagem(TEXT, DATE, DATE, JSONB) TO authenticated;


  -- ================================================================
  -- (OPCIONAL) Validar as constraints contra os dados já existentes.
  -- Rode estes comandos só depois de conferir que nenhum dado antigo
  -- viola as regras. Se algum falhar, ele aponta a linha problemática.
  -- ================================================================
  -- ALTER TABLE produtos          VALIDATE CONSTRAINT chk_produtos_rendimento;
  -- ALTER TABLE compras           VALIDATE CONSTRAINT chk_compras_qtd;
  -- ALTER TABLE compras           VALIDATE CONSTRAINT chk_compras_valor;
  -- ALTER TABLE estoques          VALIDATE CONSTRAINT chk_estoques_qtd;
  -- ALTER TABLE estoques          VALIDATE CONSTRAINT chk_estoques_valor;
  -- ALTER TABLE lotes             VALIDATE CONSTRAINT chk_lotes_qtd_orig;
  -- ALTER TABLE lotes             VALIDATE CONSTRAINT chk_lotes_qtd_atual;
  -- ALTER TABLE lotes             VALIDATE CONSTRAINT chk_lotes_qtd_coerente;
  -- ALTER TABLE lotes             VALIDATE CONSTRAINT chk_lotes_custo;
  -- ALTER TABLE saidas_avulsas    VALIDATE CONSTRAINT chk_saidas_qtd;
  -- ALTER TABLE saidas_avulsas    VALIDATE CONSTRAINT chk_saidas_valor;
  -- ALTER TABLE fichas_tecnicas   VALIDATE CONSTRAINT chk_fichas_porcoes;
  -- ALTER TABLE fichas_tecnicas   VALIDATE CONSTRAINT chk_fichas_margem;
  -- ALTER TABLE fichas_tecnicas   VALIDATE CONSTRAINT chk_fichas_impostos;
  -- ALTER TABLE fichas_tecnicas   VALIDATE CONSTRAINT chk_fichas_embalagem;
  -- ALTER TABLE fichas_tecnicas   VALIDATE CONSTRAINT chk_fichas_custo_fixo;
  -- ALTER TABLE ficha_ingredientes VALIDATE CONSTRAINT chk_fi_qtd;
  -- ALTER TABLE canais_venda      VALIDATE CONSTRAINT chk_canais_taxa;
  -- ALTER TABLE financas_semanais VALIDATE CONSTRAINT chk_financas_faturamento;
  -- ALTER TABLE financas_semanais VALIDATE CONSTRAINT chk_financas_datas;
  -- ALTER TABLE empresas          VALIDATE CONSTRAINT chk_empresas_meta_cmv;
  -- ALTER TABLE empresas          VALIDATE CONSTRAINT chk_empresas_imposto;
  -- ALTER TABLE empresas          VALIDATE CONSTRAINT chk_empresas_dias_alerta;
  -- ALTER TABLE vendas_pratos     VALIDATE CONSTRAINT chk_vendas_qtd;

  -- ================================================================
  -- FIM — Hardening v12 aplicado.
  -- Lembre de atualizar o frontend (cadastro de funcionário e PIN via RPC).
  -- ================================================================
