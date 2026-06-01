"use client"

import { useState } from "react"
import {
  Package, ShoppingCart, Trash2, Save, CheckCircle2,
  ArrowDownToLine, Lock, Pencil, X, MinusCircle, Layers, AlertTriangle,
  Calendar, Warehouse, ChefHat, Clock
} from "lucide-react"
import { useEstoque } from "@/hooks/useEstoque"
import { formatBRL } from "@/lib/utils"
import { T } from "@/lib/design-tokens"

const diasParaVencer = (dataValidade: string | null): number | null => {
  if (!dataValidade) return null
  return Math.floor(
    (new Date(dataValidade + "T12:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
}

const corLote = (dias: number | null) => {
  if (dias === null) return { chipStyle: { backgroundColor: T.stone100, color: T.stone500 }, texto: "Sem validade" }
  if (dias < 0)     return { chipStyle: { backgroundColor: T.negSoft,  color: T.negative }, texto: `Vencido há ${Math.abs(dias)}d` }
  if (dias <= 7)    return { chipStyle: { backgroundColor: T.negSoft,  color: T.negative }, texto: `Vence em ${dias}d` }
  if (dias <= 30)   return { chipStyle: { backgroundColor: T.warnSoft, color: T.warning  }, texto: `Vence em ${dias}d` }
  return              { chipStyle: { backgroundColor: T.posSoft,  color: T.positive }, texto: `Vence em ${dias}d` }
}

const iconeLocal = (tipo: string) => {
  if (tipo === "almoxarifado") return <Warehouse className="w-3.5 h-3.5" />
  if (tipo === "cozinha")      return <ChefHat className="w-3.5 h-3.5" />
  return <Package className="w-3.5 h-3.5" />
}

export function Estoque(props: any) {
  const { isReadOnly, produtos, data, onSemanaFechada } = props
  const [pendingDel, setPendingDel] = useState<{ id: number; tabela: string } | null>(null)

  const {
    aba, setAba, novoLancamento, setNovoLancamento,
    faturamento, setFaturamento, contagem, setContagem,
    editandoCompraId, setEditandoCompraId,
    locaisEstoque,
    lotes, carregandoLotes,
    getPrecoFinalAplicado,
    handleSalvarCompra, cancelarEdicaoCompra, handleSalvarSaida,
    handleExcluir, handleSalvarContagem, handlePuxarAnterior, handleSalvarFaturamento
  } = useEstoque(props)

  const di = props.dataInicio?.split('-').reverse().join('/')
  const df = props.dataFim?.split('-').reverse().join('/')

  const ABAS = [
    { id: "inicial",     label: "Est. Inicial" },
    { id: "compras",     label: "Compras" },
    { id: "saidas",      label: "Deduções" },
    { id: "faturamento", label: "Faturamento" },
    { id: "final",       label: "Est. Final" },
    { id: "lotes",       label: "Lotes" },
  ]

  return (
    <div className="space-y-4 pb-32">

      {/* Eyebrow + Título */}
      <div>
        <p className="text-[12px] font-semibold uppercase mb-1"
          style={{ color: T.stone400, letterSpacing: '0.10em' }}>
          {props.perfil?.empresa?.nome || "Operacional"} · {di} → {df}
        </p>
        <h1 className="text-[28px] font-serif" style={{ color: T.ink }}>
          Estoque
        </h1>
      </div>

      {/* Banner período encerrado */}
      {isReadOnly && (
        <div className="flex items-center gap-3 py-2.5"
          style={{ borderBottom: `1px solid ${T.stone200}` }}>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: T.negative }} />
          <p className="text-[14px] font-medium" style={{ color: T.ink }}>
            Período encerrado — este ciclo já foi fechado.
          </p>
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-semibold"
            style={{ backgroundColor: T.negSoft, color: T.negative }}>
            <Lock className="w-3 h-3" strokeWidth={2} />
            Bloqueado
          </span>
        </div>
      )}

      {/* Underline tabs */}
      <div className="flex overflow-x-auto no-scrollbar"
        style={{ borderBottom: `1px solid ${T.stone200}` }}>
        {ABAS.map(t => (
          <button
            key={t.id}
            onClick={() => { setAba(t.id as any); cancelarEdicaoCompra() }}
            className="px-4 py-3 text-[14px] whitespace-nowrap transition-all duration-150 relative flex-shrink-0"
            style={{
              color: aba === t.id ? T.ink : T.stone500,
              fontWeight: aba === t.id ? 600 : 500,
            }}>
            {t.label}
            {aba === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                style={{ backgroundColor: T.ink }} />
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="bg-white rounded-xl border p-5 lg:p-6"
        style={{ borderColor: T.stone200 }}>

        {/* ── ABA COMPRAS ── */}
        {aba === "compras" && (
          <div className="space-y-6">
            {!isReadOnly && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end p-5 rounded-xl border relative"
                style={{
                  backgroundColor: editandoCompraId ? T.paper : T.paper2,
                  borderColor: editandoCompraId ? T.margemMint : T.stone200,
                }}>
                {editandoCompraId && (
                  <div className="absolute -top-3 left-4 text-[9px] font-semibold px-3 py-1 rounded-full uppercase tracking-widest"
                    style={{ backgroundColor: T.ink, color: T.paper }}>
                    Editando
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-semibold uppercase tracking-wider"
                    style={{ color: T.stone400 }}>Insumo</label>
                  <select
                    className="p-3 rounded-xl border text-[14px] font-medium outline-none bg-white transition-all duration-150"
                    style={{ borderColor: T.stone200, color: T.ink }}
                    value={novoLancamento.produto}
                    onChange={e => setNovoLancamento({ ...novoLancamento, produto: e.target.value })}>
                    <option value="">Selecione...</option>
                    {produtos.map((p: any) => <option key={p.id}>{p.nome}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-semibold uppercase tracking-wider"
                    style={{ color: T.stone400 }}>Qtd Comprada</label>
                  <input
                    type="text" placeholder="0"
                    className="p-3 rounded-xl border text-[14px] font-medium outline-none bg-white transition-all duration-150"
                    style={{ borderColor: T.stone200, color: T.ink }}
                    value={novoLancamento.quantidade}
                    onChange={e => setNovoLancamento({ ...novoLancamento, quantidade: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-semibold uppercase tracking-wider"
                    style={{ color: T.stone400 }}>R$ Total da Nota</label>
                  <input
                    type="text" placeholder="0,00"
                    className="p-3 rounded-xl border text-[14px] font-medium outline-none transition-all duration-150"
                    style={{ borderColor: T.stone200, color: T.ink, backgroundColor: T.paper2 }}
                    value={novoLancamento.valorTotal}
                    onChange={e => setNovoLancamento({ ...novoLancamento, valorTotal: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSalvarCompra}
                    className="flex-1 p-3 rounded-xl font-semibold text-[14px] hover:opacity-90 active:scale-[0.98] transition-all duration-150 flex justify-center items-center gap-2"
                    style={{ backgroundColor: T.ink, color: T.paper }}>
                    <ShoppingCart className="w-4 h-4" strokeWidth={1.5} />
                    {editandoCompraId ? "Atualizar" : "Lançar"}
                  </button>
                  {editandoCompraId && (
                    <button onClick={cancelarEdicaoCompra}
                      className="p-3 rounded-xl border transition-all duration-150"
                      style={{ backgroundColor: 'transparent', borderColor: T.stone200, color: T.stone400 }}
                      onMouseEnter={e => { e.currentTarget.style.color = T.negative; e.currentTarget.style.borderColor = T.negSoft }}
                      onMouseLeave={e => { e.currentTarget.style.color = T.stone400; e.currentTarget.style.borderColor = T.stone200 }}>
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                {!editandoCompraId && (
                  <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-3"
                    style={{ borderTop: `1px solid ${T.stone200}` }}>
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                        style={{ color: T.stone400 }}>
                        <Calendar className="w-3 h-3" style={{ color: T.warning }} />
                        Data de Validade (opcional)
                      </label>
                      <input
                        type="date"
                        className="p-3 rounded-xl border text-[14px] font-medium outline-none bg-white transition-all duration-150"
                        style={{ borderColor: T.stone200, color: T.ink }}
                        value={novoLancamento.dataValidade}
                        onChange={e => setNovoLancamento({ ...novoLancamento, dataValidade: e.target.value })}
                      />
                      {!novoLancamento.dataValidade && (
                        <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: T.stone400 }}>
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: T.warning }} />
                          Informe para ativar alertas FEFO e controle de risco de perda.
                        </p>
                      )}
                    </div>
                    {locaisEstoque.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[12px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                          style={{ color: T.stone400 }}>
                          <Warehouse className="w-3 h-3" style={{ color: T.stone400 }} />
                          Local de Armazenamento
                        </label>
                        <select
                          className="p-3 rounded-xl border text-[14px] font-medium outline-none bg-white transition-all duration-150"
                          style={{ borderColor: T.stone200, color: T.ink }}
                          value={novoLancamento.localId}
                          onChange={e => setNovoLancamento({ ...novoLancamento, localId: e.target.value })}>
                          <option value="">Padrão (Almoxarifado)</option>
                          {locaisEstoque.map((l: any) => (
                            <option key={l.id} value={l.id}>{l.nome}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.stone200}` }}>
                    <th className="pb-3 text-left text-[12px] font-semibold uppercase"
                      style={{ color: T.stone400, letterSpacing: '0.08em' }}>Item Comprado</th>
                    <th className="pb-3 text-center text-[12px] font-semibold uppercase"
                      style={{ color: T.stone400, letterSpacing: '0.08em' }}>Quantidade</th>
                    <th className="pb-3 text-right text-[12px] font-semibold uppercase"
                      style={{ color: T.stone400, letterSpacing: '0.08em' }}>Valor Total</th>
                    {!isReadOnly && <th className="pb-3" />}
                  </tr>
                </thead>
                <tbody>
                  {data.compras.map((c: any) => (
                    <tr key={c.id} className="group transition-colors"
                      style={{ borderBottom: `1px solid ${T.stone200}` }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.paper2)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <td className="py-3.5 text-[14px] font-medium" style={{ color: T.ink }}>{c.produto}</td>
                      <td className="py-3.5 text-center text-[14px] tabular-nums" style={{ color: T.stone500 }}>{c.quantidade}</td>
                      <td className="py-3.5 text-right text-[14px] font-semibold tabular-nums" style={{ color: T.ink }}>{formatBRL(c.valorTotal)}</td>
                      {!isReadOnly && (
                        <td className="py-3.5 text-right">
                          {pendingDel?.id === c.id && pendingDel?.tabela === 'compras' ? (
                            <div className="flex justify-end items-center gap-1.5">
                              <button
                                onClick={() => { handleExcluir(c.id, 'compras'); setPendingDel(null) }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                                style={{ background: T.negSoft, color: T.negative }}>
                                Excluir
                              </button>
                              <button onClick={() => setPendingDel(null)}
                                className="p-1.5 rounded-lg transition-all"
                                style={{ color: T.stone400 }}
                                onMouseEnter={e => { e.currentTarget.style.color = T.ink }}
                                onMouseLeave={e => { e.currentTarget.style.color = T.stone400 }}>
                                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              <button
                                onClick={() => {
                                  setEditandoCompraId(c.id)
                                  setNovoLancamento({ ...novoLancamento, produto: c.produto, quantidade: c.quantidade.toString(), valorTotal: c.valorTotal.toFixed(2), motivo: "Quebra/Desperdício", dataValidade: "", localId: "" })
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                className="p-1.5 rounded-lg border transition-all duration-150"
                                style={{ color: T.stone400, borderColor: T.stone200 }}
                                onMouseEnter={e => { e.currentTarget.style.color = T.ink; e.currentTarget.style.backgroundColor = T.paper2 }}
                                onMouseLeave={e => { e.currentTarget.style.color = T.stone400; e.currentTarget.style.backgroundColor = 'transparent' }}>
                                <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                              <button
                                onClick={() => setPendingDel({ id: c.id, tabela: 'compras' })}
                                className="p-1.5 rounded-lg border transition-all duration-150"
                                style={{ color: T.stone400, borderColor: T.stone200 }}
                                onMouseEnter={e => { e.currentTarget.style.color = T.negative; e.currentTarget.style.backgroundColor = T.negSoft }}
                                onMouseLeave={e => { e.currentTarget.style.color = T.stone400; e.currentTarget.style.backgroundColor = 'transparent' }}>
                                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ABA SAÍDAS ── */}
        {aba === "saidas" && (
          <div className="space-y-6">
            {!isReadOnly && (
              <div className="p-5 rounded-xl border space-y-4"
                style={{ backgroundColor: T.paper2, borderColor: T.stone200 }}>
                <div className="flex justify-start">
                  <button
                    onClick={() => setNovoLancamento({ ...novoLancamento, modoManual: !novoLancamento.modoManual })}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all duration-150"
                    style={{
                      backgroundColor: novoLancamento.modoManual ? T.ink : 'white',
                      color: novoLancamento.modoManual ? T.paper : T.stone500,
                      borderColor: novoLancamento.modoManual ? T.ink : T.stone200,
                    }}>
                    {novoLancamento.modoManual ? 'Modo: Valor manual' : 'Modo: Abate por insumo'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  {novoLancamento.modoManual ? (
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <label className="text-[12px] font-semibold uppercase tracking-wider"
                        style={{ color: T.stone400 }}>Descrição da Saída</label>
                      <input
                        type="text" placeholder="Ex: Strogonoff p/ evento..."
                        className="p-3 rounded-xl border text-[14px] font-medium bg-white outline-none transition-all duration-150"
                        style={{ borderColor: T.stone200, color: T.ink }}
                        value={novoLancamento.descricaoManual}
                        onChange={e => setNovoLancamento({ ...novoLancamento, descricaoManual: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-semibold uppercase tracking-wider"
                        style={{ color: T.stone400 }}>Insumo</label>
                      <select
                        className="p-3 rounded-xl border text-[14px] font-medium bg-white outline-none transition-all duration-150"
                        style={{ borderColor: T.stone200, color: T.ink }}
                        value={novoLancamento.produto}
                        onChange={e => setNovoLancamento({ ...novoLancamento, produto: e.target.value })}>
                        <option value="">Selecione...</option>
                        {produtos.map((p: any) => <option key={p.id}>{p.nome}</option>)}
                      </select>
                    </div>
                  )}

                  {!novoLancamento.modoManual && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-semibold uppercase tracking-wider"
                        style={{ color: T.stone400 }}>Qtd</label>
                      <input
                        type="text" placeholder="0"
                        className="p-3 rounded-xl border text-[14px] font-medium outline-none transition-all duration-150"
                        style={{ borderColor: T.stone200, color: T.ink }}
                        value={novoLancamento.quantidade}
                        onChange={e => setNovoLancamento({ ...novoLancamento, quantidade: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-semibold uppercase tracking-wider"
                      style={{ color: T.stone400 }}>
                      {novoLancamento.modoManual ? 'Valor (R$)' : 'Motivo'}
                    </label>
                    {novoLancamento.modoManual ? (
                      <input
                        type="text" placeholder="0,00"
                        className="p-3 rounded-xl border text-[14px] font-medium outline-none transition-all duration-150"
                        style={{ borderColor: T.stone200, color: T.ink, backgroundColor: T.paper2 }}
                        value={novoLancamento.valorTotal}
                        onChange={e => setNovoLancamento({ ...novoLancamento, valorTotal: e.target.value })}
                      />
                    ) : (
                      <select
                        className="p-3 rounded-xl border text-[14px] font-medium bg-white outline-none transition-all duration-150"
                        style={{ borderColor: T.stone200, color: T.ink }}
                        value={novoLancamento.motivo}
                        onChange={e => setNovoLancamento({ ...novoLancamento, motivo: e.target.value })}>
                        <option value="Quebra/Desperdício">Quebra/Desperdício</option>
                        <option value="Alimentação Funcionário">Alimentação Funcionário</option>
                        <option value="Retirada Sócio">Retirada Sócio</option>
                      </select>
                    )}
                  </div>

                  <button
                    onClick={handleSalvarSaida}
                    className="p-3 rounded-xl font-semibold text-[14px] flex justify-center items-center gap-2 transition-all duration-150 active:scale-[0.98]"
                    style={{ backgroundColor: T.ink, color: T.paper }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.ink2)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = T.ink)}>
                    <MinusCircle size={16} strokeWidth={1.5} /> Deduzir do CMV
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.stone200}` }}>
                    <th className="pb-3 text-left text-[12px] font-semibold uppercase"
                      style={{ color: T.stone400, letterSpacing: '0.08em' }}>Lançamento</th>
                    <th className="pb-3 text-left text-[12px] font-semibold uppercase"
                      style={{ color: T.stone400, letterSpacing: '0.08em' }}>Motivo</th>
                    <th className="pb-3 text-right text-[12px] font-semibold uppercase"
                      style={{ color: T.stone400, letterSpacing: '0.08em' }}>Abate (R$)</th>
                    {!isReadOnly && <th className="pb-3" />}
                  </tr>
                </thead>
                <tbody>
                  {data.saidas.map((s: any) => (
                    <tr key={s.id} className="group transition-colors"
                      style={{ borderBottom: `1px solid ${T.stone200}` }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.paper2)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <td className="py-3.5 text-[14px] font-medium" style={{ color: T.ink }}>{s.descricaoManual || s.produto}</td>
                      <td className="py-3.5 text-[14px] italic" style={{ color: T.stone500 }}>{s.motivo}</td>
                      <td className="py-3.5 text-right text-[14px] font-semibold tabular-nums" style={{ color: T.negative }}>{formatBRL(s.valorTotal)}</td>
                      {!isReadOnly && (
                        <td className="py-3.5 text-right">
                          {pendingDel?.id === s.id && pendingDel?.tabela === 'saidas_avulsas' ? (
                            <div className="flex justify-end items-center gap-1.5">
                              <button
                                onClick={() => { handleExcluir(s.id, 'saidas_avulsas'); setPendingDel(null) }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                                style={{ background: T.negSoft, color: T.negative }}>
                                Excluir
                              </button>
                              <button onClick={() => setPendingDel(null)}
                                className="p-1.5 rounded-lg transition-all"
                                style={{ color: T.stone400 }}
                                onMouseEnter={e => { e.currentTarget.style.color = T.ink }}
                                onMouseLeave={e => { e.currentTarget.style.color = T.stone400 }}>
                                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setPendingDel({ id: s.id, tabela: 'saidas_avulsas' })}
                              className="p-1.5 rounded-lg border transition-all opacity-0 group-hover:opacity-100"
                              style={{ color: T.stone400, borderColor: T.stone200 }}
                              onMouseEnter={e => { e.currentTarget.style.color = T.negative; e.currentTarget.style.backgroundColor = T.negSoft }}
                              onMouseLeave={e => { e.currentTarget.style.color = T.stone400; e.currentTarget.style.backgroundColor = 'transparent' }}>
                              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ABA CONTAGEM INICIAL / FINAL ── */}
        {(aba === "inicial" || aba === "final") && (
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4"
              style={{ borderBottom: `1px solid ${T.stone200}` }}>
              <div>
                <p className="text-[12px] font-semibold uppercase mb-0.5"
                  style={{ color: T.stone400, letterSpacing: '0.10em' }}>
                  {aba === "inicial" ? "Abertura de Ciclo" : "Fechamento de Ciclo"}
                </p>
                <h3 className="text-[20px] font-serif" style={{ color: T.ink }}>
                  Contagem {aba === "inicial" ? "Inicial" : "Final"}
                </h3>
              </div>
              {aba === "inicial" && !isReadOnly && (
                <button
                  onClick={handlePuxarAnterior}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[14px] font-medium transition-all duration-150"
                  style={{ borderColor: T.stone200, color: T.ink, backgroundColor: 'white' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = T.paper2}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                  <ArrowDownToLine className="w-4 h-4" strokeWidth={1.5} /> Puxar anterior
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {produtos.map((p: any) => {
                const precoAplicado = aba === "final"
                  ? getPrecoFinalAplicado(p.id, p.nome)
                  : parseFloat(contagem[p.id]?.valor || "0")

                return (
                  <div key={p.id} className="p-4 border rounded-xl transition-colors"
                    style={{
                      borderColor: T.stone200,
                      backgroundColor: isReadOnly ? T.paper2 : 'white',
                      opacity: isReadOnly ? 0.75 : 1,
                    }}>
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[14px] font-medium" style={{ color: T.ink }}>{p.nome}</p>
                      <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: T.stone100, color: T.stone500 }}>{p.unidade}</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[12px] font-semibold uppercase block mb-1"
                          style={{ color: T.stone400 }}>Qtd Real</label>
                        <input
                          type="text" disabled={isReadOnly}
                          className="w-full p-2 border rounded-lg text-[14px] font-medium outline-none transition-all duration-150"
                          style={{ borderColor: T.stone200, color: T.ink, backgroundColor: isReadOnly ? T.paper2 : 'white' }}
                          value={contagem[p.id]?.qtd || ""}
                          onChange={e => setContagem({ ...contagem, [p.id]: { ...contagem[p.id], qtd: e.target.value } })}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[12px] font-semibold uppercase block mb-1 flex items-center gap-1"
                          style={{ color: T.stone400 }}>
                          {aba === "inicial" ? "R$ Unit." : <><Lock className="w-3 h-3" strokeWidth={2} /> Aplicado</>}
                        </label>
                        {aba === "inicial" ? (
                          <input
                            type="text" disabled={isReadOnly}
                            className="w-full p-2 border rounded-lg text-[14px] font-medium outline-none transition-all duration-150"
                            style={{ borderColor: T.stone200, color: T.ink, backgroundColor: isReadOnly ? T.paper2 : 'white' }}
                            value={contagem[p.id]?.valor || ""}
                            onChange={e => setContagem({ ...contagem, [p.id]: { ...contagem[p.id], valor: e.target.value } })}
                          />
                        ) : (
                          <input
                            type="text" disabled readOnly
                            className="w-full p-2 border rounded-lg text-[14px] font-medium cursor-not-allowed"
                            style={{ borderColor: T.stone200, color: T.stone500, backgroundColor: T.paper2 }}
                            value={formatBRL(precoAplicado)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── ABA FATURAMENTO ── */}
        {aba === "faturamento" && (
          <div className="py-8 flex flex-col items-start gap-6 max-w-sm">
            <div>
              <p className="text-[12px] font-semibold uppercase mb-1"
                style={{ color: T.stone400, letterSpacing: '0.10em' }}>Receita do período</p>
              <h3 className="text-[22px] font-serif" style={{ color: T.ink }}>Faturamento Bruto</h3>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[18px] font-light"
                style={{ color: T.stone400 }}>R$</span>
              <input
                type="text" disabled={isReadOnly}
                value={faturamento}
                onChange={e => setFaturamento(e.target.value)}
                className="pl-14 pr-5 py-4 text-[28px] font-light font-serif border rounded-xl outline-none transition-all duration-150"
                style={{ borderColor: T.stone200, color: T.ink, backgroundColor: isReadOnly ? T.paper2 : 'white', minWidth: 260 }}
                placeholder="0.00"
              />
            </div>

            {!isReadOnly && (
              <button
                onClick={handleSalvarFaturamento}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-all duration-150 active:scale-[0.97]"
                style={{ backgroundColor: T.ink, color: T.paper }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = T.ink2}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = T.ink}>
                <Save className="w-4 h-4" strokeWidth={1.5} /> Salvar Faturamento
              </button>
            )}
          </div>
        )}

        {/* ── ABA LOTES ── */}
        {aba === "lotes" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4"
              style={{ borderBottom: `1px solid ${T.stone200}` }}>
              <div>
                <p className="text-[12px] font-semibold uppercase mb-0.5"
                  style={{ color: T.stone400, letterSpacing: '0.10em' }}>Rastreabilidade</p>
                <h3 className="text-[20px] font-serif" style={{ color: T.ink }}>Lotes Ativos (FEFO)</h3>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { label: ">30d",          style: { backgroundColor: T.posSoft,  color: T.positive } },
                  { label: "7–30d",         style: { backgroundColor: T.warnSoft, color: T.warning  } },
                  { label: "<7d / Vencido", style: { backgroundColor: T.negSoft,  color: T.negative } },
                ].map(leg => (
                  <span key={leg.label} className="px-2 py-0.5 rounded-md text-[12px] font-semibold"
                    style={leg.style}>{leg.label}</span>
                ))}
              </div>
            </div>

            {carregandoLotes ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: `${T.stone300} ${T.stone300} ${T.stone300} transparent` }} />
              </div>
            ) : lotes.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center gap-2">
                <span className="text-[48px] font-light font-serif leading-none select-none"
                  style={{ color: T.stone200 }}>+</span>
                <p className="text-[14px] font-medium mt-2" style={{ color: T.stone400 }}>
                  Nenhum lote ativo encontrado.
                </p>
                <p className="text-[12px]" style={{ color: T.stone300 }}>
                  Lotes são criados ao lançar compras.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.stone200}` }}>
                      {["Insumo", "Local", "Qtd Atual", "Custo Unit.", "Entrada", "Validade"].map((h, i) => (
                        <th key={h}
                          className={`pb-3 text-[12px] font-semibold uppercase ${i >= 2 ? (i === 2 ? 'text-center' : 'text-right') : 'text-left'}`}
                          style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lotes.map((lote: any) => {
                      const dias = diasParaVencer(lote.data_validade)
                      const cor = corLote(dias)
                      return (
                        <tr key={lote.id} className="transition-colors"
                          style={{ borderBottom: `1px solid ${T.stone200}` }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.paper2)}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                          <td className="py-3.5 text-[14px] font-medium" style={{ color: T.ink }}>
                            {lote.produto?.nome || "—"}
                            <span className="ml-2 text-[12px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: T.stone100, color: T.stone500 }}>
                              {lote.produto?.unidade}
                            </span>
                          </td>
                          <td className="py-3.5">
                            {lote.local ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-medium"
                                style={{ backgroundColor: T.stone100, color: T.stone600 }}>
                                {iconeLocal(lote.local.tipo)} {lote.local.nome}
                              </span>
                            ) : (
                              <span style={{ color: T.stone300 }}>—</span>
                            )}
                          </td>
                          <td className="py-3.5 text-center text-[14px] font-semibold tabular-nums" style={{ color: T.ink }}>
                            {Number(lote.quantidade_atual).toFixed(2).replace(/\.?0+$/, '')}
                          </td>
                          <td className="py-3.5 text-right text-[14px] font-semibold tabular-nums" style={{ color: T.ink }}>
                            {formatBRL(lote.custo_unitario)}
                          </td>
                          <td className="py-3.5 text-right text-[14px]" style={{ color: T.stone500 }}>
                            <span className="flex items-center justify-end gap-1">
                              <Clock className="w-3 h-3" strokeWidth={1.5} />
                              {new Date(lote.data_entrada + "T12:00:00").toLocaleDateString('pt-BR')}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            {lote.data_validade ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-semibold"
                                style={cor.chipStyle}>
                                {dias !== null && dias <= 7 && <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />}
                                {new Date(lote.data_validade + "T12:00:00").toLocaleDateString('pt-BR')}
                                {" · "}{cor.texto}
                              </span>
                            ) : (
                              <span className="text-[12px]" style={{ color: T.stone300 }}>Sem validade</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botão flutuante SALVAR CONTAGEM */}
      {!isReadOnly && (aba === "inicial" || aba === "final") && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[248px] p-5 z-30"
          style={{ backgroundColor: 'rgba(251,250,247,0.92)', backdropFilter: 'blur(8px)', borderTop: `1px solid ${T.stone200}` }}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-2xl mx-auto">
            <button
              onClick={handleSalvarContagem}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-[14px] font-semibold transition-all duration-150 active:scale-[0.97]"
              style={{ backgroundColor: T.ink, color: T.paper }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = T.ink2}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = T.ink}>
              <Save size={16} strokeWidth={1.5} />
              Salvar Contagem {aba === "inicial" ? "Inicial" : "Final"}
            </button>
            {aba === "final" && onSemanaFechada && (
              <button
                onClick={onSemanaFechada}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-semibold border transition-all duration-150 active:scale-[0.97]"
                style={{ borderColor: T.stone200, color: T.ink, backgroundColor: 'white' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = T.paper2}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                <CheckCircle2 size={16} strokeWidth={1.5} />
                Encerrar Ciclo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
