import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { calcularCMV } from "@/lib/utils"

export function useDashboardMetrics({ dataInicio, dataFim, lancamentos, contagemInicial, contagemFinal, produtos }: any) {
  const [loadingHistorico, setLoadingHistorico] = useState(true)
  const [historicoSemanas, setHistoricoSemanas] = useState<any[]>([])

  // Fórmula de Vilhena (CMV = EI + Compras − EF − Deduções) — fonte única em lib/utils.
  const {
    faturamento: faturamentoAtual,
    compras: comprasAtual,
    deducoes: deducoesAtual,
    estInicial: estInicialAtual,
    estFinal: estFinalAtual,
    cmv: cmvRealR$,
    margemCMV: cmvRealPerc,
  } = calcularCMV({ lancamentos, contagemInicial, contagemFinal, produtos })

  useEffect(() => {
    const buscarHistorico = async () => {
      setLoadingHistorico(true)
      const { data: financas } = await supabase.from('financas_semanais').select('*').order('data_inicio', { ascending: false }).limit(5)
      if (!financas || financas.length === 0) { setLoadingHistorico(false); return }

      const oldestDate = financas[financas.length - 1].data_inicio
      const newestDate = financas[0].data_fim || dataFim

      const { data: dbCompras } = await supabase.from('compras').select('*').gte('data_compra', oldestDate).lte('data_compra', newestDate)
      const { data: dbEstoques } = await supabase.from('estoques').select('*').gte('data_contagem', oldestDate).lte('data_contagem', newestDate)
      const { data: dbSaidas } = await supabase.from('saidas_avulsas').select('*').gte('data_saida', oldestDate).lte('data_saida', newestDate)

      const historyData = financas.reverse().map((f, index) => {
        if (f.data_inicio === dataInicio) {
          return {
            id: f.data_inicio,
            semana: `Sem. ${index + 1}`,
            periodo: `${f.data_inicio.split('-')[2]}/${f.data_inicio.split('-')[1]} a ${dataFim.split('-')[2]}/${dataFim.split('-')[1]}`,
            faturamento: faturamentoAtual,
            compras: comprasAtual,
            deducoes: deducoesAtual,
            cmvValor: cmvRealR$,
            cmvPerc: cmvRealPerc
          }
        }

        const myCompras = dbCompras?.filter(c => c.data_compra >= f.data_inicio && c.data_compra <= f.data_fim) || []
        const myEst = dbEstoques?.filter(e => e.data_contagem >= f.data_inicio && e.data_contagem <= f.data_fim) || []
        const mySaidas = dbSaidas?.filter(s => s.data_saida >= f.data_inicio && s.data_saida <= f.data_fim) || []
        
        const totComp = myCompras.reduce((a, c) => a + (parseFloat(c.quantidade) * parseFloat(c.valor_unitario)), 0)
        const totDed = mySaidas.reduce((a, s) => a + parseFloat(s.valor_total || 0), 0)
        
        const eI_total = myEst.filter(e => e.tipo_contagem === 'Inicial').reduce((a, e) => a + (parseFloat(e.quantidade) * parseFloat(e.valor_unitario)), 0);
        const eF_total = myEst.filter(e => e.tipo_contagem === 'Final').reduce((a, e) => a + (parseFloat(e.quantidade) * parseFloat(e.valor_unitario)), 0);
        
        const cmvRS = eI_total + totComp - eF_total - totDed;

        const dFinal = new Date(f.data_inicio + "T12:00:00")
        dFinal.setDate(dFinal.getDate() + 6)
        const strFim = dFinal.toISOString().split('T')[0]

        return {
          id: f.data_inicio,
          semana: `Sem. ${index + 1}`,
          periodo: `${f.data_inicio.split('-')[2]}/${f.data_inicio.split('-')[1]} a ${strFim.split('-')[2]}/${strFim.split('-')[1]}`,
          faturamento: f.faturamento || 0,
          compras: totComp,
          deducoes: totDed,
          cmvValor: cmvRS,
          cmvPerc: f.faturamento > 0 ? (cmvRS / f.faturamento) * 100 : 0
        }
      })
      setHistoricoSemanas(historyData)
      setLoadingHistorico(false)
    }
    
    if (dataInicio && produtos?.length > 0) buscarHistorico()
  }, [dataInicio, dataFim, lancamentos, contagemInicial, contagemFinal, produtos, faturamentoAtual, comprasAtual, deducoesAtual, cmvRealR$, cmvRealPerc])

  const chartData = historicoSemanas.map(s => ({
    name: s.semana,
    Vendas: s.faturamento,
    Compras: s.compras
  }))

  return {
    faturamentoAtual,
    comprasAtual,
    deducoesAtual,
    estInicialAtual,
    estFinalAtual,
    cmvRealR$,
    cmvRealPerc,
    historicoSemanas,
    loadingHistorico,
    chartData
  }
}