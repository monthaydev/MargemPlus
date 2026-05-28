"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Loader2, Package, AlertTriangle, Clock, CheckCircle2, TrendingUp, TrendingDown, Minus, Flame } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { T, cls } from "@/lib/design-tokens"

type StatusRuptura = 'critico' | 'alerta' | 'atencao' | 'ok' | 'sem_historico'
type Tendencia    = 'subindo' | 'caindo' | 'estavel'
type Confianca    = 'alta' | 'media' | 'baixa' | 'sem_dados'
type FiltroStatus = 'todos' | StatusRuptura

interface ItemRuptura {
  produto_id:        number
  nome_produto:      string
  unidade:           string
  grupo:             string
  estoque_atual:     number
  consumo_medio_sem: number
  dias_restantes:    number | null
  data_ruptura:      string | null   // ISO date: "2026-06-02"
  tendencia:         Tendencia
  semanas_historico: number
  confianca:         Confianca
  risco_perda:       boolean
  status_ruptura:    StatusRuptura
}

const STATUS: Record<StatusRuptura, { label: string; cor: string; bg: string; border: string }> = {
  critico:       { label: 'Crítico',       cor: T.negative, bg: T.negSoft,  border: '#FECACA' },
  alerta:        { label: 'Alerta',        cor: T.warning,  bg: T.warnSoft, border: '#FDE68A' },
  atencao:       { label: 'Atenção',       cor: '#0D7A3B',  bg: '#D1FAE5',  border: '#A7F3D0' },
  ok:            { label: 'OK',            cor: T.positive, bg: T.posSoft,  border: '#86EFAC' },
  sem_historico: { label: 'Sem histórico', cor: T.stone400, bg: T.stone100, border: T.stone200 },
}

const FILTROS: { id: FiltroStatus; label: string }[] = [
  { id: 'todos',         label: 'Todos' },
  { id: 'critico',       label: 'Crítico' },
  { id: 'alerta',        label: 'Alerta' },
  { id: 'atencao',       label: 'Atenção' },
  { id: 'ok',            label: 'OK' },
  { id: 'sem_historico', label: 'Sem histórico' },
]

const CONF_COR: Record<Confianca, string> = {
  alta:      T.positive,
  media:     T.warning,
  baixa:     T.negative,
  sem_dados: T.stone300,
}

const CONF_LABEL: Record<Confianca, string> = {
  alta:      'Alta confiança',
  media:     'Média confiança',
  baixa:     'Baixa confiança',
  sem_dados: '',
}

function BaraDias({ dias, status }: { dias: number | null; status: StatusRuptura }) {
  if (dias === null) return <span className="text-[13px]" style={{ color: T.stone300 }}>—</span>
  const pct = Math.min((dias / 28) * 100, 100)
  const cor = STATUS[status].cor
  return (
    <div className="flex items-center gap-2.5 min-w-[110px]">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: T.stone100 }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cor }} />
      </div>
      <span className="text-[13px] font-semibold tabular-nums w-6 text-right" style={{ color: cor }}>
        {dias < 1 ? '<1' : Math.round(dias)}
      </span>
    </div>
  )
}

function fmtDataCurta(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso + 'T12:00:00')
  const dia = d.getDate().toString().padStart(2, '0')
  const mes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `~${dia}/${mes}`
}

function TendenciaIcon({ t }: { t: Tendencia }) {
  if (t === 'subindo') return <TrendingUp  className="w-3.5 h-3.5" style={{ color: T.negative }} />
  if (t === 'caindo')  return <TrendingDown className="w-3.5 h-3.5" style={{ color: T.positive }} />
  return <Minus className="w-3.5 h-3.5" style={{ color: T.stone300 }} />
}

function TendenciaLabel({ t }: { t: Tendencia }) {
  if (t === 'subindo') return <span style={{ color: T.negative }}>↑ subindo</span>
  if (t === 'caindo')  return <span style={{ color: T.positive }}>↓ caindo</span>
  return <span style={{ color: T.stone300 }}>→ estável</span>
}

