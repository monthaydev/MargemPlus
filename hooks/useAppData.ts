import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"
import { getSegundaFeiraAtual, calcularDataFim, proximaSegunda } from "@/lib/dates"

// Carrega e gerencia os dados do ciclo semanal (produtos, lançamentos, contagens)
// e toda a lógica de fechamento/reabertura de semana com PIN.
export function useAppData({ sessao, perfil }: { sessao: any; perfil: any }) {
  const [dataInicio, setDataInicio] = useState(getSegundaFeiraAtual())
  const [dataFim, setDataFim] = useState(calcularDataFim(getSegundaFeiraAtual()))

  const [produtos, setProdutos] = useState<any[]>([])
  const [lancamentos, setLancamentos] = useState<any>({ compras: [], faturamento: 0, saidas: [], outrosCustos: {} })
  const [contagemInicial, setContagemInicial] = useState<any>({})
  const [contagemFinal, setContagemFinal] = useState<any>({})
  const [bloqueioAtivo, setBloqueioAtivo] = useState(false)

  const [showModalDesbloqueio, setShowModalDesbloqueio] = useState(false)
  const [pinDesbloqueio, setPinDesbloqueio] = useState("")
  const [verificandoPin, setVerificandoPin] = useState(false)
  const [showModalFecharSemana, setShowModalFecharSemana] = useState(false)
  const [fechandoSemana, setFechandoSemana] = useState(false)
  const [dataAnteriorAoModal, setDataAnteriorAoModal] = useState<string | null>(null)
  // Rastreia qual semana passada foi temporariamente desbloqueada para edição
  // → ao clicar em "Semana atual", re-fecha automaticamente essa semana no banco.
  const [semanaTemporariamenteAberta, setSemanaTemporariamenteAberta] = useState<string | null>(null)

  const carregarProdutos = async () => {
    if (!sessao || !perfil) return
    const { data } = await supabase.from('produtos').select('*').order('nome')
    if (data) setProdutos(data.map((p: any) => ({ id: p.id, nome: p.nome, unidade: p.unidade, grupo: p.grupo || 'Sem Grupo', producao_interna: p.producao_interna || false, rendimento: p.rendimento ?? 100 })))
  }

  const carregarDadosDoBanco = async () => {
    if (!sessao || !perfil || produtos.length === 0) return
    toast.loading("Sincronizando...", { id: "sync" })
    try {
      const [comprasDb, estoquesDb, financasDb, saidasDb] = await Promise.all([
        supabase.from('compras').select('*').gte('data_compra', dataInicio).lte('data_compra', dataFim),
        supabase.from('estoques').select('*').gte('data_contagem', dataInicio).lte('data_contagem', dataFim),
        supabase.from('financas_semanais').select('*').eq('data_inicio', dataInicio).maybeSingle(),
        supabase.from('saidas_avulsas').select('*').gte('data_saida', dataInicio).lte('data_saida', dataFim)
      ])
      const comprasFormatadas = (comprasDb.data || []).map(c => {
        const p = produtos.find(prod => prod.id === c.produto_id)
        return { id: c.id, produto: p ? p.nome : 'Excluído', quantidade: parseFloat(c.quantidade), valorUnitario: parseFloat(c.valor_unitario), valorTotal: parseFloat(c.quantidade) * parseFloat(c.valor_unitario) }
      })
      const saidasFormatadas = (saidasDb.data || []).map(s => {
        const p = produtos.find(prod => prod.id === s.produto_id)
        return { id: s.id, produto: p ? p.nome : null, quantidade: s.quantidade ? parseFloat(s.quantidade) : 0, valorTotal: parseFloat(s.valor_total), motivo: s.motivo, descricaoManual: s.descricao_manual }
      })
      const ini: any = {}; const fim: any = {};
      (estoquesDb.data || []).forEach(e => {
        const val = { qtd: e.quantidade.toString(), valor: e.valor_unitario.toString() }
        if (e.tipo_contagem === 'Inicial') ini[e.produto_id] = val
        else if (e.tipo_contagem === 'Final') fim[e.produto_id] = val
      })
      setContagemInicial(ini); setContagemFinal(fim)
      setLancamentos({ compras: comprasFormatadas, saidas: saidasFormatadas, faturamento: financasDb.data?.faturamento || 0, outrosCustos: financasDb.data || {} })
      const isFechada = financasDb.data?.status === 'fechado'
      const isPassado = dataInicio !== getSegundaFeiraAtual()
      setBloqueioAtivo(isFechada)
      // Auto-modal: qualquer semana fechada pede PIN ao entrar
      // – semana passada: oferece "só visualizar" ou "semana atual" + PIN
      // – semana atual fechada: só mostra PIN (sem opção de voltar)
      if (isFechada) {
        if (isPassado) setDataAnteriorAoModal(getSegundaFeiraAtual())
        setPinDesbloqueio("")
        setShowModalDesbloqueio(true)
      }
      toast.success("Sincronizado.", { id: "sync" })
    } catch {
      toast.error("Erro ao sincronizar.", { id: "sync" })
    }
  }

  useEffect(() => { setDataFim(calcularDataFim(dataInicio)) }, [dataInicio])
  useEffect(() => { if (sessao && perfil) carregarProdutos() }, [sessao, perfil])
  useEffect(() => { if (sessao && perfil && produtos.length > 0) carregarDadosDoBanco() }, [dataInicio, dataFim, produtos.length, sessao, perfil])

  const handleSemanaFechada = () => {
    if (bloqueioAtivo) return
    setShowModalFecharSemana(true)
  }

  const handleConfirmarFecharSemana = async () => {
    setFechandoSemana(true)
    toast.loading("Encerrando ciclo...", { id: "fechar-semana" })
    const { data: ex } = await supabase.from('financas_semanais').select('id').eq('data_inicio', dataInicio).maybeSingle()
    if (ex) await supabase.from('financas_semanais').update({ status: 'fechado' }).eq('id', ex.id)
    else await supabase.from('financas_semanais').insert([{ data_inicio: dataInicio, data_fim: dataFim, status: 'fechado' }])
    setBloqueioAtivo(false)
    setDataInicio(proximaSegunda(dataInicio))
    setShowModalFecharSemana(false)
    setFechandoSemana(false)
    toast.success("Semana fechada. Avançando para o próximo ciclo.", { id: "fechar-semana" })
  }

  const handleDesbloquearSemana = () => {
    setPinDesbloqueio("")
    setShowModalDesbloqueio(true)
  }

  // Volta à semana atual E, se havia uma semana passada desbloqueada, re-fecha ela no banco.
  const handleVoltarSemanaAtual = async () => {
    if (semanaTemporariamenteAberta) {
      toast.loading("Fechando semana anterior...", { id: "refechar" })
      await supabase
        .from('financas_semanais')
        .update({ status: 'fechado' })
        .eq('data_inicio', semanaTemporariamenteAberta)
      setSemanaTemporariamenteAberta(null)
      if (dataInicio === semanaTemporariamenteAberta) setBloqueioAtivo(true)
      toast.success("Semana anterior fechada.", { id: "refechar" })
    }
    setDataInicio(getSegundaFeiraAtual())
  }

  const handleConfirmarPin = async () => {
    if (!pinDesbloqueio.trim()) return toast.error("Digite o PIN de desbloqueio.")
    setVerificandoPin(true)
    const pinConfigurado = perfil?.empresa?.senha_desbloqueio
    if (pinConfigurado) {
      if (pinDesbloqueio !== pinConfigurado) {
        setVerificandoPin(false)
        return toast.error("PIN incorreto.")
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: sessao.user.email, password: pinDesbloqueio })
      if (error) {
        setVerificandoPin(false)
        return toast.error("Senha incorreta. Dica: configure um PIN em Configurações → Segurança.")
      }
    }
    await supabase.from('financas_semanais').update({ status: 'aberto' }).eq('data_inicio', dataInicio)
    setBloqueioAtivo(false)
    setShowModalDesbloqueio(false)
    setPinDesbloqueio("")
    setVerificandoPin(false)
    setDataAnteriorAoModal(null)
    // Se é uma semana passada, rastreia para re-fechar ao sair.
    if (dataInicio !== getSegundaFeiraAtual()) setSemanaTemporariamenteAberta(dataInicio)
    toast.success("Semana reaberta para edição.")
  }

  // Fecha o modal de desbloqueio restaurando a data anterior (X / clique no backdrop).
  const fecharModalDesbloqueio = () => {
    setShowModalDesbloqueio(false)
    if (dataAnteriorAoModal) { setDataInicio(dataAnteriorAoModal); setDataAnteriorAoModal(null) }
  }

  // Atalho "só visualizar" — fecha o modal mantendo a semana passada em modo leitura.
  const soVisualizarSemana = () => {
    setShowModalDesbloqueio(false)
    setDataAnteriorAoModal(null)
  }

  // Atalho "semana atual" dentro do modal — volta ao ciclo aberto.
  const irParaSemanaAtual = () => {
    if (dataAnteriorAoModal) setDataInicio(dataAnteriorAoModal)
    setDataAnteriorAoModal(null)
    setShowModalDesbloqueio(false)
  }

  return {
    dataInicio, setDataInicio, dataFim,
    produtos, lancamentos, contagemInicial, contagemFinal, bloqueioAtivo,
    carregarProdutos, carregarDadosDoBanco,
    // semana
    showModalDesbloqueio, pinDesbloqueio, setPinDesbloqueio, verificandoPin,
    showModalFecharSemana, fechandoSemana, dataAnteriorAoModal,
    handleSemanaFechada, handleConfirmarFecharSemana,
    handleDesbloquearSemana, handleVoltarSemanaAtual, handleConfirmarPin,
    fecharModalDesbloqueio, soVisualizarSemana, irParaSemanaAtual,
    setShowModalFecharSemana,
  }
}
