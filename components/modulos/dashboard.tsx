"use client"

import { useState, useEffect } from "react"
import {
  X, BarChart3, Search, Warehouse, ShoppingCart,
  ReceiptText, MinusCircle, Package, AlertTriangle,
  TrendingUp, TrendingDown, Target, History, Clock
} from "lucide-react"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics"
import { useCountUp } from "@/hooks/useCountUp"
import { formatBRL, formatPerc } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { T } from "@/lib/design-tokens"

// ── Componentes internos ─────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, idle, last }: {
  label: string; value: string; sub?: string; color?: string; idle?: boolean; last?: boolean
}) {
  return (
    <div className="flex-1 min-w-[140px] py-5 px-5"
      style={{ borderRight: last ? 'none' : `1px solid ${T.stone200}` }}>
      <p className="text-[12px] font-semibold uppercase mb-2"
        style={{ color: T.stone400, letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p className="text-[30px] font-light font-serif tabular-nums leading-none animate-count-up"
        style={{ color: idle ? T.stone300 : (color || T.ink) }}>
        {value}
      </p>
      {sub && (
        <p className="text-[12px] mt-1.5" style={{ color: T.stone500 }}>{sub}</p>
      )}
    </div>
  )
}

function AlertaItem({ cor, mensagem, detalhe, onDismiss }: {
  cor: string; mensagem: string; detalhe?: string; onDismiss?: () => void
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 group"
      style={{ borderBottom: `1px solid ${T.stone200}` }}>
      <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: cor }} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium" style={{ color: T.ink }}>{mensagem}</p>
        {detalhe && <p className="text-[12px] mt-0.5" style={{ color: T.stone500 }}>{detalhe}</p>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: T.stone400 }}>
          <X size={12} strokeWidth={1.5} />
        </button>
      )}
    </div>
  )
}

