"use client"

import { useState, useEffect } from "react"
import {
  LayoutDashboard, ClipboardList, ReceiptText, LineChart, Loader2,
  Settings, ChefHat, Package, TrendingDown, ShoppingCart, Utensils,
  LayoutGrid, PlayCircle
} from "lucide-react"
import { Toaster } from 'react-hot-toast'

import { Dashboard } from "@/components/modulos/dashboard"
import { Cadastros } from "@/components/modulos/cadastros"
import { OutrosCustosDRE } from "@/components/modulos/outros-custos-dre"
import { Estoque } from "@/components/modulos/estoque"
import { Relatorios } from "@/components/modulos/relatorios"
import { Configuracoes } from "@/components/modulos/configuracoes"
import { FichaTecnica } from "@/components/modulos/ficha-tecnica"
import { PrevisaoRuptura } from "@/components/modulos/previsao-ruptura"
import { PlanoCompras } from "@/components/modulos/plano-compras"
import { CardapioInteligente } from "@/components/modulos/cardapio-inteligente"
import { Home } from "@/components/modulos/home"
import { Videos } from "@/components/modulos/videos"

import { TelaLogin } from "@/components/auth/tela-login"
import { TelaSetup } from "@/components/auth/tela-setup"
import { TelaDesativado } from "@/components/auth/tela-desativado"
import { Sidebar, type MenuItem } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { ModalDesbloqueio } from "@/components/modals/modal-desbloqueio"
import { ModalFecharSemana } from "@/components/modals/modal-fechar-semana"
import { Wordmark } from "@/components/shared/wordmark"
import { TelaBloqueada } from "@/components/shared/tela-bloqueada"

import { useAuth } from "@/hooks/useAuth"
import { useAppData } from "@/hooks/useAppData"
import { resolverPermissoes, type Permissoes } from "@/lib/permissoes"
import { T } from "@/lib/design-tokens"
import { aplicarCorMarca } from "@/lib/cores"
import { getSegundaFeiraAtual } from "@/lib/dates"
import { TELA_META, navGroups, type Tela } from "@/lib/navegacao"

