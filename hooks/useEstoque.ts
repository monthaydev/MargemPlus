import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"

export function useEstoque({ dataInicio, dataFim, produtos, data, contagemInicial, contagemFinal, onChange, onSemanaFechada, isReadOnly }: any) {
  const [aba, setAba] = useState<"inicial" | "compras" | "saidas" | "faturamento" | "final">("inicial")
  const [novoLancamento, setNovoLancamento] = useState({ produto: "", quantidade: "", valorTotal: "", motivo: "Quebra/Desperdício", descricaoManual: "", modoManual: false })
  const [faturamento, setFaturamento] = useState(data.faturamento?.toString() || "")
  const [contagem, setContagem] = useState<Record<number, { qtd: string; valor: string }>>({})
  const [editandoCompraId, setEditandoCompraId] = useState<number | null>(null)

  useEffect(() => { setContagem(aba === "inicial" ? contagemInicial : contagemFinal) }, [aba, contagemInicial, contagemFinal])
  useEffect(() => { setFaturamento(data.faturamento?.toString() || "") }, [data.faturamento])

  const getPrecoFinalAplicado = (produtoId: number, produtoNome: string) => {
    const comprasDoProduto = (data.compras || []).filter((c: any) => c.produto === produtoNome);
    if (comprasDoProduto.length > 0) return parseFloat(comprasDoProduto[comprasDoProduto.length - 1].valorUnitario);
    const valorInicial = contagemInicial[produtoId]?.valor;
    return parseFloat(valorInicial?.replace(',', '.') || "0");
  }

  const handleSalvarCompra = async () => {
    if (isReadOnly) return toast.error("Período travado para edições!")
    if (!novoLancamento.produto || !novoLancamento.quantidade || !novoLancamento.valorTotal) return toast.error("Preencha todos os campos!")
    
    const prod = produtos.find((p: any) => p.nome === novoLancamento.produto)
    if (!prod) return toast.error("Produto inválido!")

    const vTotal = parseFloat(novoLancamento.valorTotal.replace(',', '.')), qtd = parseFloat(novoLancamento.quantidade.replace(',', '.'))
    const precoUnitarioHires = vTotal / qtd;

    if (editandoCompraId) {
      const { error } = await supabase.from('compras').update({ produto_id: prod.id, quantidade: qtd, valor_unitario: precoUnitarioHires }).eq('id', editandoCompraId)
      if (error) return toast.error("Erro: " + error.message)
      toast.success("Compra atualizada!")
      setEditandoCompraId(null)
    } else {
      const { error } = await supabase.from('compras').insert([{ produto_id: prod.id, quantidade: qtd, valor_unitario: precoUnitarioHires, data_compra: dataInicio }])
      if (error) return toast.error("Erro: " + error.message)
      toast.success("Compra salva!")
    }
    setNovoLancamento({ ...novoLancamento, produto: "", quantidade: "", valorTotal: "", motivo: "Quebra/Desperdício" })
    onChange()
  }

  const cancelarEdicaoCompra = () => {
    setEditandoCompraId(null)
    setNovoLancamento({ ...novoLancamento, produto: "", quantidade: "", valorTotal: "", motivo: "Quebra/Desperdício" })
  }

  const handleSalvarSaida = async () => {
    if (isReadOnly) return toast.error("Período travado para edições!")
    let erroBanco = null;

    if (novoLancamento.modoManual) {
      if (!novoLancamento.descricaoManual || !novoLancamento.valorTotal) return toast.error("Preencha descrição e valor!")
      const { error } = await supabase.from('saidas_avulsas').insert([{ descricao_manual: novoLancamento.descricaoManual, valor_total: parseFloat(novoLancamento.valorTotal.replace(',', '.')), motivo: "Dedução Manual CMV", data_saida: dataInicio, quantidade: 1 }])
      erroBanco = error;
    } else {
      if (!novoLancamento.produto || !novoLancamento.quantidade) return toast.error("Preencha produto e qtd!")
      const prod = produtos.find((p: any) => p.nome === novoLancamento.produto)
      const valUnit = parseFloat(contagemInicial[prod.id]?.valor || "0")
      const { error } = await supabase.from('saidas_avulsas').insert([{ produto_id: prod.id, quantidade: parseFloat(novoLancamento.quantidade.replace(',', '.')), valor_total: parseFloat(novoLancamento.quantidade.replace(',', '.')) * valUnit, motivo: novoLancamento.motivo, data_saida: dataInicio }])
      erroBanco = error;
    }

    if (erroBanco) return toast.error("Erro no BD: " + erroBanco.message);
    toast.success("Dedução/Saída registrada!"); 
    setNovoLancamento({ ...novoLancamento, produto: "", quantidade: "", valorTotal: "", descricaoManual: "" }); 
    onChange();
  }

  const handleExcluir = async (id: number, tabela: string) => {
    if (isReadOnly) return toast.error("Período travado para edições!")
    if (!confirm("Apagar lançamento?")) return
    const { error } = await supabase.from(tabela).delete().eq('id', id)
    if (error) return toast.error("Erro: " + error.message)
    toast.success("Removido com sucesso!"); onChange();
  }

  const handleSalvarContagem = async () => {
    if (isReadOnly) return toast.error("Período travado para edições!")
    const tipo = aba === "inicial" ? "Inicial" : "Final"
    toast.loading(`Salvando Estoque ${tipo}...`, { id: "salva-estoque" })

    try {
      const { error: errDel } = await supabase.from('estoques').delete().eq('tipo_contagem', tipo).gte('data_contagem', dataInicio).lte('data_contagem', dataFim)
      if (errDel) throw errDel;

      const inserts = Object.entries(contagem).map(([id, d]) => {
        const pId = parseInt(id);
        const produto = produtos.find((p: any) => p.id === pId);
        const qtdStr = d?.qtd?.toString().trim() || "";
        const valStr = d?.valor?.toString().trim() || "";

        if (tipo === "Final" && qtdStr === "") return null;
        if (tipo === "Inicial" && qtdStr === "" && valStr === "") return null;

        let q = parseFloat(qtdStr.replace(',', '.'));
        let valorUnitarioParaSalvar = 0;

        if (isNaN(q)) q = 0;

        if (tipo === "Final") {
          valorUnitarioParaSalvar = getPrecoFinalAplicado(pId, produto?.nome || "");
        } else {
          valorUnitarioParaSalvar = parseFloat(valStr.replace(',', '.'));
          if (isNaN(valorUnitarioParaSalvar)) valorUnitarioParaSalvar = 0;
        }

        return { produto_id: pId, quantidade: q, valor_unitario: valorUnitarioParaSalvar, tipo_contagem: tipo, data_contagem: dataInicio }
      }).filter(i => i !== null)

      if (inserts.length > 0) {
        const { error: insErr } = await supabase.from('estoques').insert(inserts)
        if (insErr) throw insErr;
        toast.success(`Estoque ${tipo} salvo com sucesso!`, { id: "salva-estoque" });
      } else toast.success(`Estoque ${tipo} atualizado (Vazio)!`, { id: "salva-estoque" });
      
      await onChange();
    } catch (error: any) {
      toast.error("Erro no sistema ao salvar: " + error.message, { id: "salva-estoque", duration: 5000 });
    }
  }

  const handlePuxarAnterior = async () => {
    if (isReadOnly) return toast.error("Período travado!")
    const d = new Date(dataInicio + "T12:00:00")
    d.setDate(d.getDate() - 7)
    const semAnt = d.toISOString().split('T')[0]

    toast("Buscando fechamento anterior...", { icon: "⏳" })
    const { data: estAnterior } = await supabase.from('estoques').select('*').eq('tipo_contagem', 'Final').eq('data_contagem', semAnt)

    if (estAnterior && estAnterior.length > 0) {
      const novoEstoque = { ...contagem }
      estAnterior.forEach((e: any) => { novoEstoque[e.produto_id] = { qtd: e.quantidade.toString(), valor: e.valor_unitario.toString() } })
      setContagem(novoEstoque)
      toast.success("Dados carregados na tela! Clique em SALVAR CONTAGEM lá embaixo para confirmar.")
    } else toast.error("Nenhum fechamento encontrado na semana anterior.")
  }

  const handleSalvarFaturamento = async () => {
    if (isReadOnly) return toast.error("Período travado para edições!")
    const fatVal = parseFloat(faturamento.replace(',', '.')) || 0
    const { data: ex } = await supabase.from('financas_semanais').select('id').eq('data_inicio', dataInicio).maybeSingle()
    if (ex) await supabase.from('financas_semanais').update({ faturamento: fatVal }).eq('id', ex.id)
    else await supabase.from('financas_semanais').insert([{ data_inicio: dataInicio, data_fim: dataFim, faturamento: fatVal }])
    toast.success("Faturamento salvo!"); onChange();
  }

  return {
    aba, setAba,
    novoLancamento, setNovoLancamento,
    faturamento, setFaturamento,
    contagem, setContagem,
    editandoCompraId, setEditandoCompraId,
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