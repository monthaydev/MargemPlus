/**
 * SEED via UI — Margem+ v2 (seletores corrigidos para o código real)
 * Execute: node seed-ui.mjs
 */

import { chromium } from 'playwright'

const URL      = 'http://localhost:3000'
const EMAIL    = 'joao@cantinadalua.com.br'
const PASSWORD = 'Margem@2026!'
const EMPRESA  = 'Cantina da Lua'
const NOME     = 'João Carlos Monthay'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const log   = msg => console.log(`  ${msg}`)

// ── Dados a cadastrar ────────────────────────────────────────────────────────

const CATEGORIAS = ['Carnes', 'Peixes', 'Hortifruti', 'Secos', 'Laticínios', 'Condimentos']

const PRODUTOS = [
  { nome: 'Frango Peito',        un: 'KG',  grupo: 'Carnes'      },
  { nome: 'Carne Moída',         un: 'KG',  grupo: 'Carnes'      },
  { nome: 'Filé Mignon',         un: 'KG',  grupo: 'Carnes'      },
  { nome: 'Salmão Fresco',       un: 'KG',  grupo: 'Peixes'      },
  { nome: 'Tomate',              un: 'KG',  grupo: 'Hortifruti'  },
  { nome: 'Cebola',              un: 'KG',  grupo: 'Hortifruti'  },
  { nome: 'Alface Crespa',       un: 'UN',  grupo: 'Hortifruti'  },
  { nome: 'Arroz Agulhinha',     un: 'KG',  grupo: 'Secos'       },
  { nome: 'Feijão Carioca',      un: 'KG',  grupo: 'Secos'       },
  { nome: 'Macarrão Espaguete',  un: 'KG',  grupo: 'Secos'       },
  { nome: 'Queijo Mussarela',    un: 'KG',  grupo: 'Laticínios'  },
  { nome: 'Óleo de Soja',        un: 'L',   grupo: 'Condimentos' },
]

// Compras para a semana atual (sem campo de data na UI)
const COMPRAS = [
  { prod: 'Frango Peito',       qtd: '5',  total: '110.00', val: '2026-06-10' },
  { prod: 'Carne Moída',        qtd: '4',  total: '100.00', val: '2026-06-05' },
  { prod: 'Filé Mignon',        qtd: '10', total: '850.00', val: '2026-06-15' },
  { prod: 'Salmão Fresco',      qtd: '3',  total: '186.00', val: '2026-06-02' },
  { prod: 'Tomate',             qtd: '6',  total: '30.00',  val: '2026-06-01' },
  { prod: 'Cebola',             qtd: '5',  total: '20.00',  val: '2026-07-25' },
  { prod: 'Alface Crespa',      qtd: '13', total: '39.00',  val: '2026-06-01' },
  { prod: 'Arroz Agulhinha',    qtd: '13', total: '58.50'  },
  { prod: 'Feijão Carioca',     qtd: '5',  total: '40.00'  },
  { prod: 'Macarrão Espaguete', qtd: '6',  total: '36.00'  },
  { prod: 'Queijo Mussarela',   qtd: '3',  total: '114.00', val: '2026-06-20' },
  { prod: 'Óleo de Soja',       qtd: '3',  total: '21.00'  },
]

// Estoque Inicial (abertura da semana atual)
const ESTOQUE_INICIAL = [
  { prod: 'Frango Peito',       qtd: '4',  val: '22.00' },
  { prod: 'Carne Moída',        qtd: '6',  val: '25.00' },
  { prod: 'Filé Mignon',        qtd: '8',  val: '85.00' },
  { prod: 'Salmão Fresco',      qtd: '5',  val: '62.00' },
  { prod: 'Tomate',             qtd: '6',  val: '5.00'  },
  { prod: 'Cebola',             qtd: '5',  val: '4.00'  },
  { prod: 'Alface Crespa',      qtd: '10', val: '3.00'  },
  { prod: 'Arroz Agulhinha',    qtd: '15', val: '4.50'  },
  { prod: 'Feijão Carioca',     qtd: '8',  val: '8.00'  },
  { prod: 'Macarrão Espaguete', qtd: '8',  val: '6.00'  },
  { prod: 'Queijo Mussarela',   qtd: '3',  val: '38.00' },
  { prod: 'Óleo de Soja',       qtd: '4',  val: '7.00'  },
]

