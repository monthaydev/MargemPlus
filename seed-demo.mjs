/**
 * SEED DE DEMONSTRAÇÃO — Margem+
 * Cria uma conta real + dados realistas de restaurante.
 * Executa via: node seed-demo.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://uuacjauoxjluoqrbbdiv.supabase.co'
const ANON_KEY      = 'sb_publishable_z_H4YcwKS7RceDCO1TPVaA_kIeU8YI'

// ── Credenciais do usuário de demo ───────────────────────────────
const EMAIL    = 'joao@cantinadalua.com.br'
const PASSWORD = 'Margem@2026!'

const sb = createClient(SUPABASE_URL, ANON_KEY)

// ── Helpers ──────────────────────────────────────────────────────
function ok(label, data) { console.log(`  ✅ ${label}`, data ?? '') }
function warn(label, e)  { console.log(`  ⚠️  ${label}:`, e?.message ?? e) }
async function insert(table, rows, label) {
  const { data, error } = await sb.from(table).insert(rows).select()
  if (error) { warn(`INSERT ${table}`, error); return [] }
  ok(label ?? table, `(${data.length} linhas)`)
  return data
}

// ── Datas (hoje = 2026-05-25) ─────────────────────────────────────
const D0 = '2026-05-25'  // Final mais recente
const D1 = '2026-05-18'  // Final semana passada
const D2 = '2026-05-11'  // Final 2 semanas atrás
const D3 = '2026-05-04'  // Final 3 semanas atrás

const C32 = '2026-05-07'  // Compra entre D3 e D2
const C21 = '2026-05-14'  // Compra entre D2 e D1
const C10 = '2026-05-21'  // Compra entre D1 e D0

// ── Semanas das vendas de pratos ──────────────────────────────────
const SEMANAS = [
  { inicio: '2026-04-28', fim: '2026-05-04' }, // semana mais antiga
  { inicio: '2026-05-05', fim: '2026-05-11' },
  { inicio: '2026-05-12', fim: '2026-05-18' },
  { inicio: '2026-05-19', fim: '2026-05-25' }, // semana mais recente
]

// ─────────────────────────────────────────────────────────────────
// PRODUTOS
// [nome, unidade, grupo, rendimento, preços_semana [C32,C21,C10],
//  finais [D3,D2,D1,D0], validade_lote_dias]
// consumo = EI + compras - EF (por período)
// ─────────────────────────────────────────────────────────────────
const PRODUTOS_DEF = [
  // Carnes
  { nome:'Frango Peito',       un:'KG', grupo:'Carnes',      rend:85,
    preco:[22,22,23],
    // consumo semanas: 4 | 4 | 4 (estável, CRITICO)
    fins:[4, 5, 5, 1],   compras:[5, 4, 0],
    val_dias: 7 },
  { nome:'Carne Moída',        un:'KG', grupo:'Carnes',      rend:100,
    preco:[25,25,26],
    // consumo semanas: 2 | 3 | 4 (SUBINDO, ATENCAO)
    fins:[6, 9, 10, 6],  compras:[5, 4, 0],
    val_dias: 5 },
  { nome:'Filé Mignon',        un:'KG', grupo:'Carnes',      rend:90,
    preco:[85,85,88],
    // consumo semanas: 5 | 3 | 1.5 (CAINDO, OK)
    fins:[8, 13, 18, 19.5], compras:[10, 8, 3],
    val_dias: 10 },
  { nome:'Salmão Fresco',      un:'KG', grupo:'Peixes',      rend:80,
    preco:[62,62,65],
    // consumo ~2/sem, stock 3 → ATENCAO, lote vence em 3 dias → risco_perda
    fins:[5, 6, 5, 3],   compras:[3, 1, 0],
    val_dias: 4,   val_custom:'2026-05-28' }, // vence ANTES do stock acabar
  // Hortifruti
  { nome:'Tomate',             un:'KG', grupo:'Hortifruti',  rend:90,
    preco:[5,5,6],
    // consumo ~4/sem, stock 3 → ALERTA, lote vence em 2 dias → risco_perda
    fins:[6, 8, 9, 3],   compras:[6, 5, 0],
    val_dias: 5,   val_custom:'2026-05-27' },  // vence ANTES do stock acabar
  { nome:'Cebola',             un:'KG', grupo:'Hortifruti',  rend:80,
    preco:[4,4,4],
    // consumo ~3/sem, stock 6 → ATENCAO
    fins:[5, 7, 8, 6],   compras:[5, 4, 1],
    val_dias: 30 },
  { nome:'Alface Crespa',      un:'UN', grupo:'Hortifruti',  rend:100,
    preco:[3,3,4],
    // consumo ~8/sem, stock 5 → ALERTA (perecível)
    fins:[10, 15, 14, 5],  compras:[13, 7, 0],
    val_dias: 5,   val_custom:'2026-05-27' },
  // Secos
  { nome:'Arroz Agulhinha',    un:'KG', grupo:'Secos',       rend:100,
    preco:[4.5,4.5,4.8],
    // consumo ~8/sem, stock 20 → OK
    fins:[15, 20, 23, 20], compras:[13, 11, 5],
    val_dias: 365 },
  { nome:'Feijão Carioca',     un:'KG', grupo:'Secos',       rend:100,
    preco:[8,8,8.5],
    // consumo ~3/sem, stock 12 → OK
    fins:[8, 10, 12, 12],  compras:[5, 5, 3],
    val_dias: 365 },
  { nome:'Macarrão Espaguete', un:'KG', grupo:'Secos',       rend:100,
    preco:[6,6,6],
    // consumo ~4/sem, stock 10 → ATENCAO
    fins:[8, 10, 12, 10],  compras:[6, 6, 2],
    val_dias: 365 },
  // Laticínios e Condimentos
  { nome:'Queijo Mussarela',   un:'KG', grupo:'Laticínios',  rend:100,
    preco:[38,38,40],
    // consumo ~2/sem, stock 1.5 → ALERTA (perecível)
    fins:[3, 4, 4, 1.5],   compras:[3, 2, 0],
    val_dias: 14,  val_custom:'2026-05-29' },
  { nome:'Óleo de Soja',       un:'L',  grupo:'Condimentos',  rend:100,
    preco:[7,7,8],
    // consumo ~2/sem, stock 4 → ATENCAO
    fins:[4, 5, 5, 4],   compras:[3, 2, 1],
    val_dias: 365 },
]

// ── Fichas Técnicas
// [nome, categoria, preco_venda, margem_desejada, impostos_pct,
//  canal_nome, custo_fixo, embalagem, porcoes,
//  ingredientes: [{prod_nome, qtd}]]
// vendas por semana: [s1, s2, s3, s4]
const FICHAS_DEF = [
  {
    nome: 'Frango Grelhado com Arroz',
    categoria: 'Pratos Principais',
    preco_venda: 38,
    margem: 35,
    impostos: 8,
    canal: 'Balcão / Dinheiro',
    custo_fixo: 1.5,
    embalagem: 0.5,
    porcoes: 1,
    ings: [
      { prod: 'Frango Peito',   qtd: 0.25 },
      { prod: 'Arroz Agulhinha', qtd: 0.15 },
      { prod: 'Tomate',          qtd: 0.05 },
      { prod: 'Cebola',          qtd: 0.05 },
      { prod: 'Óleo de Soja',    qtd: 0.02 },
    ],
    vendas: [42, 48, 40, 55],
  },
  {
    nome: 'Picanha Especial',
    categoria: 'Pratos Principais',
    preco_venda: 89,
    margem: 40,
    impostos: 8,
    canal: 'Cartão Crédito/Débito',
    custo_fixo: 3,
    embalagem: 0.5,
    porcoes: 1,
    ings: [
      { prod: 'Filé Mignon',    qtd: 0.35 },
      { prod: 'Arroz Agulhinha', qtd: 0.15 },
      { prod: 'Feijão Carioca',  qtd: 0.10 },
      { prod: 'Cebola',          qtd: 0.03 },
    ],
    vendas: [14, 12, 18, 10],
  },
  {
    nome: 'Macarrão ao Molho Bolonhesa',
    categoria: 'Massas',
    preco_venda: 42,
    margem: 32,
    impostos: 8,
    canal: 'iFood',
    custo_fixo: 1.8,
    embalagem: 1.2,
    porcoes: 1,
    ings: [
      { prod: 'Macarrão Espaguete', qtd: 0.20 },
      { prod: 'Carne Moída',        qtd: 0.18 },
      { prod: 'Tomate',             qtd: 0.08 },
      { prod: 'Cebola',             qtd: 0.04 },
      { prod: 'Óleo de Soja',       qtd: 0.02 },
    ],
    vendas: [28, 32, 25, 38],
  },
  {
    nome: 'Salmão ao Molho de Maracujá',
    categoria: 'Peixes',
    preco_venda: 78,
    margem: 38,
    impostos: 8,
    canal: 'Cartão Crédito/Débito',
    custo_fixo: 2.5,
    embalagem: 0.5,
    porcoes: 1,
    ings: [
      { prod: 'Salmão Fresco',   qtd: 0.25 },
      { prod: 'Arroz Agulhinha', qtd: 0.12 },
      { prod: 'Alface Crespa',   qtd: 0.5  }, // 0.5 UN
      { prod: 'Óleo de Soja',    qtd: 0.02 },
    ],
    vendas: [8, 10, 13, 9],
  },
  {
    nome: 'Lasanha de Queijo',
    categoria: 'Massas',
    preco_venda: 52,
    margem: 33,
    impostos: 8,
    canal: 'iFood',
    custo_fixo: 2,
    embalagem: 1.5,
    porcoes: 1,
    ings: [
      { prod: 'Macarrão Espaguete', qtd: 0.15 },
      { prod: 'Queijo Mussarela',   qtd: 0.12 },
      { prod: 'Carne Moída',        qtd: 0.15 },
      { prod: 'Tomate',             qtd: 0.05 },
    ],
    vendas: [20, 22, 18, 24],
  },
]

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Margem+ — Seed de Demo\n')

  // 1. AUTH ──────────────────────────────────────────────────────
  console.log('📧 Criando conta...')
  let session = null

  const { data: signUp, error: signUpErr } = await sb.auth.signUp({ email: EMAIL, password: PASSWORD })
  if (signUpErr) {
    // Já pode existir — tenta login
    const { data: signIn, error: signInErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
    if (signInErr) { console.error('❌ Erro de autenticação:', signInErr.message); process.exit(1) }
    session = signIn.session
    ok('Login realizado com conta existente')
  } else {
    session = signUp.session
    if (!session) {
      console.log('\n⚠️  Confirmação de email necessária no Supabase.')
      console.log('   Desative "Confirm email" em Authentication > Settings,')
      console.log('   ou confirme o email manualmente e rode o script novamente.')
      console.log(`\n   📧 Email: ${EMAIL}\n   🔑 Senha: ${PASSWORD}`)
      process.exit(1)
    }
    ok('Conta criada com sucesso')
  }

  // 2. EMPRESA ──────────────────────────────────────────────────
  console.log('\n🏢 Criando empresa...')
  const { data: emp, error: empErr } = await sb.rpc('criar_conta_dono', {
    p_nome_restaurante: 'Cantina da Lua',
    p_nome_completo: 'João Carlos Silva',
  })
  if (empErr && !empErr.message.includes('já possui conta')) {
    warn('criar_conta_dono', empErr)
  } else {
    ok('Empresa "Cantina da Lua" criada')
  }

  // 3. CANAIS DE VENDA (já foram criados pelo seed_empresa_defaults) ──────
  console.log('\n📡 Carregando canais de venda...')
  const { data: canais } = await sb.from('canais_venda').select('id, nome')
  const canalMap = Object.fromEntries((canais ?? []).map(c => [c.nome, c.id]))
  ok('Canais carregados', Object.keys(canalMap).join(', '))

  // 4. PRODUTOS ─────────────────────────────────────────────────
  console.log('\n📦 Inserindo produtos...')
  const prodRows = PRODUTOS_DEF.map(p => ({
    nome: p.nome,
    unidade: p.un,
    grupo: p.grupo,
    rendimento: p.rend,
    producao_interna: false,
  }))
  const prodData = await insert('produtos', prodRows, 'Produtos inseridos')
  const prodMap = Object.fromEntries(prodData.map(p => [p.nome, p.id]))

  // 5. COMPRAS + LOTES ──────────────────────────────────────────
  console.log('\n🛒 Inserindo compras e lotes...')
  const comprasRows = []
  const lotesRows   = []

  for (const pd of PRODUTOS_DEF) {
    const pid = prodMap[pd.nome]
    if (!pid) continue

    const datas_compra = [C32, C21, C10]
    for (let i = 0; i < 3; i++) {
      if (pd.compras[i] === 0) continue
      const qtd   = pd.compras[i]
      const preco = pd.preco[i]
      comprasRows.push({
        produto_id: pid,
        quantidade: qtd,
        valor_unitario: preco,
        data_compra: datas_compra[i],
      })
    }
  }

  const compData = await insert('compras', comprasRows, 'Compras inseridas')

  // Lotes — uma por compra
  for (let ci = 0; ci < compData.length; ci++) {
    const c = compData[ci]
    // encontra a definição do produto para pegar val_dias
    const pd = PRODUTOS_DEF.find(p => prodMap[p.nome] === c.produto_id)
    if (!pd) continue

    let validade = null
    // validade custom (perecíveis com risco_perda)
    if (pd.val_custom && c.data_compra === C10) {
      validade = pd.val_custom
    } else if (pd.val_custom && c.data_compra === C21) {
      // compra de semana passada → validade um pouco maior
      const d = new Date(pd.val_custom + 'T12:00:00')
      d.setDate(d.getDate() + 7)
      validade = d.toISOString().split('T')[0]
    } else if (pd.val_dias < 365) {
      // calcular validade baseada em data_compra + val_dias
      const d = new Date(c.data_compra + 'T12:00:00')
      d.setDate(d.getDate() + pd.val_dias)
      validade = d.toISOString().split('T')[0]
    }
    lotesRows.push({
      produto_id: c.produto_id,
      compra_id: c.id,
      data_entrada: c.data_compra,
      data_validade: validade,
      quantidade_orig: c.quantidade,
      quantidade_atual: c.quantidade, // ainda não consumido do lote
      custo_unitario: c.valor_unitario,
      status: 'ativo',
    })
  }

  await insert('lotes', lotesRows, 'Lotes inseridos')

  // 6. ESTOQUES (contagens finais — 4 semanas) ─────────────────
  console.log('\n📊 Inserindo contagens de estoque...')
  const estRows = []
  const DATAS_FINAIS = [D3, D2, D1, D0]

  for (const pd of PRODUTOS_DEF) {
    const pid = prodMap[pd.nome]
    if (!pid) continue
    for (let i = 0; i < 4; i++) {
      estRows.push({
        produto_id: pid,
        quantidade: pd.fins[i],
        valor_unitario: pd.preco[Math.min(i, pd.preco.length - 1)],
        tipo_contagem: 'Final',
        data_contagem: DATAS_FINAIS[i],
      })
    }
  }

  await insert('estoques', estRows, 'Contagens finais inseridas')

  // 7. FICHAS TÉCNICAS ──────────────────────────────────────────
  console.log('\n🍽️  Criando fichas técnicas...')
  const fichasRows = FICHAS_DEF.map(f => ({
    nome: f.nome,
    categoria: f.categoria,
    preco_venda: f.preco_venda,
    margem_desejada: f.margem,
    impostos_pct: f.impostos,
    canal_venda_id: canalMap[f.canal] ?? null,
    custo_fixo_porcao: f.custo_fixo,
    embalagem_custo: f.embalagem,
    porcoes: f.porcoes,
    modo_preparo: '',
    tempo_preparo: 30,
  }))
  const fichasData = await insert('fichas_tecnicas', fichasRows, 'Fichas técnicas inseridas')
  const fichaMap = Object.fromEntries(fichasData.map(f => [f.nome, f.id]))

  // 8. FICHA_INGREDIENTES ────────────────────────────────────────
  console.log('\n🧾 Vinculando ingredientes às fichas...')
  const fiIngRows = []
  for (const fd of FICHAS_DEF) {
    const fid = fichaMap[fd.nome]
    if (!fid) continue
    for (const ing of fd.ings) {
      const pid = prodMap[ing.prod]
      if (!pid) { warn(`Produto não encontrado: ${ing.prod}`); continue }
      fiIngRows.push({ ficha_id: fid, produto_id: pid, quantidade: ing.qtd })
    }
  }
  await insert('ficha_ingredientes', fiIngRows, 'Ingredientes vinculados')

  // 9. VENDAS DE PRATOS (4 semanas) ─────────────────────────────
  console.log('\n📈 Inserindo vendas semanais...')
  const vendasRows = []
  for (const fd of FICHAS_DEF) {
    const fid = fichaMap[fd.nome]
    if (!fid) continue
    for (let i = 0; i < SEMANAS.length; i++) {
      vendasRows.push({
        ficha_id: fid,
        semana_inicio: SEMANAS[i].inicio,
        semana_fim: SEMANAS[i].fim,
        quantidade_vendida: fd.vendas[i],
      })
    }
  }
  await insert('vendas_pratos', vendasRows, 'Vendas inseridas')

  // 10. SAÍDAS AVULSAS (quebras/desperdícios) ───────────────────
  console.log('\n🗑️  Inserindo saídas avulsas...')
  const saidaRows = [
    { produto_id: prodMap['Tomate'],     quantidade: 1.5, valor_total: 9,  motivo: 'Quebra/Desperdício',  data_saida: '2026-05-20' },
    { produto_id: prodMap['Alface Crespa'], quantidade: 3, valor_total: 12, motivo: 'Quebra/Desperdício', data_saida: '2026-05-21' },
    { produto_id: prodMap['Salmão Fresco'], quantidade: 0.4, valor_total: 26, motivo: 'Quebra/Desperdício', data_saida: '2026-05-22' },
  ]
  await insert('saidas_avulsas', saidaRows.map(s => ({ ...s, descricao_manual: 'Produto vencido' })), 'Saídas avulsas inseridas')

  // 11. FINANÇAS SEMANAIS ────────────────────────────────────────
  console.log('\n💰 Inserindo finanças semanais...')
  const financRows = [
    { data_inicio: '2026-04-28', data_fim: '2026-05-04', faturamento: 8420,  outros_custos: { 'Embalagens': 180, 'Gás': 90, 'Material de Limpeza': 45 }, status: 'fechado' },
    { data_inicio: '2026-05-05', data_fim: '2026-05-11', faturamento: 9150,  outros_custos: { 'Embalagens': 195, 'Gás': 90, 'Material de Limpeza': 45 }, status: 'fechado' },
    { data_inicio: '2026-05-12', data_fim: '2026-05-18', faturamento: 8780,  outros_custos: { 'Embalagens': 185, 'Gás': 95, 'Material de Limpeza': 50 }, status: 'fechado' },
    { data_inicio: '2026-05-19', data_fim: '2026-05-25', faturamento: 10200, outros_custos: { 'Embalagens': 210, 'Gás': 95, 'Material de Limpeza': 50 }, status: 'aberto'  },
  ]
  await insert('financas_semanais', financRows, 'Finanças semanais inseridas')

  // ── RESUMO FINAL ─────────────────────────────────────────────
  console.log('\n' + '═'.repeat(55))
  console.log('🎉  SEED CONCLUÍDO COM SUCESSO!')
  console.log('═'.repeat(55))
  console.log(`\n  📧  Email:   ${EMAIL}`)
  console.log(`  🔑  Senha:   ${PASSWORD}`)
  console.log('\n  🌐  Acesse:  http://localhost:3000')
  console.log('\n  O que você vai ver:')
  console.log('  • Cardápio Inteligente → 5 pratos com Markup Divisor')
  console.log('  • Previsão de Ruptura  → crítico, alerta, tendências, risco de perda')
  console.log('  • Plano de Compras     → lista pronta + perecíveis destacados')
  console.log('  • Dashboard            → 4 semanas de histórico')
  console.log('\n  ⚠️  Antes de logar: aplique sql/migracao-v10.sql no Supabase!\n')
}

main().catch(e => { console.error('\n❌ Erro fatal:', e); process.exit(1) })
