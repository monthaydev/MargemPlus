import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export function useDashboardMetrics({ dataInicio, dataFim, lancamentos, contagemInicial, contagemFinal, produtos }: any) {
  const [loadingHistorico, setLoadingHistorico] = useState(true)
  const [historicoSemanas, setHistoricoSemanas] = useState<any[]>([])

  const faturamentoAtual = lancamentos?.faturamento || 0
  const comprasAtual = (lancamentos?.compras || []).reduce((acc: number, c: any) => acc + parseFloat(c.valorTotal || 0), 0)
  const deducoesAtual = (lancamentos?.saidas || []).reduce((acc: number, s: any) => acc + parseFloat(s.valorTotal || 0), 0)

  const getValorEstoqueInicial = (contagem: any) => {
    if (!contagem) return 0
    return Object.values(contagem).reduce((acc: number, item: any) => {
      return acc + (parseFloat(item.qtd || 0) * parseFloat(item.valor || 0))
    }, 0)
  }

  const estInicialAtual = getValorEstoqueInicial(contagemInicial)

  const estFinalAtual = produtos?.reduce((acc: number, p: any) => {
    const qtdF = contagemFinal[p.id]?.qtd ? parseFloat(contagemFinal[p.id].qtd) : 0;
    if (qtdF <= 0) return acc;
    
    const compProd = (lancamentos?.compras || []).filter((c: any) => c.produto === p.nome);
    let precoAplicado = 0;
    
    if (compProd.length > 0) {
        precoAplicado = parseFloat(compProd[compProd.length - 1].valorUnitario); 
    } else {
        precoAplicado = contagemInicial[p.id]?.valor ? parseFloat(contagemInicial[p.id].valor) : 0; 
    }
    
    return acc + (qtdF * precoAplicado);
  }, 0) || 0;

  // A FÓRMULA DE VILHENA QUE VOCÊ PREFERE
  const cmvRealR$ = estInicialAtual + comprasAtual - estFinalAtual - deducoesAtual;
  const cmvRealPerc = faturamentoAtual > 0 ? (cmvRealR$ / faturamentoAtual) * 100 : 0

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