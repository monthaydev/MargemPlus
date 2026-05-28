"use client"

import { useState, useEffect } from "react"
import {
  ChefHat, Plus, Search, Trash2, X, Save, Edit2,
  AlertTriangle, TrendingDown, TrendingUp, BookOpen,
  Package, Lock, Calculator, Tag, Percent, Zap,
  Clock, Users, ShoppingBag, FileText,
  CheckCircle2, Info, ArrowRight, ChevronDown, ChevronUp,
  Building2
} from "lucide-react"
import { toast } from "react-hot-toast"
import { supabase } from "@/lib/supabase"
import { formatBRL } from "@/lib/utils"
import { T } from "@/lib/design-tokens"

interface Ingrediente {
  id?: string
  produto_id: number
  quantidade: number
}

interface Ficha {
  id: string
  nome: string
  categoria: string
  preco_venda: number
  ingredientes: Ingrediente[]
  margem_desejada: number
  custo_fixo_porcao: number
  impostos_pct: number
  canal_venda_id: string | null
  porcoes: number
  embalagem_custo: number
  modo_preparo: string
  tempo_preparo: number
}

interface CanalVenda {
  id: string
  nome: string
  taxa_pct: number
}

type Aba = "receita" | "precificacao" | "preparo"

const ABAS: { id: Aba; label: string; icon: any; desc: string }[] = [
  { id: "receita", label: "Receita", icon: Package, desc: "Ingredientes e porções" },
  { id: "precificacao", label: "Precificação", icon: Calculator, desc: "Motor de preços" },
  { id: "preparo", label: "Preparo", icon: FileText, desc: "Modo de fazer" },
]

