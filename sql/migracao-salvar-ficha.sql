-- ================================================================
-- MIGRAÇÃO INCREMENTAL — RPC atômica de ingredientes da Ficha Técnica
-- Data: 2026-05-29
--
-- PROBLEMA: a edição de ficha fazia DELETE + INSERT em dois passos
--   separados no cliente. Se o INSERT falhasse, a ficha ficava SEM
--   ingredientes (corrompida).
--
-- SOLUÇÃO: substituir pelos dois passos dentro de uma única transação
--   no servidor (SECURITY DEFINER), no mesmo padrão da salvar_contagem.
--
-- INSTRUÇÕES: cole no SQL Editor do Supabase e clique Run.
--   É seguro rodar múltiplas vezes (CREATE OR REPLACE). Sem perda de dados.
-- ================================================================

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

  -- Confirma que a ficha existe E pertence à empresa do usuário (defesa extra além da RLS)
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
