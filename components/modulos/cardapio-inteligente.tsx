"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Loader2, Utensils, AlertTriangle, Clock, PlusCircle, Save, X, ChevronDown, ChevronUp, TrendingUp } from "lucide-react"
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from "recharts"
import { supabase } from "@/lib/supabase"
import { T, cls } from "@/lib/design-tokens"

type Quadrante = 'estrela' | 'cavalo' | 'interrogacao' | 'abacaxi' | 'sem_dados'
type Aba       = 'matriz' | 'vendas'

interface ItemBCG {
  ficha_id:        string
  nome_prato:      string
  categoria:       string
  preco_venda:     number
  custo_porcao:    number
  margem_real_pct: number
  vendas_total:    number
  receita_total:   number
  participacao_pct:number
  quadrante:       Quadrante
  preco_sugerido:  number | null
}

interface FichaSimples {
  id:          string
  nome:        string
  categoria:   string
  preco_venda: number
}

const Q: Record<Quadrante, { label: string; emoji: string; cor: string; bg: string; acao: string }> = {
  estrela:       { label: 'Estrelas',            emoji: '⭐', cor: '#0D7A3B', bg: '#D1FAE5', acao: 'Mantenha. São seus melhores pratos.' },
  cavalo:        { label: 'Cavalos de Batalha',   emoji: '🐎', cor: T.warning,  bg: T.warnSoft, acao: 'Otimize o custo ou ajuste o preço.' },
  interrogacao:  { label: 'Interrogações',         emoji: '❓', cor: T.info,     bg: T.infoSoft, acao: 'Promova mais. O potencial está lá.' },
  abacaxi:       { label: 'Abacaxis',              emoji: '🍍', cor: T.negative, bg: T.negSoft,  acao: 'Considere remover do cardápio.' },
  sem_dados:     { label: 'Sem dados',             emoji: '—',  cor: T.stone400, bg: T.stone100, acao: 'Lance as vendas semanais.' },
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDelta(delta: number) {
  return (delta >= 0 ? '+' : '') + fmtBRL(delta)
}

function getSegundaPassada() {
  const d   = new Date()
  const dia = d.getDay()
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1) - 7
  return new Date(new Date().setDate(diff)).toISOString().split('T')[0]
}

/** Recomendação específica por prato — não o texto genérico do quadrante */
function getRecomendacao(p: ItemBCG, mediaMargemRef: number): string {
  const delta = (p.preco_sugerido ?? 0) - p.preco_venda
  switch (p.quadrante) {
    case 'estrela':
      return 'Top vendedor e lucrativo — mantenha preço e qualidade, proteja essa estrela.'
    case 'cavalo':
      if (delta > 0.5 && p.preco_sugerido)
        return `Muito vendido, mas margem abaixo da média. Suba para ${fmtBRL(p.preco_sugerido)} para atingir a meta.`
      return 'Muito vendido, mas margem baixa — revise o custo dos ingredientes ou ajuste o preço.'
    case 'interrogacao':
      return 'Margem boa, mas pouco pedido — invista em divulgação, destaque no cardápio e promoções.'
    case 'abacaxi':
      if (delta > 0.5 && p.preco_sugerido)
        return `Margem de ${p.margem_real_pct.toFixed(0)}% e baixa participação. Suba para ${fmtBRL(p.preco_sugerido)} ou considere retirar.`
      return `Margem de ${p.margem_real_pct.toFixed(0)}% e pouco vendido — reprecifique ou retire do cardápio.`
    default:
      return 'Lance as vendas para ativar a análise.'
  }
}

