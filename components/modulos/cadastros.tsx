"use client"

import { useState } from "react"
import { Package, Plus, Search, Tag, Layers, Edit2, Trash2, X, Save, FolderTree, Beaker } from "lucide-react"
import { toast } from "react-hot-toast"
import { supabase } from "@/lib/supabase"
import { T } from "@/lib/design-tokens"

const UNIDADES_PADRAO = ["KG", "UN", "L", "G", "ML", "CX", "PCT", "DZ", "SC"]

export function Cadastros({ produtos, onRefresh, onPerfilRefresh, isReadOnly, perfil }: any) {
  const [aba, setAba] = useState<"insumos" | "categorias">("insumos")

  const categoriasEmpresa: string[] = perfil?.empresa?.categorias_produtos?.length
    ? perfil.empresa.categorias_produtos
    : [...new Set((produtos || []).map((p: any) => p.grupo).filter(Boolean))].sort() as string[]
  const unidadesEmpresa: string[] = perfil?.empresa?.unidades?.length
    ? perfil.empresa.unidades
    : UNIDADES_PADRAO

  const [nome, setNome] = useState("")
  const [unidade, setUnidade] = useState(unidadesEmpresa[0] || "KG")
  const [grupo, setGrupo] = useState("")
  const [producaoInterna, setProducaoInterna] = useState(false)
  const [busca, setBusca] = useState("")
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)

  const [novaCategoria, setNovaCategoria] = useState("")
  const [novaUnidade, setNovaUnidade] = useState("")
  const [salvandoListas, setSalvandoListas] = useState(false)
  const [categoriasEditadas, setCategoriasEditadas] = useState<string[]>(categoriasEmpresa)
  const [unidadesEditadas, setUnidadesEditadas] = useState<string[]>(unidadesEmpresa)

  const handleSalvarInsumo = async () => {
    if (isReadOnly) return toast.error("Período bloqueado!")
    if (!nome.trim()) return toast.error("Digite o nome do produto!")
    if (!grupo) return toast.error("Selecione a categoria do produto!")
    if (!perfil?.empresa_id) return toast.error("Sessão inválida. Recarregue a página.")

    setSalvando(true)
    const dados = { nome: nome.trim(), unidade, grupo, producao_interna: producaoInterna }

    const { error } = editandoId
      ? await supabase.from('produtos').update(dados).eq('id', editandoId)
      : await supabase.from('produtos').insert([{ ...dados, empresa_id: perfil.empresa_id }])

    setSalvando(false)
    if (error) return toast.error("Erro ao salvar produto.")

    toast.success(editandoId ? "Produto atualizado!" : "Produto cadastrado!")
    setNome(""); setGrupo(""); setProducaoInterna(false); setEditandoId(null)
    onRefresh()
  }

  const iniciarEdicao = (p: any) => {
    setEditandoId(p.id)
    setNome(p.nome)
    setUnidade(p.unidade)
    setGrupo(p.grupo || "")
    setProducaoInterna(p.producao_interna)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setNome(""); setGrupo(""); setProducaoInterna(false)
  }

  const handleExcluirProduto = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) return toast.error("Erro ao excluir produto.")
    toast.success("Produto removido!")
    onRefresh()
  }

  const handleSalvarListas = async () => {
    if (!perfil?.empresa_id) return toast.error("Sessão inválida.")
    setSalvandoListas(true)
    const { error } = await supabase.from('empresas').update({
      categorias_produtos: categoriasEditadas,
      unidades: unidadesEditadas
    }).eq('id', perfil.empresa_id)
    setSalvandoListas(false)
    if (error) return toast.error("Erro ao salvar.")
    toast.success("Listas salvas!")
    onPerfilRefresh?.()
  }

  const adicionarCategoria = () => {
    const v = novaCategoria.trim()
    if (!v) return toast.error("Digite o nome da categoria!")
    if (categoriasEditadas.includes(v)) return toast.error("Categoria já existe!")
    setCategoriasEditadas([...categoriasEditadas, v])
    setNovaCategoria("")
  }

  const adicionarUnidade = () => {
    const v = novaUnidade.trim().toUpperCase()
    if (!v) return toast.error("Digite a sigla da unidade!")
    if (unidadesEditadas.includes(v)) return toast.error("Unidade já existe!")
    setUnidadesEditadas([...unidadesEditadas, v])
    setNovaUnidade("")
  }

  const produtosFiltrados = (produtos || []).filter((p: any) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6 font-sans pb-10">

      {/* Eyebrow + título */}
      <div>
        <p className="text-[12px] font-semibold uppercase mb-1" style={{ color: T.stone400, letterSpacing: '0.10em' }}>
          Operacional
        </p>
        <h1 className="text-[28px] font-light font-serif" style={{ color: T.ink }}>
          Base de Insumos
        </h1>
      </div>

      {/* Underline tabs */}
      <div className="flex border-b" style={{ borderColor: T.stone200 }}>
        {[
          { id: "insumos", label: "Insumos", icon: <Layers className="w-3.5 h-3.5" /> },
          { id: "categorias", label: "Categorias & Unidades", icon: <FolderTree className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setAba(t.id as any)
              if (t.id === "categorias") { setCategoriasEditadas(categoriasEmpresa); setUnidadesEditadas(unidadesEmpresa) }
            }}
            className="relative flex items-center gap-2 px-5 py-3 text-[14px] font-semibold transition-colors whitespace-nowrap"
            style={{ color: aba === t.id ? T.ink : T.stone500 }}
          >
            {t.icon}
            {t.label}
            {aba === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: T.ink }} />
            )}
          </button>
        ))}
      </div>

      {aba === "insumos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">

          {/* Formulário */}
          <div
            className="bg-white p-6 rounded-xl h-fit sticky top-6"
            style={{ border: `1px solid ${editandoId ? T.ink : T.stone200}` }}
          >
            <h3 className="font-semibold text-base mb-5 flex items-center gap-2" style={{ color: T.ink }}>
              {editandoId ? <Edit2 className="w-4 h-4" style={{ color: T.margem }} /> : <Plus className="w-4 h-4" style={{ color: T.margem }} />}
              {editandoId ? "Editar Produto" : "Adicionar Novo"}
            </h3>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Nome</label>
                <input
                  type="text" value={nome} onChange={e => setNome(e.target.value)}
                  className="w-full p-3.5 rounded-xl outline-none text-sm font-medium transition-colors"
                  style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                  placeholder="Ex: Queijo Mussarela"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Unidade</label>
                  <select
                    value={unidade} onChange={e => setUnidade(e.target.value)}
                    className="w-full p-3.5 rounded-xl outline-none text-sm font-medium"
                    style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                  >
                    {unidadesEmpresa.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Categoria</label>
                  {categoriasEmpresa.length === 0 ? (
                    <div className="w-full p-3.5 rounded-xl text-xs text-center font-medium" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309' }}>
                      Crie categorias na aba ao lado
                    </div>
                  ) : (
                    <select
                      value={grupo} onChange={e => setGrupo(e.target.value)}
                      className="w-full p-3.5 rounded-xl outline-none text-sm font-medium"
                      style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                    >
                      <option value="">Selecione...</option>
                      {categoriasEmpresa.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <label
                className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-colors"
                style={{ border: `1px solid ${T.stone200}`, background: T.paper2 }}
              >
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={producaoInterna}
                  onChange={e => setProducaoInterna(e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                  style={{ accentColor: T.margem }}
                />
                <div>
                  <p className="font-semibold text-sm flex items-center gap-2" style={{ color: T.ink }}>
                    Fabricado na Loja <Beaker className="w-4 h-4" style={{ color: T.margem }} />
                  </p>
                  <p className="text-[12px] font-medium mt-0.5" style={{ color: T.stone400 }}>Não gera custo duplo no CMV.</p>
                </div>
              </label>

              <div className="flex gap-2">
                {editandoId && (
                  <button
                    onClick={cancelarEdicao}
                    className="flex-1 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                    style={{ background: T.paper2, color: T.stone600, border: `1px solid ${T.stone200}` }}
                  >
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                )}
                <button
                  onClick={handleSalvarInsumo}
                  disabled={isReadOnly || salvando}
                  className="flex-[2] py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: T.ink, color: T.paper }}
                  onMouseEnter={e => !isReadOnly && !salvando && ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                >
                  {editandoId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editandoId ? "Salvar Alteração" : "Cadastrar"}
                </button>
              </div>
            </div>
          </div>

          {/* Lista de insumos */}
          <div
            className="lg:col-span-2 bg-white rounded-xl overflow-hidden flex flex-col h-[600px]"
            style={{ border: `1px solid ${T.stone200}` }}
          >
            <div className="p-5 border-b flex justify-between items-center gap-4" style={{ borderColor: T.stone200, background: T.paper2 }}>
              <p className="font-semibold text-sm" style={{ color: T.ink }}>Insumos Cadastrados</p>
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.stone400 }} />
                <input
                  type="text" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm font-medium outline-none transition-colors"
                  style={{ background: 'white', border: `1px solid ${T.stone200}`, color: T.ink }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-white z-10">
                  <tr style={{ borderBottom: `1px solid ${T.stone200}` }}>
                    <th className="py-3.5 px-5 text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Produto</th>
                    <th className="py-3.5 px-5 text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Categoria</th>
                    <th className="py-3.5 px-5 text-[12px] font-semibold uppercase text-center" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Unidade</th>
                    <th className="py-3.5 px-5 text-[12px] font-semibold uppercase text-right" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados.length === 0 ? (
                    <tr><td colSpan={4} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[64px] font-light font-serif leading-none select-none plus-watermark" style={{ color: T.stone200 }}>+</span>
                        <p className="font-semibold text-sm mt-2" style={{ color: T.stone400 }}>Nenhum produto cadastrado.</p>
                        <p className="text-xs" style={{ color: T.stone300 }}>Crie o primeiro insumo usando o formulário ao lado.</p>
                      </div>
                    </td></tr>
                  ) : produtosFiltrados.map((p: any) => (
                    <tr
                      key={p.id}
                      className="transition-colors group"
                      style={{ borderBottom: `1px solid ${T.stone200}` }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.paper2}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td className="py-4 px-5 font-medium" style={{ color: T.ink }}>
                        {p.nome}
                        {p.producao_interna && (
                          <span className="ml-2 text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: T.margemSoft, color: T.margem }}>
                            Fabricado
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-2 py-1 rounded-md text-[12px] font-semibold uppercase" style={{ background: T.paper2, color: T.stone500 }}>
                          {p.grupo}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center font-semibold" style={{ color: T.stone400 }}>{p.unidade}</td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => iniciarEdicao(p)} className="p-2 rounded-lg transition-colors" style={{ color: T.margem }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.margemSoft} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleExcluirProduto(p.id)} className="p-2 rounded-lg transition-colors text-red-600" onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {aba === "categorias" && (
        <div className="space-y-6 animate-in fade-in duration-300">

          <div className="flex justify-end">
            <button
              onClick={handleSalvarListas}
              disabled={salvandoListas}
              className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-60"
              style={{ background: T.ink, color: T.paper }}
              onMouseEnter={e => !salvandoListas && ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              <Save className="w-4 h-4" /> {salvandoListas ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Categorias */}
            <div className="bg-white p-6 rounded-xl space-y-5" style={{ border: `1px solid ${T.stone200}` }}>
              <div className="pb-4" style={{ borderBottom: `1px solid ${T.stone200}` }}>
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4" style={{ color: T.margem }} />
                  <p className="font-semibold" style={{ color: T.ink }}>Categorias de Produto</p>
                </div>
                <p className="text-sm font-medium mt-1" style={{ color: T.stone400 }}>Cada insumo será associado a uma dessas categorias no cadastro.</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={novaCategoria}
                  onChange={e => setNovaCategoria(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarCategoria()}
                  placeholder="Ex: Carnes, Laticínios, Bebidas..."
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-sm outline-none transition-colors"
                  style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                />
                <button
                  onClick={adicionarCategoria}
                  className="px-4 py-3 rounded-xl font-semibold transition-all"
                  style={{ background: T.ink, color: T.paper }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {categoriasEditadas.length === 0 ? (
                  <p className="text-sm font-medium italic text-center py-6" style={{ color: T.stone400 }}>Nenhuma categoria. Adicione a primeira!</p>
                ) : categoriasEditadas.map(cat => (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-3 rounded-xl group"
                    style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}
                  >
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4" style={{ color: T.stone400 }} />
                      <span className="font-medium text-sm" style={{ color: T.ink }}>{cat}</span>
                      <span className="text-[12px] font-semibold" style={{ color: T.stone400 }}>
                        {(produtos || []).filter((p: any) => p.grupo === cat).length} insumos
                      </span>
                    </div>
                    <button
                      onClick={() => setCategoriasEditadas(categoriasEditadas.filter(c => c !== cat))}
                      className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 text-red-500"
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Unidades */}
            <div className="bg-white p-6 rounded-xl space-y-5" style={{ border: `1px solid ${T.stone200}` }}>
              <div className="pb-4" style={{ borderBottom: `1px solid ${T.stone200}` }}>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" style={{ color: T.margem }} />
                  <p className="font-semibold" style={{ color: T.ink }}>Unidades de Medida</p>
                </div>
                <p className="text-sm font-medium mt-1" style={{ color: T.stone400 }}>Siglas disponíveis para selecionar ao cadastrar um insumo.</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={novaUnidade}
                  onChange={e => setNovaUnidade(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && adicionarUnidade()}
                  placeholder="Ex: FD, LT, GL..."
                  maxLength={6}
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-sm outline-none uppercase transition-colors"
                  style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                />
                <button
                  onClick={adicionarUnidade}
                  className="px-4 py-3 rounded-xl font-semibold transition-all"
                  style={{ background: T.ink, color: T.paper }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto">
                {unidadesEditadas.length === 0 ? (
                  <p className="text-sm font-medium italic py-6" style={{ color: T.stone400 }}>Nenhuma unidade.</p>
                ) : unidadesEditadas.map(un => (
                  <span
                    key={un}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-sm group"
                    style={{ background: T.paper2, color: T.stone600, border: `1px solid ${T.stone200}` }}
                  >
                    {un}
                    <button
                      onClick={() => setUnidadesEditadas(unidadesEditadas.filter(u => u !== un))}
                      className="transition-colors opacity-0 group-hover:opacity-100 text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl" style={{ background: T.margemSoft, border: `1px solid ${T.stone200}` }}>
            <p className="text-sm font-medium leading-relaxed" style={{ color: T.stone600 }}>
              <strong style={{ color: T.ink }}>Importante:</strong> Remover uma categoria ou unidade que já está em uso nos produtos não apaga os dados existentes — apenas deixa de aparecer como opção nas próximas criações. Clique em <strong>Salvar Alterações</strong> para aplicar as mudanças.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
