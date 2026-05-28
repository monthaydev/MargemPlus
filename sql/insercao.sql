-- ================================================================
-- MARGEM+ — DADOS DE TESTE (insercao.sql)
-- Data: 2026-05-27
--
-- PRÉ-REQUISITO: rode schema.sql primeiro, depois crie sua conta
-- no app (tela de cadastro como Dono). Só então rode este arquivo.
--
-- O QUE CRIA:
--   • 15 insumos em 7 categorias
--   • 5 fichas técnicas → todos os 4 quadrantes BCG
--   • 2 locais de estoque
--   • 3 semanas fechadas de CMV (S1/S2/S3) com faturamento crescente
--   • Compras semanais para todos os insumos
--   • Contagens Inicial e Final de estoque (4 pontos = 3 períodos)
--   • Vendas de pratos por semana → alimenta motor BCG
--   • Lotes com datas de validade → ativa risco_perda (FEFO)
--   • Saídas avulsas (quebras/desperdícios)
--
-- RESULTADO ESPERADO NOS MOTORES:
--   Ruptura:  🔴 Frango, Camarão, Queijo | 🟠 Tomate, Alface, Pão
--   BCG:      ⭐ Frango | 🐎 Macarrão | ❓ Filé, Salada | 🍍 Executivo
--   Compras:  sugestões coerentes com os alertas de ruptura
-- ================================================================

DO $$
DECLARE
  v_empresa_id UUID;

  -- Produtos
  id_frango    INT;  id_carne    INT;  id_file    INT;
  id_camarao   INT;  id_tomate   INT;  id_cebola  INT;
  id_alface    INT;  id_batata   INT;  id_arroz   INT;
  id_feijao    INT;  id_macarrao INT;  id_queijo  INT;
  id_creme     INT;  id_oleo     INT;  id_pao     INT;

  -- Fichas técnicas
  fid_frango   UUID;  fid_bolonhesa UUID;  fid_file   UUID;
  fid_exec     UUID;  fid_salada    UUID;

  -- Locais de estoque
  loc_almox    UUID;  loc_cozinha  UUID;

  -- Semanas
  s1_ini DATE := '2026-05-05'; s1_fim DATE := '2026-05-11';
  s2_ini DATE := '2026-05-12'; s2_fim DATE := '2026-05-18';
  s3_ini DATE := '2026-05-19'; s3_fim DATE := '2026-05-25';