function TooltipBCG({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d: ItemBCG = payload[0].payload
  const cfg        = Q[d.quadrante]
  const delta      = d.preco_sugerido != null ? d.preco_sugerido - d.preco_venda : null
  return (
    <div className="bg-white rounded-xl border shadow-lg p-3 max-w-[230px]"
      style={{ borderColor: T.stone200 }}>
      <p className="text-[13px] font-semibold mb-2" style={{ color: T.ink }}>{d.nome_prato}</p>
      <div className="space-y-0.5 text-[12px]" style={{ color: T.stone500 }}>
        <p>Margem real: <span className="font-semibold tabular-nums" style={{ color: T.ink }}>{d.margem_real_pct.toFixed(1)}%</span></p>
        <p>Participação: <span className="font-semibold tabular-nums" style={{ color: T.ink }}>{d.participacao_pct.toFixed(1)}%</span></p>
        <p>Vendas: <span className="font-semibold tabular-nums" style={{ color: T.ink }}>{d.vendas_total} un</span></p>
        <p>Receita: <span className="font-semibold tabular-nums" style={{ color: T.ink }}>{fmtBRL(d.receita_total)}</span></p>
      </div>
      {/* Markup Divisor */}
      {d.preco_sugerido != null && delta !== null && (
        <div className="mt-2 pt-2 border-t text-[12px]" style={{ borderColor: T.stone100 }}>
          <p style={{ color: T.stone500 }}>
            Preço atual: <span className="font-semibold" style={{ color: T.ink }}>{fmtBRL(d.preco_venda)}</span>
          </p>
          <p style={{ color: T.stone500 }}>
            Ideal (MD):{' '}
            <span className="font-semibold" style={{ color: delta > 0.5 ? T.warning : T.positive }}>
              {fmtBRL(d.preco_sugerido)}
            </span>
            {' '}
            <span style={{ color: delta > 0.5 ? T.warning : T.positive }}>
              ({fmtDelta(delta)})
            </span>
          </p>
        </div>
      )}
      <div className="mt-2 pt-2 border-t" style={{ borderColor: T.stone100 }}>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
          style={{ backgroundColor: cfg.bg, color: cfg.cor }}>
          {cfg.emoji} {cfg.label}
        </span>
      </div>
    </div>
  )
}

export function CardapioInteligente({ perfil }: { perfil: any }) {
  const [aba, setAba]                   = useState<Aba>('matriz')
  const [dados, setDados]               = useState<ItemBCG[]>([])
  const [fichas, setFichas]             = useState<FichaSimples[]>([])
  const [loading, setLoading]           = useState(true)
  const [loadingVendas, setLoadingVendas] = useState(false)
  const [erro, setErro]                 = useState<string | null>(null)
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null)
  const [semanaInicio, setSemanaInicio] = useState(getSegundaPassada)
  const [vendas, setVendas]             = useState<Record<string, string>>({})
  const [salvando, setSalvando]         = useState(false)

  // Simulador "e se?" por prato
  const [simAberto, setSimAberto]   = useState<string | null>(null)
  const [simulado, setSimulado]     = useState<Record<string, string>>({})

  const semanaFim = (() => {
    const d = new Date(semanaInicio + 'T12:00:00')
    d.setDate(d.getDate() + 6)
    return d.toISOString().split('T')[0]
  })()

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    const { data, error } = await supabase.rpc('engenharia_cardapio')
    if (error) setErro(error.message)
    else { setDados((data as ItemBCG[]) ?? []); setAtualizadoEm(new Date()) }
    setLoading(false)
  }, [])

  const carregarFichas = useCallback(async () => {
    const { data } = await supabase.from('fichas_tecnicas').select('id, nome, categoria, preco_venda').order('nome')
    if (data) setFichas(data as FichaSimples[])
  }, [])

  const carregarVendasSemana = useCallback(async () => {
    setLoadingVendas(true)
    const { data } = await supabase.from('vendas_pratos').select('ficha_id, quantidade_vendida').eq('semana_inicio', semanaInicio)
    const map: Record<string, string> = {};
    (data || []).forEach((v: any) => { map[v.ficha_id] = String(v.quantidade_vendida) })
    setVendas(map)
    setLoadingVendas(false)
  }, [semanaInicio])

  useEffect(() => { carregar(); carregarFichas() }, [carregar, carregarFichas])
  useEffect(() => { if (aba === 'vendas') carregarVendasSemana() }, [aba, carregarVendasSemana])

  const salvarVendas = async () => {
    setSalvando(true)
    const rows = Object.entries(vendas)
      .filter(([, v]) => v !== '' && Number(v) >= 0)
      .map(([ficha_id, quantidade]) => ({
        ficha_id,
        semana_inicio: semanaInicio,
        semana_fim:    semanaFim,
        quantidade_vendida: Number(quantidade),
      }))
    if (rows.length > 0) {
      const { error } = await supabase
        .from('vendas_pratos')
        .upsert(rows, { onConflict: 'empresa_id,ficha_id,semana_inicio' })
      if (!error) { await carregar(); setAba('matriz') }
    }
    setSalvando(false)
  }

  const comVendas      = dados.filter(d => d.quadrante !== 'sem_dados')
  const mediaMargemRef = comVendas.length > 0 ? comVendas.reduce((s, d) => s + d.margem_real_pct, 0)  / comVendas.length : 0
  const mediaPartRef   = comVendas.length > 0 ? comVendas.reduce((s, d) => s + d.participacao_pct, 0) / comVendas.length : 0
  const receitaTotal   = comVendas.reduce((s, d) => s + d.receita_total, 0)

  /** Calcula o quadrante simulado dado um preço digitado pelo usuário */
  function calcSimulado(p: ItemBCG, precoStr: string): { margem: number; quadrante: Quadrante } | null {
    const precoNum = parseFloat(precoStr)
    if (!precoStr || isNaN(precoNum) || precoNum <= 0) return null
    const margem = ((precoNum - p.custo_porcao) / precoNum) * 100
    const q: Quadrante =
      margem >= mediaMargemRef && p.participacao_pct >= mediaPartRef ? 'estrela' :
      margem <  mediaMargemRef && p.participacao_pct >= mediaPartRef ? 'cavalo'  :
      margem >= mediaMargemRef && p.participacao_pct <  mediaPartRef ? 'interrogacao' : 'abacaxi'
    return { margem, quadrante: q }
  }

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cls.eyebrow} style={{ color: T.margemMid }}>Engenharia</p>
          <h1 className="text-[28px] font-serif mt-0.5" style={{ color: T.ink }}>Cardápio Inteligente</h1>
          {atualizadoEm && aba === 'matriz' && (
            <p className="text-[12px] mt-1 flex items-center gap-1.5" style={{ color: T.stone400 }}>
              <Clock className="w-3 h-3" />
              Atualizado às {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {aba === 'matriz' && (
            <button onClick={carregar} disabled={loading}
              className={cls.btnGhost}
              style={{ color: T.stone500, borderColor: T.stone200, backgroundColor: 'transparent' }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setAba(aba === 'vendas' ? 'matriz' : 'vendas')}
            className={cls.btnGhost}
            style={{
              color:           aba === 'vendas' ? T.paper   : T.margem,
              borderColor:     T.margem,
              backgroundColor: aba === 'vendas' ? T.margem  : 'transparent',
            }}>
            {aba === 'vendas' ? <X className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
            {aba === 'vendas' ? 'Cancelar' : 'Lançar Vendas'}
          </button>
        </div>
      </div>

      {/* ── LANÇAR VENDAS ── */}
      {aba === 'vendas' && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: T.stone200 }}>
          <div className="flex items-center gap-6 px-5 py-4 border-b" style={{ borderColor: T.stone200, backgroundColor: T.paper2 }}>
            <div>
              <p className={`${cls.eyebrow} mb-1`} style={{ color: T.stone400 }}>Semana de</p>
              <input type="date" value={semanaInicio} onChange={e => { setSemanaInicio(e.target.value); setVendas({}) }}
                className="text-[13px] font-semibold bg-transparent outline-none tabular-nums"
                style={{ color: T.ink }} />
            </div>
            <span style={{ color: T.stone300 }}>→</span>
            <div>
              <p className={`${cls.eyebrow} mb-1`} style={{ color: T.stone400 }}>Até</p>
              <p className="text-[13px] font-semibold tabular-nums" style={{ color: T.stone500 }}>{semanaFim}</p>
            </div>
            {loadingVendas && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto" style={{ color: T.stone400 }} />}
          </div>

          {fichas.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-[14px]" style={{ color: T.stone400 }}>Nenhuma ficha técnica cadastrada.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr style={{ backgroundColor: T.paper2 }}>
                      {['Prato', 'Categoria', 'Preço', 'Unidades Vendidas na Semana'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase"
                          style={{ color: T.stone400, letterSpacing: '0.08em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fichas.map(f => (
                      <tr key={f.id} className="border-t transition-colors duration-100"
                        style={{ borderColor: T.stone100 }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = T.paper2}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                        <td className="px-4 py-3">
                          <span className="text-[14px] font-medium" style={{ color: T.ink }}>{f.nome}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[12px]" style={{ color: T.stone400 }}>{f.categoria || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[14px] tabular-nums" style={{ color: T.stone600 }}>
                            {fmtBRL(f.preco_venda)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number" min="0" placeholder="0"
                            value={vendas[f.id] ?? ''}
                            onChange={e => setVendas(v => ({ ...v, [f.id]: e.target.value }))}
                            className="w-28 px-3 py-1.5 rounded-lg text-[14px] font-semibold text-center tabular-nums outline-none border transition-all duration-150"
                            style={{
                              borderColor:     vendas[f.id] ? T.margem    : T.stone200,
                              backgroundColor: vendas[f.id] ? T.margemSoft : T.stone100,
                              color:           vendas[f.id] ? T.margem    : T.stone500,
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: T.stone200 }}>
                <p className="text-[12px]" style={{ color: T.stone400 }}>
                  {Object.values(vendas).filter(v => v !== '').length} de {fichas.length} pratos preenchidos
                </p>
                <button onClick={salvarVendas}
                  disabled={salvando || Object.values(vendas).filter(v => v !== '').length === 0}
                  className={cls.btnPrimary}
                  style={{ backgroundColor: T.margem, color: T.paper }}>
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Vendas
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MATRIZ BCG ── */}
      {aba === 'matriz' && (
        <>
          {loading && (
            <div className="flex items-center justify-center py-24 gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.stone400 }} />
              <span className="text-[14px]" style={{ color: T.stone400 }}>Calculando engenharia de cardápio...</span>
            </div>
          )}

          {!loading && erro && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-xl border px-6"
              style={{ borderColor: T.stone200 }}>
              <AlertTriangle className="w-6 h-6" style={{ color: T.negative }} />
              <p className="text-[14px] font-semibold" style={{ color: T.ink }}>Erro ao carregar</p>
              <p className="text-[12px] font-mono px-4 py-2 rounded-lg text-center"
                style={{ color: T.negative, backgroundColor: T.negSoft }}>{erro}</p>
              <p className="text-[12px] text-center" style={{ color: T.stone400 }}>
                Execute a migração v10 no Supabase (função <code>engenharia_cardapio</code>).
              </p>
            </div>
          )}

          {!loading && !erro && dados.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 bg-white rounded-xl border"
              style={{ borderColor: T.stone200 }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: T.margemSoft }}>
                <Utensils className="w-5 h-5" style={{ color: T.margem }} />
              </div>
              <div className="text-center max-w-xs">
                <p className="text-[16px] font-serif mb-1.5" style={{ color: T.ink }}>Sem fichas técnicas</p>
                <p className="text-[13px] leading-relaxed" style={{ color: T.stone400 }}>
                  Cadastre fichas técnicas e lance as vendas semanais para ver a Matriz BCG do seu cardápio.
                </p>
              </div>
              <button onClick={() => setAba('vendas')} className={cls.btnPrimary} style={{ backgroundColor: T.margem, color: T.paper }}>
                <PlusCircle className="w-4 h-4" />
                Lançar primeiras vendas
              </button>
            </div>
          )}

          {!loading && !erro && dados.length > 0 && (
            <>
              {/* Aviso sem dados de venda */}
              {comVendas.length === 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{ backgroundColor: T.infoSoft, borderColor: '#BFDBFE' }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: T.info }} />
                  <p className="text-[13px]" style={{ color: T.info }}>
                    Fichas cadastradas, mas sem vendas registradas.{' '}
                    <button onClick={() => setAba('vendas')} className="font-semibold underline">
                      Lance as vendas da semana
                    </button>{' '}
                    para ativar a Matriz BCG.
                  </p>
                </div>
              )}

              {/* KPI strip */}
              {comVendas.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['estrela', 'cavalo', 'interrogacao', 'abacaxi'] as const).map(q => {
                    const cfg   = Q[q]
                    const count = dados.filter(d => d.quadrante === q).length
                    return (
                      <div key={q} className="p-4 rounded-xl border bg-white" style={{ borderColor: T.stone200 }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[15px]">{cfg.emoji}</span>
                          <span className="text-[11px] font-bold uppercase" style={{ color: cfg.cor, letterSpacing: '0.08em' }}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="text-[28px] font-serif leading-none" style={{ color: T.ink }}>{count}</div>
                        <p className="text-[11px] mt-1 leading-snug" style={{ color: T.stone400 }}>{cfg.acao}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Scatter chart */}
              {comVendas.length > 0 && (
                <div className="bg-white rounded-xl border p-5" style={{ borderColor: T.stone200 }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] font-semibold" style={{ color: T.ink }}>Matriz BCG do Cardápio</p>
                    <p className="text-[11px]" style={{ color: T.stone400 }}>
                      Receita total: <span className="font-semibold" style={{ color: T.margem }}>{fmtBRL(receitaTotal)}</span>
                    </p>
                  </div>
                  <p className="text-[12px] mb-5" style={{ color: T.stone400 }}>
                    Eixo X: Participação nas vendas (%) · Eixo Y: Margem real (%) · Hover = preço sugerido (Markup Divisor)
                  </p>
                  <ResponsiveContainer width="100%" height={360}>
                    <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.stone100} />
                      <XAxis
                        type="number" dataKey="participacao_pct" name="Participação" unit="%"
                        domain={[0, 'auto']}
                        tick={{ fontSize: 11, fill: T.stone400 }}
                        tickLine={false} axisLine={{ stroke: T.stone200 }}
                        label={{ value: 'Participação nas vendas (%)', position: 'insideBottom', offset: -18, style: { fontSize: 11, fill: T.stone400 } }}
                      />
                      <YAxis
                        type="number" dataKey="margem_real_pct" name="Margem" unit="%"
                        domain={[0, 'auto']}
                        tick={{ fontSize: 11, fill: T.stone400 }}
                        tickLine={false} axisLine={{ stroke: T.stone200 }}
                        label={{ value: 'Margem real (%)', angle: -90, position: 'insideLeft', offset: 15, style: { fontSize: 11, fill: T.stone400 } }}
                      />
                      <Tooltip content={<TooltipBCG />} cursor={{ strokeDasharray: '3 3', stroke: T.stone200 }} />
                      <ReferenceLine x={mediaPartRef} stroke={T.stone300} strokeDasharray="4 2"
                        label={{ value: `↕ ${mediaPartRef.toFixed(1)}%`, position: 'top', style: { fontSize: 10, fill: T.stone400 } }} />
                      <ReferenceLine y={mediaMargemRef} stroke={T.stone300} strokeDasharray="4 2"
                        label={{ value: `→ ${mediaMargemRef.toFixed(1)}%`, position: 'right', style: { fontSize: 10, fill: T.stone400 } }} />
                      <Scatter
                        data={comVendas}
                        shape={(props: any) => {
                          const { cx, cy, payload } = props
                          const cfg = Q[payload.quadrante as Quadrante]
                          return (
                            <g>
                              <circle cx={cx} cy={cy} r={7} fill={cfg.cor} fillOpacity={0.85} stroke="white" strokeWidth={2} />
                            </g>
                          )
                        }}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>

                  {/* Legenda */}
                  <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t justify-center" style={{ borderColor: T.stone100 }}>
                    {(['estrela', 'cavalo', 'interrogacao', 'abacaxi'] as const).map(q => {
                      const cfg = Q[q]
                      return (
                        <div key={q} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.cor }} />
                          <span className="text-[11px] font-medium" style={{ color: T.stone500 }}>
                            {cfg.emoji} {cfg.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Cards por quadrante (com preço sugerido + simulador) ── */}
              {comVendas.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(['estrela', 'cavalo', 'interrogacao', 'abacaxi'] as const).map(q => {
                    const cfg   = Q[q]
                    const pratos = dados.filter(d => d.quadrante === q)
                    return (
                      <div key={q} className="rounded-xl border overflow-hidden" style={{ borderColor: T.stone200 }}>
                        <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: cfg.bg }}>
                          <div>
                            <p className="text-[13px] font-semibold" style={{ color: cfg.cor }}>
                              {cfg.emoji} {cfg.label}
                            </p>
                            <p className="text-[11px] mt-0.5" style={{ color: cfg.cor, opacity: 0.8 }}>{cfg.acao}</p>
                          </div>
                          <span className="text-[26px] font-serif" style={{ color: cfg.cor }}>{pratos.length}</span>
                        </div>

                        {pratos.length === 0 ? (
                          <div className="px-4 py-5 text-center">
                            <p className="text-[12px]" style={{ color: T.stone300 }}>Nenhum prato neste quadrante</p>
                          </div>
                        ) : (
                          <div className="divide-y bg-white" style={{ borderColor: T.stone100 }}>
                            {pratos.map(p => {
                              const delta      = p.preco_sugerido != null ? p.preco_sugerido - p.preco_venda : null
                              const estaAberto = simAberto === p.ficha_id
                              const simRes     = calcSimulado(p, simulado[p.ficha_id] ?? '')

                              return (
                                <div key={p.ficha_id}>
                                  {/* Linha principal — clicável para abrir simulador */}
                                  <div
                                    className="px-4 py-3 transition-colors duration-100 cursor-pointer"
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = T.paper2}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                                    onClick={() => setSimAberto(estaAberto ? null : p.ficha_id)}>
                                    <div className="flex items-start justify-between gap-2">
                                      {/* Esquerda: nome + recomendação */}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <p className="text-[13px] font-medium truncate" style={{ color: T.ink }}>
                                            {p.nome_prato}
                                          </p>
                                          {estaAberto
                                            ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.stone400 }} />
                                            : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.stone300 }} />}
                                        </div>
                                        <p className="text-[11px] mt-0.5 leading-snug" style={{ color: T.stone400 }}>
                                          {getRecomendacao(p, mediaMargemRef)}
                                        </p>
                                        <p className="text-[11px] mt-1" style={{ color: T.stone400 }}>
                                          {p.vendas_total} un · {fmtBRL(p.receita_total)}
                                        </p>
                                      </div>

                                      {/* Direita: preço atual + sugerido + margem */}
                                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-0.5">
                                        <p className="text-[13px] font-semibold tabular-nums" style={{ color: cfg.cor }}>
                                          {p.margem_real_pct.toFixed(1)}%
                                        </p>
                                        <p className="text-[10px]" style={{ color: T.stone400 }}>margem</p>
                                        {/* Preço atual */}
                                        <p className="text-[12px] font-medium tabular-nums mt-1" style={{ color: T.stone600 }}>
                                          {fmtBRL(p.preco_venda)}
                                        </p>
                                        {/* Preço sugerido (Markup Divisor) */}
                                        {p.preco_sugerido != null && delta !== null && Math.abs(delta) > 0.01 && (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                                            style={{
                                              backgroundColor: delta > 0.5 ? T.warnSoft : T.posSoft,
                                              color:           delta > 0.5 ? '#92400E'  : T.positive,
                                            }}>
                                            <TrendingUp className="w-3 h-3" />
                                            ideal {fmtBRL(p.preco_sugerido)}
                                          </span>
                                        )}
                                        {p.preco_sugerido != null && delta !== null && Math.abs(delta) <= 0.01 && (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                                            style={{ backgroundColor: T.posSoft, color: T.positive }}>
                                            ✓ preço ideal
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Simulador "E se?" — expande ao clicar no prato */}
                                  {estaAberto && (
                                    <div className="px-4 py-3 border-t" style={{ borderColor: T.stone100, backgroundColor: '#FAFAFA' }}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[12px] font-semibold" style={{ color: T.stone500 }}>
                                          🔮 Simulador — e se eu mudar o preço?
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[12px]" style={{ color: T.stone400 }}>Novo preço:</span>
                                          <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: T.stone400 }}>R$</span>
                                            <input
                                              type="number"
                                              step="0.50"
                                              min="0"
                                              value={simulado[p.ficha_id] ?? ''}
                                              placeholder={p.preco_venda.toFixed(2)}
                                              onChange={e => setSimulado(s => ({ ...s, [p.ficha_id]: e.target.value }))}
                                              onClick={e => e.stopPropagation()}
                                              className="w-28 pl-8 pr-2 py-1.5 rounded-lg text-[13px] font-semibold tabular-nums outline-none border transition-all duration-150"
                                              style={{
                                                borderColor:     T.margemMint,
                                                backgroundColor: T.margemSoft,
                                                color:           T.margem,
                                              }}
                                            />
                                          </div>
                                        </div>

                                        {simRes && (
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[12px]" style={{ color: T.stone500 }}>
                                              nova margem:{' '}
                                              <b style={{ color: simRes.margem >= mediaMargemRef ? T.positive : T.negative }}>
                                                {simRes.margem.toFixed(1)}%
                                              </b>
                                            </span>
                                            <span style={{ color: T.stone300 }}>→</span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                                              style={{ backgroundColor: Q[simRes.quadrante].bg, color: Q[simRes.quadrante].cor }}>
                                              {Q[simRes.quadrante].emoji} {Q[simRes.quadrante].label}
                                            </span>
                                            {simRes.quadrante !== p.quadrante && (
                                              <span className="text-[11px]" style={{ color: T.stone400 }}>
                                                ← migra de {Q[p.quadrante].emoji}
                                              </span>
                                            )}
                                          </div>
                                        )}

                                        {/* Info custo de porção */}
                                        <span className="text-[11px] ml-auto" style={{ color: T.stone300 }}>
                                          custo/porção: {fmtBRL(p.custo_porcao)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Pratos sem dados de venda */}
              {dados.filter(d => d.quadrante === 'sem_dados').length > 0 && (
                <div className="bg-white rounded-xl border p-4" style={{ borderColor: T.stone200 }}>
                  <p className="text-[12px] font-semibold mb-2" style={{ color: T.stone400 }}>
                    Sem vendas registradas — {dados.filter(d => d.quadrante === 'sem_dados').length}{' '}
                    {dados.filter(d => d.quadrante === 'sem_dados').length === 1 ? 'prato' : 'pratos'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dados.filter(d => d.quadrante === 'sem_dados').map(d => (
                      <span key={d.ficha_id} className="px-2.5 py-1 rounded-lg text-[12px]"
                        style={{ backgroundColor: T.stone100, color: T.stone500 }}>
                        {d.nome_prato}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Nota Markup Divisor */}
              {comVendas.length > 0 && (
                <p className="text-[12px] text-center" style={{ color: T.stone300 }}>
                  Preço Ideal calculado pelo Markup Divisor: custo ÷ (1 − impostos% − taxa canal% − margem%).
                  Clique em qualquer prato para simular o impacto de um novo preço em tempo real.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