export default function Page() {
  const { sessao, perfil, carregandoAuth, checkUser, refreshPerfil, handleLogout } = useAuth()
  const app = useAppData({ sessao, perfil })

  const [tela, setTela] = useState<Tela>("home")
  const [menuAberto, setMenuAberto] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') setIsDark(true)
    if (localStorage.getItem('sidebar-collapsed') === '1') setSidebarCollapsed(true)
  }, [])

  // Aplica a identidade visual do restaurante ao carregar/atualizar o perfil.
  useEffect(() => { aplicarCorMarca(perfil?.empresa?.cor_principal) }, [perfil?.empresa?.cor_principal])

  const toggleDark = () => {
    setIsDark(d => {
      const next = !d
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }

  const setSidebarColapsado = (value: boolean) => {
    setSidebarCollapsed(value)
    localStorage.setItem('sidebar-collapsed', value ? '1' : '0')
  }

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (carregandoAuth) return (
    <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: T.paper }}>
      <div className="flex flex-col items-center gap-5">
        <Wordmark size={48} />
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: T.stone400 }} />
          <span className="text-[14px] font-medium" style={{ color: T.stone500 }}>Carregando...</span>
        </div>
      </div>
    </div>
  )

  if (!sessao) return <TelaLogin onAuthenticated={checkUser} />
  if (sessao && !perfil) return <TelaSetup onSuccess={checkUser} onLogout={handleLogout} />
  if (perfil.ativo === false) return <TelaDesativado onLogout={handleLogout} />

  // ── APP SHELL ────────────────────────────────────────────────────────────────
  const permissoes: Permissoes = resolverPermissoes(perfil)
  const logoUrl: string | null = perfil?.empresa?.logo_url || null
  const isPremium = (perfil?.empresa?.plano || 'basico') === 'completo'

  const podeEditarCadastros = permissoes.cadastros === "editar"
  const podeEditarEstoque = permissoes.estoque === "editar"
  const podeEditarDre = permissoes.dre === "editar"
  const podeFecharSemana = permissoes.fechar_semana

  const TodosMenus: MenuItem[] = [
    { id: "home",                  label: "Início",               icone: <LayoutGrid size={16} strokeWidth={1.5} />,      permissao: true },
    { id: "dashboard",             label: "Sua Semana",           icone: <LayoutDashboard size={16} strokeWidth={1.5} />, permissao: permissoes.dashboard },
    { id: "estoque",               label: "Estoque",              icone: <ClipboardList size={16} strokeWidth={1.5} />,   permissao: permissoes.estoque },
    { id: "outros-custos",         label: "Despesas & Resultado", icone: <ReceiptText size={16} strokeWidth={1.5} />,     permissao: permissoes.dre },
    { id: "ruptura",               label: "Previsão de Ruptura",  icone: <TrendingDown size={16} strokeWidth={1.5} />,    permissao: true, premium: true },
    { id: "compras-inteligente",   label: "Plano de Compras",     icone: <ShoppingCart size={16} strokeWidth={1.5} />,    permissao: true, premium: true },
    { id: "fichas",                label: "Fichas Técnicas",      icone: <ChefHat size={16} strokeWidth={1.5} />,         permissao: permissoes.fichas_tecnicas },
    { id: "cardapio-inteligente",  label: "Cardápio Inteligente", icone: <Utensils size={16} strokeWidth={1.5} />,        permissao: true, premium: true },
    { id: "relatorios",            label: "Relatórios",           icone: <LineChart size={16} strokeWidth={1.5} />,       permissao: permissoes.relatorios },
    { id: "cadastros",             label: "Cadastro de Insumos",  icone: <Package size={16} strokeWidth={1.5} />,         permissao: permissoes.cadastros },
    { id: "configuracoes",         label: "Configurações",        icone: <Settings size={16} strokeWidth={1.5} />,        permissao: permissoes.configuracoes },
    { id: "videos",                label: "Aprendizado",          icone: <PlayCircle size={16} strokeWidth={1.5} />,      permissao: true },
  ]

  const Menus = TodosMenus.filter(m => m.permissao !== false)
  const telaPermitida = Menus.some(m => m.id === tela)
  const telaEfetiva = telaPermitida ? tela : (Menus[0]?.id || "dashboard")
  const telaMeta = TELA_META[telaEfetiva] || { grupo: "", titulo: telaEfetiva }

  return (
    <div className="min-h-dvh font-sans flex flex-col lg:flex-row" style={{ backgroundColor: T.paper }}>
      <Toaster position="top-right" />

      <Sidebar
        menus={Menus}
        navGroups={navGroups}
        telaEfetiva={telaEfetiva}
        isPremium={isPremium}
        collapsed={sidebarCollapsed}
        mobileOpen={menuAberto}
        logoUrl={logoUrl}
        empresaNome={perfil.empresa?.nome}
        userEmail={sessao?.user?.email}
        onSetCollapsed={setSidebarColapsado}
        onCloseMobile={() => setMenuAberto(false)}
        onNavigate={(id) => { setTela(id); setMenuAberto(false) }}
        onLogout={handleLogout}
      />

      {/* ── ÁREA PRINCIPAL ───────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-h-screen overflow-hidden${isDark ? ' dark' : ''}`} style={{ backgroundColor: T.paper }}>

        <Header
          telaMeta={telaMeta}
          bloqueioAtivo={app.bloqueioAtivo}
          mostrarSemana={telaEfetiva !== "home"}
          ehSemanaAtual={app.dataInicio === getSegundaFeiraAtual()}
          dataInicio={app.dataInicio}
          dataFim={app.dataFim}
          onChangeDataInicio={app.setDataInicio}
          onVoltarSemanaAtual={app.handleVoltarSemanaAtual}
          onDesbloquear={app.handleDesbloquearSemana}
          isDark={isDark}
          onToggleDark={toggleDark}
          onOpenMobileMenu={() => setMenuAberto(true)}
        />

        {/* Main */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {telaEfetiva === "home"                 && <Home perfil={perfil} modulosVisiveis={Menus.filter(m => m.id !== "home").map(m => m.id)} isPremium={isPremium} dataInicio={app.dataInicio} dataFim={app.dataFim} bloqueioAtivo={app.bloqueioAtivo} lancamentos={app.lancamentos} contagemInicial={app.contagemInicial} contagemFinal={app.contagemFinal} onNavegar={(t) => setTela(t as Tela)} />}
            {telaEfetiva === "dashboard"            && <Dashboard dataInicio={app.dataInicio} dataFim={app.dataFim} lancamentos={app.lancamentos} contagemInicial={app.contagemInicial} contagemFinal={app.contagemFinal} produtos={app.produtos} perfil={perfil} />}
            {telaEfetiva === "cadastros"            && <Cadastros produtos={app.produtos} onRefresh={app.carregarProdutos} onPerfilRefresh={refreshPerfil} isReadOnly={app.bloqueioAtivo || !podeEditarCadastros} perfil={perfil} />}
            {telaEfetiva === "outros-custos"        && <OutrosCustosDRE data={app.lancamentos} dataInicio={app.dataInicio} dataFim={app.dataFim} onChange={app.carregarDadosDoBanco} onPerfilRefresh={refreshPerfil} isReadOnly={app.bloqueioAtivo || !podeEditarDre} perfil={perfil} produtos={app.produtos} contagemInicial={app.contagemInicial} contagemFinal={app.contagemFinal} />}
            {telaEfetiva === "relatorios"           && <Relatorios produtos={app.produtos} perfil={perfil} />}
            {telaEfetiva === "fichas"               && <FichaTecnica produtos={app.produtos} perfil={perfil} isReadOnly={permissoes.fichas_tecnicas !== "editar"} />}
            {telaEfetiva === "estoque"              && <Estoque dataInicio={app.dataInicio} dataFim={app.dataFim} produtos={app.produtos} data={app.lancamentos} contagemInicial={app.contagemInicial} contagemFinal={app.contagemFinal} onChange={app.carregarDadosDoBanco} onSemanaFechada={podeFecharSemana ? app.handleSemanaFechada : undefined} isReadOnly={app.bloqueioAtivo || !podeEditarEstoque} perfil={perfil} />}
            {telaEfetiva === "configuracoes"        && <Configuracoes perfil={perfil} onRefresh={refreshPerfil} isDark={isDark} onThemeChange={toggleDark} />}
            {telaEfetiva === "videos"               && <Videos perfil={perfil} />}
            {telaEfetiva === "ruptura"              && (isPremium ? <PrevisaoRuptura perfil={perfil} /> : <TelaBloqueada tela="ruptura" />)}
            {telaEfetiva === "compras-inteligente"  && (isPremium ? <PlanoCompras perfil={perfil} /> : <TelaBloqueada tela="compras-inteligente" />)}
            {telaEfetiva === "cardapio-inteligente" && (isPremium ? <CardapioInteligente perfil={perfil} /> : <TelaBloqueada tela="cardapio-inteligente" />)}
          </div>
        </main>
      </div>

      {app.showModalDesbloqueio && (
        <ModalDesbloqueio
          dataInicio={app.dataInicio}
          temOpcaoVoltar={!!app.dataAnteriorAoModal}
          temPinConfigurado={!!perfil?.empresa?.pin_configurado}
          pin={app.pinDesbloqueio}
          onPinChange={app.setPinDesbloqueio}
          verificando={app.verificandoPin}
          onFechar={app.fecharModalDesbloqueio}
          onSoVisualizar={app.soVisualizarSemana}
          onIrSemanaAtual={app.irParaSemanaAtual}
          onConfirmar={app.handleConfirmarPin}
        />
      )}

      {app.showModalFecharSemana && (
        <ModalFecharSemana
          fechando={app.fechandoSemana}
          onCancelar={() => app.setShowModalFecharSemana(false)}
          onConfirmar={app.handleConfirmarFecharSemana}
        />
      )}
    </div>
  )
}
