"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { RefreshCw, Loader2, ShoppingCart, AlertTriangle, Clock, CheckCircle2, Package, Copy, MessageCircle, Layers2, List } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { T, cls } from "@/lib/design-tokens"

type StatusRuptura = 'critico' | 'alerta' | 'atencao' | 'ok' | 'sem_historico'
type Filtro        = 'todos' | 'comprar' | 'ok'

interface ItemCompra {
  produto_id:             number
  nome_produto:           string
  unidade:                string
  grupo:                  string
  estoque_atual:          number
  consumo_medio_sem:      number
  dias_restantes:         number | null
  ultimo_preco:           number
  qtd_sugerida:           number
  custo_estimado:         number
  status_ruptura:         StatusRuptura
  is_perecivel:           boolean
  dias_cobertura_efetiva: number
}

const STATUS: Record<StatusRuptura, { label: string; cor: string; bg: string }> = {
  critico:       { label: 'Crítico',       cor: T.negative, bg: T.negSoft  },
  alerta:        { label: 'Alerta',        cor: T.warning,  bg: T.warnSoft },
  atencao:       { label: 'Atenção',       cor: '#0D7A3B',  bg: '#D1FAE5'  },
  ok:            { label: 'Estoque OK',    cor: T.positive, bg: T.posSoft  },
  sem_historico: { label: 'Sem histórico', cor: T.stone400, bg: T.stone100 },
}

const COBERTURA_OPTS = [7, 10, 14, 21]

