"use client"

import { useState, useEffect } from "react"
import { CalendarDays, Search, LayoutList, ClipboardCheck, ArrowRightLeft, FileDown, Flame, Loader2, Sheet, TrendingUp, TrendingDown, Minus, Package, LineChart, Layers } from "lucide-react"
import { toast } from "react-hot-toast"
import { useRelatorios } from "@/hooks/useRelatorios"
import { formatBRL, formatPerc } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { T } from "@/lib/design-tokens"
import { getCorMarca } from "@/lib/cores"

export function Relatorios({ produtos, perfil }: { produtos: any[], perfil: any }) {
  const metaCMV = parseFloat(perfil?.empresa?.meta_cmv) || 35

  const [historicoPrecos, setHistoricoPrecos] = useState<any[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [filtroProduto, setFiltroProduto] = useState("")

  const carregarHistoricoPrecos = async () => {
    setLoadingHistorico(true)
    // Janela de 12 meses: evita trazer milhares de linhas após 1-2 anos de uso.
    const dataLimite = new Date()
    dataLimite.setMonth(dataLimite.getMonth() - 12)
    const isoLimite = dataLimite.toISOString().split('T')[0]
    const { data } = await supabase
      .from('compras')
      .select('produto_id, quantidade, valor_unitario, data_compra')
      .gte('data_compra', isoLimite)
      .order('data_compra', { ascending: true })

    if (!data) { setLoadingHistorico(false); return }

    const porProduto: Record<number, any[]> = {}
    data.forEach((c: any) => {
      if (!porProduto[c.produto_id]) porProduto[c.produto_id] = []
      porProduto[c.produto_id].push({ data: c.data_compra, preco: parseFloat(c.valor_unitario), qtd: parseFloat(c.quantidade) })
    })

    const resultado = (produtos || []).map((p: any) => {
      const entradas = porProduto[p.id] || []
      if (entradas.length === 0) return null
      const precoAtual = entradas[entradas.length - 1].preco
      const precoAnterior = entradas.length > 1 ? entradas[entradas.length - 2].preco : null
      const variacao = precoAnterior ? ((precoAtual - precoAnterior) / precoAnterior) * 100 : null
      return { ...p, entradas, precoAtual, precoAnterior, variacao }
    }).filter(Boolean)

    setHistoricoPrecos(resultado)
    setLoadingHistorico(false)
  }

  const {
    filtroCategoria, setFiltroCategoria,
    categoriasDisponiveis,
    modoVisao, setModoVisao,
    semanasData,
    semanaSelecionadaModal, setSemanaSelecionadaModal,
    semanaComp1, setSemanaComp1,
    semanaComp2, setSemanaComp2,
    loading,
    mesSelecionado, setMesSelecionado
  } = useRelatorios(produtos)

  const [pdfPronto,   setPdfPronto]   = useState(false)
  const [excelPronto, setExcelPronto] = useState(false)

  useEffect(() => {
    if (modoVisao === "precos" && historicoPrecos.length === 0 && !loadingHistorico) {
      carregarHistoricoPrecos()
    }
  }, [modoVisao])

  useEffect(() => {
    // Injeta um <script> só se ainda não existir uma tag com o mesmo src
    // (evita acumular nós no DOM ao remontar o módulo) e reaproveita a tag
    // já presente, aguardando seu onload se ainda estiver carregando.
    const injetarScript = (src: string, onReady: () => void) => {
      const existente = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
      if (existente) {
        if (existente.dataset.carregado === '1') onReady()
        else existente.addEventListener('load', onReady)
        return
      }
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.addEventListener('load', () => { s.dataset.carregado = '1'; onReady() })
      document.body.appendChild(s)
    }

    // ── jsPDF + autoTable (encadeado) ──────────────────────────────
    // @ts-ignore
    if (window.jspdf?.jsPDF?.API?.autoTable) setPdfPronto(true)
    else injetarScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => {
      injetarScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js", () => setPdfPronto(true))
    })

    // ── ExcelJS ────────────────────────────────────────────────────
    // @ts-ignore
    if (window.ExcelJS) setExcelPronto(true)
    else injetarScript("https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js", () => setExcelPronto(true))
  }, []);

  const nomeEmpresa = (perfil?.empresa?.nome || "Restaurante").toUpperCase()
  const slugEmpresa = nomeEmpresa.replace(/[^a-zA-Z0-9]+/g, '_')

  // ── Motor de Excel Profissional ──────────────────────────────────────────────
  const handleExportarExcel = async () => {
    if (!excelPronto) return
    // @ts-ignore
    const ExcelJS = window.ExcelJS
    const wb = new ExcelJS.Workbook()
    wb.creator  = nomeEmpresa
    wb.created  = new Date()

    // Paleta da marca da empresa
    const marca   = getCorMarca(perfil?.empresa?.cor_principal)
    const DARK    = '0F172A'   // ink
    const BRAND   = marca.hex500.replace('#', '')  // cor principal da empresa
    const BSOFT   = marca.hex100.replace('#', '')  // soft da marca (fundo tintado)
    const WHITE   = 'FFFFFF'
    const ALT     = 'F8FAFC'   // linha alternada
    const BORDER  = 'E2E8F0'   // borda
    const GREEN   = '15803D'
    const RED     = 'B91C1C'
    const AMBER   = 'B45309'
    const MINT    = marca.mint.replace('#', '')

    const borda = {
      top:    { style: 'thin' as const, color: { argb: 'FF' + BORDER } },
      left:   { style: 'thin' as const, color: { argb: 'FF' + BORDER } },
      bottom: { style: 'thin' as const, color: { argb: 'FF' + BORDER } },
      right:  { style: 'thin' as const, color: { argb: 'FF' + BORDER } },
    }

    // Helpers reutilizáveis
    const fillSolid = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + argb } })
    const fontBase  = (bold = false, size = 10, color = DARK) => ({ name: 'Calibri', size, bold, color: { argb: 'FF' + color } })

    const aplicarHeaderEmpresa = (sheet: any, totalCols: number, subtitulo: string) => {
      // Linha 1 — Nome da empresa (dark)
      sheet.mergeCells(1, 1, 1, totalCols)
      const c1 = sheet.getCell('A1')
      c1.value     = nomeEmpresa
      c1.font      = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FF' + WHITE } }
      c1.fill      = fillSolid(DARK)
      c1.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
      sheet.getRow(1).height = 40

      // Linha 2 — Subtítulo
      sheet.mergeCells(2, 1, 2, totalCols)
      const c2 = sheet.getCell('A2')
      c2.value     = subtitulo
      c2.font      = { name: 'Calibri', size: 11, color: { argb: 'FF64748B' } }
      c2.fill      = fillSolid(ALT)
      c2.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
      sheet.getRow(2).height = 24

      // Linha 3 — Emissão
      sheet.mergeCells(3, 1, 3, totalCols)
      const c3 = sheet.getCell('A3')
      c3.value     = `Emitido em ${new Date().toLocaleString('pt-BR')}   |   Margem+ · Sistema de Controle de CMV`
      c3.font      = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF94A3B8' } }
      c3.fill      = fillSolid(ALT)
      c3.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
      sheet.getRow(3).height = 18

      // Linha 4 — Divisor colorido (1px de altura, cor da marca)
      sheet.mergeCells(4, 1, 4, totalCols)
      const c4 = sheet.getCell('A4')
      c4.fill      = fillSolid(BRAND)
      sheet.getRow(4).height = 4
    }

    const estilizarCabecalho = (row: any, labels: string[], alinhamentos: string[] = []) => {
      row.height = 30
      labels.forEach((label, i) => {
        const cell = row.getCell(i + 1)
        cell.value     = label
        cell.font      = fontBase(true, 10, WHITE)
        cell.fill      = fillSolid(DARK)
        cell.border    = borda
        cell.alignment = { vertical: 'middle', horizontal: (alinhamentos[i] || 'left') as any, indent: alinhamentos[i] === 'left' || i === 0 ? 1 : 0 }
      })
    }

    const labelMes = new Date(mesSelecionado + '-15').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

    // ── 1. ABA RESUMO ────────────────────────────────────────────────────────
    if (modoVisao === 'resumo' && semanasData.length > 0) {
      const totalCols = 1 + semanasData.length
      const sheet = wb.addWorksheet('CMV Mensal')

      sheet.columns = [
        { width: 32 },
        ...semanasData.map(() => ({ width: 22 })),
      ]

      aplicarHeaderEmpresa(sheet, totalCols,
        `Relatório de CMV — ${labelMes}  |  Categoria: ${filtroCategoria}  |  Meta CMV: ${metaCMV}%`)

      // Cabeçalhos das semanas
      const hRow = sheet.getRow(5)
      hRow.height = 36
      const hCell0 = hRow.getCell(1)
      hCell0.value     = 'Métricas Financeiras'
      hCell0.font      = fontBase(true, 10, WHITE)
      hCell0.fill      = fillSolid(DARK)
      hCell0.border    = borda
      hCell0.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

      semanasData.forEach((s: any, i: number) => {
        const cell = hRow.getCell(i + 2)
        cell.value     = `${s.nome}\n${s.periodo}`
        cell.font      = fontBase(true, 10, WHITE)
        cell.fill      = fillSolid(DARK)
        cell.border    = borda
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      })

      // Linhas de dados
      const linhas = [
        { label: 'Faturamento Global',       values: semanasData.map((s: any) => s.faturamento), cor: GREEN,  bold: false },
        { label: `(+) Compras (${filtroCategoria})`, values: semanasData.map((s: any) => s.compras),     cor: AMBER,  bold: false },
        { label: '(–) Deduções / Saídas',    values: semanasData.map((s: any) => s.deducoes),    cor: RED,    bold: false },
        { label: '(=) CMV Líquido (R$)',      values: semanasData.map((s: any) => s.cmvValor),    cor: DARK,   bold: true  },
      ]

      linhas.forEach((def, rowIdx) => {
        const row = sheet.getRow(6 + rowIdx)
        row.height = 26
        const bg = rowIdx % 2 === 0 ? WHITE : ALT

        const label = row.getCell(1)
        label.value     = def.label
        label.font      = fontBase(def.bold, 11, def.cor)
        label.fill      = fillSolid(bg)
        label.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        label.border    = borda

        def.values.forEach((val: number, i: number) => {
          const cell = row.getCell(i + 2)
          cell.value     = val
          cell.numFmt    = '"R$"\\ #,##0.00'
          cell.font      = fontBase(def.bold, 11, def.cor)
          cell.fill      = fillSolid(bg)
          cell.alignment = { vertical: 'middle', horizontal: 'right' }
          cell.border    = borda
        })
      })

      // Margem CMV % — linha condicional
      const pctRow = sheet.getRow(10)
      pctRow.height = 30
      const pLabel = pctRow.getCell(1)
      pLabel.value     = 'Margem CMV (%)'
      pLabel.font      = fontBase(true, 11, DARK)
      pLabel.fill      = fillSolid(BSOFT)
      pLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      pLabel.border    = borda

      semanasData.forEach((s: any, i: number) => {
        const pct      = s.faturamento > 0 ? (s.cmvValor / s.faturamento) * 100 : 0
        const acimaMeta = pct > metaCMV
        const cell = pctRow.getCell(i + 2)
        cell.value     = pct / 100
        cell.numFmt    = '0.00%'
        cell.font      = fontBase(true, 12, acimaMeta ? RED : GREEN)
        cell.fill      = fillSolid(acimaMeta ? 'FEE2E2' : 'DCFCE7')
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border    = borda
      })

      // Linha de nota
      sheet.getRow(11).height = 6
      sheet.mergeCells(12, 1, 12, totalCols)
      const nota = sheet.getCell('A12')
      nota.value     = `★  Meta CMV definida: ${metaCMV}%   |   Verde = dentro da meta   |   Vermelho = acima da meta`
      nota.font      = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF94A3B8' } }
      nota.alignment = { horizontal: 'left', indent: 1 }
      sheet.getRow(12).height = 18

      sheet.views = [{ state: 'frozen', ySplit: 5, xSplit: 1 }]

    // ── 2. ABA AUDITORIA ────────────────────────────────────────────────────
    } else if (modoVisao === 'detalhado') {
      const semana = semanasData.find((s: any) => s.id === semanaSelecionadaModal)
      if (!semana) return

      const sheet = wb.addWorksheet(`Auditoria`)
      sheet.columns = [
        { width: 28 }, { width: 14 },
        { width: 11 }, { width: 17 },
        { width: 11 }, { width: 17 },
        { width: 11 }, { width: 17 },
        { width: 11 }, { width: 17 },
      ]

      aplicarHeaderEmpresa(sheet, 10,
        `Auditoria Completa — ${semana.nome} (${semana.periodo})  |  Categoria: ${filtroCategoria}`)

      // Cabeçalhos de grupo (linha 5)
      const grpRow = sheet.getRow(5)
      grpRow.height = 18
      ;[['A5', ''], ['B5', ''],
        ['C5', 'INICIAL'], ['D5', ''],
        ['E5', 'COMPRAS'], ['F5', ''],
        ['G5', 'CMV (CONSUMO)'], ['H5', ''],
        ['I5', 'FINAL'], ['J5', ''],
      ].forEach(([addr, val]) => {
        const c = sheet.getCell(addr)
        c.value     = val
        c.font      = { name: 'Calibri', bold: true, size: 8, color: { argb: 'FF94A3B8' } }
        c.fill      = fillSolid(ALT)
        c.alignment = { horizontal: 'center', vertical: 'middle' }
      })
      // Merge dos grupos
      ;[['C5', 'D5'], ['E5', 'F5'], ['G5', 'H5'], ['I5', 'J5']].forEach(([a, b]) => sheet.mergeCells(a + ':' + b))

      // Cabeçalhos das colunas (linha 6)
      estilizarCabecalho(sheet.getRow(6),
        ['Insumo / Produto', 'Categoria', 'Qtd', 'R$ Valor', 'Qtd', 'R$ Valor', 'Qtd Cons.', 'R$ CMV', 'Qtd', 'R$ Final'],
        ['left', 'left', 'center', 'right', 'center', 'right', 'center', 'right', 'center', 'right'])

      // Dados
      semana.consumoDetalhado.forEach((item: any, idx: number) => {
        const row = sheet.getRow(7 + idx)
        row.height = 22
        const bg = idx % 2 === 0 ? WHITE : ALT

        const set = (col: number, val: any, cor: string, fmt?: string, bold = false, align = 'center') => {
          const c = row.getCell(col)
          c.value     = typeof val === 'string' ? val : (val ?? 0)
          c.font      = fontBase(bold, 10, cor)
          c.fill      = fillSolid(bg)
          c.alignment = { vertical: 'middle', horizontal: (col <= 2 ? 'left' : align) as any, indent: col === 1 ? 1 : 0 }
          c.border    = borda
          if (fmt) c.numFmt = fmt
        }

        set(1,  item.item,          DARK,  undefined,           true,  'left')
        set(2,  item.grupo,         '64748B')
        set(3,  item.qtdIni ?? 0,   '475569', undefined,         false, 'center')
        set(4,  item.valorIni,      '64748B', '"R$"\\ #,##0.00', false, 'right')
        set(5,  item.qtdComp ?? 0,  AMBER,  undefined,           false, 'center')
        set(6,  item.valorComp,     AMBER,   '"R$"\\ #,##0.00', true,  'right')
        set(7,  item.qtdConsumida,  item.producao_interna ? '3B82F6' : RED, undefined, false, 'center')
        set(8,  item.producao_interna ? 0 : item.valorConsumido,
                item.producao_interna ? '3B82F6' : RED, '"R$"\\ #,##0.00', true, 'right')
        set(9,  item.qtdFin ?? 0,   GREEN,  undefined,           false, 'center')
        set(10, item.valorFinal,    GREEN,   '"R$"\\ #,##0.00', true,  'right')
      })

      // Linha de totais
      const totIdx  = 7 + semana.consumoDetalhado.length
      const totRow  = sheet.getRow(totIdx)
      totRow.height = 32
      sheet.mergeCells(totIdx, 1, totIdx, 2)
      const totLabel = totRow.getCell(1)
      totLabel.value     = 'TOTAL DO PERÍODO'
      totLabel.font      = fontBase(true, 11, WHITE)
      totLabel.fill      = fillSolid(DARK)
      totLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      totLabel.border    = borda

      const totalComp = semana.consumoDetalhado.reduce((s: number, i: any) => s + i.valorComp, 0)
      const totalCMV  = semana.consumoDetalhado.reduce((s: number, i: any) => s + (i.producao_interna ? 0 : i.valorConsumido), 0)
      const totalFinal = semana.consumoDetalhado.reduce((s: number, i: any) => s + i.valorFinal, 0)

      ;[3, 4, 5, 7, 9].forEach(c => {
        const cell = totRow.getCell(c)
        cell.fill   = fillSolid(DARK)
        cell.border = borda
        cell.value  = ''
      })

      const setTot = (col: number, val: number, cor: string) => {
        const c = totRow.getCell(col)
        c.value     = val
        c.numFmt    = '"R$"\\ #,##0.00'
        c.font      = fontBase(true, 12, cor)
        c.fill      = fillSolid(DARK)
        c.alignment = { vertical: 'middle', horizontal: 'right' }
        c.border    = borda
      }
      setTot(6,  totalComp,  'FB923C')
      setTot(8,  totalCMV,   'FCA5A5')
      setTot(10, totalFinal, '6EE7B7')

      sheet.views = [{ state: 'frozen', ySplit: 6, xSplit: 2 }]

    // ── 3. ABA COMPARAÇÃO ──────────────────────────────────────────────────
    } else if (modoVisao === 'comparacao') {
      const sem1 = semanasData.find((s: any) => s.id === semanaComp1)
      const sem2 = semanasData.find((s: any) => s.id === semanaComp2)
      if (!sem1 || !sem2) return

      const sheet = wb.addWorksheet('Comparativo')
      sheet.columns = [
        { width: 30 },
        { width: 12 }, { width: 18 },
        { width: 12 }, { width: 18 },
        { width: 20 },
      ]

      aplicarHeaderEmpresa(sheet, 6,
        `Comparativo: ${sem1.nome} (${sem1.periodo})  vs  ${sem2.nome} (${sem2.periodo})`)

      // Linha 5 — grupos
      const grpRow = sheet.getRow(5)
      grpRow.height = 18
      sheet.mergeCells('B5:C5')
      sheet.mergeCells('D5:E5')
      ;[['A5', ''], ['B5', sem1.nome], ['D5', sem2.nome], ['F5', '']].forEach(([a, v]) => {
        const c = sheet.getCell(a)
        c.value     = v
        c.font      = fontBase(true, 9, DARK)
        c.fill      = fillSolid(BSOFT)
        c.alignment = { horizontal: 'center', vertical: 'middle' }
        c.border    = borda
      })
      // Preenche B5 e D5 também (exigido após merge)
      sheet.getCell('C5').fill = fillSolid(BSOFT); sheet.getCell('C5').border = borda
      sheet.getCell('E5').fill = fillSolid(BSOFT); sheet.getCell('E5').border = borda

      // Linha 6 — cabeçalhos
      estilizarCabecalho(sheet.getRow(6),
        ['Insumo / Produto', 'Qtd (A)', 'Custo (A)', 'Qtd (B)', 'Custo (B)', 'Diferença  B − A'],
        ['left', 'center', 'right', 'center', 'right', 'center'])

      const todosItens = Array.from(new Set([
        ...sem1.consumoDetalhado.map((i: any) => i.item),
        ...sem2.consumoDetalhado.map((i: any) => i.item),
      ])).sort() as string[]

      todosItens.forEach((nomeItem, idx) => {
        const i1   = sem1.consumoDetalhado.find((i: any) => i.item === nomeItem) || { qtdConsumida: 0, valorConsumido: 0, unidade: '' }
        const i2   = sem2.consumoDetalhado.find((i: any) => i.item === nomeItem) || { qtdConsumida: 0, valorConsumido: 0, unidade: '' }
        const diff = i2.valorConsumido - i1.valorConsumido
        const row  = sheet.getRow(7 + idx)
        row.height = 22
        const bg   = idx % 2 === 0 ? WHITE : ALT

        const set = (col: number, val: any, cor: string, fmt?: string, bold = false) => {
          const c = row.getCell(col)
          c.value     = val ?? 0
          c.font      = fontBase(bold, 10, cor)
          c.fill      = fillSolid(bg)
          c.alignment = { vertical: 'middle', horizontal: (col === 1 ? 'left' : col % 2 === 0 ? 'center' : 'right') as any, indent: col === 1 ? 1 : 0 }
          c.border    = borda
          if (fmt) c.numFmt = fmt
        }

        set(1, nomeItem,           DARK,   undefined,           true)
        set(2, i1.qtdConsumida,    '64748B')
        set(3, i1.valorConsumido,  '64748B', '"R$"\\ #,##0.00')
        set(4, i2.qtdConsumida,    '64748B')
        set(5, i2.valorConsumido,  '64748B', '"R$"\\ #,##0.00')

        // Célula de diferença — colorida condicionalmente
        const dc  = row.getCell(6)
        const cor = diff > 0 ? RED : diff < 0 ? GREEN : '64748B'
        const dbg = diff > 0 ? 'FFF5F5' : diff < 0 ? 'F0FDF4' : bg
        dc.value     = Math.abs(diff)
        dc.numFmt    = '"R$"\\ #,##0.00'
        dc.font      = fontBase(true, 11, cor)
        dc.fill      = fillSolid(dbg)
        dc.alignment = { vertical: 'middle', horizontal: 'center' }
        dc.border    = borda

        // Prefixo +/- como texto auxiliar na mesma célula via numFmt com condição
        if (diff > 0)       dc.numFmt = '"▲  R$"\\ #,##0.00'
        else if (diff < 0)  dc.numFmt = '"▼  R$"\\ #,##0.00'
        else                dc.numFmt = '"=  R$"\\ #,##0.00'
      })

      sheet.views = [{ state: 'frozen', ySplit: 6, xSplit: 1 }]

    // ── 4. ABA HISTÓRICO DE PREÇOS ─────────────────────────────────────────
    } else if (modoVisao === 'precos' && historicoPrecos.length > 0) {
      const sheet = wb.addWorksheet('Histórico de Preços')
      sheet.columns = [
        { width: 28 }, { width: 14 }, { width: 10 },
        { width: 14 }, { width: 16 }, { width: 16 },
      ]

      aplicarHeaderEmpresa(sheet, 6,
        `Histórico de Preços por Insumo  |  Todas as compras registradas`)

      estilizarCabecalho(sheet.getRow(5),
        ['Produto', 'Categoria', 'Unidade', 'Data da Compra', 'Preço Unitário', 'Variação'],
        ['left', 'left', 'center', 'center', 'right', 'center'])

      let linha = 6
      const produtosFiltrados = historicoPrecos.filter((p: any) =>
        p.nome.toLowerCase().includes(filtroProduto.toLowerCase()))

      produtosFiltrados.forEach((p: any) => {
        // Linha separadora do produto
        const sepRow = sheet.getRow(linha)
        sepRow.height = 22
        sheet.mergeCells(linha, 1, linha, 6)
        const sepCell = sepRow.getCell(1)
        sepCell.value     = `  ${p.nome}  ·  ${p.grupo}  ·  ${p.unidade}`
        sepCell.font      = fontBase(true, 10, WHITE)
        sepCell.fill      = fillSolid(BRAND)
        sepCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        linha++

        const entradas = [...p.entradas].reverse()
        entradas.forEach((e: any, i: number) => {
          const precoAnt     = entradas[i + 1]?.preco
          const variacaoItem = precoAnt ? ((e.preco - precoAnt) / precoAnt) * 100 : null
          const row          = sheet.getRow(linha)
          row.height         = 22
          const bg           = i % 2 === 0 ? WHITE : ALT

          const set = (col: number, val: any, cor: string, fmt?: string, bold = false) => {
            const c = row.getCell(col)
            c.value     = val
            c.font      = fontBase(bold, 10, cor)
            c.fill      = fillSolid(bg)
            c.alignment = { vertical: 'middle', horizontal: (col <= 2 ? 'left' : col === 3 || col === 4 || col === 6 ? 'center' : 'right') as any, indent: col <= 2 ? 1 : 0 }
            c.border    = borda
            if (fmt) c.numFmt = fmt
          }

          set(1, p.nome,                                         DARK,   undefined, true)
          set(2, p.grupo,                                        '64748B')
          set(3, p.unidade,                                      '94A3B8')
          set(4, new Date(e.data + 'T12:00:00'),                 '475569', 'dd/mm/yyyy')
          set(5, e.preco,                                        DARK,   '"R$"\\ #,##0.00', true)

          if (variacaoItem === null) {
            set(6, '—', '94A3B8')
          } else {
            const cor = variacaoItem > 0 ? RED : variacaoItem < 0 ? GREEN : '64748B'
            const bgV = variacaoItem > 0 ? 'FFF5F5' : variacaoItem < 0 ? 'F0FDF4' : bg
            const c6  = row.getCell(6)
            c6.value     = variacaoItem / 100
            c6.numFmt    = variacaoItem > 0 ? '"▲  "0.0%' : variacaoItem < 0 ? '"▼  "0.0%' : '0.0%'
            c6.font      = fontBase(true, 10, cor)
            c6.fill      = fillSolid(bgV)
            c6.alignment = { vertical: 'middle', horizontal: 'center' }
            c6.border    = borda
          }

          linha++
        })
        linha++ // espaço entre produtos
      })

      sheet.views = [{ state: 'frozen', ySplit: 5, xSplit: 1 }]
    }

    // ── Download ─────────────────────────────────────────────────────────────
    const nomeArquivo: Record<string, string> = {
      resumo:    `${slugEmpresa}_CMV_${mesSelecionado}.xlsx`,
      detalhado: `${slugEmpresa}_Auditoria_${semanasData.find((s: any) => s.id === semanaSelecionadaModal)?.nome?.replace(/\s/g, '_') || 'semana'}.xlsx`,
      comparacao:`${slugEmpresa}_Comparativo.xlsx`,
      precos:    `${slugEmpresa}_Historico_Precos.xlsx`,
    }

    const buffer = await wb.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = nomeArquivo[modoVisao] || `${slugEmpresa}_Relatorio.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleGerarPDFFoda = () => {
    try {
      // @ts-ignore
      const jsPDF = window.jspdf.jsPDF
      const doc   = new jsPDF('l', 'pt', 'a4')
      const W     = doc.internal.pageSize.width
      const H     = doc.internal.pageSize.height
      const marca = getCorMarca(perfil?.empresa?.cor_principal)

      const hex2rgb = (hex: string): [number, number, number] => {
        const h = hex.replace('#', '')
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
      }
      const brandRgb  = hex2rgb(marca.hex500)
      const brand100  = hex2rgb(marca.hex100)

      const gerarHeader = (subtitulo: string) => {
        doc.setFillColor(15, 23, 42)
        doc.rect(0, 0, W, 54, 'F')
        doc.setFont("helvetica", "bold")
        doc.setFontSize(18)
        doc.setTextColor(255, 255, 255)
        doc.text(nomeEmpresa, 40, 36)
        doc.setFillColor(...brandRgb)
        doc.rect(0, 54, W, 4, 'F')
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.setTextColor(100, 116, 139)
        doc.text(subtitulo, 40, 76)
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}   |   Margem+ · Sistema de Controle de CMV`, 40, 90)
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.5)
        doc.line(40, 96, W - 40, 96)
      }

      const tableConfig: any = {
        startY: 112,
        theme: 'striped',
        styles:             { fontSize: 10, cellPadding: 8, textColor: [30, 41, 59] },
        headStyles:         { fillColor: brandRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: brand100 },
        didDrawPage: (data: any) => {
          const pageCount = (doc as any).internal.getNumberOfPages()
          doc.setFontSize(8)
          doc.setTextColor(148, 163, 184)
          doc.text(`${nomeEmpresa}  ·  Margem+`, 40, H - 16)
          doc.text(`Página ${data.pageNumber} de ${pageCount}`, W - 40, H - 16, { align: 'right' })
        }
      }

      if (modoVisao === "resumo") {
        const labelMes = new Date(mesSelecionado + '-15').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
        gerarHeader(`Relatório de CMV — ${labelMes}  |  Categoria: ${filtroCategoria}  |  Meta: ${metaCMV}%`)

        const head = [['Métricas Financeiras do Mês', ...semanasData.map(s => `${s.nome} (${s.periodo})`)]]
        const body = [
          ['Faturamento Global',          ...semanasData.map(s => formatBRL(s.faturamento))],
          [`(+) Compras (${filtroCategoria})`, ...semanasData.map(s => formatBRL(s.compras))],
          ['(–) Deduções / Saídas',       ...semanasData.map(s => formatBRL(s.deducoes))],
          ['(=) CMV LÍQUIDO',             ...semanasData.map(s => formatBRL(s.cmvValor))],
          ['MARGEM CMV REAL (%)',         ...semanasData.map(s => formatPerc(s.faturamento > 0 ? (s.cmvValor / s.faturamento) * 100 : 0))]
        ]

        // @ts-ignore
        doc.autoTable({
          ...tableConfig,
          head, body,
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 180 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.row.index === 4 && data.column.index > 0) {
              const s = semanasData[data.column.index - 1]
              if (s) {
                const pct = s.faturamento > 0 ? (s.cmvValor / s.faturamento) * 100 : 0
                data.cell.styles.textColor = pct > metaCMV ? [185, 28, 28] : [21, 128, 61]
                data.cell.styles.fontStyle = 'bold'
              }
            }
          }
        })
        doc.save(`${slugEmpresa}_CMV_Mensal_${mesSelecionado}.pdf`)
      }
      else if (modoVisao === "detalhado") {
        const semana = semanasData.find(s => s.id === semanaSelecionadaModal)
        if (!semana) return

        gerarHeader(`Auditoria Completa — ${semana.nome} (${semana.periodo})  |  Categoria: ${filtroCategoria}`)

        const head = [['Insumo / Produto', 'Inicial', '+ Comprou', '= Consumiu (CMV)', 'Sobrou (Final)']]
        const body = semana.consumoDetalhado.map((i: any) => [
          `${i.item} (${i.grupo})`,
          formatBRL(i.valorIni),
          formatBRL(i.valorComp),
          `${i.qtdConsumida} ${i.unidade}  ${i.producao_interna ? '(Subproduto)' : formatBRL(i.valorConsumido)}`,
          formatBRL(i.valorFinal)
        ])

        // @ts-ignore
        doc.autoTable({
          ...tableConfig,
          head, body,
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 200 },
            1: { halign: 'right' }, 2: { halign: 'right' },
            3: { halign: 'right', textColor: [185, 28, 28] as [number,number,number] },
            4: { halign: 'right', textColor: [21, 128, 61] as [number,number,number] }
          }
        })
        doc.save(`${slugEmpresa}_Auditoria_${semana.nome.replace(' ', '_')}.pdf`)
      }
      else if (modoVisao === "comparacao") {
        const sem1 = semanasData.find(s => s.id === semanaComp1)
        const sem2 = semanasData.find(s => s.id === semanaComp2)
        if (!sem1 || !sem2) return

        gerarHeader(`Comparativo: ${sem1.nome} (${sem1.periodo})  vs  ${sem2.nome} (${sem2.periodo})`)

        const todosItens = Array.from(new Set([
          ...sem1.consumoDetalhado.map((i:any)=>i.item),
          ...sem2.consumoDetalhado.map((i:any)=>i.item)
        ])).map((nomeItem: any) => ({
          nomeItem,
          i1: sem1.consumoDetalhado.find((i:any) => i.item === nomeItem) || { qtdConsumida: 0, valorConsumido: 0, unidade: '' },
          i2: sem2.consumoDetalhado.find((i:any) => i.item === nomeItem) || { qtdConsumida: 0, valorConsumido: 0, unidade: '' },
        })).sort((a: any, b: any) => Math.abs(b.i2.valorConsumido - b.i1.valorConsumido) - Math.abs(a.i2.valorConsumido - a.i1.valorConsumido))

        const head = [['Insumo Auditorado', `${sem1.nome} (A)`, `${sem2.nome} (B)`, 'Diferença B − A']]
        const body = todosItens.map(({ nomeItem, i1, i2 }: any) => {
          const diff = i2.valorConsumido - i1.valorConsumido
          return [
            String(nomeItem),
            `${i1.qtdConsumida} ${i1.unidade}  |  ${formatBRL(i1.valorConsumido)}`,
            `${i2.qtdConsumida} ${i2.unidade}  |  ${formatBRL(i2.valorConsumido)}`,
            `${diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : '= '}${formatBRL(Math.abs(diff))}`
          ]
        })

        // @ts-ignore
        doc.autoTable({
          ...tableConfig,
          head, body,
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 250 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 3) {
              const v = data.cell.raw?.toString() || ''
              if (v.startsWith('▲')) data.cell.styles.textColor = [185, 28, 28]
              else if (v.startsWith('▼')) data.cell.styles.textColor = [21, 128, 61]
            }
          }
        })
        doc.save(`${slugEmpresa}_Comparativo_${sem1.nome}_vs_${sem2.nome}.pdf`)
      }
      else if (modoVisao === "precos") {
        const produtosFiltrados = historicoPrecos.filter((p: any) =>
          p.nome.toLowerCase().includes(filtroProduto.toLowerCase()))
        if (produtosFiltrados.length === 0) { toast.error("Nenhum dado de preço para exportar."); return }

        gerarHeader(`Histórico de Preços por Insumo  |  Últimas compras registradas`)

        const head = [['Produto', 'Categoria', 'Data da Compra', 'Qtd', 'Preço Unitário', 'Variação']]
        const body: any[] = []
        produtosFiltrados.forEach((p: any) => {
          const entradas = [...p.entradas].reverse()
          entradas.forEach((e: any, i: number) => {
            const precoAnt = entradas[i + 1]?.preco
            const variacao = precoAnt ? ((e.preco - precoAnt) / precoAnt) * 100 : null
            body.push([
              i === 0 ? p.nome : '',
              i === 0 ? (p.grupo || '—') : '',
              new Date(e.data + "T12:00:00").toLocaleDateString('pt-BR'),
              `${e.qtd} ${p.unidade}`,
              formatBRL(e.preco),
              variacao === null ? '—' : `${variacao > 0 ? '▲ +' : '▼ '}${variacao.toFixed(1)}%`,
            ])
          })
        })

        // @ts-ignore
        doc.autoTable({
          ...tableConfig,
          head, body,
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 180 }, 1: { cellWidth: 110 },
            2: { halign: 'center' }, 3: { halign: 'right' },
            4: { halign: 'right', fontStyle: 'bold' }, 5: { halign: 'center' },
          },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 5) {
              const v = data.cell.raw?.toString() || ''
              if (v.startsWith('▲')) data.cell.styles.textColor = [185, 28, 28]
              else if (v.startsWith('▼')) data.cell.styles.textColor = [21, 128, 61]
            }
          }
        })
        doc.save(`${slugEmpresa}_Historico_Precos.pdf`)
      }
    } catch (error: any) {
      console.error("Erro absoluto:", error)
      toast.error(`Erro no motor de PDF: ${error.message}. Recarregue a página.`)
    }
  }

  const handleRelatorioExecutivo = () => {
    if (!pdfPronto) return
    const semana = semanasData.find(s => s.id === semanaSelecionadaModal)
    if (!semana) return

    try {
      // @ts-ignore
      const jsPDF  = window.jspdf.jsPDF
      const doc    = new jsPDF('p', 'pt', 'a4')
      const W      = doc.internal.pageSize.width   // 595
      const H      = doc.internal.pageSize.height  // 842
      const marca  = getCorMarca(perfil?.empresa?.cor_principal)

      const hex2rgb = (hex: string): [number, number, number] => {
        const h = hex.replace('#', '')
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
      }
      const brandRgb = hex2rgb(marca.hex500)
      const brand100 = hex2rgb(marca.hex100)

      const cmvPct    = semana.faturamento > 0 ? (semana.cmvValor / semana.faturamento) * 100 : 0
      const acimaMeta = cmvPct > metaCMV

      // ── 1. Cabeçalho de marca ──────────────────────────────────────────
      doc.setFillColor(15, 23, 42)
      doc.rect(0, 0, W, 64, 'F')
      doc.setFont("helvetica", "bold")
      doc.setFontSize(20)
      doc.setTextColor(255, 255, 255)
      doc.text(nomeEmpresa, 40, 38)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(148, 163, 184)
      doc.text(`Relatório Executivo Semanal  ·  ${semana.nome} (${semana.periodo})`, 40, 56)
      doc.setFillColor(...brandRgb)
      doc.rect(0, 64, W, 5, 'F')
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}  |  Margem+ · Sistema de Controle de CMV`, 40, 84)

      // ── 2. 4 KPI cards desenhados ──────────────────────────────────────
      const cardW = (W - 80 - 30) / 4
      const cardH = 76
      const cardY = 100
      const kpis = [
        { label: 'FATURAMENTO',  valor: formatBRL(semana.faturamento), sub: 'receita do período',  color: [21, 128, 61]   as [number,number,number], bg: brand100 },
        { label: 'CMV (R$)',     valor: formatBRL(semana.cmvValor),    sub: 'custo dos insumos',   color: [185, 28, 28]   as [number,number,number], bg: hex2rgb('#FEE2E2') },
        { label: `CMV (%) · META ${metaCMV}%`, valor: `${cmvPct.toFixed(1)}%`, sub: acimaMeta ? 'acima da meta ▲' : 'dentro da meta ✓',
          color: (acimaMeta ? [185, 28, 28] : [21, 128, 61]) as [number,number,number],
          bg:    (acimaMeta ? hex2rgb('#FEE2E2') : hex2rgb('#DCFCE7')) as [number,number,number] },
        { label: 'COMPRAS',      valor: formatBRL(semana.compras),     sub: 'entradas do período', color: brandRgb,                                  bg: brand100 },
      ]

      kpis.forEach((kpi, i) => {
        const x = 40 + i * (cardW + 10)
        doc.setFillColor(...kpi.bg)
        doc.roundedRect(x, cardY, cardW, cardH, 6, 6, 'F')
        doc.setFont("helvetica", "bold")
        doc.setFontSize(7)
        doc.setTextColor(100, 116, 139)
        doc.text(kpi.label, x + 10, cardY + 15)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(15)
        doc.setTextColor(...kpi.color)
        doc.text(kpi.valor, x + 10, cardY + 42)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text(kpi.sub, x + 10, cardY + 60)
      })

      // ── 3. Veredito ────────────────────────────────────────────────────
      const verY  = cardY + cardH + 18
      const delta = Math.abs(cmvPct - metaCMV).toFixed(1)
      const veredito = acimaMeta
        ? `CMV ficou em ${cmvPct.toFixed(1)}% — ${delta} ponto(s) ACIMA da meta de ${metaCMV}%. Revise o consumo dos principais insumos.`
        : `CMV ficou em ${cmvPct.toFixed(1)}% — ${delta} ponto(s) abaixo da meta de ${metaCMV}%. Resultado dentro do esperado.`

      const bgVer: [number,number,number] = acimaMeta ? [254, 226, 226] : [220, 252, 231]
      doc.setFillColor(...bgVer)
      doc.roundedRect(40, verY, W - 80, 34, 4, 4, 'F')
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...(acimaMeta ? [185, 28, 28] : [21, 128, 61]) as [number,number,number])
      doc.text(veredito, 52, verY + 21, { maxWidth: W - 104 })

      // ── 4. Top 5 insumos ───────────────────────────────────────────────
      const tableY = verY + 54
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text("Top Insumos por Custo no CMV", 40, tableY)
      doc.setFillColor(...brandRgb)
      doc.rect(40, tableY + 4, 200, 2, 'F')

      const top5 = semana.consumoDetalhado
        .filter((i: any) => !i.producao_interna)
        .slice(0, 5)

      // @ts-ignore
      doc.autoTable({
        startY: tableY + 16,
        theme: 'striped',
        styles:             { fontSize: 10, cellPadding: 7, textColor: [30, 41, 59] },
        headStyles:         { fillColor: brandRgb, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: brand100 },
        head: [['Insumo', 'Categoria', 'Consumido', 'Custo CMV', '% do Total']],
        body: top5.map((i: any) => [
          i.item,
          i.grupo,
          `${i.qtdConsumida} ${i.unidade}`,
          formatBRL(i.valorConsumido),
          `${semana.cmvValor > 0 ? ((i.valorConsumido / semana.cmvValor) * 100).toFixed(1) : 0}%`
        ]),
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 170 },
          1: { cellWidth: 100 },
          2: { halign: 'right', cellWidth: 90 },
          3: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] as [number,number,number], cellWidth: 110 },
          4: { halign: 'center', cellWidth: 70 },
        }
      })

      // ── 5. Rodapé ─────────────────────────────────────────────────────
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(`${nomeEmpresa}  ·  Margem+  ·  Gerado em ${new Date().toLocaleString('pt-BR')}`, 40, H - 16)

      doc.save(`${slugEmpresa}_Executivo_${semana.nome.replace(' ', '_')}.pdf`)
    } catch (error: any) {
      console.error("Erro relatório executivo:", error)
      toast.error(`Erro ao gerar relatório: ${error.message}`)
    }
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-t-transparent rounded-full" style={{ borderColor: T.margem, borderTopColor: 'transparent' }} />
    </div>
  )

  const anosMeses = []
  const dataLoop = new Date()
  for (let i = 0; i < 12; i++) {
    anosMeses.push({ value: `${dataLoop.getFullYear()}-${String(dataLoop.getMonth() + 1).padStart(2, '0')}`, label: dataLoop.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) })
    dataLoop.setMonth(dataLoop.getMonth() - 1)
  }

  const semanaSel = semanasData.find(s => s.id === semanaSelecionadaModal) || { consumoDetalhado: [] }
  const dComp1 = semanasData.find(s => s.id === semanaComp1)
  const dComp2 = semanasData.find(s => s.id === semanaComp2)

  return (
    <div className="space-y-6 pb-10 animate-in fade-in">

      {/* Cabeçalho */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-xl" style={{ border: `1px solid ${T.stone200}` }}>
        <div>
          <p className="text-[12px] font-semibold uppercase mb-1" style={{ color: T.stone400, letterSpacing: '0.10em' }}>Análise</p>
          <h2 className="text-[28px] font-light font-serif" style={{ color: T.ink }}>Central de Relatórios</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}>
            <CalendarDays className="w-5 h-5 ml-2" style={{ color: T.stone400 }} />
            <select
              value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-transparent font-semibold outline-none text-sm cursor-pointer pr-2 capitalize"
              style={{ color: T.ink }}
            >
              {anosMeses.map(am => <option key={am.value} value={am.value}>{am.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}>
            <Layers className="w-5 h-5 ml-2" style={{ color: T.stone400 }} />
            <select
              value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
              className="bg-transparent font-semibold outline-none text-sm cursor-pointer pr-2"
              style={{ color: T.ink }}
            >
              {categoriasDisponiveis.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <button
            onClick={handleExportarExcel}
            disabled={!excelPronto || semanasData.length === 0}
            className="px-5 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            style={excelPronto && semanasData.length > 0
              ? { background: T.margem, color: T.paper }
              : { background: T.paper2, color: T.stone400, cursor: 'not-allowed' }}
          >
            {excelPronto
              ? <><Sheet className="w-5 h-5" /> Excel</>
              : <><Loader2 className="w-5 h-5 animate-spin" /> Carregando...</>}
          </button>
          <button
            onClick={handleGerarPDFFoda}
            disabled={!pdfPronto}
            className="px-5 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={pdfPronto ? { background: T.ink, color: T.paper } : { background: T.paper2, color: T.stone400, cursor: 'not-allowed' }}
          >
            {pdfPronto ? (
              <><FileDown className="w-5 h-5" /> PDF</>
            ) : (
              <><Loader2 className="w-5 h-5 animate-spin" /> Carregando...</>
            )}
          </button>
        </div>
      </div>

      {/* Underline tabs */}
      <div className="flex border-b" style={{ borderColor: T.stone200 }}>
        {[
          { id: "resumo", label: "Resumo do Mês", icon: <LayoutList size={14} /> },
          { id: "detalhado", label: "Auditoria", icon: <ClipboardCheck size={14} /> },
          { id: "comparacao", label: "Comparação", icon: <ArrowRightLeft size={14} /> },
          { id: "precos", label: "Preços", icon: <LineChart size={14} /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setModoVisao(t.id as any)}
            className="relative flex items-center gap-2 px-5 py-3 text-[14px] font-semibold transition-colors whitespace-nowrap"
            style={{ color: modoVisao === t.id ? T.ink : T.stone500 }}
          >
            {t.icon}
            {t.label}
            {modoVisao === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: T.ink }} />
            )}
          </button>
        ))}
      </div>

      {/* Resumo */}
      {modoVisao === "resumo" && (
        <div className="bg-white rounded-xl overflow-hidden animate-in zoom-in-95" style={{ border: `1px solid ${T.stone200}` }}>
          {semanasData.length === 0 ? (
            <div className="p-14 text-center flex flex-col items-center gap-2">
              <span className="text-[72px] font-light font-serif leading-none select-none" style={{ color: T.stone200 }}>+</span>
              <p className="font-semibold text-sm mt-2" style={{ color: T.stone400 }}>Nenhum dado neste mês.</p>
              <p className="text-xs" style={{ color: T.stone300 }}>Registre compras e faturamento para ver os relatórios aqui.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead style={{ background: T.paper2, borderBottom: `1px solid ${T.stone200}` }}>
                  <tr>
                    <th className="p-5 text-left text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Métricas</th>
                    {semanasData.map(s => (
                      <th key={s.id} className="p-5 min-w-[150px]" style={{ borderLeft: `1px solid ${T.stone200}` }}>
                        <span className="block text-[14px] font-semibold" style={{ color: T.ink }}>{s.nome}</span>
                        <span className="block text-[12px] font-medium mt-0.5" style={{ color: T.stone400 }}>{s.periodo}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className="transition-colors"
                    style={{ borderBottom: `1px solid ${T.stone200}` }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.paper2 + '66'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td className="p-5 text-left text-[14px] font-medium" style={{ color: T.stone500 }}>Faturamento Global</td>
                    {semanasData.map(s => <td key={s.id} className="p-5 font-semibold tabular-nums" style={{ color: '#15803D', borderLeft: `1px solid ${T.stone200}` }}>{formatBRL(s.faturamento)}</td>)}
                  </tr>
                  <tr
                    className="transition-colors"
                    style={{ borderBottom: `1px solid ${T.stone200}` }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.paper2 + '66'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td className="p-5 text-left text-[14px] font-medium" style={{ color: T.stone500 }}>Compras ({filtroCategoria})</td>
                    {semanasData.map(s => <td key={s.id} className="p-5 font-semibold tabular-nums" style={{ color: '#B45309', borderLeft: `1px solid ${T.stone200}` }}>{formatBRL(s.compras)}</td>)}
                  </tr>
                  <tr
                    className="transition-colors"
                    style={{ borderBottom: `1px solid ${T.stone200}` }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.paper2 + '66'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td className="p-5 text-left text-[14px] font-medium" style={{ color: T.stone500 }}>Deduções / Saídas (-)</td>
                    {semanasData.map(s => <td key={s.id} className="p-5 font-semibold tabular-nums" style={{ color: '#B91C1C', borderLeft: `1px solid ${T.stone200}` }}>{formatBRL(s.deducoes)}</td>)}
                  </tr>
                  <tr
                    className="transition-colors"
                    style={{ background: T.margemSoft + '33', borderBottom: `1px solid ${T.stone200}` }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.margemSoft + '55'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = T.margemSoft + '33'}
                  >
                    <td className="p-5 text-left font-semibold text-[14px]" style={{ color: T.ink }}>CMV Líquido (R$)</td>
                    {semanasData.map(s => <td key={s.id} className="p-5 font-semibold tabular-nums" style={{ color: T.ink, borderLeft: `1px solid ${T.stone200}` }}>{formatBRL(s.cmvValor)}</td>)}
                  </tr>
                  <tr style={{ background: T.paper2 + '99' }}>
                    <td className="p-5 text-left font-semibold text-[0.8rem]" style={{ color: T.stone600 }}>Margem CMV (%)</td>
                    {semanasData.map(s => {
                      const cmvP = s.faturamento > 0 ? (s.cmvValor / s.faturamento) * 100 : 0
                      return (
                        <td key={s.id} className="p-5" style={{ borderLeft: `1px solid ${T.stone200}` }}>
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg font-semibold text-sm tabular-nums ${cmvP > metaCMV ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#E8F0EC] text-[#0F4C3A]'}`}>
                            {formatPerc(cmvP)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Auditoria */}
      {modoVisao === "detalhado" && (
        <div className="bg-white rounded-xl overflow-hidden flex flex-col min-h-[600px] animate-in slide-in-from-right-8" style={{ border: `1px solid ${T.stone200}` }}>
          <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ borderBottom: `1px solid ${T.stone200}`, background: T.paper2 }}>
            <div>
              <p className="font-semibold text-sm flex items-center gap-2" style={{ color: T.ink }}>
                <ClipboardCheck className="w-4 h-4" style={{ color: T.margem }} /> Auditoria Completa
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="p-3 rounded-xl text-sm font-semibold outline-none cursor-pointer"
                style={{ border: `1px solid ${T.stone200}`, background: 'white', color: T.ink }}
                value={semanaSelecionadaModal} onChange={e => setSemanaSelecionadaModal(e.target.value)}
              >
                {semanasData.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.periodo})</option>)}
              </select>
              <button
                onClick={handleRelatorioExecutivo}
                disabled={!pdfPronto || !semanaSelecionadaModal}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                style={pdfPronto && semanaSelecionadaModal ? { background: T.ink, color: T.paper } : { background: T.paper2, color: T.stone400 }}
              >
                <FileDown className="w-4 h-4" /> Relatório Executivo
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-4" style={{ background: T.paper + '88' }}>
            {semanaSel.consumoDetalhado.length === 0 && (
              <p className="text-center font-semibold mt-10" style={{ color: T.stone400 }}>
                Nenhum consumo para a categoria {filtroCategoria} nessa semana.
              </p>
            )}
            <div className="grid grid-cols-1 gap-4">
              {semanaSel.consumoDetalhado.map((item: any, i: number) => (
                <div
                  key={i}
                  className={`flex flex-col p-5 bg-white rounded-xl`}
                  style={{ border: `1px solid ${item.producao_interna ? T.margemMint + '66' : T.stone200}`, background: item.producao_interna ? T.margemSoft + '33' : 'white' }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full font-semibold flex items-center justify-center text-xs"
                        style={{ background: item.producao_interna ? T.margemSoft : T.paper2, color: item.producao_interna ? T.margem : T.stone500 }}
                      >
                        {i + 1}º
                      </div>
                      <div>
                        <p className="font-semibold text-lg" style={{ color: T.ink }}>{item.item}</p>
                        <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: T.stone400 }}>{item.grupo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: T.stone400 }}>Custo no CMV</p>
                      {item.producao_interna
                        ? <p className="font-semibold text-sm px-2 py-1 rounded-md border" style={{ color: '#3B82F6', background: '#EFF6FF', borderColor: '#DBEAFE' }}>R$ 0,00 (Subproduto)</p>
                        : <p className="font-semibold text-xl" style={{ color: '#B91C1C' }}>{formatBRL(item.valorConsumido)}</p>
                      }
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 p-4 rounded-xl text-center" style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}>
                    <div className="flex flex-col p-1" style={{ borderRight: `1px solid ${T.stone200}` }}>
                      <span className="text-[12px] uppercase font-semibold tracking-wider" style={{ color: T.stone400 }}>Inicial</span>
                      <span className="font-semibold text-lg mt-1" style={{ color: T.ink }}>{item.qtdIni} <span className="text-[12px] font-semibold uppercase">{item.unidade}</span></span>
                      <span className="text-[12px] font-semibold mt-1.5" style={{ color: T.stone500 }}>{formatBRL(item.valorIni)}</span>
                    </div>
                    <div className="flex flex-col p-1" style={{ borderRight: `1px solid ${T.stone200}` }}>
                      <span className="text-[12px] uppercase font-semibold tracking-wider" style={{ color: '#B45309' }}>+ Comprou</span>
                      <span className="font-semibold text-lg mt-1" style={{ color: '#B45309' }}>{item.qtdComp} <span className="text-[12px] font-semibold uppercase">{item.unidade}</span></span>
                      <span className="text-[12px] font-semibold mt-1.5" style={{ color: '#B45309' }}>{formatBRL(item.valorComp)}</span>
                    </div>
                    <div className="flex flex-col p-1" style={{ borderRight: `1px solid ${T.stone200}` }}>
                      <span className="text-[12px] uppercase font-semibold tracking-wider" style={{ color: T.stone500 }}>= Consumiu</span>
                      <span className="font-semibold text-lg mt-1" style={{ color: T.ink }}>{item.qtdConsumida} <span className="text-[12px] font-semibold uppercase">{item.unidade}</span></span>
                      <span className="text-[12px] font-semibold mt-1.5" style={{ color: T.stone500 }}>{item.producao_interna ? "R$ 0,00" : formatBRL(item.valorConsumido)}</span>
                    </div>
                    <div className="flex flex-col justify-center p-1 rounded-lg" style={{ background: T.margemSoft + '80' }}>
                      <span className="text-[12px] uppercase font-semibold tracking-wider" style={{ color: T.margem }}>Sobrou (Final)</span>
                      <span className="font-semibold text-lg mt-1" style={{ color: T.margem }}>{item.qtdFin} <span className="text-[12px] font-semibold uppercase">{item.unidade}</span></span>
                      <span className="text-[12px] font-semibold mt-1.5 py-1 rounded-md" style={{ color: T.margem }}>{formatBRL(item.valorFinal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comparação */}
      {modoVisao === "comparacao" && (
        <div className="space-y-6 animate-in slide-in-from-left-8">
          <div
            className="p-6 rounded-xl flex flex-col md:flex-row items-center gap-4"
            style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}
          >
            <div className="flex-1 w-full">
              <label className="text-[12px] font-semibold uppercase block mb-1" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Analisar Semana A:</label>
              <select
                value={semanaComp1} onChange={e => setSemanaComp1(e.target.value)}
                className="w-full p-3 rounded-xl font-semibold outline-none"
                style={{ background: 'white', border: `1px solid ${T.stone200}`, color: T.ink }}
              >
                {semanasData.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.periodo})</option>)}
              </select>
            </div>
            <div className="p-3 rounded-full mt-4 md:mt-0" style={{ background: T.stone200 }}>
              <Flame className="w-5 h-5 text-rose-500" />
            </div>
            <div className="flex-1 w-full">
              <label className="text-[12px] font-semibold uppercase block mb-1" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Contra Semana B:</label>
              <select
                value={semanaComp2} onChange={e => setSemanaComp2(e.target.value)}
                className="w-full p-3 rounded-xl font-semibold outline-none"
                style={{ background: 'white', border: `1px solid ${T.stone200}`, color: T.ink }}
              >
                {semanasData.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.periodo})</option>)}
              </select>
            </div>
          </div>

          {dComp1 && dComp2 && (() => {
            const cmvPct1 = dComp1.faturamento > 0 ? (dComp1.cmvValor / dComp1.faturamento) * 100 : 0
            const cmvPct2 = dComp2.faturamento > 0 ? (dComp2.cmvValor / dComp2.faturamento) * 100 : 0

            const itensComDiff = Array.from(new Set([
              ...dComp1.consumoDetalhado.map((i: any) => i.item),
              ...dComp2.consumoDetalhado.map((i: any) => i.item),
            ])).map((nomeItem: any) => {
              const item1 = dComp1.consumoDetalhado.find((i: any) => i.item === nomeItem) || { qtdConsumida: 0, valorConsumido: 0, unidade: '' }
              const item2 = dComp2.consumoDetalhado.find((i: any) => i.item === nomeItem) || { qtdConsumida: 0, valorConsumido: 0, unidade: '' }
              return { nomeItem, item1, item2, diff: item2.valorConsumido - item1.valorConsumido }
            }).sort((a: any, b: any) => Math.abs(b.diff) - Math.abs(a.diff))

            const totalA    = itensComDiff.reduce((s: number, i: any) => s + i.item1.valorConsumido, 0)
            const totalB    = itensComDiff.reduce((s: number, i: any) => s + i.item2.valorConsumido, 0)
            const totalDiff = totalB - totalA

            const kpis = [
              { label: 'Faturamento',       a: dComp1.faturamento, b: dComp2.faturamento, fmt: formatBRL,          goodWhen: 'higher' as const },
              { label: 'CMV (R$)',           a: dComp1.cmvValor,    b: dComp2.cmvValor,    fmt: formatBRL,          goodWhen: 'lower'  as const },
              { label: `CMV (%) · meta ${metaCMV}%`, a: cmvPct1,   b: cmvPct2,            fmt: (v: number) => `${v.toFixed(1)}%`, goodWhen: 'lower' as const },
              { label: 'Compras do Período', a: dComp1.compras,     b: dComp2.compras,     fmt: formatBRL,          goodWhen: 'lower'  as const },
            ]

            return (
              <>
                {/* KPI cards A vs B */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  {kpis.map(kpi => {
                    const delta     = kpi.b - kpi.a
                    const isNeutral = Math.abs(delta) < 0.01
                    const isGood    = kpi.goodWhen === 'higher' ? delta >= 0 : delta <= 0
                    const deltaColor = isNeutral ? T.stone400 : isGood ? '#15803D' : '#B91C1C'
                    const deltaBg    = isNeutral ? T.paper2   : isGood ? '#DCFCE7' : '#FEE2E2'
                    return (
                      <div key={kpi.label} className="flex flex-col gap-3 p-5 bg-white rounded-xl" style={{ border: `1px solid ${T.stone200}` }}>
                        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T.stone400 }}>{kpi.label}</p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <p className="text-[12px]" style={{ color: T.stone400 }}>A <span className="font-semibold" style={{ color: T.stone600 }}>{kpi.fmt(kpi.a)}</span></p>
                            <p className="text-[12px]" style={{ color: T.stone400 }}>B <span className="text-base font-bold" style={{ color: T.ink }}>{kpi.fmt(kpi.b)}</span></p>
                          </div>
                          {!isNeutral && (
                            <span className="text-xs font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap" style={{ color: deltaColor, background: deltaBg }}>
                              {delta > 0 ? '▲' : '▼'} {kpi.fmt(Math.abs(delta))}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Tabela ordenada por maior variação */}
                <div className="bg-white rounded-xl overflow-hidden" style={{ border: `1px solid ${T.stone200}` }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead style={{ background: T.paper2, borderBottom: `1px solid ${T.stone200}` }}>
                        <tr>
                          <th className="p-5 text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Insumo / Produto</th>
                          <th className="p-5 text-[12px] font-semibold uppercase text-center" style={{ color: T.stone400, letterSpacing: '0.08em', borderLeft: `1px solid ${T.stone200}` }}>{dComp1.nome}</th>
                          <th className="p-5 text-[12px] font-semibold uppercase text-center" style={{ color: T.stone400, letterSpacing: '0.08em', borderLeft: `1px solid ${T.stone200}` }}>{dComp2.nome}</th>
                          <th className="p-5 text-[12px] font-semibold uppercase text-right" style={{ color: T.margem, letterSpacing: '0.08em', borderLeft: `1px solid ${T.stone200}`, background: T.margemSoft + '55' }}>Diferença Custo (B − A)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensComDiff.map(({ nomeItem, item1, item2, diff }: any, idx: number) => (
                          <tr
                            key={idx}
                            className="transition-colors"
                            style={{ borderBottom: `1px solid ${T.stone200}` }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.paper2}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            <td className="p-4 font-semibold" style={{ color: T.ink }}>{nomeItem}</td>
                            <td className="p-4 text-center" style={{ borderLeft: `1px solid ${T.stone200}`, background: T.paper2 + '55' }}>
                              <span className="block font-semibold" style={{ color: T.ink }}>{item1.qtdConsumida} {item1.unidade}</span>
                              <span className="block text-[12px]" style={{ color: T.stone400 }}>{formatBRL(item1.valorConsumido)}</span>
                            </td>
                            <td className="p-4 text-center" style={{ borderLeft: `1px solid ${T.stone200}`, background: T.paper2 + '55' }}>
                              <span className="block font-semibold" style={{ color: T.ink }}>{item2.qtdConsumida} {item2.unidade}</span>
                              <span className="block text-[12px]" style={{ color: T.stone400 }}>{formatBRL(item2.valorConsumido)}</span>
                            </td>
                            <td className="p-4 text-right" style={{ borderLeft: `1px solid ${T.stone200}`, background: T.margemSoft + '22' }}>
                              <span className={`font-semibold text-lg ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-emerald-600' : ''}`} style={diff === 0 ? { color: T.stone400 } : {}}>
                                {diff > 0 ? '+' : ''}{formatBRL(diff)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: T.ink }}>
                          <td colSpan={2} className="p-4 font-bold text-sm" style={{ color: 'white' }}>Total do Período</td>
                          <td className="p-4 text-center font-semibold text-sm" style={{ color: '#CBD5E1', borderLeft: '1px solid #1E293B' }}>{formatBRL(totalB)}</td>
                          <td className="p-4 text-right font-bold text-sm" style={{ color: totalDiff > 0 ? '#FCA5A5' : totalDiff < 0 ? '#6EE7B7' : '#94A3B8', borderLeft: '1px solid #1E293B' }}>
                            {totalDiff > 0 ? '+' : ''}{formatBRL(totalDiff)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* Histórico de preços */}
      {modoVisao === "precos" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ border: `1px solid ${T.stone200}` }}>
            <div>
              <p className="font-semibold text-sm flex items-center gap-2" style={{ color: T.ink }}>
                <LineChart className="w-4 h-4" style={{ color: '#B45309' }} /> Histórico de Preços por Insumo
              </p>
              <p className="text-sm font-medium mt-1" style={{ color: T.stone400 }}>Evolução do preço unitário de cada produto ao longo das compras registradas.</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.stone400 }} />
                <input
                  type="text" placeholder="Filtrar produto..." value={filtroProduto}
                  onChange={e => setFiltroProduto(e.target.value)}
                  className="pl-9 pr-4 py-2.5 rounded-lg text-sm font-medium outline-none transition-colors"
                  style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                />
              </div>
              <button
                onClick={() => { setHistoricoPrecos([]); carregarHistoricoPrecos() }}
                className="p-2.5 rounded-lg transition-colors"
                title="Recarregar"
                style={{ background: T.paper2, color: T.stone500 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.stone200}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = T.paper2}
              >
                <Loader2 className={`w-4 h-4 ${loadingHistorico ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loadingHistorico ? (
            <div className="flex h-48 items-center justify-center bg-white rounded-xl" style={{ border: `1px solid ${T.stone200}` }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#B45309' }} />
            </div>
          ) : historicoPrecos.length === 0 ? (
            <div className="bg-white rounded-xl p-14 text-center" style={{ border: `1px solid ${T.stone200}` }}>
              <span className="text-[72px] font-light font-serif leading-none select-none block mb-3" style={{ color: T.stone200 }}>+</span>
              <p className="font-semibold text-sm" style={{ color: T.stone400 }}>Nenhuma compra registrada ainda.</p>
              <p className="text-xs mt-1" style={{ color: T.stone300 }}>Lance compras no Estoque para ver o histórico de preços aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historicoPrecos
                .filter((p: any) => p.nome.toLowerCase().includes(filtroProduto.toLowerCase()))
                .map((p: any) => (
                  <div key={p.id} className="bg-white rounded-xl overflow-hidden" style={{ border: `1px solid ${T.stone200}` }}>
                    <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.stone200}`, background: T.paper2 }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                          <Package className="w-4 h-4" style={{ color: '#B45309' }} />
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: T.ink }}>{p.nome}</p>
                          <p className="text-[12px] font-semibold uppercase" style={{ color: T.stone400 }}>{p.grupo} · {p.unidade}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {p.variacao !== null && (
                          p.variacao > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-xs px-3 py-1.5 rounded-full border text-red-600 bg-red-50 border-red-100">
                              <TrendingUp className="w-3 h-3" /> +{p.variacao.toFixed(1)}% na última compra
                            </span>
                          ) : p.variacao < 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-xs px-3 py-1.5 rounded-full border text-emerald-600 bg-emerald-50 border-emerald-100">
                              <TrendingDown className="w-3 h-3" /> {p.variacao.toFixed(1)}% na última compra
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-xs px-3 py-1.5 rounded-full border" style={{ color: T.stone400, background: T.paper2, borderColor: T.stone200 }}>
                              <Minus className="w-3 h-3" /> Sem variação
                            </span>
                          )
                        )}
                        <div className="text-right">
                          <p className="text-[12px] font-semibold uppercase" style={{ color: T.stone400 }}>Último preço</p>
                          <p className="font-semibold text-lg" style={{ color: T.ink }}>{formatBRL(p.precoAtual)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead style={{ background: T.paper2 + '88', borderBottom: `1px solid ${T.stone200}` }}>
                          <tr>
                            <th className="py-3 px-5 text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Data da Compra</th>
                            <th className="py-3 px-5 text-[12px] font-semibold uppercase text-right" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Qtd</th>
                            <th className="py-3 px-5 text-[12px] font-semibold uppercase text-right" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Preço Unitário</th>
                            <th className="py-3 px-5 text-[12px] font-semibold uppercase text-right" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Variação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...p.entradas].reverse().map((e: any, i: number, arr: any[]) => {
                            const precoAnt = arr[i + 1]?.preco
                            const variacaoItem = precoAnt ? ((e.preco - precoAnt) / precoAnt) * 100 : null
                            return (
                              <tr
                                key={i}
                                className="transition-colors"
                                style={{ borderBottom: `1px solid ${T.stone200}` }}
                                onMouseEnter={e2 => (e2.currentTarget as HTMLElement).style.background = T.paper2}
                                onMouseLeave={e2 => (e2.currentTarget as HTMLElement).style.background = 'transparent'}
                              >
                                <td className="py-3 px-5 font-medium" style={{ color: T.stone600 }}>
                                  {new Date(e.data + "T12:00:00").toLocaleDateString('pt-BR')}
                                </td>
                                <td className="py-3 px-5 text-right font-medium" style={{ color: T.stone500 }}>{e.qtd} {p.unidade}</td>
                                <td className="py-3 px-5 text-right font-semibold" style={{ color: T.ink }}>{formatBRL(e.preco)}</td>
                                <td className="py-3 px-5 text-right">
                                  {variacaoItem === null ? (
                                    <span className="font-semibold text-xs" style={{ color: T.stone300 }}>—</span>
                                  ) : variacaoItem > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs bg-red-50 px-2 py-1 rounded-lg">
                                      <TrendingUp className="w-3 h-3" /> +{variacaoItem.toFixed(1)}%
                                    </span>
                                  ) : variacaoItem < 0 ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs bg-emerald-50 px-2 py-1 rounded-lg">
                                      <TrendingDown className="w-3 h-3" /> {variacaoItem.toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 font-semibold text-xs px-2 py-1 rounded-lg" style={{ color: T.stone400, background: T.paper2 }}>
                                      <Minus className="w-3 h-3" /> 0%
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
