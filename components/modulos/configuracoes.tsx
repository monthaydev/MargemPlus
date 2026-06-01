"use client"

import { useState, useEffect } from "react"
import {
  Settings, Save, Store, Target, KeyRound, ShieldCheck, Users, UserCog,
  Plus, X, Edit2, Trash2, Copy, RefreshCw, Lock, CheckCircle2,
  UserX, UserCheck, Mail, Clock, Palette, Image as ImageIcon, Check,
  Tag, Percent, ShieldAlert, Unlock, Sparkles
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"
import { formatPerc } from "@/lib/utils"
import { MODULOS, PERMISSOES_PADRAO, gerarCodigoConvite, type Permissoes, type NivelPermissao } from "@/lib/permissoes"
import { T } from "@/lib/design-tokens"
import { LISTA_CORES, getCorMarca, aplicarCorMarca } from "@/lib/cores"

type Cargo = {
  id: string; empresa_id: string; nome: string
  permissoes: Partial<Permissoes>; codigo_convite: string | null
}
type Membro = {
  id: string; nome_completo: string; cargo: string | null
  role: string; ativo: boolean; cargo_id: string | null; ultimo_acesso: string | null
}
type CanalVenda = {
  id: string; empresa_id: string; nome: string; taxa_pct: number; ativo: boolean
}

export function Configuracoes({ perfil, onRefresh, isDark, onThemeChange }: any) {
  const [aba, setAba] = useState<"empresa" | "canais" | "equipe" | "personalizacao" | "senha">("empresa")

  const [nomeEmpresa, setNomeEmpresa] = useState(perfil?.empresa?.nome || "")
  const [metaCMV, setMetaCMV] = useState(String(perfil?.empresa?.meta_cmv || 35))
  const [salvando, setSalvando] = useState(false)

  const [logoUrl, setLogoUrl] = useState<string>(perfil?.empresa?.logo_url || "")
  const [salvandoLogo, setSalvandoLogo] = useState(false)

  const [senhaAtual, setSenhaAtual] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [trocandoSenha, setTrocandoSenha] = useState(false)

  const [novoPin, setNovoPin] = useState("")
  const [confirmarPin, setConfirmarPin] = useState("")
  const [salvandoPin, setSalvandoPin] = useState(false)
  const pinJaCadastrado = !!(perfil?.empresa?.pin_configurado)

  const [impostoDefault, setImpostoDefault] = useState(String(perfil?.empresa?.imposto_padrao_pct ?? 0))
  const [diasAlerta, setDiasAlerta] = useState(String(perfil?.empresa?.dias_alerta_lote ?? 7))

  const [cargos, setCargos] = useState<Cargo[]>([])
  const [membros, setMembros] = useState<Membro[]>([])
  const [carregandoEquipe, setCarregandoEquipe] = useState(true)
  const [editandoCargo, setEditandoCargo] = useState<Cargo | null>(null)
  const [novoCargoNome, setNovoCargoNome] = useState("")
  const [novoCargoPerm, setNovoCargoPerm] = useState<Permissoes>(PERMISSOES_PADRAO)
  const [salvandoCargo, setSalvandoCargo] = useState(false)
  const [criandoCargo, setCriandoCargo] = useState(false)

  const [canais, setCanais] = useState<CanalVenda[]>([])
  const [carregandoCanais, setCarregandoCanais] = useState(false)
  const [novoCanal, setNovoCanal] = useState({ nome: "", taxa_pct: "" })
  const [editandoCanal, setEditandoCanal] = useState<CanalVenda | null>(null)
  const [salvandoCanal, setSalvandoCanal] = useState(false)

  const [salvandoCor, setSalvandoCor] = useState(false)
  const corAtual = perfil?.empresa?.cor_principal || "petroleo"

  useEffect(() => {
    setNomeEmpresa(perfil?.empresa?.nome || "")
    setMetaCMV(String(perfil?.empresa?.meta_cmv || 35))
    setLogoUrl(perfil?.empresa?.logo_url || "")
    setImpostoDefault(String(perfil?.empresa?.imposto_padrao_pct ?? 0))
    setDiasAlerta(String(perfil?.empresa?.dias_alerta_lote ?? 7))
  }, [perfil])

  useEffect(() => {
    if (aba === "equipe" && perfil?.empresa_id) carregarEquipe()
    if (aba === "canais" && perfil?.empresa_id) carregarCanais()
  }, [aba, perfil?.empresa_id])

  const carregarEquipe = async () => {
    setCarregandoEquipe(true)
    const [cargosResp, membrosResp] = await Promise.all([
      supabase.from('cargos').select('*').eq('empresa_id', perfil.empresa_id).order('created_at', { ascending: true }),
      supabase.from('perfis').select('id, nome_completo, cargo, role, ativo, cargo_id, ultimo_acesso').eq('empresa_id', perfil.empresa_id).order('nome_completo', { ascending: true })
    ])
    setCargos(cargosResp.data || [])
    setMembros(membrosResp.data || [])
    setCarregandoEquipe(false)
  }

  const carregarCanais = async () => {
    setCarregandoCanais(true)
    const { data } = await supabase.from('canais_venda').select('*').eq('empresa_id', perfil.empresa_id).order('created_at', { ascending: true })
    setCanais(data || [])
    setCarregandoCanais(false)
  }

  const handleSalvarEmpresa = async () => {
    if (!nomeEmpresa.trim()) return toast.error("O nome do restaurante não pode ficar vazio.")
    const meta = parseFloat(metaCMV.replace(',', '.'))
    if (isNaN(meta) || meta <= 0 || meta > 100) return toast.error("Meta de CMV inválida (deve ser entre 0 e 100).")
    const imposto = parseFloat(impostoDefault.replace(',', '.'))
    if (isNaN(imposto) || imposto < 0 || imposto > 100) return toast.error("Alíquota fiscal inválida (0–100%).")
    const diasAlt = parseInt(diasAlerta)
    if (isNaN(diasAlt) || diasAlt < 1) return toast.error("Dias de alerta inválido.")
    setSalvando(true)
    const { error } = await supabase.from('empresas').update({
      nome: nomeEmpresa.trim(),
      meta_cmv: meta,
      imposto_padrao_pct: imposto,
      dias_alerta_lote: diasAlt,
    }).eq('id', perfil.empresa_id)
    setSalvando(false)
    if (error) return toast.error("Erro ao salvar: " + error.message)
    toast.success("Configurações salvas!")
    onRefresh?.()
  }

  const handleSalvarPin = async () => {
    if (!novoPin) return toast.error("Digite o novo PIN.")
    if (novoPin.length < 4) return toast.error("PIN precisa de pelo menos 4 caracteres.")
    if (novoPin !== confirmarPin) return toast.error("Os PINs não coincidem.")
    setSalvandoPin(true)
    // O PIN é gravado como hash bcrypt no servidor (RPC) — nunca em texto plano.
    const { data: result, error } = await supabase.rpc('definir_pin_desbloqueio', { p_pin: novoPin })
    setSalvandoPin(false)
    if (error) return toast.error("Erro ao salvar PIN: " + error.message)
    if (!result?.ok) return toast.error(result?.erro || "Não foi possível salvar o PIN.")
    toast.success(pinJaCadastrado ? "PIN atualizado!" : "PIN de desbloqueio criado!")
    setNovoPin(""); setConfirmarPin("")
    onRefresh?.()
  }

  const handleRemoverPin = async () => {
    if (!confirm("Remover o PIN? O desbloqueio vai exigir a senha de login novamente.")) return
    const { data: result, error } = await supabase.rpc('remover_pin_desbloqueio')
    if (error) return toast.error("Erro: " + error.message)
    if (!result?.ok) return toast.error(result?.erro || "Não foi possível remover o PIN.")
    toast.success("PIN removido.")
    onRefresh?.()
  }

  const handleSalvarLogo = async () => {
    if (!perfil?.empresa_id) return toast.error("Sessão inválida.")
    setSalvandoLogo(true)
    const { error } = await supabase.from('empresas').update({ logo_url: logoUrl.trim() || null }).eq('id', perfil.empresa_id)
    setSalvandoLogo(false)
    if (error) return toast.error("Erro ao salvar: " + error.message)
    toast.success("Logo salvo!")
    onRefresh?.()
  }

  const handleSalvarCor = async (chave: string) => {
    if (chave === corAtual || salvandoCor) return
    setSalvandoCor(true)
    const { error } = await supabase.from('empresas').update({ cor_principal: chave }).eq('id', perfil.empresa_id)
    setSalvandoCor(false)
    if (error) return toast.error("Erro ao salvar identidade visual.")
    aplicarCorMarca(chave)
    onRefresh?.()
    toast.success(`Identidade visual aplicada: ${getCorMarca(chave).nome}`)
  }

  const handleTrocarSenha = async () => {
    if (!senhaAtual || !novaSenha) return toast.error("Preencha todos os campos.")
    if (novaSenha.length < 6) return toast.error("A nova senha precisa de no mínimo 6 caracteres.")
    if (novaSenha !== confirmarSenha) return toast.error("As senhas não coincidem.")
    setTrocandoSenha(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setTrocandoSenha(false); return toast.error("Sessão inválida.") }
    const { error: errLogin } = await supabase.auth.signInWithPassword({ email: user.email, password: senhaAtual })
    if (errLogin) { setTrocandoSenha(false); return toast.error("Senha atual incorreta.") }
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setTrocandoSenha(false)
    if (error) return toast.error("Erro ao atualizar senha: " + error.message)
    toast.success("Senha atualizada com sucesso!")
    setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("")
  }

  const iniciarNovoCargo = () => { setEditandoCargo(null); setNovoCargoNome(""); setNovoCargoPerm(PERMISSOES_PADRAO); setCriandoCargo(true) }
  const iniciarEdicaoCargo = (c: Cargo) => { setEditandoCargo(c); setNovoCargoNome(c.nome); setNovoCargoPerm({ ...PERMISSOES_PADRAO, ...c.permissoes } as Permissoes); setCriandoCargo(true) }
  const cancelarCargo = () => { setCriandoCargo(false); setEditandoCargo(null); setNovoCargoNome("") }

  const salvarCargo = async () => {
    if (!novoCargoNome.trim()) return toast.error("Dê um nome ao cargo.")
    setSalvandoCargo(true)
    if (editandoCargo) {
      const { error } = await supabase.from('cargos').update({ nome: novoCargoNome.trim(), permissoes: novoCargoPerm }).eq('id', editandoCargo.id)
      setSalvandoCargo(false)
      if (error) return toast.error("Erro ao salvar: " + error.message)
      toast.success("Cargo atualizado!")
    } else {
      const { error } = await supabase.from('cargos').insert([{ empresa_id: perfil.empresa_id, nome: novoCargoNome.trim(), permissoes: novoCargoPerm, codigo_convite: gerarCodigoConvite() }])
      setSalvandoCargo(false)
      if (error) return toast.error("Erro ao criar: " + error.message)
      toast.success("Cargo criado com código de convite!")
    }
    cancelarCargo(); carregarEquipe()
  }

  const excluirCargo = async (c: Cargo) => {
    const usados = membros.filter(m => m.cargo_id === c.id).length
    if (usados > 0) return toast.error(`Este cargo está em uso por ${usados} membro(s). Reatribua-os antes de excluir.`)
    if (!confirm(`Excluir o cargo "${c.nome}"?`)) return
    const { error } = await supabase.from('cargos').delete().eq('id', c.id)
    if (error) return toast.error("Erro ao excluir: " + error.message)
    toast.success("Cargo removido."); carregarEquipe()
  }

  const regenerarCodigo = async (c: Cargo) => {
    if (!confirm("Gerar um novo código vai invalidar o atual. Continuar?")) return
    const novo = gerarCodigoConvite()
    const { error } = await supabase.from('cargos').update({ codigo_convite: novo }).eq('id', c.id)
    if (error) return toast.error("Erro: " + error.message)
    toast.success("Novo código gerado!"); carregarEquipe()
  }

  const copiarCodigo = (codigo: string) => { navigator.clipboard.writeText(codigo); toast.success(`Código ${codigo} copiado!`) }

  const trocarCargoMembro = async (membroId: string, novoCargoId: string) => {
    const { error } = await supabase.from('perfis').update({ cargo_id: novoCargoId || null }).eq('id', membroId)
    if (error) return toast.error("Erro: " + error.message)
    toast.success("Cargo atualizado!"); carregarEquipe()
  }

  const alternarAtivacao = async (m: Membro) => {
    if (m.role === 'dono') return toast.error("Não é possível desativar um dono.")
    if (!confirm(`Tem certeza que deseja ${m.ativo ? "desativar" : "reativar"} o acesso de ${m.nome_completo}?`)) return
    const { error } = await supabase.from('perfis').update({ ativo: !m.ativo }).eq('id', m.id)
    if (error) return toast.error("Erro: " + error.message)
    toast.success(`Acesso ${m.ativo ? 'desativado' : 'reativado'}.`); carregarEquipe()
  }

  const salvarCanal = async () => {
    if (!novoCanal.nome.trim()) return toast.error("Informe o nome do canal.")
    const taxa = parseFloat(novoCanal.taxa_pct.replace(',', '.'))
    if (isNaN(taxa) || taxa < 0 || taxa > 100) return toast.error("Taxa inválida (0-100%).")
    setSalvandoCanal(true)

    if (editandoCanal) {
      const { error } = await supabase.from('canais_venda').update({ nome: novoCanal.nome.trim(), taxa_pct: taxa }).eq('id', editandoCanal.id)
      setSalvandoCanal(false)
      if (error) return toast.error("Erro: " + error.message)
      toast.success("Canal atualizado!")
    } else {
      const { error } = await supabase.from('canais_venda').insert([{ empresa_id: perfil.empresa_id, nome: novoCanal.nome.trim(), taxa_pct: taxa }])
      setSalvandoCanal(false)
      if (error) return toast.error("Erro: " + error.message)
      toast.success("Canal criado!")
    }

    setNovoCanal({ nome: "", taxa_pct: "" }); setEditandoCanal(null); carregarCanais()
  }

  const iniciarEdicaoCanal = (c: CanalVenda) => {
    setEditandoCanal(c); setNovoCanal({ nome: c.nome, taxa_pct: String(c.taxa_pct) })
  }

  const excluirCanal = async (c: CanalVenda) => {
    if (!confirm(`Excluir o canal "${c.nome}"?`)) return
    const { error } = await supabase.from('canais_venda').delete().eq('id', c.id)
    if (error) return toast.error("Erro: " + error.message)
    toast.success("Canal removido."); carregarCanais()
  }

  const alternarAtivoCanal = async (c: CanalVenda) => {
    const { error } = await supabase.from('canais_venda').update({ ativo: !c.ativo }).eq('id', c.id)
    if (error) return toast.error("Erro: " + error.message)
    carregarCanais()
  }

  const ABAS_CONFIG = [
    { id: "empresa", label: "Empresa", icon: <Store className="w-4 h-4" /> },
    { id: "canais", label: "Canais de Venda", icon: <Tag className="w-4 h-4" /> },
    { id: "equipe", label: "Equipe", icon: <Users className="w-4 h-4" /> },
    { id: "personalizacao", label: "Personalização", icon: <Palette className="w-4 h-4" /> },
    { id: "senha", label: "Segurança", icon: <ShieldCheck className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6 pb-10">

      {/* Eyebrow + título */}
      <div>
        <p className="text-[12px] font-semibold uppercase mb-1" style={{ color: T.stone400, letterSpacing: '0.10em' }}>Sistema</p>
        <h1 className="text-[28px] font-light font-serif" style={{ color: T.ink }}>Configurações</h1>
      </div>

      {/* Underline tabs */}
      <div className="flex overflow-x-auto border-b no-scrollbar" style={{ borderColor: T.stone200 }}>
        {ABAS_CONFIG.map(t => (
          <button
            key={t.id}
            onClick={() => setAba(t.id as any)}
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

      {/* ABA EMPRESA */}
      {aba === "empresa" && (
        <div className="bg-white p-8 rounded-xl space-y-6 animate-in fade-in duration-300" style={{ border: `1px solid ${T.stone200}` }}>
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: `1px solid ${T.stone200}` }}>
            <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: T.ink }}>
              <Store className="w-4 h-4" style={{ color: T.margem }} /> Identidade do Restaurante
            </h3>
            <button
              onClick={handleSalvarEmpresa}
              disabled={salvando}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-60"
              style={{ background: T.ink, color: T.paper }}
              onMouseEnter={e => !salvando && ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              <Save className="w-4 h-4" /> {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Nome do Restaurante</label>
              <input
                type="text" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)}
                className="w-full px-4 py-3 rounded-xl font-medium text-sm outline-none transition-colors"
                style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-semibold uppercase flex items-center gap-1" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                <Target className="w-3 h-3" style={{ color: '#B45309' }} /> Meta de CMV (%)
              </label>
              <div className="relative">
                <input
                  type="text" value={metaCMV} onChange={e => setMetaCMV(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl font-medium text-sm outline-none transition-colors"
                  style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-sm" style={{ color: T.stone400 }}>%</span>
              </div>
              <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>CMVs acima de {formatPerc(parseFloat(metaCMV) || 35)} serão destacados em vermelho no dashboard.</p>
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-semibold uppercase flex items-center gap-1" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                <Percent className="w-3 h-3" style={{ color: '#B45309' }} /> Alíquota Fiscal Padrão (%)
              </label>
              <div className="relative">
                <input
                  type="text" value={impostoDefault} onChange={e => setImpostoDefault(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 pr-12 rounded-xl font-medium text-sm outline-none transition-colors"
                  style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-sm" style={{ color: T.stone400 }}>%</span>
              </div>
              <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>Simples Nacional, ISS etc. Pré-preenche o campo Impostos% em novas Fichas Técnicas.</p>
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-semibold uppercase flex items-center gap-1" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                <Clock className="w-3 h-3" style={{ color: '#B45309' }} /> Alertar validade com antecedência
              </label>
              <select
                value={diasAlerta} onChange={e => setDiasAlerta(e.target.value)}
                className="w-full px-4 py-3 rounded-xl font-medium text-sm outline-none transition-colors"
                style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
              >
                <option value="3">3 dias antes</option>
                <option value="7">7 dias antes (padrão)</option>
                <option value="14">14 dias antes</option>
                <option value="30">30 dias antes</option>
              </select>
              <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>Lotes com validade dentro desse prazo aparecem em alerta no Dashboard e Estoque.</p>
            </div>
          </div>
        </div>
      )}

      {/* ABA CANAIS DE VENDA */}
      {aba === "canais" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-xl space-y-6" style={{ border: `1px solid ${T.stone200}` }}>
            <div className="pb-4" style={{ borderBottom: `1px solid ${T.stone200}` }}>
              <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: T.ink }}>
                <Tag className="w-4 h-4" style={{ color: T.margem }} /> Canais de Venda
              </h3>
              <p className="text-sm font-medium mt-0.5" style={{ color: T.stone400 }}>
                Defina as taxas de cada plataforma. Esses valores alimentam o Motor de Precificação das Fichas Técnicas.
              </p>
            </div>

            {/* Formulário canal */}
            <div
              className="p-5 rounded-xl space-y-4"
              style={{
                background: editandoCanal ? T.margemSoft : T.paper2,
                border: `1px solid ${editandoCanal ? T.margemMint : T.stone200}`
              }}
            >
              {editandoCanal && (
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase" style={{ color: T.margem, letterSpacing: '0.08em' }}>Editando canal</span>
                  <button
                    onClick={() => { setEditandoCanal(null); setNovoCanal({ nome: "", taxa_pct: "" }) }}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: T.margem }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.margemSoft}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Nome do Canal</label>
                  <input
                    type="text" placeholder="Ex: iFood, Rappi, Balcão, Cartão..."
                    value={novoCanal.nome} onChange={e => setNovoCanal({ ...novoCanal, nome: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl font-medium text-sm outline-none transition-colors"
                    style={{ background: 'white', border: `1px solid ${T.stone200}`, color: T.ink }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold uppercase flex items-center gap-1" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                    <Percent className="w-3 h-3" /> Taxa (%)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text" placeholder="0"
                        value={novoCanal.taxa_pct} onChange={e => setNovoCanal({ ...novoCanal, taxa_pct: e.target.value })}
                        className="w-full px-4 py-3 pr-10 rounded-xl font-medium text-sm outline-none transition-colors"
                        style={{ background: 'white', border: `1px solid ${T.stone200}`, color: T.ink }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-semibold text-sm" style={{ color: T.stone400 }}>%</span>
                    </div>
                    <button
                      onClick={salvarCanal} disabled={salvandoCanal}
                      className="px-4 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-60"
                      style={{ background: T.ink, color: T.paper }}
                      onMouseEnter={e => !salvandoCanal && ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                    >
                      <Save className="w-4 h-4" /> {editandoCanal ? "Salvar" : "Adicionar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista canais */}
            {carregandoCanais ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-7 h-7 border-4 border-t-transparent rounded-full" style={{ borderColor: T.margem, borderTopColor: 'transparent' }} />
              </div>
            ) : canais.length === 0 ? (
              <div className="text-center py-10" style={{ color: T.stone400 }}>
                <Tag className="w-12 h-12 mx-auto mb-3" style={{ color: T.stone200 }} />
                <p className="font-semibold">Nenhum canal cadastrado ainda.</p>
                <p className="text-xs font-medium">Adicione iFood, Rappi, Cartão etc. acima.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {canais.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all"
                    style={{
                      border: `1px solid ${c.ativo ? T.stone200 : T.stone200}`,
                      background: c.ativo ? 'white' : T.paper2,
                      opacity: c.ativo ? 1 : 0.6
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: T.margemSoft }}>
                      <Tag className="w-5 h-5" style={{ color: T.margem }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold" style={{ color: T.ink }}>{c.nome}</p>
                      <p className="text-xs font-medium" style={{ color: T.stone400 }}>Taxa: {c.taxa_pct}%</p>
                    </div>
                    <div
                      className="px-3 py-1.5 rounded-xl font-semibold text-sm"
                      style={c.taxa_pct === 0 ? { background: T.margemSoft, color: T.margem } : c.taxa_pct > 10 ? { background: '#FEE2E2', color: '#B91C1C' } : { background: '#FEF3C7', color: '#B45309' }}
                    >
                      {c.taxa_pct === 0 ? "Sem taxa" : `${c.taxa_pct}%`}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => iniciarEdicaoCanal(c)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: T.margem }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.margemSoft}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => alternarAtivoCanal(c)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: c.ativo ? '#B45309' : T.margem }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = c.ativo ? '#FEF3C7' : T.margemSoft}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        {c.ativo ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => excluirCanal(c)}
                        className="p-2 rounded-lg transition-colors text-red-500"
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 rounded-xl" style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}>
              <p className="text-sm font-medium" style={{ color: T.stone600 }}>
                <strong style={{ color: T.ink }}>Como funciona:</strong> os canais cadastrados aqui aparecem como opções no Motor de Precificação de cada Ficha Técnica. A taxa é usada para calcular o preço mínimo de venda de acordo com a margem desejada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ABA EQUIPE */}
      {aba === "equipe" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {carregandoEquipe ? (
            <div className="bg-white p-12 rounded-xl flex justify-center" style={{ border: `1px solid ${T.stone200}` }}>
              <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: T.margem, borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <>
              <div className="bg-white p-8 rounded-xl space-y-6" style={{ border: `1px solid ${T.stone200}` }}>
                <div className="flex items-center justify-between pb-4" style={{ borderBottom: `1px solid ${T.stone200}` }}>
                  <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: T.ink }}>
                    <UserCog className="w-4 h-4" style={{ color: T.margem }} /> Cargos & Permissões
                  </h3>
                  <button
                    onClick={iniciarNovoCargo}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
                    style={{ background: T.ink, color: T.paper }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                  >
                    <Plus className="w-4 h-4" /> Novo Cargo
                  </button>
                </div>

                {criandoCargo && (
                  <div className="rounded-xl p-6 space-y-5" style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold" style={{ color: T.ink }}>{editandoCargo ? "Editando cargo" : "Novo cargo"}</h4>
                      <button
                        onClick={cancelarCargo}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: T.stone400 }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.stone200}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Nome do Cargo</label>
                      <input
                        type="text" value={novoCargoNome} onChange={e => setNovoCargoNome(e.target.value)}
                        placeholder="Ex: Gerente, Cozinheiro, Caixa..."
                        className="w-full px-4 py-3 rounded-xl font-medium text-sm outline-none transition-colors"
                        style={{ background: 'white', border: `1px solid ${T.stone200}`, color: T.ink }}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Permissões</label>
                      <div className="bg-white rounded-xl overflow-hidden" style={{ border: `1px solid ${T.stone200}` }}>
                        <table className="w-full text-sm">
                          <thead style={{ background: T.paper2, borderBottom: `1px solid ${T.stone200}` }}>
                            <tr>
                              <th className="p-3 text-left text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Módulo</th>
                              <th className="p-3 text-center text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Bloqueado</th>
                              <th className="p-3 text-center text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Só Leitura</th>
                              <th className="p-3 text-center text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Acesso Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MODULOS.map(mod => {
                              const valor = novoCargoPerm[mod.chave]
                              if (mod.tipo === "boolean") {
                                return (
                                  <tr key={mod.chave} className="transition-colors" style={{ borderBottom: `1px solid ${T.stone200}` }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.paper2} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                    <td className="p-3 font-medium text-sm" style={{ color: T.ink }}>{mod.label}</td>
                                    <td className="p-3 text-center"><input type="radio" name={mod.chave} checked={!valor} onChange={() => setNovoCargoPerm({ ...novoCargoPerm, [mod.chave]: false })} className="w-4 h-4 accent-red-500" /></td>
                                    <td className="p-3 text-center" style={{ color: T.stone300 }}>—</td>
                                    <td className="p-3 text-center"><input type="radio" name={mod.chave} checked={!!valor} onChange={() => setNovoCargoPerm({ ...novoCargoPerm, [mod.chave]: true })} className="w-4 h-4" style={{ accentColor: T.margem } as any} /></td>
                                  </tr>
                                )
                              }
                              return (
                                <tr key={mod.chave} className="transition-colors" style={{ borderBottom: `1px solid ${T.stone200}` }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.paper2} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                  <td className="p-3 font-medium text-sm" style={{ color: T.ink }}>{mod.label}</td>
                                  <td className="p-3 text-center"><input type="radio" name={mod.chave} checked={valor === false} onChange={() => setNovoCargoPerm({ ...novoCargoPerm, [mod.chave]: false as NivelPermissao })} className="w-4 h-4 accent-red-500" /></td>
                                  <td className="p-3 text-center"><input type="radio" name={mod.chave} checked={valor === "ver"} onChange={() => setNovoCargoPerm({ ...novoCargoPerm, [mod.chave]: "ver" as NivelPermissao })} className="w-4 h-4 accent-amber-500" /></td>
                                  <td className="p-3 text-center"><input type="radio" name={mod.chave} checked={valor === "editar"} onChange={() => setNovoCargoPerm({ ...novoCargoPerm, [mod.chave]: "editar" as NivelPermissao })} className="w-4 h-4" style={{ accentColor: T.margem } as any} /></td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelarCargo}
                        className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                        style={{ color: T.stone600 }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.paper2}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >Cancelar</button>
                      <button
                        onClick={salvarCargo} disabled={salvandoCargo}
                        className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-60"
                        style={{ background: T.ink, color: T.paper }}
                        onMouseEnter={e => !salvandoCargo && ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                      >
                        <Save className="w-4 h-4" /> {salvandoCargo ? "Salvando..." : "Salvar Cargo"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {cargos.length === 0 && !criandoCargo ? (
                    <div className="text-center py-10" style={{ color: T.stone400 }}>
                      <UserCog className="w-12 h-12 mx-auto mb-3" style={{ color: T.stone200 }} />
                      <p className="font-semibold">Nenhum cargo criado ainda.</p>
                    </div>
                  ) : cargos.map(c => {
                    const totalAcesso = MODULOS.filter(m => { const v = (c.permissoes as any)[m.chave]; return v === "editar" || v === true }).length
                    return (
                      <div key={c.id} className="rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4" style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}>
                        <div className="flex-1">
                          <p className="font-semibold text-lg" style={{ color: T.ink }}>{c.nome}</p>
                          <p className="text-xs font-medium mt-0.5" style={{ color: T.stone400 }}>{totalAcesso} de {MODULOS.length} módulos com acesso total</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white p-2 px-3 rounded-xl" style={{ border: `1px solid ${T.stone200}` }}>
                          <Lock className="w-3.5 h-3.5" style={{ color: T.stone400 }} />
                          <code className="font-semibold text-sm tracking-widest" style={{ color: T.margem }}>{c.codigo_convite || "—"}</code>
                          {c.codigo_convite && (
                            <>
                              <button onClick={() => copiarCodigo(c.codigo_convite!)} title="Copiar" className="p-1 rounded transition-colors" onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.paper2} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}><Copy className="w-3.5 h-3.5" style={{ color: T.stone500 }} /></button>
                              <button onClick={() => regenerarCodigo(c)} title="Novo código" className="p-1 rounded transition-colors" onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.paper2} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}><RefreshCw className="w-3.5 h-3.5" style={{ color: T.stone500 }} /></button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => iniciarEdicaoCargo(c)} className="p-2 rounded-lg transition-colors" style={{ color: T.margem }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.margemSoft} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => excluirCargo(c)} className="p-2 rounded-lg transition-colors text-red-600" onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white p-8 rounded-xl space-y-6" style={{ border: `1px solid ${T.stone200}` }}>
                <div className="flex items-center justify-between pb-4" style={{ borderBottom: `1px solid ${T.stone200}` }}>
                  <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: T.ink }}>
                    <Users className="w-4 h-4" style={{ color: T.margem }} /> Membros da Equipe
                  </h3>
                  <span className="text-xs font-semibold" style={{ color: T.stone400 }}>{membros.length} {membros.length === 1 ? 'membro' : 'membros'}</span>
                </div>
                {membros.length === 0 ? (
                  <div className="text-center py-10" style={{ color: T.stone400 }}>
                    <Users className="w-12 h-12 mx-auto mb-3" style={{ color: T.stone200 }} />
                    <p className="font-semibold">Apenas você por enquanto.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead style={{ borderBottom: `1px solid ${T.stone200}` }}>
                        <tr>
                          <th className="p-3 text-left text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Nome</th>
                          <th className="p-3 text-left text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Cargo</th>
                          <th className="p-3 text-left text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Status</th>
                          <th className="p-3 text-left text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Último acesso</th>
                          <th className="p-3 text-right text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {membros.map(m => (
                          <tr
                            key={m.id}
                            className="transition-colors"
                            style={{ borderBottom: `1px solid ${T.stone200}` }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.paper2}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold" style={{ background: T.paper2, color: T.stone600 }}>
                                  {m.nome_completo?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                  <p className="font-semibold" style={{ color: T.ink }}>{m.nome_completo}</p>
                                  {m.role === 'dono' && <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase" style={{ color: '#B45309', background: '#FEF3C7' }}>Dono</span>}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              {m.role === 'dono' ? (
                                <span className="font-medium text-xs" style={{ color: T.stone400 }}>Acesso total (Dono)</span>
                              ) : (
                                <select
                                  value={m.cargo_id || ""} onChange={e => trocarCargoMembro(m.id, e.target.value)}
                                  className="px-3 py-2 rounded-lg text-xs font-medium outline-none"
                                  style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                                >
                                  <option value="">— Sem cargo —</option>
                                  {cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                              )}
                            </td>
                            <td className="p-3">
                              {m.ativo === false
                                ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-semibold uppercase border text-red-600 bg-red-50 border-red-100"><UserX className="w-3 h-3" /> Inativo</span>
                                : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-semibold uppercase border" style={{ color: T.margem, background: T.margemSoft, borderColor: T.margemMint + '66' }}><CheckCircle2 className="w-3 h-3" /> Ativo</span>
                              }
                            </td>
                            <td className="p-3 text-xs font-medium" style={{ color: T.stone500 }}>
                              {m.ultimo_acesso
                                ? <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(m.ultimo_acesso).toLocaleString('pt-BR')}</span>
                                : <span style={{ color: T.stone300 }}>—</span>}
                            </td>
                            <td className="p-3 text-right">
                              {m.role !== 'dono' && (
                                <button
                                  onClick={() => alternarAtivacao(m)}
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ color: m.ativo === false ? T.margem : '#B91C1C' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = m.ativo === false ? T.margemSoft : '#FEF2F2'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                >
                                  {m.ativo === false ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="p-5 rounded-xl" style={{ background: T.paper2, border: `1px solid ${T.stone200}` }}>
                  <p className="text-sm font-medium leading-relaxed flex items-start gap-2" style={{ color: T.stone600 }}>
                    <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.margem }} />
                    <span><strong style={{ color: T.ink }}>Como convidar funcionários:</strong> compartilhe o <strong>código do cargo</strong>. Ele acessa a tela de cadastro, escolhe "Sou funcionário" e digita o código.</span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ABA PERSONALIZAÇÃO */}
      {aba === "personalizacao" && (
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* Identidade Visual */}
          <div className="bg-white p-8 rounded-xl space-y-6" style={{ border: `1px solid ${T.stone200}` }}>
            <div className="pb-4" style={{ borderBottom: `1px solid ${T.stone200}` }}>
              <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: T.ink }}>
                <Sparkles className="w-4 h-4" style={{ color: T.margem }} /> Identidade Visual
              </h3>
              <p className="text-sm font-medium mt-1" style={{ color: T.stone400 }}>
                Escolha a personalidade da sua marca. A cor se aplica em todo o painel — botões, badges, gráficos e indicadores.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {LISTA_CORES.map(cor => {
                const ativa = cor.chave === corAtual
                return (
                  <button
                    key={cor.chave}
                    onClick={() => handleSalvarCor(cor.chave)}
                    disabled={salvandoCor}
                    className="relative group rounded-xl text-left transition-all duration-200 overflow-hidden disabled:opacity-60"
                    style={{
                      border: `2px solid ${ativa ? cor.hex500 : T.stone200}`,
                      boxShadow: ativa ? `0 0 0 1px ${cor.hex500}` : 'none',
                    }}
                  >
                    {/* Mini preview do painel */}
                    <div className="h-[72px] flex" style={{ background: '#FBFAF7' }}>
                      {/* Sidebar */}
                      <div className="w-8 h-full flex flex-col items-center pt-2 gap-1.5" style={{ background: '#0B0D0E' }}>
                        <div className="w-3.5 h-3.5 rounded-sm" style={{ background: cor.hex500, opacity: 0.9 }} />
                        <div className="w-3 h-[3px] rounded-full" style={{ background: cor.mint, opacity: 0.7 }} />
                        <div className="w-3 h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
                        <div className="w-3 h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
                      </div>
                      {/* Conteúdo */}
                      <div className="flex-1 p-2 space-y-1.5">
                        <div className="flex gap-1 items-center">
                          <div className="h-[6px] rounded-full flex-1" style={{ background: T.stone200 }} />
                          <div className="h-[6px] w-8 rounded-full" style={{ background: cor.hex100 }} />
                        </div>
                        <div className="h-8 rounded-lg flex items-center justify-end px-1.5" style={{ background: T.stone100 }}>
                          <div className="h-4 w-10 rounded-md" style={{ background: cor.hex500 }} />
                        </div>
                        <div className="flex gap-1">
                          <div className="h-[5px] rounded-full flex-1" style={{ background: T.stone200 }} />
                          <div className="h-[5px] rounded-full flex-1" style={{ background: T.stone200 }} />
                        </div>
                      </div>
                    </div>

                    {/* Label */}
                    <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${T.stone200}`, background: ativa ? cor.hex50 : 'white' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[12px] font-semibold" style={{ color: T.ink }}>{cor.nome}</p>
                          <p className="text-[10px] font-medium leading-tight mt-0.5" style={{ color: T.stone400 }}>{cor.descricao}</p>
                        </div>
                        {ativa && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: cor.hex500 }}>
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="px-4 py-3 rounded-xl text-[12px] font-medium leading-relaxed flex items-start gap-2"
              style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.stone600 }}>
              <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: T.margem }} />
              <span>A alteração é aplicada imediatamente e salva no perfil da empresa. Todos os usuários da conta veem a mesma identidade visual.</span>
            </div>
          </div>

          {/* Logo */}
          <div className="bg-white p-8 rounded-xl space-y-6" style={{ border: `1px solid ${T.stone200}` }}>
            <div className="flex items-center justify-between pb-4" style={{ borderBottom: `1px solid ${T.stone200}` }}>
              <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: T.ink }}>
                <ImageIcon className="w-4 h-4" style={{ color: T.margem }} /> Logo do Restaurante
              </h3>
              <button
                onClick={handleSalvarLogo}
                disabled={salvandoLogo}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-60"
                style={{ background: T.ink, color: T.paper }}
                onMouseEnter={e => !salvandoLogo && ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              >
                <Save className="w-4 h-4" /> {salvandoLogo ? "Salvando..." : "Salvar Logo"}
              </button>
            </div>
            <div className="space-y-3">
              <label className="text-[12px] font-semibold uppercase flex items-center gap-1.5" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                <ImageIcon className="w-3 h-3" /> URL da Logo
              </label>
              <div className="flex gap-3 items-start">
                <input
                  type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://exemplo.com/logo.png"
                  className="flex-1 px-4 py-3 rounded-xl font-medium text-sm outline-none transition-colors"
                  style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
                />
                {logoUrl && (
                  <button
                    onClick={() => setLogoUrl("")}
                    className="px-3 py-3 rounded-xl transition-all text-red-500 hover:bg-red-50"
                    style={{ border: `1px solid ${T.stone200}` }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {logoUrl && (
                <div className="flex items-center gap-3 pt-1">
                  <img src={logoUrl} alt="preview" className="w-12 h-12 rounded-xl object-cover" style={{ border: `1px solid ${T.stone200}` }} onError={e => (e.currentTarget as HTMLImageElement).style.display = 'none'} />
                  <p className="text-[12px] font-medium" style={{ color: T.stone500 }}>Preview da logo no painel</p>
                </div>
              )}
              <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>
                Cole o link de uma imagem hospedada. A logo aparece no topo da barra lateral em substituição ao ícone padrão.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ABA SENHA */}
      {aba === "senha" && (
        <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white p-8 rounded-xl space-y-6" style={{ border: `1px solid ${T.stone200}` }}>
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: `1px solid ${T.stone200}` }}>
            <h3 className="font-semibold text-base flex items-center gap-2" style={{ color: T.ink }}>
              <ShieldCheck className="w-4 h-4" style={{ color: T.margem }} /> Alterar Senha
            </h3>
            <button
              onClick={handleTrocarSenha}
              disabled={trocandoSenha}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-60"
              style={{ background: T.ink, color: T.paper }}
              onMouseEnter={e => !trocandoSenha && ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              <KeyRound className="w-4 h-4" /> {trocandoSenha ? "Atualizando..." : "Trocar Senha"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Senha Atual</label>
              <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} className="w-full px-4 py-3 rounded-xl font-medium text-sm outline-none transition-colors" style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }} />
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Nova Senha</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="w-full px-4 py-3 rounded-xl font-medium text-sm outline-none transition-colors" style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }} />
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Confirmar Nova Senha</label>
              <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} className="w-full px-4 py-3 rounded-xl font-medium text-sm outline-none transition-colors" style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }} />
            </div>
          </div>
        </div>

        {/* PIN de Desbloqueio de Ciclo */}
        <div className="bg-white p-8 rounded-xl space-y-6 animate-in fade-in duration-300" style={{ border: `1px solid ${T.stone200}` }}>
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: `1px solid ${T.stone200}` }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: pinJaCadastrado ? T.margemSoft : '#FEF3C7' }}>
                {pinJaCadastrado
                  ? <Lock className="w-4 h-4" style={{ color: T.margem }} />
                  : <ShieldAlert className="w-4 h-4" style={{ color: '#B45309' }} />}
              </div>
              <div>
                <h3 className="font-semibold text-base" style={{ color: T.ink }}>PIN de Desbloqueio de Ciclo</h3>
                <p className="text-[12px] font-medium mt-0.5" style={{ color: T.stone400 }}>
                  {pinJaCadastrado
                    ? "PIN configurado — usado para reabrir semanas fechadas."
                    : "Sem PIN — o desbloqueio exige sua senha de login."}
                </p>
              </div>
            </div>
            {pinJaCadastrado && (
              <button
                onClick={handleRemoverPin}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors border"
                style={{ color: '#B91C1C', borderColor: '#FCA5A5', background: '#FEF2F2' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEE2E2'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
              >
                Remover PIN
              </button>
            )}
          </div>

          {!pinJaCadastrado && (
            <div className="p-4 rounded-xl text-[13px] font-medium leading-relaxed" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
              <strong>Por que usar um PIN?</strong> Permite que o gerente desbloqueie semanas passadas para correções sem precisar da senha da conta principal. Ideal para equipes.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                {pinJaCadastrado ? "Novo PIN" : "Definir PIN"}
              </label>
              <input
                type="password" value={novoPin} onChange={e => setNovoPin(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full px-4 py-3 rounded-xl font-medium text-sm outline-none transition-colors"
                style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>Confirmar PIN</label>
              <input
                type="password" value={confirmarPin} onChange={e => setConfirmarPin(e.target.value)}
                placeholder="Repita o PIN"
                className="w-full px-4 py-3 rounded-xl font-medium text-sm outline-none transition-colors"
                style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSalvarPin}
              disabled={salvandoPin || !novoPin}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-60"
              style={{ background: T.ink, color: T.paper }}
              onMouseEnter={e => !salvandoPin && ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              <Unlock className="w-4 h-4" />
              {salvandoPin ? "Salvando..." : pinJaCadastrado ? "Alterar PIN" : "Criar PIN"}
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}