export function PrevisaoRuptura({ perfil }: { perfil: any }) {
  const [dados, setDados] = useState<ItemRuptura[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null)
  const [filtro, setFiltro] = useState<FiltroStatus>('todos')

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    const { data, error } = await supabase.rpc('previsao_ruptura_estoque')
    if (error) {
      setErro(error.message)
    } else {
      setDados((data as ItemRuptura[]) ?? [])
      setAtualizadoEm(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const contagens = {
    critico: dados.filter(d => d.status_ruptura === 'critico').length,
    alerta:  dados.filter(d => d.status_ruptura === 'alerta').length,
    atencao: dados.filter(d => d.status_ruptura === 'atencao').length,
    ok:      dados.filter(d => d.status_ruptura === 'ok').length,
  }
  const totalCriticos   = contagens.critico + contagens.alerta
  const totalRiscoPerda = dados.filter(d => d.risco_perda).length
  const dadosFiltrados  = filtro === 'todos' ? dados : dados.filter(d => d.status_ruptura === filtro)

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cls.eyebrow} style={{ color: T.margemMid }}>Estoque Inteligente</p>
          <h1 className="text-[28px] font-serif mt-0.5" style={{ color: T.ink }}>Previsão de Ruptura</h1>
          {atualizadoEm && (
            <p className="text-[12px] mt-1 flex items-center gap-1.5" style={{ color: T.stone400 }}>
              <Clock className="w-3 h-3" />
              Atualizado às {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {' '}· média ponderada das últimas 4 semanas
            </p>
          )}
        </div>
        <button onClick={carregar} disabled={loading}
          className={cls.btnGhost}
          style={{ color: T.stone500, borderColor: T.stone200, backgroundColor: 'transparent' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* KPI strip */}
      {!loading && dados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { key: 'critico', desc: '< 3 dias'   },
            { key: 'alerta',  desc: '3 – 7 dias'  },
            { key: 'atencao', desc: '7 – 14 dias' },
            { key: 'ok',      desc: '> 14 dias'   },
          ] as const).map(({ key, desc }) => {
            const cfg  = STATUS[key]
            const ativo = filtro === key
            return (
              <button key={key}
                onClick={() => setFiltro(ativo ? 'todos' : key)}
                className="text-left p-4 rounded-xl border transition-all duration-150 active:scale-[0.98]"
                style={{
                  backgroundColor: ativo ? cfg.bg : 'white',
                  borderColor:     ativo ? cfg.border : T.stone200,
                }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.cor }} />
                  <span className="text-[11px] font-bold uppercase" style={{ color: cfg.cor, letterSpacing: '0.08em' }}>
                    {cfg.label}
                  </span>
                </div>
                <div className="text-[28px] font-serif leading-none tabular-nums" style={{ color: T.ink }}>
                  {contagens[key]}
                </div>
                <div className="text-[11px] mt-1" style={{ color: T.stone400 }}>{desc}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* Banner stockout */}
      {!loading && totalCriticos > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border"
          style={{ backgroundColor: T.negSoft, borderColor: '#FECACA' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: T.negative }} />
          <p className="text-[13px] font-medium" style={{ color: T.negative }}>
            {totalCriticos === 1
              ? '1 insumo em estado crítico ou de alerta — risco real de stockout.'
              : `${totalCriticos} insumos em estado crítico ou de alerta — risco real de stockout.`}
          </p>
        </div>
      )}

      {/* Banner risco de perda */}
      {!loading && totalRiscoPerda > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border"
          style={{ backgroundColor: T.warnSoft, borderColor: '#FDE68A' }}>
          <Flame className="w-4 h-4 flex-shrink-0" style={{ color: T.warning }} />
          <p className="text-[13px] font-medium" style={{ color: '#92400E' }}>
            {totalRiscoPerda === 1
              ? '1 insumo com risco de PERDA — lote vence antes do estoque acabar.'
              : `${totalRiscoPerda} insumos com risco de PERDA — lote vence antes do estoque acabar.`}
            {' '}Use esses itens primeiro (FEFO).
          </p>
        </div>
      )}

      {/* Card principal */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: T.stone200 }}>

        {/* Tabs de filtro */}
        <div className="flex border-b overflow-x-auto no-scrollbar" style={{ borderColor: T.stone200 }}>
          {FILTROS.filter(f => f.id === 'todos' || dados.some(d => d.status_ruptura === f.id)).map(f => {
            const count = f.id === 'todos' ? dados.length : dados.filter(d => d.status_ruptura === f.id).length
            const ativo = filtro === f.id
            return (
              <button key={f.id}
                onClick={() => setFiltro(f.id)}
                className="px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all duration-150 flex items-center gap-1.5 flex-shrink-0"
                style={{
                  borderBottomColor: ativo ? T.ink : 'transparent',
                  color: ativo ? T.ink : T.stone400,
                }}>
                {f.label}
                <span className="px-1.5 py-0.5 rounded-full text-[11px]"
                  style={{ backgroundColor: T.stone100, color: ativo ? T.ink : T.stone400 }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Erro da RPC */}
        {!loading && erro && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
            <AlertTriangle className="w-6 h-6" style={{ color: T.negative }} />
            <p className="text-[14px] font-semibold text-center" style={{ color: T.ink }}>Erro ao carregar previsão</p>
            <p className="text-[12px] text-center font-mono px-4 py-2 rounded-lg"
              style={{ color: T.negative, backgroundColor: T.negSoft }}>{erro}</p>
            <p className="text-[12px] text-center" style={{ color: T.stone400 }}>
              Execute a migração v10 no Supabase (função <code>previsao_ruptura_estoque</code>).
            </p>
          </div>
        )}

        {/* Carregando */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.stone400 }} />
            <span className="text-[14px]" style={{ color: T.stone400 }}>Calculando previsões...</span>
          </div>
        )}

        {/* Empty state global */}
        {!loading && !erro && dados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: T.margemSoft }}>
              <Package className="w-5 h-5" style={{ color: T.margem }} />
            </div>
            <div className="text-center max-w-xs">
              <p className="text-[16px] font-serif mb-1.5" style={{ color: T.ink }}>Sem dados de estoque</p>
              <p className="text-[13px] leading-relaxed" style={{ color: T.stone400 }}>
                Lance ao menos duas contagens finais de estoque em semanas diferentes para ativar a previsão.
              </p>
            </div>
          </div>
        )}

        {/* Tabela */}
        {!loading && dadosFiltrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr style={{ backgroundColor: T.paper2 }}>
                  {['Insumo', 'Estoque Atual', 'Consumo / Sem.', 'Dias Restantes', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase"
                      style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map(item => {
                  const cfg        = STATUS[item.status_ruptura]
                  const dataLabel  = fmtDataCurta(item.data_ruptura)
                  const confCor    = CONF_COR[item.confianca]
                  const confLabel  = CONF_LABEL[item.confianca]

                  return (
                    <tr key={item.produto_id}
                      className="border-t transition-colors duration-100"
                      style={{ borderColor: T.stone100 }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = T.paper2}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>

                      {/* Insumo + confiança */}
                      <td className="px-4 py-3.5">
                        <div className="text-[14px] font-medium" style={{ color: T.ink }}>{item.nome_produto}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.grupo && (
                            <span className="text-[11px]" style={{ color: T.stone400 }}>{item.grupo}</span>
                          )}
                          {confLabel && (
                            <span className="flex items-center gap-1 text-[11px]" style={{ color: confCor }}>
                              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: confCor }} />
                              {confLabel}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estoque atual */}
                      <td className="px-4 py-3.5">
                        <span className="text-[14px] font-semibold tabular-nums" style={{ color: T.ink }}>
                          {item.estoque_atual % 1 === 0
                            ? item.estoque_atual.toFixed(0)
                            : item.estoque_atual.toFixed(2)}
                        </span>
                        <span className="text-[12px] ml-1" style={{ color: T.stone400 }}>{item.unidade}</span>
                      </td>

                      {/* Consumo + tendência */}
                      <td className="px-4 py-3.5">
                        {item.consumo_medio_sem > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[14px] tabular-nums" style={{ color: T.stone600 }}>
                                {item.consumo_medio_sem % 1 === 0
                                  ? item.consumo_medio_sem.toFixed(0)
                                  : item.consumo_medio_sem.toFixed(2)}
                              </span>
                              <span className="text-[12px]" style={{ color: T.stone400 }}>{item.unidade}/sem</span>
                              <TendenciaIcon t={item.tendencia} />
                            </div>
                            {item.semanas_historico >= 3 && (
                              <span className="text-[11px]" style={{ color: T.stone300 }}>
                                <TendenciaLabel t={item.tendencia} />
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[13px]" style={{ color: T.stone300 }}>—</span>
                        )}
                      </td>

                      {/* Dias restantes + data prevista */}
                      <td className="px-4 py-3.5">
                        <BaraDias dias={item.dias_restantes} status={item.status_ruptura} />
                        {dataLabel && item.dias_restantes !== null && (
                          <p className="text-[11px] mt-1 tabular-nums" style={{ color: T.stone400 }}>
                            {dataLabel}
                          </p>
                        )}
                      </td>

                      {/* Status + risco de perda */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold w-fit"
                            style={{ backgroundColor: cfg.bg, color: cfg.cor }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.cor }} />
                            {cfg.label}
                          </span>
                          {item.risco_perda && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold w-fit"
                              style={{ backgroundColor: T.warnSoft, color: '#92400E' }}>
                              <Flame className="w-3 h-3" />
                              Risco de Perda
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state do filtro */}
        {!loading && dados.length > 0 && dadosFiltrados.length === 0 && (
          <div className="flex items-center justify-center py-10 gap-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: T.positive }} />
            <span className="text-[14px]" style={{ color: T.stone400 }}>Nenhum insumo nesta categoria.</span>
          </div>
        )}
      </div>

      {/* Nota metodológica */}
      {!loading && dados.length > 0 && (
        <p className="text-[12px] text-center" style={{ color: T.stone300 }}>
          Média ponderada das últimas 4 semanas (peso 4/3/2/1 — recentes valem mais).
          Tendência ↑ = consumo acelerando, ↓ = desacelerando.
          Risco de Perda = lote vence antes do estoque acabar.
        </p>
      )}
    </div>
  )
}