export function FichaTecnica({ produtos, perfil, isReadOnly }: { produtos: any[]; perfil: any; isReadOnly?: boolean }) {
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [precosPorProduto, setPrecosPorProduto] = useState<Record<number, number>>({})
  const [canaisVenda, setCanaisVenda] = useState<CanalVenda[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState("")
  const [abaAtiva, setAbaAtiva] = useState<Aba>("receita")

  const [fichaEditando, setFichaEditando] = useState<Ficha | null>(null)
  const [isNova, setIsNova] = useState(false)
  const [formNome, setFormNome] = useState("")
  const [formCategoria, setFormCategoria] = useState("")
  const [formPrecoVenda, setFormPrecoVenda] = useState("")
  const [formIngredientes, setFormIngredientes] = useState<Ingrediente[]>([])
  const [novoIngProdutoId, setNovoIngProdutoId] = useState<number | "">("")
  const [novoIngQtd, setNovoIngQtd] = useState("")
  const [formPorcoes, setFormPorcoes] = useState("1")

  const [formMargem, setFormMargem] = useState("30")
  const [formImpostos, setFormImpostos] = useState(String(perfil?.empresa?.imposto_padrao_pct ?? 0))
  const [formCanalId, setFormCanalId] = useState<string>("")
  const [formEmbalagem, setFormEmbalagem] = useState("0")
  const [formCustoFixoPorcao, setFormCustoFixoPorcao] = useState("0")

  const [showCalculadora, setShowCalculadora] = useState(false)
  const [calcCustoMensal, setCalcCustoMensal] = useState("")
  const [calcQtdMensal, setCalcQtdMensal] = useState("")

  const [formModoPreparo, setFormModoPreparo] = useState("")
  const [formTempoPreparo, setFormTempoPreparo] = useState("")

  useEffect(() => { carregarDados() }, [])

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [fichasRes, ingredientesRes, comprasRes, estoquesRes, canaisRes] = await Promise.all([
        supabase.from("fichas_tecnicas").select("*").order("nome"),
        supabase.from("ficha_ingredientes").select("*"),
        supabase.from("compras")
          .select("produto_id, valor_unitario, data_compra")
          .order("data_compra", { ascending: false }),
        supabase.from("estoques")
          .select("produto_id, valor_unitario, tipo_contagem, data_contagem")
          .order("data_contagem", { ascending: false }),
        supabase.from("canais_venda").select("*").eq("ativo", true).order("nome"),
      ])

      const precos: Record<number, number> = {}

      // 1ª prioridade — Estoque Final mais recente
      //    (valor_unitario já reflete a última compra consolidada pelo sistema)
      for (const e of estoquesRes.data || []) {
        if (e.tipo_contagem === "Final" && precos[e.produto_id] === undefined) {
          const v = parseFloat(e.valor_unitario)
          if (v > 0) precos[e.produto_id] = v
        }
      }

      // 2ª prioridade — Estoque Inicial mais recente
      //    (preço digitado manualmente na abertura do ciclo)
      for (const e of estoquesRes.data || []) {
        if (e.tipo_contagem === "Inicial" && precos[e.produto_id] === undefined) {
          const v = parseFloat(e.valor_unitario)
          if (v > 0) precos[e.produto_id] = v
        }
      }

      // 3ª prioridade — Última compra registrada
      //    (fallback para produtos que ainda não entraram em nenhuma contagem)
      for (const c of comprasRes.data || []) {
        if (precos[c.produto_id] === undefined) {
          const v = parseFloat(c.valor_unitario)
          if (v > 0) precos[c.produto_id] = v
        }
      }

      setPrecosPorProduto(precos)
      setCanaisVenda(canaisRes.data || [])

      const ingPorFicha: Record<string, Ingrediente[]> = {}
      for (const ing of ingredientesRes.data || []) {
        if (!ingPorFicha[ing.ficha_id]) ingPorFicha[ing.ficha_id] = []
        ingPorFicha[ing.ficha_id].push({ id: ing.id, produto_id: ing.produto_id, quantidade: parseFloat(ing.quantidade) })
      }

      setFichas(
        (fichasRes.data || []).map((f: any) => ({
          id: f.id, nome: f.nome, categoria: f.categoria || "",
          preco_venda: parseFloat(f.preco_venda) || 0,
          ingredientes: ingPorFicha[f.id] || [],
          margem_desejada: parseFloat(f.margem_desejada) || 30,
          custo_fixo_porcao: parseFloat(f.custo_fixo_porcao) || 0,
          impostos_pct: parseFloat(f.impostos_pct) || 0,
          canal_venda_id: f.canal_venda_id || null,
          porcoes: parseInt(f.porcoes) || 1,
          embalagem_custo: parseFloat(f.embalagem_custo) || 0,
          modo_preparo: f.modo_preparo || "",
          tempo_preparo: parseInt(f.tempo_preparo) || 0,
        }))
      )
    } catch {
      toast.error("Erro ao carregar fichas técnicas.")
    } finally {
      setCarregando(false)
    }
  }

  const calcularCustoTotal = (ingredientes: Ingrediente[]) =>
    ingredientes.reduce((total, ing) => {
      const precoBase = precosPorProduto[ing.produto_id] ?? 0
      const prod = produtos.find(p => p.id === ing.produto_id)
      const rendPct = prod?.rendimento ?? 100
      const precoCorrigido = rendPct > 0 && rendPct < 100 ? precoBase / (rendPct / 100) : precoBase
      return total + ing.quantidade * precoCorrigido
    }, 0)

  const calcularMargem = (custo: number, venda: number): number | null => {
    if (!venda || venda <= 0) return null
    return ((venda - custo) / venda) * 100
  }

  const calcularPrecoSugerido = (custoBase: number, margem: number, taxaCanal: number, impostos: number): number | null => {
    const denominador = 1 - (margem + taxaCanal + impostos) / 100
    if (denominador <= 0) return null
    return custoBase / denominador
  }

  const bgBadgeMargem = (m: number | null) => {
    if (m === null) return { background: T.paper2, color: T.stone400 }
    if (m >= 60) return { background: T.margemSoft, color: T.margem }
    if (m >= 30) return { background: '#FEF3C7', color: '#B45309' }
    return { background: '#FEE2E2', color: '#B91C1C' }
  }

  const resetForm = () => {
    setFormNome(""); setFormCategoria(""); setFormPrecoVenda("")
    setFormIngredientes([]); setNovoIngProdutoId(""); setNovoIngQtd("")
    setFormPorcoes("1")
    setFormMargem("30"); setFormImpostos(String(perfil?.empresa?.imposto_padrao_pct ?? 0)); setFormCanalId("")
    setFormEmbalagem("0"); setFormCustoFixoPorcao("0")
    setShowCalculadora(false); setCalcCustoMensal(""); setCalcQtdMensal("")
    setFormModoPreparo(""); setFormTempoPreparo("")
    setAbaAtiva("receita")
  }

  const abrirNova = () => { setFichaEditando(null); setIsNova(true); resetForm() }

  const abrirEdicao = (f: Ficha) => {
    setFichaEditando(f); setIsNova(false)
    setFormNome(f.nome); setFormCategoria(f.categoria)
    setFormPrecoVenda(f.preco_venda ? f.preco_venda.toFixed(2) : "")
    setFormIngredientes([...f.ingredientes])
    setNovoIngProdutoId(""); setNovoIngQtd("")
    setFormPorcoes(String(f.porcoes || 1))
    setFormMargem(String(f.margem_desejada || 30))
    setFormImpostos(String(f.impostos_pct || 0))
    setFormCanalId(f.canal_venda_id || "")
    setFormEmbalagem(String(f.embalagem_custo || 0))
    setFormCustoFixoPorcao(String(f.custo_fixo_porcao || 0))
    setShowCalculadora(false); setCalcCustoMensal(""); setCalcQtdMensal("")
    setFormModoPreparo(f.modo_preparo || "")
    setFormTempoPreparo(f.tempo_preparo ? String(f.tempo_preparo) : "")
    setAbaAtiva("receita")
  }

  const fecharForm = () => { setFichaEditando(null); setIsNova(false) }

  const adicionarIngrediente = () => {
    if (!novoIngProdutoId || !novoIngQtd) return toast.error("Selecione o produto e a quantidade!")
    const qtd = parseFloat(novoIngQtd.replace(",", "."))
    if (isNaN(qtd) || qtd <= 0) return toast.error("Quantidade inválida!")
    if (formIngredientes.some(i => i.produto_id === novoIngProdutoId)) return toast.error("Ingrediente já adicionado!")
    setFormIngredientes([...formIngredientes, { produto_id: novoIngProdutoId as number, quantidade: qtd }])
    setNovoIngProdutoId(""); setNovoIngQtd("")
  }

  const removerIngrediente = (idx: number) =>
    setFormIngredientes(formIngredientes.filter((_, i) => i !== idx))

  const aplicarCustoCalculado = () => {
    const total = parseFloat(calcCustoMensal.replace(",", "."))
    const qtd = parseFloat(calcQtdMensal.replace(",", "."))
    if (!total || !qtd || qtd <= 0) return toast.error("Preencha os dois campos!")
    const por_porcao = total / qtd
    setFormCustoFixoPorcao(por_porcao.toFixed(2))
    setShowCalculadora(false)
    setCalcCustoMensal(""); setCalcQtdMensal("")
    toast.success(`R$ ${por_porcao.toFixed(2)} aplicado como custo fixo por porção.`)
  }

  const handleSalvar = async () => {
    if (!formNome.trim()) { setAbaAtiva("receita"); return toast.error("Digite o nome da ficha!") }
    if (formIngredientes.length === 0) { setAbaAtiva("receita"); return toast.error("Adicione pelo menos um ingrediente!") }

    setSalvando(true)
    const precoVenda = parseFloat(formPrecoVenda.replace(",", ".")) || 0
    const margem = parseFloat(formMargem) || 30

    try {
      let fichaId: string

      const fichaPayload = {
        nome: formNome.trim(),
        categoria: formCategoria.trim(),
        preco_venda: precoVenda,
        margem_desejada: margem,
        custo_fixo_porcao: parseFloat(formCustoFixoPorcao) || 0,
        impostos_pct: parseFloat(formImpostos) || 0,
        canal_venda_id: formCanalId || null,
        porcoes: parseInt(formPorcoes) || 1,
        embalagem_custo: parseFloat(formEmbalagem) || 0,
        modo_preparo: formModoPreparo.trim(),
        tempo_preparo: parseInt(formTempoPreparo) || 0,
      }

      if (isNova) {
        const { data, error } = await supabase
          .from("fichas_tecnicas")
          .insert([{ empresa_id: perfil.empresa_id, ...fichaPayload }])
          .select("id").single()
        if (error || !data) throw error
        fichaId = data.id
      } else {
        const { error } = await supabase
          .from("fichas_tecnicas")
          .update({ ...fichaPayload, updated_at: new Date().toISOString() })
          .eq("id", fichaEditando!.id)
        if (error) throw error
        fichaId = fichaEditando!.id
        await supabase.from("ficha_ingredientes").delete().eq("ficha_id", fichaId)
      }

      const ings = formIngredientes.map(i => ({ ficha_id: fichaId, produto_id: i.produto_id, quantidade: i.quantidade }))
      if (ings.length > 0) {
        const { error: ingErr } = await supabase.from("ficha_ingredientes").insert(ings)
        if (ingErr) throw ingErr
      }

      toast.success(isNova ? "Ficha criada!" : "Ficha atualizada!")
      await carregarDados()
      fecharForm()
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || "tente novamente"))
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (f: Ficha) => {
    if (!confirm(`Excluir "${f.nome}"? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from("fichas_tecnicas").delete().eq("id", f.id)
    if (error) return toast.error("Erro ao excluir ficha.")
    toast.success("Ficha excluída!")
    await carregarDados()
    if (fichaEditando?.id === f.id) fecharForm()
  }

  const fichasFiltradas = fichas.filter(f =>
    f.nome.toLowerCase().includes(busca.toLowerCase()) ||
    f.categoria.toLowerCase().includes(busca.toLowerCase())
  )

  const custoTotalForm = calcularCustoTotal(formIngredientes)
  const porcoesNum = Math.max(1, parseInt(formPorcoes) || 1)
  const custoPorPorcaoForm = custoTotalForm / porcoesNum
  const embalagemNum = parseFloat(formEmbalagem) || 0
  const custoFixoPorcaoNum = parseFloat(formCustoFixoPorcao) || 0
  const custoBasePrec = custoPorPorcaoForm + embalagemNum + custoFixoPorcaoNum

  const precoVendaNum = parseFloat(formPrecoVenda.replace(",", ".")) || 0
  const margemForm = calcularMargem(custoBasePrec, precoVendaNum)
  const semPrecoForm = formIngredientes.filter(i => !precosPorProduto[i.produto_id])
  const mostrarForm = isNova || fichaEditando !== null

  const canalSelecionado = canaisVenda.find(c => c.id === formCanalId)
  const taxaCanal = canalSelecionado?.taxa_pct || 0
  const impostosNum = parseFloat(formImpostos) || 0
  const margemDesejadaNum = parseFloat(formMargem) || 0
  const totalPercentual = margemDesejadaNum + taxaCanal + impostosNum
  const denominadorValido = totalPercentual < 100

  const precoSugerido = formIngredientes.length > 0
    ? calcularPrecoSugerido(custoBasePrec, margemDesejadaNum, taxaCanal, impostosNum)
    : null

  const custoMensalNum = parseFloat(calcCustoMensal.replace(",", ".")) || 0
  const qtdMensalNum = parseFloat(calcQtdMensal.replace(",", ".")) || 0
  const custoCalculadoPorPorcao = qtdMensalNum > 0 ? custoMensalNum / qtdMensalNum : 0

  const abaReceita_ok = formNome.trim().length > 0 && formIngredientes.length > 0
  const abaPrec_ok = precoSugerido !== null || precoVendaNum > 0

  return (
    <div className="space-y-6 pb-10">

      {/* Eyebrow + título + ação */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase mb-1" style={{ color: T.stone400, letterSpacing: '0.10em' }}>Operacional</p>
          <h1 className="text-[28px] font-light font-serif" style={{ color: T.ink }}>Fichas Técnicas</h1>
        </div>
        {isReadOnly ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
            <Lock className="w-4 h-4" /> Somente Leitura
          </div>
        ) : (
          <button
            onClick={abrirNova}
            className="px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all whitespace-nowrap"
            style={{ background: T.ink, color: T.paper }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
          >
            <Plus className="w-4 h-4" /> Nova Ficha
          </button>
        )}
      </div>

      <div className={`grid gap-6 ${mostrarForm ? "grid-cols-1 xl:grid-cols-[1fr_440px]" : "grid-cols-1"}`}>

        {/* ── LISTA ── */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: T.stone400 }} />
            <input
              type="text" placeholder="Buscar por nome ou categoria..."
              value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-xl text-sm font-medium outline-none transition-colors"
              style={{ border: `1px solid ${T.stone200}`, color: T.ink }}
            />
          </div>

          {carregando ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-xl p-5 animate-pulse" style={{ border: `1px solid ${T.stone200}` }}>
                  <div className="h-4 rounded w-1/3 mb-3" style={{ background: T.paper2 }} />
                  <div className="h-3 rounded w-1/2" style={{ background: T.paper2 }} />
                </div>
              ))}
            </div>
          ) : fichasFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl p-16 text-center" style={{ border: `1px solid ${T.stone200}` }}>
              <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: T.stone200 }} />
              <p className="font-semibold text-lg" style={{ color: T.stone400 }}>Nenhuma ficha cadastrada</p>
              <p className="text-sm mt-1" style={{ color: T.stone400 }}>
                {busca ? "Nenhum resultado para essa busca." : "Crie a primeira ficha técnica do seu restaurante!"}
              </p>
              {!busca && !isReadOnly && (
                <button
                  onClick={abrirNova}
                  className="mt-5 px-5 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 transition-all"
                  style={{ background: T.ink, color: T.paper }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                >
                  <Plus className="w-4 h-4" /> Criar Primeira Ficha
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {fichasFiltradas.map(ficha => {
                const custoTotal = calcularCustoTotal(ficha.ingredientes)
                const porcoes = ficha.porcoes || 1
                const custoPorcao = (custoTotal / porcoes) + (ficha.embalagem_custo || 0) + (ficha.custo_fixo_porcao || 0)
                const semPreco = ficha.ingredientes.some(i => !precosPorProduto[i.produto_id])
                const canalDaFicha = canaisVenda.find(c => c.id === ficha.canal_venda_id)
                const taxaCanalFicha = canalDaFicha?.taxa_pct || 0
                const precoMinFicha = calcularPrecoSugerido(custoPorcao, ficha.margem_desejada, taxaCanalFicha, ficha.impostos_pct)
                const margemReal = calcularMargem(custoPorcao, ficha.preco_venda)
                const abaixoDoMinimo = precoMinFicha !== null && ficha.preco_venda > 0 && ficha.preco_venda < precoMinFicha
                const selecionada = fichaEditando?.id === ficha.id

                return (
                  <div
                    key={ficha.id}
                    onClick={() => !isReadOnly && abrirEdicao(ficha)}
                    className="bg-white rounded-xl p-4 transition-all group"
                    style={{
                      border: `1px solid ${selecionada ? T.ink : T.stone200}`,
                      cursor: isReadOnly ? 'default' : 'pointer',
                    }}
                    onMouseEnter={e => { if (!selecionada && !isReadOnly) (e.currentTarget as HTMLElement).style.borderColor = T.stone400 }}
                    onMouseLeave={e => { if (!selecionada) (e.currentTarget as HTMLElement).style.borderColor = T.stone200 }}
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {selecionada && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: T.ink }} />}
                          <h3 className="font-semibold text-sm" style={{ color: T.ink }}>{ficha.nome}</h3>
                          {ficha.categoria && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider" style={{ background: T.margemSoft, color: T.margem }}>
                              {ficha.categoria}
                            </span>
                          )}
                          {semPreco && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 bg-amber-100 text-amber-600">
                              <AlertTriangle className="w-2.5 h-2.5" /> S/ Preço
                            </span>
                          )}
                          {abaixoDoMinimo && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 bg-red-100 text-red-600">
                              <TrendingDown className="w-2.5 h-2.5" /> Margem baixa
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[12px] font-medium" style={{ color: T.stone400 }}>
                          <span>{ficha.ingredientes.length} ingrediente{ficha.ingredientes.length !== 1 ? "s" : ""}</span>
                          {porcoes > 1 && <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {porcoes} porções</span>}
                          {ficha.tempo_preparo > 0 && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {ficha.tempo_preparo}min</span>}
                          {canalDaFicha && <span style={{ color: T.margem }}>· {canalDaFicha.nome}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-[9px] font-semibold uppercase" style={{ color: T.stone400 }}>Custo/porção</p>
                          <p className="font-semibold text-sm" style={{ color: T.ink }}>{formatBRL(custoPorcao)}</p>
                        </div>
                        {ficha.preco_venda > 0 && (
                          <>
                            <div className="text-right">
                              <p className="text-[9px] font-semibold uppercase" style={{ color: T.stone400 }}>Venda</p>
                              <p className="font-semibold text-sm" style={{ color: T.ink }}>{formatBRL(ficha.preco_venda)}</p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={bgBadgeMargem(margemReal)}>
                              {margemReal !== null ? `${margemReal.toFixed(0)}%` : "--"}
                            </span>
                          </>
                        )}
                        {!isReadOnly && (
                          <button
                            onClick={e => { e.stopPropagation(); handleExcluir(ficha) }}
                            className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── FORMULÁRIO EM ABAS ── */}
        {mostrarForm && (
          <div className="space-y-4 h-fit sticky top-6">
            <div className="bg-white rounded-xl overflow-hidden" style={{ border: `1px solid ${T.stone200}` }}>

              {/* Cabeçalho */}
              <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: `1px solid ${T.stone200}`, background: T.paper2 }}>
                <div>
                  <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: T.ink }}>
                    {isNova
                      ? <><Plus className="w-4 h-4" style={{ color: T.margem }} /> Nova Ficha</>
                      : <><Edit2 className="w-4 h-4" style={{ color: T.margem }} /> Editar Ficha</>
                    }
                  </h3>
                  {formNome && <p className="text-xs font-medium mt-0.5 truncate max-w-[240px]" style={{ color: T.stone400 }}>{formNome}</p>}
                </div>
                <button
                  onClick={fecharForm}
                  className="p-2 rounded-lg transition-all"
                  style={{ color: T.stone400 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.ink; (e.currentTarget as HTMLElement).style.background = T.stone200 }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.stone400; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Abas do formulário */}
              <div className="flex" style={{ borderBottom: `1px solid ${T.stone200}` }}>
                {ABAS.map((aba) => {
                  const Icon = aba.icon
                  const ativa = abaAtiva === aba.id
                  const completa = aba.id === "receita" ? abaReceita_ok : aba.id === "precificacao" ? abaPrec_ok : !!formModoPreparo.trim()
                  return (
                    <button
                      key={aba.id}
                      onClick={() => setAbaAtiva(aba.id)}
                      className="flex-1 py-3 px-2 flex flex-col items-center gap-0.5 transition-all relative"
                      style={{
                        color: ativa ? T.ink : T.stone400,
                        background: ativa ? 'white' : T.paper2,
                      }}
                    >
                      {ativa && <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: T.ink }} />}
                      <div className="relative">
                        <Icon className="w-4 h-4" />
                        {completa && !ativa && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />}
                      </div>
                      <span className="text-[12px] font-semibold uppercase tracking-wide">{aba.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* ABA 1: RECEITA */}
              {abaAtiva === "receita" && (
                <div className="p-5 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                      Nome do Prato <span style={{ color: '#B91C1C' }}>*</span>
                    </label>
                    <input
                      type="text" value={formNome} onChange={e => setFormNome(e.target.value)}
                      placeholder="Ex: Pizza Pepperoni, X-Burguer..."
                      className="w-full p-3.5 rounded-xl font-medium text-sm outline-none transition-all"
                      style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Categoria</label>
                      <input
                        type="text" value={formCategoria} onChange={e => setFormCategoria(e.target.value)}
                        placeholder="Ex: Pizzas"
                        className="w-full p-3 rounded-xl font-medium text-sm outline-none transition-all"
                        style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold uppercase flex items-center gap-1" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                        <Users className="w-3 h-3" /> Porções
                      </label>
                      <input
                        type="number" min="1" value={formPorcoes} onChange={e => setFormPorcoes(e.target.value)}
                        placeholder="1"
                        className="w-full p-3 rounded-xl font-medium text-sm outline-none transition-all text-center"
                        style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold uppercase flex items-center gap-1" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                        <Clock className="w-3 h-3" /> Tempo (min)
                      </label>
                      <input
                        type="number" min="0" value={formTempoPreparo} onChange={e => setFormTempoPreparo(e.target.value)}
                        placeholder="0"
                        className="w-full p-3 rounded-xl font-medium text-sm outline-none transition-all text-center"
                        style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                      />
                    </div>
                  </div>

                  {/* Ingredientes */}
                  <div className="space-y-3">
                    <label className="text-[12px] font-semibold uppercase flex items-center gap-1.5" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                      <Package className="w-3.5 h-3.5" /> Ingredientes <span style={{ color: '#B91C1C' }}>*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={novoIngProdutoId}
                        onChange={e => setNovoIngProdutoId(e.target.value ? parseInt(e.target.value) : "")}
                        className="flex-1 p-3 rounded-xl font-medium text-sm outline-none"
                        style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                      >
                        <option value="">Selecione o insumo...</option>
                        {produtos.filter(p => !formIngredientes.some(i => i.produto_id === p.id)).map(p => (
                          <option key={p.id} value={p.id}>{p.nome} ({p.unidade})</option>
                        ))}
                      </select>
                      <input
                        type="text" value={novoIngQtd} onChange={e => setNovoIngQtd(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && adicionarIngrediente()}
                        placeholder="Qtd"
                        className="w-20 p-3 rounded-xl font-medium outline-none text-sm text-center"
                        style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                      />
                      <button
                        onClick={adicionarIngrediente}
                        className="px-4 py-3 rounded-xl font-semibold transition-all"
                        style={{ background: T.ink, color: T.paper }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {formIngredientes.length > 0 ? (
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {formIngredientes.map((ing, idx) => {
                          const prod = produtos.find(p => p.id === ing.produto_id)
                          const preco = precosPorProduto[ing.produto_id]
                          const rendPct = prod?.rendimento ?? 100
                          const precoCorrigido = preco !== undefined && rendPct < 100 ? preco / (rendPct / 100) : preco
                          const subtotal = precoCorrigido !== undefined ? ing.quantidade * precoCorrigido : null
                          return (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl group" style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate flex items-center gap-1.5" style={{ color: T.ink }}>
                                  {prod?.nome || "Produto removido"}
                                  {rendPct < 100 && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-amber-100 text-amber-700">
                                      rend.{rendPct}%
                                    </span>
                                  )}
                                </p>
                                <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>
                                  {ing.quantidade} {prod?.unidade} × {preco !== undefined
                                    ? (rendPct < 100
                                      ? <><span className="line-through opacity-50">{formatBRL(preco)}</span> → <span className="font-semibold" style={{ color: '#B45309' }}>{formatBRL(precoCorrigido!)}</span></>
                                      : formatBRL(preco))
                                    : <span style={{ color: '#B45309' }}>sem preço no estoque</span>
                                  }
                                </p>
                              </div>
                              <p className="font-semibold text-sm flex-shrink-0" style={{ color: subtotal !== null ? T.margem : '#B45309' }}>
                                {subtotal !== null ? formatBRL(subtotal) : "--"}
                              </p>
                              <button
                                onClick={() => removerIngrediente(idx)}
                                className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-xl p-6 text-center" style={{ borderColor: T.stone200 }}>
                        <Package className="w-8 h-8 mx-auto mb-2" style={{ color: T.stone300 }} />
                        <p className="text-xs font-semibold" style={{ color: T.stone400 }}>Nenhum ingrediente ainda</p>
                        <p className="text-xs mt-0.5" style={{ color: T.stone300 }}>Use o campo acima para adicionar</p>
                      </div>
                    )}

                    {semPrecoForm.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-amber-700 text-xs font-semibold">
                          {semPrecoForm.length} ingrediente{semPrecoForm.length > 1 ? "s" : ""} sem preço no estoque — lance uma compra ou faça uma contagem com valor para calcular o custo corretamente.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Resumo de custo */}
                  {formIngredientes.length > 0 && (
                    <div className="rounded-xl p-4 space-y-2" style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}>
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Custo Total Receita</span>
                        <span className="font-semibold" style={{ color: T.ink }}>{formatBRL(custoTotalForm)}</span>
                      </div>
                      {porcoesNum > 1 && (
                        <div className="flex justify-between items-center pt-2" style={{ borderTop: `1px solid ${T.stone200}` }}>
                          <span className="text-[12px] font-semibold uppercase flex items-center gap-1" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                            <Users className="w-3 h-3" /> Custo por Porção
                          </span>
                          <span className="font-semibold" style={{ color: T.margem }}>{formatBRL(custoPorPorcaoForm)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {formIngredientes.length > 0 && (
                    <button
                      onClick={() => setAbaAtiva("precificacao")}
                      className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                      style={{ border: `1px solid ${T.stone200}`, color: T.ink }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.paper2}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      Ir para Precificação <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* ABA 2: PRECIFICAÇÃO */}
              {abaAtiva === "precificacao" && (
                <div className="p-5 space-y-4">

                  {formIngredientes.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                      <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-800 text-sm font-semibold">Adicione ingredientes primeiro</p>
                        <p className="text-amber-600 text-xs mt-0.5">O motor precisa do custo dos ingredientes para calcular o preço ideal.</p>
                        <button onClick={() => setAbaAtiva("receita")} className="mt-2 text-amber-700 text-xs font-semibold underline">← Voltar para Receita</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Preço de Venda Atual (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-sm" style={{ color: T.stone400 }}>R$</span>
                      <input
                        type="text" value={formPrecoVenda} onChange={e => setFormPrecoVenda(e.target.value)}
                        placeholder="0,00"
                        className="w-full p-3 pl-9 rounded-xl font-semibold outline-none transition-all"
                        style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                      />
                    </div>
                    <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>Deixe em branco para usar o preço sugerido pelo motor abaixo.</p>
                  </div>

                  <div className="pt-4" style={{ borderTop: `1px solid ${T.stone200}` }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg" style={{ background: T.ink }}>
                        <Calculator className="w-4 h-4" style={{ color: T.paper }} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: T.ink }}>Motor de Precificação</p>
                        <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>Markup Divisor — todos os custos considerados</p>
                      </div>
                    </div>

                    <div className="space-y-4">

                      {/* Embalagem */}
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold uppercase flex items-center gap-1.5" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                          <ShoppingBag className="w-3 h-3" /> Embalagem (R$/porção)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-xs" style={{ color: T.stone400 }}>R$</span>
                          <input
                            type="text" value={formEmbalagem} onChange={e => setFormEmbalagem(e.target.value)}
                            placeholder="0,00"
                            className="w-full p-3 pl-8 rounded-xl font-medium outline-none text-sm transition-all"
                            style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                          />
                        </div>
                        <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>Caixa, saco, bandeja, etc.</p>
                      </div>

                      {/* Custo fixo */}
                      <div className="space-y-2">
                        <label className="text-[12px] font-semibold uppercase flex items-center gap-1.5" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                          <Building2 className="w-3 h-3" /> Custo Fixo (R$/porção)
                        </label>

                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-xs" style={{ color: T.stone400 }}>R$</span>
                            <input
                              type="text" value={formCustoFixoPorcao} onChange={e => setFormCustoFixoPorcao(e.target.value)}
                              placeholder="0,00"
                              className="w-full p-3 pl-8 rounded-xl font-medium outline-none text-sm transition-all"
                              style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                            />
                          </div>
                          <button
                            onClick={() => setShowCalculadora(!showCalculadora)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs border transition-all"
                            style={showCalculadora
                              ? { background: T.ink, color: T.paper, borderColor: T.ink }
                              : { background: 'white', color: T.stone600, borderColor: T.stone200 }
                            }
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            {showCalculadora ? "Fechar" : "Calcular"}
                            {showCalculadora ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>

                        <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>
                          Aluguel, salários, contas e outros fixos rateados por porção.{" "}
                          {!showCalculadora && (
                            <button onClick={() => setShowCalculadora(true)} className="font-semibold underline" style={{ color: T.margem }}>
                              Não sei o valor — calcular agora
                            </button>
                          )}
                        </p>

                        {/* Calculadora */}
                        {showCalculadora && (
                          <div className="rounded-xl p-4 space-y-4" style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}>
                            <div className="flex items-start gap-2">
                              <div className="p-1 rounded-lg mt-0.5 flex-shrink-0" style={{ background: T.ink }}>
                                <Zap className="w-3.5 h-3.5" style={{ color: T.paper }} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold" style={{ color: T.ink }}>Calculadora de Custo Fixo</p>
                                <p className="text-xs mt-0.5" style={{ color: T.stone400 }}>Informe seus custos mensais — calculamos o valor por prato automaticamente.</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Total fixo/mês (R$)</label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-semibold text-xs" style={{ color: T.stone400 }}>R$</span>
                                  <input
                                    type="text"
                                    value={calcCustoMensal}
                                    onChange={e => setCalcCustoMensal(e.target.value)}
                                    placeholder="5.000,00"
                                    className="w-full p-3 pl-8 bg-white rounded-xl font-medium text-sm outline-none transition-all"
                                    style={{ border: `1px solid ${T.stone200}`, color: T.ink }}
                                  />
                                </div>
                                <p className="text-[9px] font-medium" style={{ color: T.stone400 }}>Aluguel + salários + contas</p>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Pratos/mês</label>
                                <input
                                  type="text"
                                  value={calcQtdMensal}
                                  onChange={e => setCalcQtdMensal(e.target.value)}
                                  placeholder="300"
                                  className="w-full p-3 bg-white rounded-xl font-medium text-sm outline-none text-center transition-all"
                                  style={{ border: `1px solid ${T.stone200}`, color: T.ink }}
                                />
                                <p className="text-[9px] font-medium" style={{ color: T.stone400 }}>Quantos pratos vende por mês?</p>
                              </div>
                            </div>

                            {custoCalculadoPorPorcao > 0 && (
                              <div className="bg-white rounded-xl p-3" style={{ border: `1px solid ${T.stone200}` }}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Custo fixo por porção</p>
                                    <p className="text-2xl font-light font-serif" style={{ color: T.margem }}>{formatBRL(custoCalculadoPorPorcao)}</p>
                                  </div>
                                  <div className="text-right text-[12px] font-medium" style={{ color: T.stone400 }}>
                                    <p>{formatBRL(custoMensalNum)}</p>
                                    <p>÷ {qtdMensalNum} pratos</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <button
                              onClick={aplicarCustoCalculado}
                              disabled={custoCalculadoPorPorcao <= 0}
                              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                              style={{ background: T.ink, color: T.paper }}
                              onMouseEnter={e => custoCalculadoPorPorcao > 0 && ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {custoCalculadoPorPorcao > 0
                                ? `Aplicar ${formatBRL(custoCalculadoPorPorcao)}/porção`
                                : "Preencha os campos acima"
                              }
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Impostos */}
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold uppercase flex items-center gap-1.5" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                          <Percent className="w-3 h-3 text-red-400" /> Impostos (DAS / Simples / ISS)
                        </label>
                        <div className="relative">
                          <input
                            type="text" value={formImpostos} onChange={e => setFormImpostos(e.target.value)}
                            placeholder="0"
                            className="w-full p-3 pr-8 rounded-xl font-medium outline-none text-sm transition-all"
                            style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-semibold text-xs" style={{ color: T.stone400 }}>%</span>
                        </div>
                        <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>Simples Nacional restaurante: geralmente 4–15% da receita bruta.</p>
                      </div>

                      {/* Canal de Venda */}
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold uppercase flex items-center gap-1.5" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                          <Tag className="w-3 h-3" style={{ color: T.margem }} /> Canal de Venda
                        </label>
                        <select
                          value={formCanalId}
                          onChange={e => setFormCanalId(e.target.value)}
                          className="w-full p-3 rounded-xl font-medium outline-none text-sm"
                          style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                        >
                          <option value="">Direto (sem taxa de plataforma)</option>
                          {canaisVenda.map(c => (
                            <option key={c.id} value={c.id}>{c.nome} — {c.taxa_pct}%</option>
                          ))}
                        </select>
                        {canalSelecionado && (
                          <p className="text-[12px] font-semibold flex items-center gap-1" style={{ color: T.margem }}>
                            <Info className="w-3 h-3" /> Taxa de {taxaCanal}% descontada do preço de venda.
                          </p>
                        )}
                      </div>

                      {/* Margem */}
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold uppercase flex items-center gap-1" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                          <TrendingUp className="w-3 h-3 text-emerald-500" /> Margem de Lucro Desejada (%)
                        </label>
                        <div className="relative">
                          <input
                            type="text" value={formMargem} onChange={e => setFormMargem(e.target.value)}
                            placeholder="30"
                            className="w-full p-3 pr-8 rounded-xl font-medium outline-none text-sm transition-all"
                            style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-semibold text-xs" style={{ color: T.stone400 }}>%</span>
                        </div>
                      </div>

                      {/* Barra visual */}
                      {totalPercentual > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[12px] font-semibold" style={{ color: T.stone400 }}>
                            <span>Do preço de venda:</span>
                            <span style={totalPercentual >= 100 ? { color: '#B91C1C' } : { color: T.stone500 }}>{totalPercentual.toFixed(0)}% alocado em %</span>
                          </div>
                          <div className="flex h-2 rounded-full overflow-hidden" style={{ background: T.paper2 }}>
                            {impostosNum > 0 && <div className="bg-red-400 transition-all" style={{ width: `${Math.min(impostosNum, 100)}%` }} />}
                            {taxaCanal > 0 && <div className="transition-all" style={{ width: `${Math.min(taxaCanal, 100 - impostosNum)}%`, background: T.stone400 }} />}
                            {margemDesejadaNum > 0 && <div className="bg-emerald-400 transition-all" style={{ width: `${Math.min(margemDesejadaNum, 100 - impostosNum - taxaCanal)}%` }} />}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            {impostosNum > 0 && <span className="text-[9px] text-red-500 font-semibold flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Impostos {impostosNum}%</span>}
                            {taxaCanal > 0 && <span className="text-[9px] font-semibold flex items-center gap-0.5" style={{ color: T.stone500 }}><span className="w-2 h-2 rounded-full inline-block" style={{ background: T.stone400 }} /> Canal {taxaCanal}%</span>}
                            {margemDesejadaNum > 0 && <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Lucro {margemDesejadaNum}%</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resultado do motor */}
                  {formIngredientes.length > 0 && (
                    !denominadorValido ? (
                      <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-red-700 text-sm font-semibold">Percentuais inválidos!</p>
                          <p className="text-red-600 text-xs mt-0.5">A soma ({totalPercentual.toFixed(0)}%) ≥ 100%. Reduza a margem ou as taxas.</p>
                        </div>
                      </div>
                    ) : precoSugerido !== null ? (
                      <div className="rounded-xl p-5 space-y-4" style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}>
                        <div>
                          <p className="text-[12px] font-semibold uppercase mb-1" style={{ color: T.stone400, letterSpacing: '0.10em' }}>Preço Sugerido</p>
                          <div className="text-[32px] font-light font-serif" style={{ color: T.margem }}>{formatBRL(precoSugerido)}</div>
                          {porcoesNum > 1 && <p className="text-xs font-medium mt-1" style={{ color: T.stone400 }}>por porção · {formatBRL(precoSugerido * porcoesNum)} para {porcoesNum} porções</p>}
                        </div>

                        <div className="space-y-2 text-sm pt-3" style={{ borderTop: `1px solid ${T.stone200}` }}>
                          <div className="flex justify-between" style={{ color: T.stone600 }}>
                            <span>(-) Ingredientes/porção</span>
                            <span className="font-semibold">
                              {formatBRL(custoPorPorcaoForm)}
                              <span className="text-xs ml-1" style={{ color: T.stone400 }}>({((custoPorPorcaoForm / precoSugerido) * 100).toFixed(0)}%)</span>
                            </span>
                          </div>
                          {embalagemNum > 0 && (
                            <div className="flex justify-between" style={{ color: T.stone600 }}>
                              <span>(-) Embalagem</span>
                              <span className="font-semibold">{formatBRL(embalagemNum)} <span className="text-xs" style={{ color: T.stone400 }}>({((embalagemNum / precoSugerido) * 100).toFixed(0)}%)</span></span>
                            </div>
                          )}
                          {custoFixoPorcaoNum > 0 && (
                            <div className="flex justify-between" style={{ color: T.stone600 }}>
                              <span>(-) Custo Fixo/porção</span>
                              <span className="font-semibold">{formatBRL(custoFixoPorcaoNum)} <span className="text-xs" style={{ color: T.stone400 }}>({((custoFixoPorcaoNum / precoSugerido) * 100).toFixed(0)}%)</span></span>
                            </div>
                          )}
                          {taxaCanal > 0 && canalSelecionado && (
                            <div className="flex justify-between" style={{ color: T.stone600 }}>
                              <span>(-) {canalSelecionado.nome} ({taxaCanal}%)</span>
                              <span className="font-semibold">{formatBRL(precoSugerido * taxaCanal / 100)}</span>
                            </div>
                          )}
                          {impostosNum > 0 && (
                            <div className="flex justify-between" style={{ color: T.stone600 }}>
                              <span>(-) Impostos ({impostosNum}%)</span>
                              <span className="font-semibold">{formatBRL(precoSugerido * impostosNum / 100)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2" style={{ borderTop: `1px solid ${T.stone200}` }}>
                            <span className="font-semibold" style={{ color: T.margem }}>(=) Seu Lucro ({margemDesejadaNum}%)</span>
                            <span className="font-semibold" style={{ color: T.margem }}>{formatBRL(precoSugerido * margemDesejadaNum / 100)}</span>
                          </div>
                        </div>

                        {precoVendaNum > 0 && precoVendaNum < precoSugerido && (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-red-700 text-xs font-semibold">
                              Preço atual ({formatBRL(precoVendaNum)}) está {formatBRL(precoSugerido - precoVendaNum)} abaixo do ideal.
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() => setFormPrecoVenda(precoSugerido.toFixed(2).replace('.', ','))}
                          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                          style={{ background: T.margem, color: T.paper }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Usar este preço
                        </button>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {/* ABA 3: PREPARO */}
              {abaAtiva === "preparo" && (
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold uppercase flex items-center gap-1.5" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                      <FileText className="w-3.5 h-3.5" /> Modo de Preparo
                    </label>
                    <textarea
                      value={formModoPreparo}
                      onChange={e => setFormModoPreparo(e.target.value)}
                      placeholder={"1. Pré-aqueça o forno a 200°C\n2. Abra a massa e aplique o molho\n3. Adicione os ingredientes\n4. Asse por 12-15 minutos..."}
                      rows={10}
                      className="w-full p-4 rounded-xl font-medium text-sm outline-none transition-all resize-none leading-relaxed"
                      style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                    />
                    <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>
                      Passo a passo para sua equipe. Quanto mais detalhado, mais consistente o preparo.
                    </p>
                  </div>
                  {!formModoPreparo.trim() && (
                    <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}>
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: T.stone400 }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: T.stone600 }}>Aba opcional</p>
                        <p className="text-xs mt-0.5" style={{ color: T.stone400 }}>O modo de preparo é exibido para a cozinha como guia operacional. Você pode preencher depois.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botão Salvar */}
              <div className="px-5 pb-5 pt-3" style={{ borderTop: `1px solid ${T.stone200}` }}>
                <button
                  onClick={handleSalvar} disabled={salvando}
                  className="w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{ background: T.ink, color: T.paper }}
                  onMouseEnter={e => !salvando && ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                >
                  <Save className="w-5 h-5" />
                  {salvando ? "Salvando..." : isNova ? "Criar Ficha" : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
