import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export function useRelatorios(produtos: any[]) {
  const [filtroCategoria, setFiltroCategoria] = useState<"Geral" | "Cozinha" | "Bebidas">("Geral")
  const [modoVisao, setModoVisao] = useState<"resumo" | "comparacao" | "detalhado">("resumo")
  const [semanasData, setSemanasData] = useState<any[]>([])
  
  const [semanaSelecionadaModal, setSemanaSelecionadaModal] = useState<string>("")
  const [semanaComp1, setSemanaComp1] = useState<string>("")
  const [semanaComp2, setSemanaComp2] = useState<string>("")
  const [loading, setLoading] = useState(true)
  
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true)

      const { data: todasFinancas } = await supabase.from('financas_semanais').select('*').order('data_inicio', { ascending: true })
      if (!todasFinancas || todasFinancas.length === 0) { setSemanasData([]); setLoading(false); return }

      const financasComNumeroMensal = todasFinancas.map(f => {
        const mesDoRegistro = f.data_inicio.substring(0, 7);
        const registrosDoMes = todasFinancas.filter(r => r.data_inicio.startsWith(mesDoRegistro));
        const indexNoMes = registrosDoMes.findIndex(r => r.id === f.id);
        return { ...f, numeroNoMes: indexNoMes + 1 };
      });

      const financasDoMes = financasComNumeroMensal.filter(f => f.data_inicio.startsWith(mesSelecionado))
      if (financasDoMes.length === 0) { setSemanasData([]); setLoading(false); return; }

      const oldestDate = financasDoMes[0].data_inicio
      const newestDate = financasDoMes[financasDoMes.length - 1].data_fim || financasDoMes[financasDoMes.length - 1].data_inicio

      const [dbCompras, dbEstoques, dbSaidas] = await Promise.all([
        supabase.from('compras').select('*').gte('data_compra', oldestDate).lte('data_compra', newestDate),
        supabase.from('estoques').select('*').gte('data_contagem', oldestDate).lte('data_contagem', newestDate),
        supabase.from('saidas_avulsas').select('*').gte('data_saida', oldestDate).lte('data_saida', newestDate)
      ])

      const semanasProcessadas = financasDoMes.map(f => {
        let comp = dbCompras.data?.filter(c => c.data_compra >= f.data_inicio && c.data_compra <= f.data_fim) || []
        let est = dbEstoques.data?.filter(e => e.data_contagem >= f.data_inicio && e.data_contagem <= f.data_fim) || []
        let saidas = dbSaidas.data?.filter(s => s.data_saida >= f.data_inicio && s.data_saida <= f.data_fim) || []

        let prodsFiltrados = produtos || []
        if (filtroCategoria === "Cozinha") prodsFiltrados = produtos.filter(p => p.grupo !== "Bebidas" && p.grupo !== "Embalagens" && p.grupo !== "Limpeza" && p.grupo !== "Outros")
        else if (filtroCategoria === "Bebidas") prodsFiltrados = produtos.filter(p => p.grupo === "Bebidas")

        const consumoDetalhado = prodsFiltrados.map(p => {
          const eI = est.find(e => e.produto_id === p.id && e.tipo_contagem === 'Inicial')
          const eF = est.find(e => e.produto_id === p.id && e.tipo_contagem === 'Final')
          const cP = comp.filter(c => c.produto_id === p.id)
          const qI = eI ? parseFloat(eI.quantidade) : 0, vI = eI ? parseFloat(eI.valor_unitario) : 0
          let qC = 0, vC = 0; cP.forEach(c => { qC += parseFloat(c.quantidade); vC += parseFloat(c.quantidade) * parseFloat(c.valor_unitario) })
          const qF = eF ? parseFloat(eF.quantidade) : 0, vF = eF ? parseFloat(eF.valor_unitario) : vI
          const custoConsumido = (p.producao_interna) ? 0 : ((qI * vI) + vC - (qF * vF))
          return { item: p.nome, unidade: p.unidade, grupo: p.grupo, producao_interna: p.producao_interna, qI, valorIni: qI * vI, qC, valorComp: vC, qF, valorFinal: qF * vF, qtdConsumida: (qI + qC - qF), valorConsumido: custoConsumido }
        }).filter(i => i.valorConsumido !== 0 || i.qtdConsumida !== 0 || i.qI > 0 || i.qF > 0 || i.qC > 0).sort((a,b) => b.valorConsumido - a.valorConsumido)

        const totalDed = saidas.reduce((a, s) => a + parseFloat(s.valor_total || 0), 0)
        let cmvValorReal = consumoDetalhado.reduce((acc, curr) => acc + curr.valorConsumido, 0)
        if (filtroCategoria === "Geral") cmvValorReal -= totalDed;

        const inicialVisual = est.filter(e => e.tipo_contagem === 'Inicial' && prodsFiltrados.find(p => p.id === e.produto_id)).reduce((acc, e) => acc + (parseFloat(e.quantidade) * parseFloat(e.valor_unitario)), 0)
        const finalVisual = est.filter(e => e.tipo_contagem === 'Final' && prodsFiltrados.find(p => p.id === e.produto_id)).reduce((acc, e) => acc + (parseFloat(e.quantidade) * parseFloat(e.valor_unitario)), 0)
        const comprasVisuais = comp.filter(c => prodsFiltrados.find(p => p.id === c.produto_id)).reduce((acc, c) => acc + (parseFloat(c.quantidade) * parseFloat(c.valor_unitario)), 0)
        const deducoesVisuais = filtroCategoria === "Geral" ? totalDed : 0

        const dFinal = new Date(f.data_inicio + "T12:00:00")
        dFinal.setDate(dFinal.getDate() + 6)
        const dataVisual = `${f.data_inicio.split('-')[2]}/${f.data_inicio.split('-')[1]} a ${dFinal.toISOString().split('T')[0].split('-')[2]}/${dFinal.toISOString().split('T')[0].split('-')[1]}`

        return { id: f.data_inicio, nome: `Semana ${f.numeroNoMes}`, periodo: dataVisual, faturamento: f.faturamento || 0, inicial: inicialVisual, compras: comprasVisuais, deducoes: deducoesVisuais, final: finalVisual, cmvValor: cmvValorReal, consumoDetalhado }
      })

      setSemanasData(semanasProcessadas)
      if (semanasProcessadas.length > 0) {
        setSemanaSelecionadaModal(semanasProcessadas[semanasProcessadas.length - 1].id)
        if (semanasProcessadas.length >= 2) {
          setSemanaComp1(semanasProcessadas[semanasProcessadas.length - 2].id)
          setSemanaComp2(semanasProcessadas[semanasProcessadas.length - 1].id)
        } else {
          setSemanaComp1(semanasProcessadas[0].id)
          setSemanaComp2(semanasProcessadas[0].id)
        }
      }
      setLoading(false)
    }

    if (produtos.length > 0) carregarDados()
  }, [filtroCategoria, produtos, mesSelecionado])

  return {
    filtroCategoria, setFiltroCategoria,
    modoVisao, setModoVisao,
    semanasData,
    semanaSelecionadaModal, setSemanaSelecionadaModal,
    semanaComp1, setSemanaComp1,
    semanaComp2, setSemanaComp2,
    loading,
    mesSelecionado, setMesSelecionado
  }
}