// ── Tooltip customizado ───────────────────────────────────────────────────────
function TooltipAtelier({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 text-[12px]"
      style={{ backgroundColor: T.ink, border: `1px solid ${T.ink2}`, boxShadow: '0 8px 24px rgba(11,13,14,0.2)' }}>
      <p className="font-semibold mb-2" style={{ color: T.stone400, letterSpacing: '0.06em' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 tabular-nums">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.fill || p.stroke }} />
          <span style={{ color: T.paper }}>{p.dataKey}: {formatBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────
export function Dashboard(props: any) {
  const [modalAberto, setModalAberto] = useState<"compras" | null>(null)
  const [alertaDismissed, setAlertaDismissed] = useState(false)
  const [vencimentoDismissed, setVencimentoDismissed] = useState(false)
  const [lotesRisco, setLotesRisco] = useState<any[]>([])

  const metaCMV = parseFloat(props.perfil?.empresa?.meta_cmv) || 35
  const metrics = useDashboardMetrics(props)
  const cmvAcimaDaMeta = metrics.faturamentoAtual > 0 && metrics.cmvRealPerc > metaCMV
  const cmvDiff = metrics.cmvRealPerc - metaCMV
  const cmvStatus = !metrics.faturamentoAtual ? "idle" : cmvAcimaDaMeta ? "danger" : "ok"

  const animCmvPerc     = useCountUp(metrics.cmvRealPerc, 700, 1)
  const animFaturamento = useCountUp(metrics.faturamentoAtual, 700, 0)
  const animCmvReais    = useCountUp(metrics.cmvRealR$, 700, 0)
  const animDeducoes    = useCountUp(metrics.deducoesAtual, 700, 0)
  const animEstInicial  = useCountUp(metrics.estInicialAtual, 700, 0)
  const animCompras     = useCountUp(metrics.comprasAtual, 700, 0)
  const animEstFinal    = useCountUp(metrics.estFinalAtual, 700, 0)

  useEffect(() => {
    setAlertaDismissed(false)
    setVencimentoDismissed(false)
  }, [props.dataInicio])

  useEffect(() => { carregarLotesRisco() }, [])

  const carregarLotesRisco = async () => {
    try {
      const { data } = await supabase.rpc('lotes_em_risco', { dias_aviso: 7 })
      setLotesRisco(data || [])
    } catch { /* RPC não existe ainda */ }
  }

  const nomeProduto = (id: number) =>
    props.produtos?.find((p: any) => p.id === id)?.nome || `Produto #${id}`

  const di = props.dataInicio?.split('-').reverse().join('/')
  const df = props.dataFim?.split('-').reverse().join('/')

  const temAlertas = (lotesRisco.length > 0 && !vencimentoDismissed) ||
                     (cmvAcimaDaMeta && !alertaDismissed)

  // Dados do gráfico de evolução (LineChart com CMV%)
  const lineData = metrics.historicoSemanas.map((s: any) => ({
    name: s.semana,
    CMV: s.cmvPerc,
  }))

  return (
    <div className="space-y-4 pb-10">

      {/* ── Eyebrow + Título ──────────────────────────────────────────────── */}
      <div>
        <p className="text-[12px] font-semibold uppercase mb-1"
          style={{ color: T.stone400, letterSpacing: '0.10em' }}>
          {props.perfil?.empresa?.nome || "Operacional"} · {di} → {df}
        </p>
        <h1 className="text-[28px] font-serif" style={{ color: T.ink }}>
          Sua Semana
        </h1>
      </div>

      {/* ── KPI Strip ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl overflow-hidden"
        style={{ border: `1px solid ${T.stone200}` }}>
        <div className="flex flex-wrap divide-y sm:divide-y-0"
          style={{ borderBottom: `1px solid ${T.stone200}` }}>

          {/* CMV% — hero */}
          <div className="w-full sm:w-auto flex-1 min-w-[160px] py-5 px-5"
            style={{ borderRight: `1px solid ${T.stone200}` }}>
            <p className="text-[12px] font-semibold uppercase mb-2 flex items-center gap-1.5"
              style={{ color: T.stone400, letterSpacing: '0.08em' }}>
              <Target size={11} strokeWidth={2} />
              CMV Real · meta {formatPerc(metaCMV)}
            </p>
            <div className="flex items-end gap-2">
              <p className="text-[40px] font-light font-serif tabular-nums leading-none animate-count-up"
                style={{ color: cmvStatus === 'danger' ? T.negative : cmvStatus === 'ok' ? T.positive : T.stone300 }}>
                {cmvStatus === 'idle' ? '—' : formatPerc(animCmvPerc)}
              </p>
              {cmvStatus !== 'idle' && (
                <span className="mb-1 text-[12px] font-semibold flex items-center gap-0.5"
                  style={{ color: cmvStatus === 'danger' ? T.negative : T.positive }}>
                  {cmvStatus === 'danger'
                    ? <><TrendingUp size={13} strokeWidth={2} />+{cmvDiff.toFixed(1)}pp</>
                    : <><TrendingDown size={13} strokeWidth={2} />-{Math.abs(cmvDiff).toFixed(1)}pp</>
                  }
                </span>
              )}
            </div>
            {cmvStatus !== 'idle' && (
              <div className="mt-3">
                <div className="h-1 rounded-full" style={{ backgroundColor: T.stone100 }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(metrics.cmvRealPerc, 100)}%`, backgroundColor: cmvStatus === 'danger' ? T.negative : T.positive }} />
                </div>
              </div>
            )}
          </div>

          <KpiCard
            label="Venda Bruta"
            value={formatBRL(animFaturamento)}
            sub="Período selecionado"
            idle={!metrics.faturamentoAtual}
          />
          <KpiCard
            label="CMV Líquido"
            value={formatBRL(animCmvReais)}
            sub="Custo total de insumos"
            idle={!metrics.cmvRealR$}
          />
          <KpiCard
            label="Deduções"
            value={formatBRL(animDeducoes)}
            sub="Saídas e perdas"
            color={metrics.deducoesAtual > 0 ? T.warning : undefined}
            idle={!metrics.deducoesAtual}
            last
          />
        </div>

        {/* Sub-strip: Est. Inicial + Compras + Est. Final */}
        <div className="flex flex-wrap divide-x" style={{ backgroundColor: T.paper }}>
          {[
            { icon: <Warehouse size={12} strokeWidth={1.5} />, label: "Est. Inicial", value: animEstInicial },
            { icon: <ShoppingCart size={12} strokeWidth={1.5} />, label: "(+) Compras", value: animCompras },
            { icon: <Package size={12} strokeWidth={1.5} />, label: "(−) Est. Final", value: animEstFinal },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex-1 min-w-[110px] flex items-center gap-2 px-5 py-2.5">
              <span style={{ color: T.stone400 }}>{icon}</span>
              <span className="text-[12px]" style={{ color: T.stone500 }}>{label}</span>
              <span className="text-[12px] font-semibold tabular-nums ml-auto" style={{ color: T.ink }}>
                {formatBRL(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alertas (Linear-style) ────────────────────────────────────────── */}
      {temAlertas && (
        <div className="bg-white rounded-xl overflow-hidden"
          style={{ border: `1px solid ${T.stone200}` }}>
          <div className="px-5 py-3" style={{ borderBottom: `1px solid ${T.stone200}` }}>
            <p className="text-[12px] font-semibold uppercase"
              style={{ color: T.stone400, letterSpacing: '0.08em' }}>
              Atenção · {(lotesRisco.length > 0 && !vencimentoDismissed ? lotesRisco.length : 0) + (cmvAcimaDaMeta && !alertaDismissed ? 1 : 0)} item(s)
            </p>
          </div>
          <div className="px-5">
            {cmvAcimaDaMeta && !alertaDismissed && (
              <AlertaItem
                cor={T.negative}
                mensagem={`CMV ${formatPerc(metrics.cmvRealPerc)} — ${cmvDiff.toFixed(1)}pp acima da meta de ${formatPerc(metaCMV)}`}
                detalhe="Analise os insumos com maior custo e revise as fichas técnicas."
                onDismiss={() => setAlertaDismissed(true)}
              />
            )}
            {lotesRisco.length > 0 && !vencimentoDismissed && lotesRisco.map((l: any) => (
              <AlertaItem
                key={l.id}
                cor={l.dias_para_vencer <= 0 ? T.negative : T.warning}
                mensagem={`${nomeProduto(l.produto_id)} — ${l.dias_para_vencer <= 0 ? `vencido há ${Math.abs(l.dias_para_vencer)} dia(s)` : `vence em ${l.dias_para_vencer} dia(s)`}`}
                detalhe="Verifique o estoque e utilize o método FEFO."
                onDismiss={lotesRisco.indexOf(l) === 0 ? () => setVencimentoDismissed(true) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Gráfico de evolução do CMV% ───────────────────────────────────── */}
      {metrics.historicoSemanas.length > 0 && (
        <div className="bg-white rounded-xl overflow-hidden"
          style={{ border: `1px solid ${T.stone200}` }}>
          <div className="px-6 py-4 flex items-start justify-between"
            style={{ borderBottom: `1px solid ${T.stone200}` }}>
            <div>
              <p className="text-[12px] font-semibold uppercase"
                style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                Análise histórica
              </p>
              <p className="text-[16px] font-medium mt-0.5" style={{ color: T.ink }}>
                Evolução do CMV nas últimas semanas
              </p>
            </div>
            {metrics.loadingHistorico && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin mt-1"
                style={{ borderColor: `${T.stone300} ${T.stone300} ${T.stone300} transparent` }} />
            )}
          </div>
          <div className="px-4 py-5" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke={T.stone200} />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fill: T.stone400, fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)' }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: T.stone400, fontSize: 10 }}
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                <ReferenceLine y={metaCMV} stroke={T.stone300} strokeDasharray="4 4"
                  label={{ value: `Meta ${metaCMV}%`, fill: T.stone400, fontSize: 10, position: 'right' }} />
                <Tooltip content={<TooltipAtelier />} formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Line type="monotone" dataKey="CMV" stroke={T.ink} strokeWidth={2}
                  dot={{ fill: T.ink, r: 3, strokeWidth: 0 }}
                  activeDot={{ fill: T.ink, r: 5, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Histórico tabular ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl overflow-hidden"
        style={{ border: `1px solid ${T.stone200}` }}>
        <div className="px-6 py-4 flex items-center gap-2"
          style={{ borderBottom: `1px solid ${T.stone200}` }}>
          <History size={14} strokeWidth={1.5} style={{ color: T.stone400 }} />
          <h3 className="text-[14px] font-medium" style={{ color: T.ink }}>Comparativo — Últimas 5 Semanas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.stone200}`, backgroundColor: T.paper }}>
                <th className="py-3 px-6 text-left text-[12px] font-semibold uppercase"
                  style={{ color: T.stone400, letterSpacing: '0.08em' }}>Métrica</th>
                {metrics.historicoSemanas.map((s: any) => (
                  <th key={s.id} className="py-3 px-5 text-right whitespace-nowrap">
                    <span className="block text-[12px] font-semibold" style={{ color: T.ink }}>{s.semana}</span>
                    <span className="block text-[12px] font-medium mt-0.5" style={{ color: T.stone400 }}>{s.periodo}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Faturamento", key: "faturamento", fmt: formatBRL, color: T.positive, weight: false },
                { label: "Deduções (−)", key: "deducoes", fmt: formatBRL, color: T.warning, weight: false },
                { label: "CMV Líquido", key: "cmvValor", fmt: formatBRL, color: T.ink, weight: true },
              ].map(({ label, key, fmt, color, weight }) => (
                <tr key={key} className="group"
                  style={{ borderBottom: `1px solid ${T.stone200}` }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.paper2)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <td className="py-3 px-6 text-[12px]"
                    style={{ color: weight ? T.ink : T.stone500, fontWeight: weight ? 600 : 400 }}>
                    {label}
                  </td>
                  {metrics.historicoSemanas.map((s: any) => (
                    <td key={s.id} className="py-3 px-5 text-right text-[12px] tabular-nums"
                      style={{ color, fontWeight: weight ? 700 : 500 }}>
                      {fmt(s[key])}
                    </td>
                  ))}
                </tr>
              ))}
              {/* CMV% com chips */}
              <tr style={{ backgroundColor: T.paper }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.paper2)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = T.paper)}>
                <td className="py-3.5 px-6 text-[12px] font-semibold" style={{ color: T.ink }}>
                  Margem CMV %
                </td>
                {metrics.historicoSemanas.map((s: any) => (
                  <td key={s.id} className="py-3.5 px-5 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-semibold tabular-nums"
                      style={{
                        backgroundColor: s.cmvPerc > metaCMV ? T.negSoft : T.posSoft,
                        color: s.cmvPerc > metaCMV ? T.negative : T.positive,
                      }}>
                      {s.cmvPerc > metaCMV
                        ? <TrendingUp size={10} strokeWidth={2} />
                        : <TrendingDown size={10} strokeWidth={2} />}
                      {formatPerc(s.cmvPerc)}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Entradas de insumos + Chart Vendas×Compras ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Lista de entradas */}
        <div className="bg-white rounded-xl overflow-hidden flex flex-col"
          style={{ border: `1px solid ${T.stone200}`, minHeight: 320 }}>
          <div className="px-5 py-3.5 flex items-center justify-between flex-shrink-0"
            style={{ borderBottom: `1px solid ${T.stone200}` }}>
            <div className="flex items-center gap-2">
              <ShoppingCart size={14} strokeWidth={1.5} style={{ color: T.stone400 }} />
              <span className="text-[14px] font-medium" style={{ color: T.ink }}>Entradas de Insumos</span>
            </div>
            <button onClick={() => setModalAberto("compras")}
              className="p-1.5 rounded-lg transition-colors"
              title="Ver todos"
              style={{ color: T.stone400 }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = T.paper2; e.currentTarget.style.color = T.ink }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = T.stone400 }}>
              <Search size={13} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(!props.lancamentos?.compras?.length) ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                <div className="text-[32px] font-serif" style={{ color: T.stone200 }}>+</div>
                <p className="text-[14px]" style={{ color: T.stone400 }}>
                  Ainda não há compras nessa semana.
                </p>
              </div>
            ) : (
              [...(props.lancamentos?.compras || [])]
                .sort((a: any, b: any) => b.valorTotal - a.valorTotal)
                .slice(0, 10)
                .map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-5 py-2.5 group transition-colors"
                    style={{ borderBottom: `1px solid ${T.stone200}` }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.paper2)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium truncate" style={{ color: T.ink }}>{c.produto}</p>
                      <p className="text-[12px] uppercase mt-0.5" style={{ color: T.stone400, letterSpacing: '0.06em' }}>
                        {c.quantidade} un.
                      </p>
                    </div>
                    <p className="text-[14px] font-semibold tabular-nums ml-3 flex-shrink-0" style={{ color: T.ink }}>
                      {formatBRL(c.valorTotal)}
                    </p>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Chart Vendas × Compras */}
        <div className="bg-white rounded-xl overflow-hidden"
          style={{ border: `1px solid ${T.stone200}`, minHeight: 320 }}>
          <div className="px-5 py-3.5 flex items-center gap-2"
            style={{ borderBottom: `1px solid ${T.stone200}` }}>
            <BarChart3 size={14} strokeWidth={1.5} style={{ color: T.stone400 }} />
            <span className="text-[14px] font-medium" style={{ color: T.ink }}>Vendas × Compras</span>
          </div>
          <div className="p-5" style={{ height: 265 }}>
            {metrics.chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[14px]" style={{ color: T.stone300 }}>Sem dados suficientes.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke={T.stone200} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fill: T.stone400, fontSize: 10, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: T.stone400, fontSize: 10 }}
                    tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<TooltipAtelier />} />
                  <Bar dataKey="Vendas" fill={T.positive} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Compras" fill={T.stone400} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal de compras ─────────────────────────────────────────────── */}
      {modalAberto === "compras" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(11,13,14,0.5)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            style={{ boxShadow: '0 24px 48px rgba(11,13,14,0.2)', border: `1px solid ${T.stone200}` }}>
            <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: `1px solid ${T.stone200}` }}>
              <h3 className="text-[15px] font-medium" style={{ color: T.ink }}>
                Todas as Entradas de Insumos
              </h3>
              <button onClick={() => setModalAberto(null)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: T.stone400 }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = T.paper2; e.currentTarget.style.color = T.ink }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = T.stone400 }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0 bg-white" style={{ borderBottom: `1px solid ${T.stone200}` }}>
                  <tr>
                    <th className="py-3 px-6 text-left text-[12px] font-semibold uppercase"
                      style={{ color: T.stone400, letterSpacing: '0.08em' }}>Produto</th>
                    <th className="py-3 px-4 text-center text-[12px] font-semibold uppercase"
                      style={{ color: T.stone400, letterSpacing: '0.08em' }}>Qtd.</th>
                    <th className="py-3 px-6 text-right text-[12px] font-semibold uppercase"
                      style={{ color: T.stone400, letterSpacing: '0.08em' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {props.lancamentos?.compras?.map((c: any, i: number) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.stone200}` }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.paper2)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <td className="py-3 px-6 text-[14px] font-medium" style={{ color: T.ink }}>{c.produto}</td>
                      <td className="py-3 px-4 text-center text-[14px] tabular-nums" style={{ color: T.stone500 }}>{c.quantidade}</td>
                      <td className="py-3 px-6 text-right text-[14px] font-semibold tabular-nums" style={{ color: T.ink }}>{formatBRL(c.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