BEGIN
  -- ── Empresa ───────────────────────────────────────────────────
  SELECT id INTO v_empresa_id FROM empresas LIMIT 1;
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa encontrada. Crie sua conta no app primeiro.';
  END IF;

  -- Configura categorias e meta
  UPDATE empresas SET
    meta_cmv            = 35,
    imposto_padrao_pct  = 6,
    dias_alerta_lote    = 7,
    categorias_produtos = '["Carnes","Pescados","Hortifruti","Secos","Laticínios","Condimentos","Panificação"]'::jsonb
  WHERE id = v_empresa_id;

  -- ── Locais de estoque ─────────────────────────────────────────
  INSERT INTO locais_estoque (empresa_id, nome, tipo) VALUES
    (v_empresa_id, 'Almoxarifado Principal', 'almoxarifado'),
    (v_empresa_id, 'Cozinha',                'cozinha');

  SELECT id INTO loc_almox   FROM locais_estoque WHERE empresa_id = v_empresa_id AND nome = 'Almoxarifado Principal';
  SELECT id INTO loc_cozinha FROM locais_estoque WHERE empresa_id = v_empresa_id AND nome = 'Cozinha';

  -- ── 15 Insumos ────────────────────────────────────────────────
  INSERT INTO produtos (empresa_id, nome, unidade, grupo, rendimento) VALUES
    (v_empresa_id, 'Frango Peito',        'KG', 'Carnes',      85),
    (v_empresa_id, 'Carne Moída',         'KG', 'Carnes',     100),
    (v_empresa_id, 'Filé Mignon',         'KG', 'Carnes',      90),
    (v_empresa_id, 'Camarão Limpo',       'KG', 'Pescados',    80),
    (v_empresa_id, 'Tomate',              'KG', 'Hortifruti',  90),
    (v_empresa_id, 'Cebola',              'KG', 'Hortifruti',  80),
    (v_empresa_id, 'Alface Crespa',       'UN', 'Hortifruti', 100),
    (v_empresa_id, 'Batata Inglesa',      'KG', 'Hortifruti',  85),
    (v_empresa_id, 'Arroz Agulhinha',     'KG', 'Secos',      100),
    (v_empresa_id, 'Feijão Carioca',      'KG', 'Secos',      100),
    (v_empresa_id, 'Macarrão Espaguete',  'KG', 'Secos',      100),
    (v_empresa_id, 'Queijo Mussarela',    'KG', 'Laticínios', 100),
    (v_empresa_id, 'Creme de Leite',      'L',  'Laticínios', 100),
    (v_empresa_id, 'Óleo de Soja',        'L',  'Condimentos',100),
    (v_empresa_id, 'Pão de Hambúrguer',   'UN', 'Panificação',100);

  SELECT id INTO id_frango    FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Frango Peito';
  SELECT id INTO id_carne     FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Carne Moída';
  SELECT id INTO id_file      FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Filé Mignon';
  SELECT id INTO id_camarao   FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Camarão Limpo';
  SELECT id INTO id_tomate    FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Tomate';
  SELECT id INTO id_cebola    FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Cebola';
  SELECT id INTO id_alface    FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Alface Crespa';
  SELECT id INTO id_batata    FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Batata Inglesa';
  SELECT id INTO id_arroz     FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Arroz Agulhinha';
  SELECT id INTO id_feijao    FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Feijão Carioca';
  SELECT id INTO id_macarrao  FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Macarrão Espaguete';
  SELECT id INTO id_queijo    FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Queijo Mussarela';
  SELECT id INTO id_creme     FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Creme de Leite';
  SELECT id INTO id_oleo      FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Óleo de Soja';
  SELECT id INTO id_pao       FROM produtos WHERE empresa_id = v_empresa_id AND nome = 'Pão de Hambúrguer';

  -- ── 5 Fichas Técnicas ─────────────────────────────────────────
  -- Parâmetros de precificação:
  --   Frango:    custo ~R$8.18  | venda R$38.90 | margem 73% → ⭐ ESTRELA
  --   Bolonhesa: custo ~R$11.49 | venda R$32.00 | margem 60% → 🐎 CAVALO
  --   Filé:      custo ~R$17.53 | venda R$89.00 | margem 75% → ❓ INTERROGAÇÃO
  --   Executivo: custo ~R$9.17  | venda R$29.90 | margem 63% → 🍍 ABACAXI
  --   Salada:    custo ~R$7.51  | venda R$34.00 | margem 72% → ❓ INTERROGAÇÃO
  -- Todos com impostos_pct = 6 (Simples Nacional)

  INSERT INTO fichas_tecnicas
    (empresa_id, nome, categoria, porcoes, preco_venda, margem_desejada, impostos_pct, embalagem_custo, tempo_preparo, modo_preparo)
  VALUES
    (v_empresa_id, 'Frango Grelhado com Arroz e Feijão', 'Prato Principal', 1, 38.90, 73, 6, 0.50, 25,
     'Temperar frango e grelhar em frigideira quente. Servir com arroz e feijão.'),
    (v_empresa_id, 'Macarrão à Bolonhesa',               'Massas',          1, 32.00, 60, 6, 0.50, 30,
     'Refogar carne moída com tomate e cebola. Cozinhar macarrão e servir com molho.'),
    (v_empresa_id, 'Filé ao Molho de Queijo',            'Prato Principal', 1, 89.00, 75, 6, 1.00, 40,
     'Selar filé na manteiga. Preparar molho com creme de leite e queijo.'),
    (v_empresa_id, 'Prato Executivo',                    'Prato Principal', 1, 29.90, 63, 6, 0.50, 20,
     'Frango desfiado com arroz, feijão, salada e molho da casa.'),
    (v_empresa_id, 'Salada Caesar com Frango',           'Saladas',         1, 34.00, 72, 6, 0.80, 15,
     'Frango grelhado sobre alface crespa com queijo ralado e molho caesar.');

  SELECT id INTO fid_frango    FROM fichas_tecnicas WHERE empresa_id = v_empresa_id AND nome = 'Frango Grelhado com Arroz e Feijão';
  SELECT id INTO fid_bolonhesa FROM fichas_tecnicas WHERE empresa_id = v_empresa_id AND nome = 'Macarrão à Bolonhesa';
  SELECT id INTO fid_file      FROM fichas_tecnicas WHERE empresa_id = v_empresa_id AND nome = 'Filé ao Molho de Queijo';
  SELECT id INTO fid_exec      FROM fichas_tecnicas WHERE empresa_id = v_empresa_id AND nome = 'Prato Executivo';
  SELECT id INTO fid_salada    FROM fichas_tecnicas WHERE empresa_id = v_empresa_id AND nome = 'Salada Caesar com Frango';

  -- Ingredientes das fichas
  -- Frango Grelhado (custo base: 0.22kg frango + 0.10kg arroz + 0.08kg feijão + 0.05kg tomate + 0.03kg cebola + 0.01L óleo)
  INSERT INTO ficha_ingredientes (ficha_id, produto_id, quantidade) VALUES
    (fid_frango, id_frango,   0.220),
    (fid_frango, id_arroz,    0.100),
    (fid_frango, id_feijao,   0.080),
    (fid_frango, id_tomate,   0.050),
    (fid_frango, id_cebola,   0.030),
    (fid_frango, id_oleo,     0.010);

  -- Macarrão à Bolonhesa
  INSERT INTO ficha_ingredientes (ficha_id, produto_id, quantidade) VALUES
    (fid_bolonhesa, id_macarrao, 0.200),
    (fid_bolonhesa, id_carne,    0.180),
    (fid_bolonhesa, id_tomate,   0.120),
    (fid_bolonhesa, id_cebola,   0.060),
    (fid_bolonhesa, id_oleo,     0.015);

  -- Filé ao Molho de Queijo
  INSERT INTO ficha_ingredientes (ficha_id, produto_id, quantidade) VALUES
    (fid_file, id_file,   0.250),
    (fid_file, id_queijo, 0.080),
    (fid_file, id_creme,  0.100),
    (fid_file, id_cebola, 0.040),
    (fid_file, id_batata, 0.200);

  -- Prato Executivo (frango desfiado menor + guarnição)
  INSERT INTO ficha_ingredientes (ficha_id, produto_id, quantidade) VALUES
    (fid_exec, id_frango,  0.150),
    (fid_exec, id_arroz,   0.120),
    (fid_exec, id_feijao,  0.100),
    (fid_exec, id_alface,  0.500),
    (fid_exec, id_tomate,  0.060),
    (fid_exec, id_oleo,    0.010);

  -- Salada Caesar com Frango
  INSERT INTO ficha_ingredientes (ficha_id, produto_id, quantidade) VALUES
    (fid_salada, id_frango, 0.160),
    (fid_salada, id_alface, 1.000),
    (fid_salada, id_queijo, 0.040),
    (fid_salada, id_tomate, 0.080),
    (fid_salada, id_cebola, 0.020);

  -- ── Compras — Semana 1 (entrada 2026-05-05) ───────────────────
  INSERT INTO compras (empresa_id, produto_id, quantidade, valor_unitario, data_compra) VALUES
    (v_empresa_id, id_frango,   15.0, 18.90, s1_ini),
    (v_empresa_id, id_carne,    12.0, 22.50, s1_ini),
    (v_empresa_id, id_file,      5.0, 68.00, s1_ini),
    (v_empresa_id, id_camarao,   4.0, 45.00, s1_ini),
    (v_empresa_id, id_tomate,   10.0,  5.80, s1_ini),
    (v_empresa_id, id_cebola,    8.0,  3.20, s1_ini),
    (v_empresa_id, id_alface,   30.0,  2.50, s1_ini),
    (v_empresa_id, id_batata,    8.0,  4.50, s1_ini),
    (v_empresa_id, id_arroz,    10.0,  4.80, s1_ini),
    (v_empresa_id, id_feijao,    8.0,  7.20, s1_ini),
    (v_empresa_id, id_macarrao, 10.0,  6.50, s1_ini),
    (v_empresa_id, id_queijo,    5.0, 32.00, s1_ini),
    (v_empresa_id, id_creme,     4.0, 12.00, s1_ini),
    (v_empresa_id, id_oleo,      4.0,  8.50, s1_ini),
    (v_empresa_id, id_pao,      60.0,  1.20, s1_ini);

  -- Compras — Semana 2 (entrada 2026-05-12)
  INSERT INTO compras (empresa_id, produto_id, quantidade, valor_unitario, data_compra) VALUES
    (v_empresa_id, id_frango,   16.0, 19.20, s2_ini),
    (v_empresa_id, id_carne,    13.0, 22.50, s2_ini),
    (v_empresa_id, id_file,      4.0, 68.00, s2_ini),
    (v_empresa_id, id_camarao,   4.0, 46.00, s2_ini),
    (v_empresa_id, id_tomate,   11.0,  5.80, s2_ini),
    (v_empresa_id, id_cebola,    8.0,  3.20, s2_ini),
    (v_empresa_id, id_alface,   32.0,  2.50, s2_ini),
    (v_empresa_id, id_batata,    8.0,  4.50, s2_ini),
    (v_empresa_id, id_arroz,    10.0,  4.80, s2_ini),
    (v_empresa_id, id_feijao,    8.0,  7.20, s2_ini),
    (v_empresa_id, id_macarrao, 11.0,  6.60, s2_ini),
    (v_empresa_id, id_queijo,    5.0, 32.50, s2_ini),
    (v_empresa_id, id_creme,     4.0, 12.00, s2_ini),
    (v_empresa_id, id_oleo,      4.0,  8.50, s2_ini),
    (v_empresa_id, id_pao,      65.0,  1.20, s2_ini);

  -- Compras — Semana 3 (entrada 2026-05-19)
  INSERT INTO compras (empresa_id, produto_id, quantidade, valor_unitario, data_compra) VALUES
    (v_empresa_id, id_frango,   18.0, 19.50, s3_ini),
    (v_empresa_id, id_carne,    14.0, 23.00, s3_ini),
    (v_empresa_id, id_file,      4.0, 69.00, s3_ini),
    (v_empresa_id, id_camarao,   5.0, 46.00, s3_ini),
    (v_empresa_id, id_tomate,   12.0,  5.90, s3_ini),
    (v_empresa_id, id_cebola,    9.0,  3.30, s3_ini),
    (v_empresa_id, id_alface,   35.0,  2.60, s3_ini),
    (v_empresa_id, id_batata,    9.0,  4.60, s3_ini),
    (v_empresa_id, id_arroz,    11.0,  4.80, s3_ini),
    (v_empresa_id, id_feijao,    9.0,  7.20, s3_ini),
    (v_empresa_id, id_macarrao, 12.0,  6.60, s3_ini),
    (v_empresa_id, id_queijo,    5.0, 33.00, s3_ini),
    (v_empresa_id, id_creme,     5.0, 12.00, s3_ini),
    (v_empresa_id, id_oleo,      5.0,  8.50, s3_ini),
    (v_empresa_id, id_pao,      70.0,  1.20, s3_ini);

  -- ── Contagens de Estoque ──────────────────────────────────────
  -- Ponto 0: Inicial da S1 (início do período) — 2026-05-05
  INSERT INTO estoques (empresa_id, produto_id, quantidade, valor_unitario, tipo_contagem, data_contagem) VALUES
    (v_empresa_id, id_frango,    2.0, 18.50, 'Inicial', s1_ini),
    (v_empresa_id, id_carne,     3.0, 22.00, 'Inicial', s1_ini),
    (v_empresa_id, id_file,      1.5, 67.00, 'Inicial', s1_ini),
    (v_empresa_id, id_camarao,   1.0, 44.00, 'Inicial', s1_ini),
    (v_empresa_id, id_tomate,    2.0,  5.50, 'Inicial', s1_ini),
    (v_empresa_id, id_cebola,    2.0,  3.00, 'Inicial', s1_ini),
    (v_empresa_id, id_alface,    5.0,  2.40, 'Inicial', s1_ini),
    (v_empresa_id, id_batata,    3.0,  4.20, 'Inicial', s1_ini),
    (v_empresa_id, id_arroz,     5.0,  4.70, 'Inicial', s1_ini),
    (v_empresa_id, id_feijao,    4.0,  7.00, 'Inicial', s1_ini),
    (v_empresa_id, id_macarrao,  4.0,  6.30, 'Inicial', s1_ini),
    (v_empresa_id, id_queijo,    2.0, 31.00, 'Inicial', s1_ini),
    (v_empresa_id, id_creme,     1.0, 11.50, 'Inicial', s1_ini),
    (v_empresa_id, id_oleo,      2.0,  8.20, 'Inicial', s1_ini),
    (v_empresa_id, id_pao,      10.0,  1.15, 'Inicial', s1_ini);

  -- Ponto 1: Final da S1 / Inicial da S2 — 2026-05-11
  -- Consumo S1 = EI + Compras - EF
  INSERT INTO estoques (empresa_id, produto_id, quantidade, valor_unitario, tipo_contagem, data_contagem) VALUES
    (v_empresa_id, id_frango,    3.5, 18.90, 'Final',   s1_fim),
    (v_empresa_id, id_carne,     4.2, 22.50, 'Final',   s1_fim),
    (v_empresa_id, id_file,      4.0, 68.00, 'Final',   s1_fim),
    (v_empresa_id, id_camarao,   2.0, 45.00, 'Final',   s1_fim),
    (v_empresa_id, id_tomate,    3.5,  5.80, 'Final',   s1_fim),
    (v_empresa_id, id_cebola,    3.0,  3.20, 'Final',   s1_fim),
    (v_empresa_id, id_alface,    9.0,  2.50, 'Final',   s1_fim),
    (v_empresa_id, id_batata,    5.5,  4.50, 'Final',   s1_fim),
    (v_empresa_id, id_arroz,     7.5,  4.80, 'Final',   s1_fim),
    (v_empresa_id, id_feijao,    6.0,  7.20, 'Final',   s1_fim),
    (v_empresa_id, id_macarrao,  6.5,  6.50, 'Final',   s1_fim),
    (v_empresa_id, id_queijo,    3.5, 32.00, 'Final',   s1_fim),
    (v_empresa_id, id_creme,     2.2, 12.00, 'Final',   s1_fim),
    (v_empresa_id, id_oleo,      3.8,  8.50, 'Final',   s1_fim),
    (v_empresa_id, id_pao,      14.0,  1.20, 'Final',   s1_fim);

  INSERT INTO estoques (empresa_id, produto_id, quantidade, valor_unitario, tipo_contagem, data_contagem) VALUES
    (v_empresa_id, id_frango,    3.5, 18.90, 'Inicial', s2_ini),
    (v_empresa_id, id_carne,     4.2, 22.50, 'Inicial', s2_ini),
    (v_empresa_id, id_file,      4.0, 68.00, 'Inicial', s2_ini),
    (v_empresa_id, id_camarao,   2.0, 45.00, 'Inicial', s2_ini),
    (v_empresa_id, id_tomate,    3.5,  5.80, 'Inicial', s2_ini),
    (v_empresa_id, id_cebola,    3.0,  3.20, 'Inicial', s2_ini),
    (v_empresa_id, id_alface,    9.0,  2.50, 'Inicial', s2_ini),
    (v_empresa_id, id_batata,    5.5,  4.50, 'Inicial', s2_ini),
    (v_empresa_id, id_arroz,     7.5,  4.80, 'Inicial', s2_ini),
    (v_empresa_id, id_feijao,    6.0,  7.20, 'Inicial', s2_ini),
    (v_empresa_id, id_macarrao,  6.5,  6.50, 'Inicial', s2_ini),
    (v_empresa_id, id_queijo,    3.5, 32.00, 'Inicial', s2_ini),
    (v_empresa_id, id_creme,     2.2, 12.00, 'Inicial', s2_ini),
    (v_empresa_id, id_oleo,      3.8,  8.50, 'Inicial', s2_ini),
    (v_empresa_id, id_pao,      14.0,  1.20, 'Inicial', s2_ini);

  -- Ponto 2: Final da S2 / Inicial da S3 — 2026-05-18
  INSERT INTO estoques (empresa_id, produto_id, quantidade, valor_unitario, tipo_contagem, data_contagem) VALUES
    (v_empresa_id, id_frango,    2.8, 19.20, 'Final',   s2_fim),
    (v_empresa_id, id_carne,     4.5, 22.50, 'Final',   s2_fim),
    (v_empresa_id, id_file,      5.5, 68.00, 'Final',   s2_fim),
    (v_empresa_id, id_camarao,   2.5, 46.00, 'Final',   s2_fim),
    (v_empresa_id, id_tomate,    3.8,  5.80, 'Final',   s2_fim),
    (v_empresa_id, id_cebola,    3.3,  3.20, 'Final',   s2_fim),
    (v_empresa_id, id_alface,    8.0,  2.50, 'Final',   s2_fim),
    (v_empresa_id, id_batata,    5.8,  4.50, 'Final',   s2_fim),
    (v_empresa_id, id_arroz,     8.2,  4.80, 'Final',   s2_fim),
    (v_empresa_id, id_feijao,    6.5,  7.20, 'Final',   s2_fim),
    (v_empresa_id, id_macarrao,  6.8,  6.60, 'Final',   s2_fim),
    (v_empresa_id, id_queijo,    3.2, 32.50, 'Final',   s2_fim),
    (v_empresa_id, id_creme,     2.5, 12.00, 'Final',   s2_fim),
    (v_empresa_id, id_oleo,      4.2,  8.50, 'Final',   s2_fim),
    (v_empresa_id, id_pao,      15.0,  1.20, 'Final',   s2_fim);

  INSERT INTO estoques (empresa_id, produto_id, quantidade, valor_unitario, tipo_contagem, data_contagem) VALUES
    (v_empresa_id, id_frango,    2.8, 19.20, 'Inicial', s3_ini),
    (v_empresa_id, id_carne,     4.5, 22.50, 'Inicial', s3_ini),
    (v_empresa_id, id_file,      5.5, 68.00, 'Inicial', s3_ini),
    (v_empresa_id, id_camarao,   2.5, 46.00, 'Inicial', s3_ini),
    (v_empresa_id, id_tomate,    3.8,  5.80, 'Inicial', s3_ini),
    (v_empresa_id, id_cebola,    3.3,  3.20, 'Inicial', s3_ini),
    (v_empresa_id, id_alface,    8.0,  2.50, 'Inicial', s3_ini),
    (v_empresa_id, id_batata,    5.8,  4.50, 'Inicial', s3_ini),
    (v_empresa_id, id_arroz,     8.2,  4.80, 'Inicial', s3_ini),
    (v_empresa_id, id_feijao,    6.5,  7.20, 'Inicial', s3_ini),
    (v_empresa_id, id_macarrao,  6.8,  6.60, 'Inicial', s3_ini),
    (v_empresa_id, id_queijo,    3.2, 32.50, 'Inicial', s3_ini),
    (v_empresa_id, id_creme,     2.5, 12.00, 'Inicial', s3_ini),
    (v_empresa_id, id_oleo,      4.2,  8.50, 'Inicial', s3_ini),
    (v_empresa_id, id_pao,      15.0,  1.20, 'Inicial', s3_ini);

  -- Ponto 3: Final da S3 (estoque atual — gatilha alertas de ruptura) — 2026-05-25
  -- Frango: 0.7kg 🔴 | Camarão: 0.9kg 🔴 | Queijo: 1.8kg 🔴
  -- Tomate: 2.2kg 🟠 | Alface: 6un 🟠 | Pão: 8un 🟠
  -- Restante: níveis moderados (atenção)
  INSERT INTO estoques (empresa_id, produto_id, quantidade, valor_unitario, tipo_contagem, data_contagem) VALUES
    (v_empresa_id, id_frango,    0.7, 19.50, 'Final',   s3_fim),
    (v_empresa_id, id_carne,     5.2, 23.00, 'Final',   s3_fim),
    (v_empresa_id, id_file,      7.5, 69.00, 'Final',   s3_fim),
    (v_empresa_id, id_camarao,   0.9, 46.00, 'Final',   s3_fim),
    (v_empresa_id, id_tomate,    2.2,  5.90, 'Final',   s3_fim),
    (v_empresa_id, id_cebola,    4.0,  3.30, 'Final',   s3_fim),
    (v_empresa_id, id_alface,    6.0,  2.60, 'Final',   s3_fim),
    (v_empresa_id, id_batata,    6.5,  4.60, 'Final',   s3_fim),
    (v_empresa_id, id_arroz,     9.0,  4.80, 'Final',   s3_fim),
    (v_empresa_id, id_feijao,    7.2,  7.20, 'Final',   s3_fim),
    (v_empresa_id, id_macarrao,  5.5,  6.60, 'Final',   s3_fim),
    (v_empresa_id, id_queijo,    1.8, 33.00, 'Final',   s3_fim),
    (v_empresa_id, id_creme,     3.5, 12.00, 'Final',   s3_fim),
    (v_empresa_id, id_oleo,      5.5,  8.50, 'Final',   s3_fim),
    (v_empresa_id, id_pao,       8.0,  1.20, 'Final',   s3_fim);

  -- ── Finanças Semanais (3 semanas fechadas) ────────────────────
  -- outros_custos: chaves devem corresponder à categorias_custos da empresa
  INSERT INTO financas_semanais
    (empresa_id, data_inicio, data_fim, faturamento, outros_custos, status)
  VALUES
    (v_empresa_id, s1_ini, s1_fim, 4600.00,
     '{"Embalagens": 120.00, "Material de Limpeza": 45.00, "Gás": 80.00, "Descartáveis": 60.00}'::jsonb,
     'fechado'),
    (v_empresa_id, s2_ini, s2_fim, 4600.00,
     '{"Embalagens": 130.00, "Material de Limpeza": 45.00, "Gás": 80.00, "Descartáveis": 65.00}'::jsonb,
     'fechado'),
    (v_empresa_id, s3_ini, s3_fim, 5500.00,
     '{"Embalagens": 150.00, "Material de Limpeza": 50.00, "Gás": 90.00, "Descartáveis": 75.00}'::jsonb,
     'fechado');

  -- ── Vendas de Pratos por semana (motor BCG) ───────────────────
  -- S1: Frango 62 | Bolonhesa 48 | Filé 9 | Executivo 31 | Salada 14  → total 164
  -- S2: Frango 75 | Bolonhesa 54 | Filé 12| Executivo 28 | Salada 11  → total 180
  -- S3: Frango 92 | Bolonhesa 63 | Filé 8 | Executivo 33 | Salada 17  → total 213
  -- Acumulado:  229      165        29        92           42  total 557
  -- % partc:   41.1%   29.6%     5.2%     16.5%         7.5%
  -- Médias: margem_media ≈ 74% | partc_media ≈ 20%
  --   → Frango    78.8% margem, 41.1% partc  → ESTRELA  ✓
  --   → Bolonhesa 64.1% margem, 29.6% partc  → CAVALO   ✓
  --   → Filé      80.3% margem,  5.2% partc  → INTERROGAÇÃO ✓
  --   → Executivo 69.3% margem, 16.5% partc  → ABACAXI  ✓
  --   → Salada    77.9% margem,  7.5% partc  → INTERROGAÇÃO ✓
  INSERT INTO vendas_pratos (empresa_id, ficha_id, semana_inicio, semana_fim, quantidade_vendida) VALUES
    (v_empresa_id, fid_frango,    s1_ini, s1_fim,  62),
    (v_empresa_id, fid_bolonhesa, s1_ini, s1_fim,  48),
    (v_empresa_id, fid_file,      s1_ini, s1_fim,   9),
    (v_empresa_id, fid_exec,      s1_ini, s1_fim,  31),
    (v_empresa_id, fid_salada,    s1_ini, s1_fim,  14),
    (v_empresa_id, fid_frango,    s2_ini, s2_fim,  75),
    (v_empresa_id, fid_bolonhesa, s2_ini, s2_fim,  54),
    (v_empresa_id, fid_file,      s2_ini, s2_fim,  12),
    (v_empresa_id, fid_exec,      s2_ini, s2_fim,  28),
    (v_empresa_id, fid_salada,    s2_ini, s2_fim,  11),
    (v_empresa_id, fid_frango,    s3_ini, s3_fim,  92),
    (v_empresa_id, fid_bolonhesa, s3_ini, s3_fim,  63),
    (v_empresa_id, fid_file,      s3_ini, s3_fim,   8),
    (v_empresa_id, fid_exec,      s3_ini, s3_fim,  33),
    (v_empresa_id, fid_salada,    s3_ini, s3_fim,  17);

  -- ── Lotes (FEFO — risco_perda ativado para alguns) ────────────
  -- Alface vence 28/mai → risco_perda TRUE (estoque dura ~3d, lote vence em 1d)
  -- Queijo vence 29/mai → risco_perda TRUE
  -- Camarão vence 01/jun → próximo do limite
  -- Frango vence 03/jun
  -- Filé vence 16/jun → OK, estoque alto (dias_restantes ~38d)
  INSERT INTO lotes
    (empresa_id, produto_id, local_id, numero_lote, data_entrada, data_validade,
     quantidade_orig, quantidade_atual, custo_unitario, fornecedor, status)
  VALUES
    (v_empresa_id, id_alface,  loc_cozinha, 'ALF-052601', '2026-05-19', '2026-05-28',
     35.0, 6.0, 2.60, 'Hortifruti São João', 'ativo'),

    (v_empresa_id, id_queijo,  loc_almox,   'QUE-052601', '2026-05-20', '2026-05-29',
     5.0,  1.8, 33.00, 'Laticínios Bela Vista', 'ativo'),

    (v_empresa_id, id_camarao, loc_almox,   'CAM-052601', '2026-05-22', '2026-06-01',
     5.0,  0.9, 46.00, 'Pescados do Litoral', 'ativo'),

    (v_empresa_id, id_frango,  loc_almox,   'FRA-052601', '2026-05-24', '2026-06-03',
     18.0, 0.7, 19.50, 'Frigorífico Norte', 'ativo'),

    (v_empresa_id, id_file,    loc_almox,   'FIL-052601', '2026-05-20', '2026-06-16',
     4.0,  7.5, 69.00, 'Frigorífico Prime', 'ativo'),

    (v_empresa_id, id_carne,   loc_almox,   'CAR-052601', '2026-05-22', '2026-06-15',
     14.0, 5.2, 23.00, 'Frigorífico Norte', 'ativo'),

    (v_empresa_id, id_macarrao,loc_almox,   'MAC-052601', '2026-05-19', '2027-05-19',
     12.0, 5.5, 6.60,  'Distribuidora Central', 'ativo'),

    (v_empresa_id, id_arroz,   loc_almox,   'ARR-052601', '2026-05-19', '2027-05-19',
     11.0, 9.0, 4.80,  'Distribuidora Central', 'ativo'),

    (v_empresa_id, id_feijao,  loc_almox,   'FEI-052601', '2026-05-19', '2027-03-01',
     9.0,  7.2, 7.20,  'Distribuidora Central', 'ativo');

  -- ── Saídas Avulsas (quebras / desperdícios) ───────────────────
  INSERT INTO saidas_avulsas
    (empresa_id, produto_id, quantidade, valor_total, motivo, descricao_manual, data_saida)
  VALUES
    (v_empresa_id, id_frango,   0.3, 5.85,  'Quebra/Desperdício',
     'Frango com embalagem danificada — descartado na entrada', '2026-05-07'),

    (v_empresa_id, id_alface,   3.0, 7.80,  'Vencimento',
     'Alfaces amareladas vencidas antes do uso', '2026-05-15'),

    (v_empresa_id, id_macarrao, 0.5, 3.30,  'Quebra/Desperdício',
     'Embalagem rasgada durante armazenagem', '2026-05-21');

  -- ── Resultado ─────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '✅ MARGEM+ — DADOS DE TESTE INSERIDOS';
  RAISE NOTICE '   Empresa: %', v_empresa_id;
  RAISE NOTICE '   15 insumos em 7 categorias';
  RAISE NOTICE '   5 fichas técnicas (todos os 4 quadrantes BCG)';
  RAISE NOTICE '   2 locais de estoque (almoxarifado + cozinha)';
  RAISE NOTICE '   3 semanas fechadas de CMV';
  RAISE NOTICE '   9 lotes com datas de validade (FEFO ativo)';
  RAISE NOTICE '   3 saídas avulsas (quebras e vencimentos)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Módulos para testar:';
  RAISE NOTICE '   Dashboard  → 3 semanas de histórico, gráfico de linha';
  RAISE NOTICE '   Estoque    → contagens + lotes com alertas de validade';
  RAISE NOTICE '   Ruptura    → Frango/Camarão/Queijo críticos; Tomate/Alface alarme';
  RAISE NOTICE '   Compras    → sugestões coerentes com alertas';
  RAISE NOTICE '   Cardápio   → ⭐ Frango  🐎 Macarrão  ❓ Filé/Salada  🍍 Executivo';
  RAISE NOTICE '   Relatórios → exportar Excel/PDF das 3 semanas';

END $$;