function fmt(n: number, dec = 2) {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(dec)
}
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function PlanoCompras({ perfil }: { perfil: any }) {
  const [dados, setDados]               = useState<ItemCompra[]>([])
  const [loading, setLoading]           = useState(true)
  const [erro, setErro]                 = useState<string | null>(null)
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null)
  const [filtro, setFiltro]             = useState<Filtro>('comprar')
  const [comprados, setComprados]       = useState<Set<number>>(new Set())
  const [diasCobertura, setDiasCobertura] = useState(14)
  const [agruparPorGrupo, setAgruparPorGrupo] = useState(false)
  const [copied, setCopied]             = useState(false)

  const carregar = useCallback(async (dias: number) => {
    setLoading(true)
    setErro(null)
    const { data, error } = await supabase.rpc('plano_compras_inteligente', { p_dias_cobertura: dias })
    if (error) {
      setErro(error.message)
    } else {
      setDados((data as ItemCompra[]) ?? [])
      setAtualizadoEm(new Date())
      setComprados(new Set()) // reseta marcações ao recarregar
    }
    setLoading(false)
  }, [])

  useEffect(() => { carregar(diasCobertura) }, [carregar, diasCobertura])

  const toggleComprado = (id: number) => {
    setComprados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const aComprar   = dados.filter(d => d.qtd_sugerida > 0)
  const semCompra  = dados.filter(d => d.qtd_sugerida === 0 && d.status_ruptura !== 'sem_historico')
  const totalCusto = aComprar.reduce((s, d) => s + d.custo_estimado, 0)
  const nComprados = comprados.size
  const criticos   = aComprar.filter(d => d.status_ruptura === 'critico' || d.status_ruptura === 'alerta').length

  const dadosFiltrados =
    filtro === 'comprar' ? aComprar :
    filtro === 'ok'      ? semCompra :
    dados.filter(d => d.status_ruptura !== 'sem_historico')

  // ── Compartilhamento ──────────────────────────────────────────
  const gerarTextoLista = () => {
    const data  = new Date().toLocaleDateString('pt-BR')
    const pendentes = aComprar.filter(d => !comprados.has(d.produto_id))
    const itens = pendentes
      .map(d => `• ${d.nome_produto}: ${fmt(d.qtd_sugerida)} ${d.unidade}${d.custo_estimado > 0 ? ` (≈ ${fmtBRL(d.custo_estimado)})` : ''}`)
      .join('\n')
    const total = fmtBRL(pendentes.reduce((s, d) => s + d.custo_estimado, 0))
    return `🛒 *Lista de Compras — Margem+*\n📅 ${data} · Meta: ${diasCobertura} dias\n\n${itens}\n\n💰 *Total estimado: ${total}*`
  }

  const copiarLista = async () => {
    try {
      await navigator.clipboard.writeText(gerarTextoLista())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard bloqueado */ }
  }

  const compartilharWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(gerarTextoLista())}`, '_blank')
  }

  // ── Agrupamento ───────────────────────────────────────────────
  const grupos = Array.from(new Set(dadosFiltrados.map(d => d.grupo || 'Sem grupo'))).sort()

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className={cls.eyebrow} style={{ color: T.margemMid }}>Estoque Inteligente</p>
          <h1 className="text-[28px] font-serif mt-0.5" style={{ color: T.ink }}>Plano de Compras</h1>
          {atualizadoEm && (
            <p className="text-[12px] mt-1 flex items-center gap-1.5" style={{ color: T.stone400 }}>
              <Clock className="w-3 h-3" />
              Atualizado às {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Share buttons — só aparecem com itens a comprar */}
          {!loading && aComprar.length > 0 && (
            <>
              <button onClick={copiarLista}
                className={cls.btnGhost}
                style={{ color: copied ? T.positive : T.stone500, borderColor: copied ? T.positive : T.stone200, backgroundColor: 'transparent' }}>
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copiado!' : 'Copiar lista'}
              </button>
              <button onClick={compartilharWhatsApp}
                className={cls.btnGhost}
                style={{ color: '#16a34a', borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}>
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            </>
          )}
          <button onClick={() => carregar(diasCobertura)} disabled={loading}
            className={cls.btnGhost}
            style={{ color: T.stone500, borderColor: T.stone200, backgroundColor: 'transparent' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Seletor de cobertura */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[13px] font-medium" style={{ color: T.stone500 }}>Meta de cobertura:</span>
        <div className="flex gap-1.5">
          {COBERTURA_OPTS.map(dias => (
            <button key={dias}
              onClick={() => setDiasCobertura(dias)}
              className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150"
              style={{
                backgroundColor: diasCobertura === dias ? T.margem   : T.stone100,
                color:           diasCobertura === dias ? T.paper    : T.stone500,
                border:          `1px solid ${diasCobertura === dias ? T.margem : T.stone200}`,
              }}>
              {dias} dias
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      {!loading && !erro && aComprar.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          <div className="p-4 rounded-xl border bg-white" style={{ borderColor: T.stone200 }}>
            <p className={`${cls.eyebrow} mb-2`} style={{ color: T.stone400 }}>Itens a Comprar</p>
            <div className="text-[32px] font-serif leading-none tabular-nums" style={{ color: T.ink }}>
              {aComprar.length}
            </div>
            <p className="text-[12px] mt-1" style={{ color: T.stone400 }}>
              {nComprados > 0 ? `${nComprados} marcado${nComprados > 1 ? 's' : ''} como comprado` : `abaixo de ${diasCobertura} dias de cobertura`}
            </p>
          </div>

          <div className="p-4 rounded-xl border" style={{ borderColor: T.margemSoft, backgroundColor: T.margemSoft }}>
            <p className={`${cls.eyebrow} mb-2`} style={{ color: T.margemMid }}>Custo Estimado</p>
            <div className="text-[28px] font-serif leading-none tabular-nums" style={{ color: T.margem }}>
              {fmtBRL(totalCusto)}
            </div>
            <p className="text-[12px] mt-1" style={{ color: T.margemMid }}>baseado no último preço de compra</p>
          </div>

          <div className="p-4 rounded-xl border"
            style={{
              borderColor:     criticos > 0 ? '#FECACA' : T.stone200,
              backgroundColor: criticos > 0 ? T.negSoft  : 'white',
            }}>
            <p className={`${cls.eyebrow} mb-2`} style={{ color: criticos > 0 ? T.negative : T.stone400 }}>
              Urgentes
            </p>
            <div className="text-[32px] font-serif leading-none tabular-nums"
              style={{ color: criticos > 0 ? T.negative : T.ink }}>
              {criticos}
            </div>
            <p className="text-[12px] mt-1" style={{ color: criticos > 0 ? T.negative : T.stone400 }}>
              {criticos > 0 ? 'risco de stockout esta semana' : 'nenhum em estado crítico'}
            </p>
          </div>
        </div>
      )}

      {/* Banner progresso se tiver marcados */}
      {nComprados > 0 && aComprar.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border"
          style={{ backgroundColor: T.margemSoft, borderColor: T.margemMint }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: T.margem }} />
          <p className="text-[13px] font-medium" style={{ color: T.margem }}>
            {nComprados} de {aComprar.length} {nComprados === 1 ? 'item comprado' : 'itens comprados'} —
            {' '}{fmtBRL(aComprar.filter(d => comprados.has(d.produto_id)).reduce((s, d) => s + d.custo_estimado, 0))} gastos
          </p>
        </div>
      )}

      {/* Card principal */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: T.stone200 }}>

        {/* Tabs + toggle de agrupamento */}
        <div className="flex items-center justify-between border-b" style={{ borderColor: T.stone200 }}>
          <div className="flex">
            {([
              { id: 'comprar' as Filtro, label: 'Comprar Agora', count: aComprar.length },
              { id: 'ok'      as Filtro, label: 'Estoque OK',    count: semCompra.length },
              { id: 'todos'   as Filtro, label: 'Todos',         count: dados.filter(d => d.status_ruptura !== 'sem_historico').length },
            ]).map(f => (
              <button key={f.id}
                onClick={() => setFiltro(f.id)}
                className="px-4 py-3 text-[13px] font-medium border-b-2 transition-all duration-150 flex items-center gap-1.5 flex-shrink-0"
                style={{
                  borderBottomColor: filtro === f.id ? T.ink : 'transparent',
                  color: filtro === f.id ? T.ink : T.stone400,
                }}>
                {f.label}
                <span className="px-1.5 py-0.5 rounded-full text-[11px]"
                  style={{ backgroundColor: T.stone100, color: filtro === f.id ? T.ink : T.stone400 }}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
          {/* Toggle agrupar por grupo */}
          {!loading && dadosFiltrados.length > 0 && (
            <button
              onClick={() => setAgruparPorGrupo(a => !a)}
              className="mr-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
              style={{
                color:           agruparPorGrupo ? T.margem   : T.stone400,
                backgroundColor: agruparPorGrupo ? T.margemSoft : 'transparent',
                border:          `1px solid ${agruparPorGrupo ? T.margemMint : T.stone200}`,
              }}>
              {agruparPorGrupo ? <Layers2 className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
              {agruparPorGrupo ? 'Por grupo' : 'Lista'}
            </button>
          )}
        </div>

        {/* Carregando */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.stone400 }} />
            <span className="text-[14px]" style={{ color: T.stone400 }}>Calculando plano de compras...</span>
          </div>
        )}

        {/* Erro */}
        {!loading && erro && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
            <AlertTriangle className="w-6 h-6" style={{ color: T.negative }} />
            <p className="text-[14px] font-semibold" style={{ color: T.ink }}>Erro ao carregar</p>
            <p className="text-[12px] font-mono px-4 py-2 rounded-lg text-center"
              style={{ color: T.negative, backgroundColor: T.negSoft }}>{erro}</p>
            <p className="text-[12px] text-center" style={{ color: T.stone400 }}>
              Execute a migração v10 no Supabase (função <code>plano_compras_inteligente</code>).
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !erro && dados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: T.margemSoft }}>
              <Package className="w-5 h-5" style={{ color: T.margem }} />
            </div>
            <div className="text-center max-w-xs">
              <p className="text-[16px] font-serif mb-1.5" style={{ color: T.ink }}>Sem dados de estoque</p>
              <p className="text-[13px] leading-relaxed" style={{ color: T.stone400 }}>
                Lance contagens finais de estoque em semanas diferentes para gerar o plano de compras.
              </p>
            </div>
          </div>
        )}

        {/* Tabela */}
        {!loading && !erro && dadosFiltrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr style={{ backgroundColor: T.paper2 }}>
                  <th className="w-10 px-4 py-3" />
                  {['Insumo', 'Estoque Atual', 'Consumo / Sem.', 'Sugestão de Compra', 'Último Preço', 'Custo Est.'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase"
                      style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agruparPorGrupo
                  ? grupos.map(grupo => {
                      const itensGrupo = dadosFiltrados.filter(d => (d.grupo || 'Sem grupo') === grupo)
                      const custoGrupo = itensGrupo.reduce((s, d) => s + d.custo_estimado, 0)
                      return (
                        <Fragment key={grupo}>
                          {/* Cabeçalho do grupo */}
                          <tr style={{ backgroundColor: T.paper2 }}>
                            <td colSpan={7} className="px-4 py-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                                  {grupo}
                                </span>
                                {custoGrupo > 0 && (
                                  <span className="text-[12px] font-semibold" style={{ color: T.margem }}>
                                    {fmtBRL(custoGrupo)}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                          {itensGrupo.map(item => (
                            <TabelaLinha key={item.produto_id} item={item} comprados={comprados} toggleComprado={toggleComprado} />
                          ))}
                        </Fragment>
                      )
                    })
                  : dadosFiltrados.map(item => (
                      <TabelaLinha key={item.produto_id} item={item} comprados={comprados} toggleComprado={toggleComprado} />
                    ))
                }
              </tbody>

              {/* Rodapé com total */}
              {filtro !== 'ok' && aComprar.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: T.paper2, borderTop: `2px solid ${T.stone200}` }}>
                    <td colSpan={6} className="px-4 py-3 text-right text-[13px] font-semibold" style={{ color: T.stone500 }}>
                      Total estimado da compra:
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[15px] font-bold tabular-nums font-serif" style={{ color: T.margem }}>
                        {fmtBRL(totalCusto)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Empty do filtro */}
        {!loading && !erro && dados.length > 0 && dadosFiltrados.length === 0 && (
          <div className="flex items-center justify-center py-10 gap-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: T.positive }} />
            <span className="text-[14px]" style={{ color: T.stone400 }}>
              {filtro === 'ok' ? 'Todos os produtos precisam de reposição.' : 'Estoque de todos os produtos está em dia.'}
            </span>
          </div>
        )}
      </div>

      {/* Nota metodológica */}
      {!loading && !erro && dados.length > 0 && (
        <p className="text-[12px] text-center" style={{ color: T.stone300 }}>
          Meta: {diasCobertura} dias de cobertura (média ponderada das últimas 4 semanas).
          Perecíveis: sugestão limitada pela validade típica do insumo.
          Custo baseado no último preço de compra registrado.
        </p>
      )}
    </div>
  )
}

// ── Sub-componente linha da tabela ────────────────────────────────
function TabelaLinha({
  item,
  comprados,
  toggleComprado,
}: {
  item: ItemCompra
  comprados: Set<number>
  toggleComprado: (id: number) => void
}) {
  const cfg   = STATUS[item.status_ruptura]
  const feito = comprados.has(item.produto_id)

  return (
    <tr
      className="border-t transition-colors duration-100"
      style={{ borderColor: T.stone100, opacity: feito ? 0.45 : 1 }}
      onMouseEnter={e => { if (!feito) e.currentTarget.style.backgroundColor = T.paper2 }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}>

      {/* Checkbox */}
      <td className="px-4 py-3.5">
        <button
          onClick={() => toggleComprado(item.produto_id)}
          className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 flex-shrink-0"
          style={{
            borderColor:     feito ? T.margem : T.stone300,
            backgroundColor: feito ? T.margem : 'transparent',
          }}>
          {feito && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </td>

      {/* Nome + grupo + perecível */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.cor }} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-medium"
                style={{ color: feito ? T.stone400 : T.ink, textDecoration: feito ? 'line-through' : 'none' }}>
                {item.nome_produto}
              </span>
              {item.is_perecivel && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ backgroundColor: T.warnSoft, color: '#92400E' }}>
                  🌿 {item.dias_cobertura_efetiva}d
                </span>
              )}
            </div>
            {item.grupo && (
              <div className="text-[11px] mt-0.5" style={{ color: T.stone400 }}>{item.grupo}</div>
            )}
          </div>
        </div>
      </td>

      {/* Estoque atual */}
      <td className="px-4 py-3.5">
        <span className="text-[14px] font-semibold tabular-nums" style={{ color: T.ink }}>
          {item.estoque_atual % 1 === 0 ? item.estoque_atual.toFixed(0) : item.estoque_atual.toFixed(2)}
        </span>
        <span className="text-[12px] ml-1" style={{ color: T.stone400 }}>{item.unidade}</span>
      </td>

      {/* Consumo semanal */}
      <td className="px-4 py-3.5">
        {item.consumo_medio_sem > 0 ? (
          <>
            <span className="text-[14px] tabular-nums" style={{ color: T.stone600 }}>
              {item.consumo_medio_sem % 1 === 0 ? item.consumo_medio_sem.toFixed(0) : item.consumo_medio_sem.toFixed(2)}
            </span>
            <span className="text-[12px] ml-1" style={{ color: T.stone400 }}>{item.unidade}/sem</span>
          </>
        ) : (
          <span className="text-[13px]" style={{ color: T.stone300 }}>—</span>
        )}
      </td>

      {/* Sugestão de compra */}
      <td className="px-4 py-3.5">
        {item.qtd_sugerida > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-bold tabular-nums"
            style={{ backgroundColor: T.margemSoft, color: T.margem }}>
            {item.qtd_sugerida % 1 === 0 ? item.qtd_sugerida.toFixed(0) : item.qtd_sugerida.toFixed(2)} {item.unidade}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ backgroundColor: T.posSoft, color: T.positive }}>
            <CheckCircle2 className="w-3 h-3" />
            Não precisa
          </span>
        )}
      </td>

      {/* Último preço */}
      <td className="px-4 py-3.5">
        {item.ultimo_preco > 0 ? (
          <span className="text-[14px] tabular-nums" style={{ color: T.stone600 }}>
            {fmtBRL(item.ultimo_preco)}/{item.unidade}
          </span>
        ) : (
          <span className="text-[13px]" style={{ color: T.stone300 }}>sem registro</span>
        )}
      </td>

      {/* Custo estimado */}
      <td className="px-4 py-3.5">
        {item.custo_estimado > 0 ? (
          <span className="text-[14px] font-semibold tabular-nums" style={{ color: T.margem }}>
            {fmtBRL(item.custo_estimado)}
          </span>
        ) : (
          <span className="text-[13px]" style={{ color: T.stone300 }}>—</span>
        )}
      </td>
    </tr>
  )
}
