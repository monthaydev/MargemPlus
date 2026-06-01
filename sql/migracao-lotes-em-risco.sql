-- ================================================================
-- MARGEM+ — MIGRAÇÃO: lotes_em_risco turbinado (v11)
--
-- INSTRUÇÕES:
--   Cole este arquivo no SQL Editor do Supabase e clique Run.
--   É INCREMENTAL e SEGURO: não apaga nenhum dado — só substitui
--   a função lotes_em_risco. Pode rodar quantas vezes quiser.
--
-- O QUE MUDA:
--   A função agora retorna, além do que já trazia, o nome e a
--   unidade do insumo, o número do lote, o local de estoque,
--   o valor em risco (R$ = quantidade × custo) e a severidade
--   (vencido / critico / alerta).
-- ================================================================

-- Necessário DROP antes do CREATE porque o tipo de retorno mudou.
DROP FUNCTION IF EXISTS lotes_em_risco(INT) CASCADE;

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

-- ================================================================
-- FIM — rode o app e confira o alerta de validade no Dashboard.
-- ================================================================
