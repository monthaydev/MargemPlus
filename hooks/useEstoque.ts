import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"

export function useEstoque({ dataInicio, dataFim, produtos, data, contagemInicial, contagemFinal, onChange, isReadOnly, perfil }: any) {
  const [aba, setAba] = useState<"inicial" | "compras" | "saidas" | "faturamento" | "final" | "lotes">("inicial")
  const [novoLancamento, setNovoLancamento] = useState({
    produto: "", quantidade: "", valorTotal: "", motivo: "Quebra/Desperdício",
    descricaoManual: "", modoManual: false,
    dataValidade: "",
    localId: ""
  })
  const [faturamento, setFaturamento] = useState(data.faturamento?.toString() || "")
  const [contagem, setContagem] = useState<Record<number, { qtd: string; valor: string }>>({})
  const [editandoCompraId, setEditandoCompraId] = useState<number | null>(null)

  const [locaisEstoque, setLocaisEstoque] = useState<any[]>([])
  const [lotes, setLotes] = useState<any[]>([])
  const [carregandoLotes, setCarregandoLotes] = useState(false)

  useEffect(() => { setContagem(aba === "inicial" ? contagemInicial : contagemFinal) }, [aba, contagemInicial, contagemFinal])
  useEffect(() => { setFaturamento(data.faturamento?.toString() || "") }, [data.faturamento])

  useEffect(() => {
    carregarLocais()
  }, [])

  useEffect(() => {
    if (aba === "lotes") carregarLotes()
  }, [aba])

  const carregarLocais = async () => {
    try {
      const { data: locaisData, error } = await supabase
        .from('locais_estoque')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      if (error) { setLocaisEstoque([]); return }

      // Se a empresa ainda não tem nenhum local cadastrado, cria o Almoxarifado padrão
      if (!locaisData || locaisData.length === 0) {
        if (perfil?.empresa_id) {
          const { data: novoLocal } = await supabase
            .from('locais_estoque')
            .insert([{ empresa_id: perfil.empresa_id, nome: 'Almoxarifado Principal', tipo: 'almoxarifado', ativo: true }])
            .select()
            .single()
          setLocaisEstoque(novoLocal ? [novoLocal] : [])
        }
      } else {
        setLocaisEstoque(locaisData)
      }
    } catch {
      setLocaisEstoque([])
    }
  }

  const carregarLotes = async () => {
    setCarregandoLotes(true)
    try {
      const { data: lotesData, error } = await supabase
        .from('lotes')
        .select('*, produto:produtos(nome, unidade), local:locais_estoque(nome, tipo)')
        .eq('status', 'ativo')
        .order('data_validade', { ascending: true, nullsFirst: false })

      if (error) {
        console.error("Erro ao carregar lotes:", error.message)
        setLotes([])
      } else {
        setLotes(lotesData || [])
      }
    } catch (e: any) {
      console.error("Erro inesperado ao carregar lotes:", e)
      setLotes([])
    } finally {
      setCarregandoLotes(false)
    }
  }

  const getPrecoFinalAplicado = (produtoId: number, produtoNome: string) => {
    const comprasDoProduto = (data.compras || []).filter((c: any) => c.produto === produtoNome)
    if (comprasDoProduto.length > 0) return parseFloat(comprasDoProduto[comprasDoProduto.length - 1].valorUnitario)
    const valorInicial = contagemInicial[produtoId]?.valor
    return parseFloat(valorInicial?.replace(',', '.') || "0")
  }

  const handleSalvarCompra = async () => {
    if (isReadOnly) return toast.error("Período travado para edições!")
    if (!novoLancamento.produto || !novoLancamento.quantidade || !novoLancamento.valorTotal) return toast.error("Preencha todos os campos!")

    const prod = produtos.find((p: any) => p.nome === novoLancamento.produto)
    if (!prod) return toast.error("Produto inválido!")

    const vTotal = parseFloat(novoLancamento.valorTotal.replace(',', '.'))
    const qtd = parseFloat(novoLancamento.quantidade.replace(',', '.'))
    const precoUnitario = vTotal / qtd

    if (editandoCompraId) {
      const { error } = await supabase.from('compras')
        .update({ produto_id: prod.id, quantidade: qtd, valor_unitario: precoUnitario })
        .eq('id', editandoCompraId)
      if (error) return toast.error("Erro: " + error.message)
      toast.success("Compra atualizada!")
      setEditandoCompraId(null)
    } else {
      // Insere a compra e captura o ID para vincular ao lote
      const { data: compraData, error } = await supabase.from('compras')
        .insert([{ produto_id: prod.id, quantidade: qtd, valor_unitario: precoUnitario, data_compra: dataInicio }])
        .select('id')
        .single()

      if (error) return toast.error("Erro: " + error.message)

      // Cria o lote vinculado (FEFO)
      if (perfil?.empresa_id) {
        const localPadrao = locaisEstoque.find((l: any) => l.tipo === 'almoxarifado') || locaisEstoque[0]
        const localId = novoLancamento.localId || localPadrao?.id || null

        const { error: loteError } = await supabase.from('lotes').insert([{
          empresa_id: perfil.empresa_id,
          produto_id: prod.id,
          local_id: localId,
          data_entrada: dataInicio,
          data_validade: novoLancamento.dataValidade || null,
          quantidade_orig: qtd,
          quantidade_atual: qtd,
          custo_unitario: precoUnitario,
          compra_id: compraData?.id,
          status: 'ativo'
        }])

        if (loteError) {
          console.error("Erro ao criar lote:", loteError.message)
          toast.error("Compra salva, mas não foi possível criar o lote: " + loteError.message)
        } else {
          if (aba === "lotes") carregarLotes()
        }
      }

      toast.success("Compra registrada" + (novoLancamento.dataValidade ? " com lote de validade!" : "!"))
    }

    setNovoLancamento({ ...novoLancamento, produto: "", quantidade: "", valorTotal: "", motivo: "Quebra/Desperdício", dataValidade: "", localId: "" })
    onChange()
  }

  const cancelarEdicaoCompra = () => {
    setEditandoCompraId(null)
    setNovoLancamento({ ...novoLancamento, produto: "", quantidade: "", valorTotal: "", motivo: "Quebra/Desperdício", dataValidade: "", localId: "" })
  }

  const handleSalvarSaida = async () => {
    if (isReadOnly) return toast.error("Período travado para edições!")
    let erroBanco = null

    if (novoLancamento.modoManual) {
      if (!novoLancamento.descricaoManual || !novoLancamento.valorTotal) return toast.error("Preencha descrição e valor!")
      const { error } = await supabase.from('saidas_avulsas').insert([{
        descricao_manual: novoLancamento.descricaoManual,
        valor_total: parseFloat(novoLancamento.valorTotal.replace(',', '.')),
        motivo: "Dedução Manual CMV",
        data_saida: dataInicio,
        quantidade: 1
      }])
      erroBanco = error
    } else {
      if (!novoLancamento.produto || !novoLancamento.quantidade) return toast.error("Preencha produto e qtd!")
      const prod = produtos.find((p: any) => p.nome === novoLancamento.produto)
      if (!prod) return toast.error("Produto não encontrado!")
      const valUnit = parseFloat(contagemInicial[prod.id]?.valor || "0")
      const { error } = await supabase.from('saidas_avulsas').insert([{
        produto_id: prod.id,
        quantidade: parseFloat(novoLancamento.quantidade.replace(',', '.')),
        valor_total: parseFloat(novoLancamento.quantidade.replace(',', '.')) * valUnit,
        motivo: novoLancamento.motivo,
        data_saida: dataInicio
      }])
      erroBanco = error
    }

    if (erroBanco) return toast.error("Erro no BD: " + erroBanco.message)
    toast.success("Dedução/Saída registrada!")
    setNovoLancamento({ ...novoLancamento, produto: "", quantidade: "", valorTotal: "", descricaoManual: "" })
    onChange()
  }

  const handleExcluir = async (id: number, tabela: string) => {
    if (isReadOnly) return toast.error("Período travado para edições!")
    if (!confirm("Apagar lançamento?")) return
    const { error } = await supabase.from(tabela).delete().eq('id', id)
    if (error) return toast.error("Erro: " + error.message)
    toast.success("Removido!")
    onChange()
  }

  const handleSalvarContagem = async () => {
    if (isReadOnly) return toast.error("Período travado para edições!")
    const tipo = aba === "inicial" ? "Inicial" : "Final"
    toast.loading(`Salvando Estoque ${tipo}...`, { id: "salva-estoque" })

    try {
      const { error: errDel } = await supabase.from('estoques')
        .delete()
        .eq('tipo_contagem', tipo)
        .gte('data_contagem', dataInicio)
        .lte('data_contagem', dataFim)
      if (errDel) throw errDel

      const inserts = Object.entries(contagem).map(([id, d]) => {
        const pId = parseInt(id)
        const produto = produtos.find((p: any) => p.id === pId)
        const qtdStr = d?.qtd?.toString().trim() || ""
        const valStr = d?.valor?.toString().trim() || ""

        if (tipo === "Final" && qtdStr === "") return null
        if (tipo === "Inicial" && qtdStr === "" && valStr === "") return null

        let q = parseFloat(qtdStr.replace(',', '.'))
        let valorUnitario = 0

        if (isNaN(q)) q = 0

        if (tipo === "Final") {
          valorUnitario = getPrecoFinalAplicado(pId, produto?.nome || "")
        } else {
          valorUnitario = parseFloat(valStr.replace(',', '.'))
          if (isNaN(valorUnitario)) valorUnitario = 0
        }

        return { produto_id: pId, quantidade: q, valor_unitario: valorUnitario, tipo_contagem: tipo, data_contagem: dataInicio }
      }).filter(i => i !== null)

      if (inserts.length > 0) {
        const { error: insErr } = await supabase.from('estoques').insert(inserts)
        if (insErr) throw insErr
        toast.success(`Estoque ${tipo} salvo!`, { id: "salva-estoque" })
      } else {
        toast.success(`Estoque ${tipo} atualizado (Vazio)!`, { id: "salva-estoque" })
      }

      await onChange()
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message, { id: "salva-estoque", duration: 5000 })
    }
  }

  const handlePuxarAnterior = async () => {
    if (isReadOnly) return toast.error("Período travado!")
    const d = new Date(dataInicio + "T12:00:00")
    d.setDate(d.getDate() - 7)
    const semAnt = d.toISOString().split('T')[0]

    toast("Buscando fechamento anterior...", { icon: "⏳" })
    const { data: estAnterior } = await supabase.from('estoques')
      .select('*')
      .eq('tipo_contagem', 'Final')
      .eq('data_contagem', semAnt)

    if (estAnterior && estAnterior.length > 0) {
      const novoEstoque = { ...contagem }
      estAnterior.forEach((e: any) => {
        novoEstoque[e.produto_id] = { qtd: e.quantidade.toString(), valor: e.valor_unitario.toString() }
      })
      setContagem(novoEstoque)
      toast.success("Dados carregados! Clique em SALVAR CONTAGEM para confirmar.")
    } else {
      toast.error("Nenhum fechamento encontrado na semana anterior.")
    }
  }

  const handleSalvarFaturamento = async () => {
    if (isReadOnly) return toast.error("Período travado para edições!")
    const fatVal = parseFloat(faturamento.replace(',', '.')) || 0
    const { data: ex } = await supabase.from('financas_semanais').select('id').eq('data_inicio', dataInicio).maybeSingle()
    if (ex) await supabase.from('financas_semanais').update({ faturamento: fatVal }).eq('id', ex.id)
    else await supabase.from('financas_semanais').insert([{ data_inicio: dataInicio, data_fim: dataFim, faturamento: fatVal }])
    toast.success("Faturamento salvo!")
    onChange()
  }

  return {
    aba, setAba,
    novoLancamento, setNovoLancamento,
    faturamento, setFaturamento,
    contagem, setContagem,
    editandoCompraId, setEditandoCompraId,
    locaisEstoque,
    lotes, carregandoLotes, carregarLotes,
    getPrecoFinalAplicado,
    handleSalvarCompra,
    cancelarEdicaoCompra,
    handleSalvarSaida,
    handleExcluir,
    handleSalvarContagem,
    handlePuxarAnterior,
    handleSalvarFaturamento
  }
}
