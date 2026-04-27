"use client"

import { useState } from "react"
import { DollarSign, X, BarChart3, Search, Warehouse, History, ShoppingCart, ReceiptText, MinusCircle, Package } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics"

const formatBRL = (v: any) => {
  try {
    if (v === null || v === undefined || isNaN(Number(v))) return "R$ 0,00"
    return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  } catch (e) {
    return "R$ 0,00";
  }
}

const formatPerc = (v: number) => {
  if (isNaN(v) || v === null || !isFinite(v)) return "0.00%"
  return `${v.toFixed(2)}%`
}

export function Dashboard(props: any) {
  const [modalAberto, setModalAberto] = useState<"compras" | "consumo" | null>(null)
  
  // AQUI NÓS CHAMAMOS A MATEMÁTICA QUE ESTÁ LÁ NO HOOK!
  const metrics = useDashboardMetrics(props)

  return (
    <div className="space-y-6 font-sans pb-10">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[24px] shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-blue-600"/> Dashboard Vilhena
          </h2>
          <p className="text-slate-500 font-medium text-sm">Controle de CMV e Abatimentos de Produção.</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período de Auditoria</span>
          <div className="text-slate-700 font-black text-lg">{props.dataInicio.split('-').reverse().join('/')} <span className="text-slate-300 mx-1">➜</span> {props.dataFim.split('-').reverse().join('/')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Warehouse className="w-3 h-3"/> Inicial</p>
          <p className="text-xl font-black text-slate-700">{formatBRL(metrics.estInicialAtual)}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><ShoppingCart className="w-3 h-3 text-amber-500"/> (+) Compras</p>
          <p className="text-xl font-black text-slate-700">{formatBRL(metrics.comprasAtual)}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Package className="w-3 h-3 text-blue-500"/> (-) Final</p>
          <p className="text-xl font-black text-slate-700">{formatBRL(metrics.estFinalAtual)}</p>
        </div>
        <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 shadow-sm">
          <p className="text-[10px] font-black text-rose-400 uppercase mb-1 flex items-center gap-1"><MinusCircle className="w-3 h-3"/> (-) Deduções</p>
          <p className="text-xl font-black text-rose-600">{formatBRL(metrics.deducoesAtual)}</p>
        </div>
        <div className="bg-blue-600 p-5 rounded-3xl shadow-blue-200 shadow-lg text-white">
          <p className="text-[10px] font-black text-blue-100 uppercase mb-1">(=) CMV Líquido</p>
          <p className="text-xl font-black">{formatBRL(metrics.cmvRealR$)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><DollarSign className="w-24 h-24"/></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Venda Bruta</p>
          <h3 className="text-4xl font-black text-emerald-600">{formatBRL(metrics.faturamentoAtual)}</h3>
          <div className="mt-4 flex items-center gap-2 text-slate-500 text-sm font-bold">
            <ReceiptText className="w-4 h-4"/> Seleção atual
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm text-center">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Margem CMV Real</p>
          <h3 className={`text-5xl font-black ${metrics.cmvRealPerc > 35 ? 'text-red-500' : 'text-slate-800'}`}>
            {formatPerc(metrics.cmvRealPerc)}
          </h3>
          <p className="text-slate-400 font-bold mt-2 text-sm">da receita líquida de insumos</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-blue-600"/> Evolução das Últimas 5 Semanas</h3>
          {metrics.loadingHistorico && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-black tracking-wider uppercase">
              <tr>
                <th className="py-4 px-6 text-left text-[10px]">Métricas</th>
                {metrics.historicoSemanas.map(s => (
                  <th key={s.id} className="py-3 px-6 text-right whitespace-nowrap min-w-[100px]">
                    <span className="block text-[12px] text-slate-800">{s.semana}</span>
                    <span className="block text-[9px] text-slate-400 mt-0.5">{s.periodo}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr>
                <td className="py-4 px-6 text-slate-500">Faturamento</td>
                {metrics.historicoSemanas.map(s => <td key={s.id} className="py-4 px-6 text-right font-black text-emerald-600">{formatBRL(s.faturamento)}</td>)}
              </tr>
              <tr>
                <td className="py-4 px-6 text-slate-500">Deduções (-)</td>
                {metrics.historicoSemanas.map(s => <td key={s.id} className="py-4 px-6 text-right text-rose-500 font-bold">{formatBRL(s.deducoes)}</td>)}
              </tr>
              <tr className="bg-blue-50/30">
                <td className="py-4 px-6 font-bold text-slate-700 flex flex-col">
                  CMV Líquido (R$)
                </td>
                {metrics.historicoSemanas.map(s => <td key={s.id} className="py-4 px-6 text-right font-black text-slate-800">{formatBRL(s.cmvValor)}</td>)}
              </tr>
              <tr className="bg-slate-50">
                <td className="py-5 px-6 font-black text-slate-800">Margem CMV (%)</td>
                {metrics.historicoSemanas.map(s => (
                  <td key={s.id} className="py-5 px-6 text-right">
                    <span className={`px-3 py-1.5 rounded-lg font-black text-sm ${s.cmvPerc > 35 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                      {formatPerc(s.cmvPerc)}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-black text-slate-800 flex items-center gap-2"><ShoppingCart className="text-amber-500 w-5 h-5"/> Entradas de Insumos</h4>
            <button onClick={() => setModalAberto("compras")} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-blue-600"><Search className="w-5 h-5"/></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {props.lancamentos?.compras?.length === 0 && <p className="text-center text-slate-400 mt-10 font-bold italic text-sm">Nenhuma nota fiscal lançada.</p>}
            {[...(props.lancamentos?.compras || [])].sort((a: any, b: any) => b.valorTotal - a.valorTotal).slice(0,10).map((c: any, i: number) => (
              <div key={i} className="flex justify-between items-center pb-3 border-b border-slate-50 last:border-0">
                <div><p className="font-bold text-slate-700 text-sm">{c.produto}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{c.quantidade} unidades</p></div>
                <p className="font-black text-slate-800">{formatBRL(c.valorTotal)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="mb-6">
             <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><BarChart3 className="text-blue-600 w-5 h-5"/> Vendas x Compras</h3>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val: number) => `R$${(val/1000).toFixed(0)}k`} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value: number) => formatBRL(value)} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '10px'}} />
                <Bar dataKey="Vendas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Compras" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {modalAberto === "compras" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800">Listagem Completa de Notas</h3>
              <button onClick={() => setModalAberto(null)} className="p-2 bg-white hover:bg-red-50 rounded-full border transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="overflow-y-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-white shadow-sm font-black text-[10px] uppercase text-slate-400">
                  <tr><th className="py-4 px-6">Produto</th><th className="py-4 px-6 text-center">Quantidade</th><th className="py-4 px-6 text-right">Valor Pago</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {props.lancamentos?.compras?.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-700">{c.produto}</td>
                      <td className="py-4 px-6 text-center font-bold text-slate-500">{c.quantidade}</td>
                      <td className="py-4 px-6 font-black text-slate-800 text-right">{formatBRL(c.valorTotal)}</td>
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