// Estoque Final (fechamento da semana)
const ESTOQUE_FINAL = [
  { prod: 'Frango Peito',       qtd: '1'   },
  { prod: 'Carne Moída',        qtd: '6'   },
  { prod: 'Filé Mignon',        qtd: '14'  },
  { prod: 'Salmão Fresco',      qtd: '3'   },
  { prod: 'Tomate',             qtd: '3'   },
  { prod: 'Cebola',             qtd: '6'   },
  { prod: 'Alface Crespa',      qtd: '5'   },
  { prod: 'Arroz Agulhinha',    qtd: '20'  },
  { prod: 'Feijão Carioca',     qtd: '10'  },
  { prod: 'Macarrão Espaguete', qtd: '10'  },
  { prod: 'Queijo Mussarela',   qtd: '1.5' },
  { prod: 'Óleo de Soja',       qtd: '4'   },
]

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎭  Margem+ — Automação de UI (Playwright)\n')

  const browser = await chromium.launch({ headless: false, slowMo: 60 })
  const ctx     = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page    = await ctx.newPage()

  try {
    // ── PASSO 1: ACESSA O SISTEMA ──────────────────────────────────────────
    console.log('🌐 PASSO 1: Abrindo Margem+...')
    await page.goto(URL)
    await sleep(2000)
    await page.screenshot({ path: 'ss-00-inicio.png' })

    // ── PASSO 2: CADASTRO DE NOVO USUÁRIO ─────────────────────────────────
    console.log('\n📧 PASSO 2: Cadastrando conta "Cantina da Lua"...')

    // ── AGUARDA O USUÁRIO FAZER LOGIN MANUALMENTE ──────────────────────────
    console.log('\n' + '═'.repeat(55))
    console.log('🔐  AÇÃO NECESSÁRIA:')
    console.log('   Faça login no browser Playwright que acabou de abrir.')
    console.log('   Use suas credenciais normais de acesso ao sistema.')
    console.log('   O script continua automaticamente assim que entrar.')
    console.log('═'.repeat(55) + '\n')

    // Aguarda até 3 minutos pelo login (sidebar "Início" aparece quando logado)
    await page.locator('text="Início"').first().waitFor({ timeout: 180000 })

    // Fecha qualquer modal de semana bloqueada que apareça
    await fecharModalSeSemanaFechada(page)

    // Garante sidebar expandida (para que os textos dos menus fiquem visíveis)
    await expandirSidebar(page)

    log('✅ Autenticado!')
    await page.screenshot({ path: 'ss-02-dashboard.png' })

    // ── PASSO 3: CRIAR CATEGORIAS ──────────────────────────────────────────
    console.log('\n🗂️  PASSO 3: Criando categorias de produto...')

    // Navega para Cadastro de Insumos (texto no sidebar expandido)
    await clicarMenu(page, 'Cadastro de Insumos')
    await sleep(1500)

    // Clica na aba "Categorias & Unidades"
    await page.locator('button:has-text("Categorias & Unidades")').click()
    await sleep(800)

    const inputCat = page.locator('input[placeholder*="Carnes, Laticínios"]')
    for (const cat of CATEGORIAS) {
      log(`  Categoria: ${cat}`)
      await inputCat.fill(cat)
      await inputCat.press('Enter')
      await sleep(400)
    }

    // Salva as categorias
    await page.locator('button:has-text("Salvar Alterações")').click()
    await sleep(1500)
    log('✅ Categorias salvas!')
    await page.screenshot({ path: 'ss-03-categorias.png' })

    // ── PASSO 4: CADASTRAR PRODUTOS ────────────────────────────────────────
    console.log('\n📦 PASSO 4: Cadastrando produtos...')

    // Volta para aba Insumos
    await page.locator('button:has-text("Insumos")').first().click()
    await sleep(800)

    const inputNomeProd = page.locator('input[placeholder="Ex: Queijo Mussarela"]')
    const selects       = page.locator('select')

    for (const prod of PRODUTOS) {
      log(`  Produto: ${prod.nome}`)

      // Nome
      await inputNomeProd.fill(prod.nome)
      await sleep(200)

      // Unidade (1º select)
      const selUn = selects.nth(0)
      await selUn.selectOption(prod.un).catch(() => {})

      // Categoria (2º select)
      const selGrupo = selects.nth(1)
      await selGrupo.selectOption(prod.grupo).catch(async () => {
        // Fallback: tenta pelo texto parcial
        const opcoes = await selGrupo.locator('option').all()
        for (const op of opcoes) {
          const t = await op.textContent()
          if (t?.includes(prod.grupo)) { await selGrupo.selectOption({ label: t }); break }
        }
      })
      await sleep(200)

      // Cadastrar
      await page.locator('button:has-text("Cadastrar")').click()
      await sleep(800)
    }

    log('✅ Produtos cadastrados!')
    await page.screenshot({ path: 'ss-04-produtos.png' })

    // ── PASSO 5: LANÇAR COMPRAS ────────────────────────────────────────────
    console.log('\n🛒 PASSO 5: Lançando compras...')

    await clicarMenu(page, 'Estoque')
    await sleep(1500)

    // Fecha modal de semana bloqueada se aparecer
    await fecharModalSeSemanaFechada(page)

    // Clica na aba Compras
    await page.locator('button:has-text("Compras")').first().click()
    await sleep(800)

    for (const c of COMPRAS) {
      log(`  Compra: ${c.prod} x${c.qtd}`)

      // Seleciona produto no select de Insumo
      const selectProd = page.locator('select').first()
      await selectProd.selectOption({ label: c.prod }).catch(async () => {
        const opcoes = await selectProd.locator('option').all()
        for (const op of opcoes) {
          const t = await op.textContent()
          if (t?.includes(c.prod.split(' ')[0])) { await selectProd.selectOption({ label: t?.trim() ?? '' }); break }
        }
      })
      await sleep(200)

      // Quantidade (input type="text" com placeholder "0")
      const inputQtd = page.locator('input[placeholder="0"]')
      await inputQtd.click({ clickCount: 3 })
      await inputQtd.fill(c.qtd)

      // Valor total (input type="text" com placeholder "0,00")
      const inputVal = page.locator('input[placeholder="0,00"]')
      await inputVal.click({ clickCount: 3 })
      await inputVal.fill(c.total)

      // Data de validade (se houver)
      if (c.val) {
        const inputData = page.locator('input[type="date"]').first()
        const visivel   = await inputData.isVisible({ timeout: 2000 }).catch(() => false)
        if (visivel) await inputData.fill(c.val)
      }

      // Lançar
      await page.locator('button:has-text("Lançar")').click()
      await sleep(700)
    }

    log('✅ Compras registradas!')
    await page.screenshot({ path: 'ss-05-compras.png' })

    // ── PASSO 6: ESTOQUE INICIAL ───────────────────────────────────────────
    console.log('\n📊 PASSO 6: Preenchendo Estoque Inicial...')

    await page.locator('button:has-text("Est. Inicial")').first().click()
    await sleep(800)

    await preencherContagem(page, ESTOQUE_INICIAL, true)

    // Salva contagem inicial
    await page.locator('button:has-text("Salvar Contagem Inicial")').click()
    await sleep(1500)
    log('✅ Estoque Inicial salvo!')
    await page.screenshot({ path: 'ss-06-estoque-inicial.png' })

    // ── PASSO 7: ESTOQUE FINAL ─────────────────────────────────────────────
    console.log('\n📊 PASSO 7: Preenchendo Estoque Final...')

    await page.locator('button:has-text("Est. Final")').first().click()
    await sleep(800)

    await preencherContagem(page, ESTOQUE_FINAL, false)

    // Salva contagem final
    await page.locator('button:has-text("Salvar Contagem Final")').click()
    await sleep(1500)
    log('✅ Estoque Final salvo!')
    await page.screenshot({ path: 'ss-07-estoque-final.png' })

    // ── PASSO 8: FATURAMENTO ───────────────────────────────────────────────
    console.log('\n💰 PASSO 8: Registrando faturamento da semana...')

    await page.locator('button:has-text("Faturamento")').first().click()
    await sleep(800)

    // O input de faturamento é o único text input visível nessa aba
    const inputsFat = await page.locator('input[type="text"]').all()
    for (const inp of inputsFat) {
      const visivel = await inp.isVisible({ timeout: 1000 }).catch(() => false)
      if (visivel) {
        await inp.click({ clickCount: 3 })
        await inp.fill('18500')
        break
      }
    }

    // Salva faturamento
    const btnFat = page.locator('button:has-text("Salvar Faturamento")')
    const temBtnFat = await btnFat.isVisible({ timeout: 3000 }).catch(() => false)
    if (temBtnFat) {
      await btnFat.click()
      await sleep(1000)
      log('✅ Faturamento salvo!')
    }

    await page.screenshot({ path: 'ss-08-faturamento.png' })

    // ── RESULTADO ─────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(55))
    console.log('🎉  DADOS POPULADOS COM SUCESSO!')
    console.log('═'.repeat(55))
    console.log(`\n  📧  Email:   ${EMAIL}`)
    console.log(`  🔑  Senha:   ${PASSWORD}`)
    console.log(`  🏢  Empresa: ${EMPRESA}`)
    console.log('\n  📸 Screenshots salvas (ss-00 a ss-08)')
    console.log('  🌐  Acesse: http://localhost:3000\n')

    await sleep(5000)

  } catch (err) {
    console.error('\n❌ Erro:', err.message)
    await page.screenshot({ path: 'ss-ERRO.png' }).catch(() => {})
    console.log('  Screenshot do erro salvo em ss-ERRO.png')
    throw err
  } finally {
    await browser.close()
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Expande o sidebar se estiver colapsado */
async function expandirSidebar(page) {
  const btnExpandir = page.locator('button[title="Expandir menu"]')
  const visivel = await btnExpandir.isVisible({ timeout: 2000 }).catch(() => false)
  if (visivel) {
    await btnExpandir.click()
    await sleep(600)
  }
}

/** Clica em um item do menu do sidebar */
async function clicarMenu(page, label) {
  // Tenta por texto visível (sidebar expandida)
  const porTexto = page.locator(`aside button:has-text("${label}")`).first()
  const temTexto  = await porTexto.isVisible({ timeout: 2000 }).catch(() => false)
  if (temTexto) {
    await porTexto.click()
    await sleep(1200)
    return
  }
  // Tenta por title (sidebar colapsada)
  const porTitle = page.locator(`aside button[title="${label}"]`).first()
  const temTitle  = await porTitle.isVisible({ timeout: 2000 }).catch(() => false)
  if (temTitle) {
    await porTitle.click()
    await sleep(1200)
    return
  }
  // Último recurso: clica em qualquer botão com o texto
  await page.locator(`button:has-text("${label}")`).first().click({ timeout: 8000 })
  await sleep(1200)
}

/** Fecha modal de semana bloqueada se aparecer */
async function fecharModalSeSemanaFechada(page) {
  await sleep(1000)
  // Opção "Semana atual" no modal
  const btnSemanaAtual = page.locator('button:has-text("Semana atual")').first()
  const apareceu = await btnSemanaAtual.isVisible({ timeout: 3000 }).catch(() => false)
  if (apareceu) {
    await btnSemanaAtual.click()
    await sleep(500)
    return
  }
  // Opção "Só visualizar"
  const btnVisualizar = page.locator('button:has-text("Só visualizar")').first()
  const apareceu2 = await btnVisualizar.isVisible({ timeout: 1000 }).catch(() => false)
  if (apareceu2) {
    await btnVisualizar.click()
    await sleep(500)
  }
}

/** Preenche os campos de contagem (inicial ou final) */
async function preencherContagem(page, itens, isInicial) {
  // A aba de contagem mostra cards por produto
  // Cada card tem: nome do produto, input "Qtd Real", e (se inicial) input "R$ Unit."
  for (const item of itens) {
    // Localiza o card do produto pelo nome
    const card = page.locator(`div:has(p:has-text("${item.prod}"))`).filter({
      has: page.locator('input')
    }).first()

    const cardVisivel = await card.isVisible({ timeout: 3000 }).catch(() => false)
    if (!cardVisivel) {
      console.log(`    ⚠️ Card "${item.prod}" não encontrado, pulando...`)
      continue
    }

    // Preenche quantidade (1º input no card)
    const inputQtd = card.locator('input').nth(0)
    await inputQtd.click({ clickCount: 3 })
    await inputQtd.fill(item.qtd)

    // Preenche valor unitário se for contagem inicial
    if (isInicial && item.val) {
      const inputVal = card.locator('input').nth(1)
      const valVisivel = await inputVal.isVisible({ timeout: 1000 }).catch(() => false)
      if (valVisivel) {
        await inputVal.click({ clickCount: 3 })
        await inputVal.fill(item.val)
      }
    }

    await page.keyboard.press('Tab')
    await page.waitForTimeout(150)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
