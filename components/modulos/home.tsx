"use client"

import { useState, useEffect } from "react"
import {
  LayoutDashboard, ClipboardList, ReceiptText, LineChart,
  ChefHat, Package, Settings, TrendingDown, ShoppingCart,
  Utensils, Lock, ArrowRight, CheckCircle2, Sparkles, X
} from "lucide-react"
import { T } from "@/lib/design-tokens"
import {
  isWelcomeVisto, isOnboardingAtivo, ativarOnboarding,
  isOnboardingDispensado, dispensarOnboarding,
} from "@/lib/onboarding"

type Tela = "home" | "dashboard" | "cadastros" | "estoque" | "outros-custos" | "relatorios" |
            "fichas" | "configuracoes" | "ruptura" | "compras-inteligente" | "cardapio-inteligente"

// ── Metadados visuais de cada módulo ──────────────────────────────────────────
const CARD_META: Record<string, { cor: string; corSoft: string; grupo: string; premium?: boolean }> = {
  "dashboard":            { cor: T.margem,    corSoft: T.margemSoft, grupo: "CMV" },
  "estoque":              { cor: T.margem,    corSoft: T.margemSoft, grupo: "CMV" },
  "outros-custos":        { cor: T.warning,   corSoft: T.warnSoft,   grupo: "CMV" },
  "ruptura":              { cor: T.negative,  corSoft: T.negSoft,    grupo: "Inteligente", premium: true },
  "compras-inteligente":  { cor: T.info,      corSoft: T.infoSoft,   grupo: "Inteligente", premium: true },
  "fichas":               { cor: T.margem,    corSoft: T.margemSoft, grupo: "Engenharia" },
  "cardapio-inteligente": { cor: T.margemMid, corSoft: T.margemSoft, grupo: "Engenharia", premium: true },
  "relatorios":           { cor: T.stone600,  corSoft: T.stone100,   grupo: "Análise" },
  "cadastros":            { cor: T.stone600,  corSoft: T.stone100,   grupo: "Sistema" },
  "configuracoes":        { cor: T.stone600,  corSoft: T.stone100,   grupo: "Sistema" },
}

const CARD_ICONS: Record<string, React.ReactNode> = {
  "dashboard":            <LayoutDashboard  size={20} strokeWidth={1.5} />,
  "estoque":              <ClipboardList    size={20} strokeWidth={1.5} />,
  "outros-custos":        <ReceiptText      size={20} strokeWidth={1.5} />,
  "ruptura":              <TrendingDown     size={20} strokeWidth={1.5} />,
  "compras-inteligente":  <ShoppingCart     size={20} strokeWidth={1.5} />,
  "fichas":               <ChefHat          size={20} strokeWidth={1.5} />,
  "cardapio-inteligente": <Utensils         size={20} strokeWidth={1.5} />,
  "relatorios":           <LineChart        size={20} strokeWidth={1.5} />,
  "cadastros":            <Package          size={20} strokeWidth={1.5} />,
  "configuracoes":        <Settings         size={20} strokeWidth={1.5} />,
}

const LABELS: Record<string, string> = {
  "dashboard": "Sua Semana", "estoque": "Estoque", "outros-custos": "Despesas & Resultado",
  "fichas": "Fichas Técnicas", "relatorios": "Relatórios", "cadastros": "Cadastro de insumos",
  "configuracoes": "Configurações", "ruptura": "Previsão de Ruptura",
  "compras-inteligente": "Plano de Compras", "cardapio-inteligente": "Cardápio Inteligente",
}

// ── Frases editoriais de marca (estáveis por dia, sem mismatch de hidratação) ──
const FRASES = [
  "Margem não é o que sobra. É o que você decide manter.",
  "Quem controla o custo, escreve o próprio lucro.",
  "Cada gramo desperdiçado é uma decisão que ninguém tomou.",
  "O prato mais caro do cardápio é aquele que ninguém calculou.",
  "Restaurante bom alimenta clientes. Restaurante lucrativo alimenta sonhos.",
  "Preço é o que você cobra. Margem é o que você entende.",
]

// ── Props ─────────────────────────────────────────────────────────────────────
interface HomeProps {
  perfil: any
  modulosVisiveis: string[]
  isPremium: boolean
  dataInicio: string
  dataFim: string
  bloqueioAtivo: boolean
  lancamentos: any
  contagemInicial: Record<string, { qtd: string; valor: string }>
  contagemFinal: Record<string, { qtd: string; valor: string }>
  produtos: any[]
  produtosCarregados: boolean
  onNavegar: (tela: Tela) => void
  onAbrirWelcome?: () => void
}

export function Home({
  perfil, modulosVisiveis, isPremium,
  dataInicio, dataFim, bloqueioAtivo,
  lancamentos, contagemInicial, contagemFinal,
  produtos, produtosCarregados,
  onNavegar, onAbrirWelcome,
}: HomeProps) {
  const primeiroNome = perfil?.nome_completo?.split(' ')[0] || "você"
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite"
  const fmt = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}` }
  const frase = FRASES[new Date().getDate() % FRASES.length]
  const empresaId = perfil?.empresa?.id as string

  // ── Estado do ciclo (só presença, sem expor números — não é dashboard) ───────
  const temInicial  = Object.keys(contagemInicial).length > 0
  const temFinal    = Object.keys(contagemFinal).length > 0
  const temCompras  = (lancamentos.compras || []).length > 0
  const temFat      = (lancamentos.faturamento || 0) > 0

  // ── Onboarding (Primeiros Passos) ────────────────────────────────────────────
  const [checklistVisivel, setChecklistVisivel] = useState(false)
  const [welcomeFeito,     setWelcomeFeito]     = useState(false)

  useEffect(() => {
    if (!empresaId || !produtosCarregados) return
    const dispensado = isOnboardingDispensado(empresaId)
    if (dispensado) return
    // Ativa para novos clientes (sem produtos) ou para quem já estava em onboarding
    if (produtos.length === 0 || isOnboardingAtivo(empresaId)) {
      ativarOnboarding(empresaId)
      setChecklistVisivel(true)
    }
    setWelcomeFeito(isWelcomeVisto(empresaId))
  }, [empresaId, produtosCarregados, produtos.length])

  // Reflete quando o welcome modal é fechado (prop-drill via onAbrirWelcome)
  useEffect(() => {
    if (empresaId) setWelcomeFeito(isWelcomeVisto(empresaId))
  }, [empresaId])

  const handleDispensar = () => {
    dispensarOnboarding(empresaId)
    setChecklistVisivel(false)
  }

  const passosOnboarding = [
    { id: 'conta',       label: 'Conta criada',                      done: true,                  cta: null,                   acao: null },
    { id: 'config',      label: 'Configurar meta de CMV e impostos', done: welcomeFeito,          cta: 'Configurar agora',     acao: () => onAbrirWelcome?.() },
    { id: 'insumos',     label: 'Cadastrar seus primeiros insumos',  done: produtos.length > 0,  cta: 'Ir para Cadastros',    acao: () => onNavegar('cadastros') },
    { id: 'contagem',    label: 'Fazer a primeira contagem',         done: temInicial,            cta: 'Ir para Estoque',      acao: () => onNavegar('estoque') },
    { id: 'faturamento', label: 'Lançar o faturamento da semana',    done: temFat,                cta: 'Lançar faturamento',   acao: () => onNavegar('outros-custos') },
  ] as const

  const todosProntosOnboarding = passosOnboarding.every(p => p.done)
  const proximoPasso = passosOnboarding.find(p => !p.done)

  const ciclo = [
    { label: "Estoque inicial", ok: temInicial, tela: "estoque" as Tela,
      titulo: "Lance o estoque inicial", cta: "Lançar estoque",
      sub: "Conte o que você tem hoje para abrir o ciclo desta semana." },
    { label: "Compras", ok: temCompras, tela: "estoque" as Tela,
      titulo: "Registre as compras", cta: "Registrar compras",
      sub: "Adicione as notas de entrada de insumos deste período." },
    { label: "Faturamento", ok: temFat, tela: "outros-custos" as Tela,
      titulo: "Informe o faturamento", cta: "Lançar faturamento",
      sub: "É a base para calcular o seu CMV% da semana." },
    { label: "Estoque final", ok: temFinal, tela: "estoque" as Tela,
      titulo: "Faça a contagem final", cta: "Contar estoque",
      sub: "Conte o que sobrou para fechar o cálculo do ciclo." },
  ]
  const cicloOk    = ciclo.filter(c => c.ok).length
  const proxima    = ciclo.find(c => !c.ok)
  const completo   = cicloOk === ciclo.length

  // ── Módulos visíveis no grid ────────────────────────────────────────────────
  const modulos = modulosVisiveis.filter(id => id !== "home" && CARD_META[id])

  return (
    <div className="space-y-10 pb-12 animate-in fade-in duration-500">

      {/* ── Saudação ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 pt-2">
        <div>
          <p className="text-[12px] font-semibold uppercase mb-2"
            style={{ color: T.stone400, letterSpacing: '0.12em' }}>{saudacao}</p>
          <h1 className="text-[44px] sm:text-[52px] font-light font-serif leading-[0.95]" style={{ color: T.ink }}>
            {primeiroNome}
          </h1>
          <p className="text-[14px] mt-3 font-medium" style={{ color: T.stone500 }}>
            {perfil?.empresa?.nome || "Seu restaurante"}
            <span className="mx-2" style={{ color: T.stone300 }}>·</span>
            <span className="tabular-nums">{fmt(dataInicio)} – {fmt(dataFim)}</span>
          </p>
        </div>
        <div className="mt-1 flex-shrink-0">
          {bloqueioAtivo
            ? <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                style={{ backgroundColor: T.negSoft, color: T.negative }}>
                <Lock size={11} strokeWidth={2.5} /> Semana fechada
              </span>
            : <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                style={{ backgroundColor: T.margemSoft, color: T.margem }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.margem }} />
                Semana aberta
              </span>
          }
        </div>
      </div>

      {/* ── Primeiros Passos (onboarding) ────────────────────────────────────── */}
      {checklistVisivel && (
        <div className="rounded-2xl overflow-hidden animate-in fade-in duration-300" style={{ border: `1px solid ${T.stone200}`, background: T.paper }}>

          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${T.stone200}`, background: T.paper2 }}>
            <div>
              <p className="text-[11px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.12em' }}>Configuração inicial</p>
              <p className="font-semibold text-[15px] mt-0.5" style={{ color: T.ink }}>
                {todosProntosOnboarding ? '🎉 Tudo pronto — o sistema está operacional' : 'Primeiros Passos'}
              </p>
            </div>
            <button onClick={handleDispensar} className="p-1.5 rounded-lg transition-colors" style={{ color: T.stone400 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.stone200}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              title="Dispensar">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lista de passos */}
          {!todosProntosOnboarding && (
            <div className="divide-y" style={{ borderColor: T.stone200 }}>
              {passosOnboarding.map((passo, i) => {
                const ehProximo = !passo.done && passosOnboarding.slice(0, i).every(p => p.done)
                return (
                  <div
                    key={passo.id}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors"
                    style={{ background: ehProximo ? T.margemSoft + '33' : 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Indicador */}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                        style={{
                          background: passo.done ? T.margem : ehProximo ? T.ink : T.stone200,
                          color: passo.done || ehProximo ? 'white' : T.stone400,
                        }}
                      >
                        {passo.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <p className="text-[14px] font-medium" style={{ color: passo.done ? T.stone400 : T.ink, textDecoration: passo.done ? 'line-through' : 'none' }}>
                        {passo.label}
                      </p>
                    </div>
                    {ehProximo && passo.acao && (
                      <button
                        onClick={passo.acao}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold flex-shrink-0 transition-all active:scale-[0.97]"
                        style={{ background: T.ink, color: T.paper }}
                      >
                        {passo.cta} <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Estado "tudo pronto" */}
          {todosProntosOnboarding && (
            <div className="p-6 flex items-center justify-between gap-4">
              <p className="text-[14px] font-medium" style={{ color: T.stone500 }}>
                Todos os dados estão configurados. Veja seu CMV no painel da semana.
              </p>
              <button
                onClick={() => { onNavegar('dashboard'); dispensarOnboarding(empresaId) }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold flex-shrink-0 transition-all active:scale-[0.97]"
                style={{ background: T.margem, color: 'white' }}
              >
                Ver CMV <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Frase editorial ──────────────────────────────────────────────────── */}
      <div className="border-l-2 pl-5 py-1" style={{ borderColor: T.margem }}>
        <p className="text-[20px] sm:text-[22px] font-serif italic leading-snug" style={{ color: T.stone600 }}>
          {frase}
        </p>
      </div>

      {/* ── Continue de onde parou ───────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ backgroundColor: T.paper, borderColor: T.stone200 }}>
        <div className="p-6 sm:p-7">
          <p className="text-[11px] font-semibold uppercase mb-5"
            style={{ color: T.stone400, letterSpacing: '0.12em' }}>
            {bloqueioAtivo ? "Ciclo encerrado" : completo ? "Tudo pronto" : "Continue de onde parou"}
          </p>

          <div className="flex items-start justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: completo || bloqueioAtivo ? T.posSoft : T.margemSoft,
                         color: completo || bloqueioAtivo ? T.positive : T.margem }}>
                {completo || bloqueioAtivo
                  ? <CheckCircle2 size={22} strokeWidth={1.5} />
                  : <Sparkles size={22} strokeWidth={1.5} />}
              </div>
              <div className="min-w-0">
                <h2 className="text-[22px] sm:text-[24px] font-light font-serif leading-tight" style={{ color: T.ink }}>
                  {bloqueioAtivo
                    ? "Semana fechada e calculada"
                    : completo
                      ? "Tudo lançado — pronto para fechar"
                      : proxima?.titulo}
                </h2>
                <p className="text-[14px] mt-1.5 font-medium leading-relaxed" style={{ color: T.stone500 }}>
                  {bloqueioAtivo
                    ? "Confira o resultado desta semana nos relatórios ou no painel."
                    : completo
                      ? "Revise os números e feche o ciclo no painel da sua semana."
                      : proxima?.sub}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavegar(bloqueioAtivo ? "relatorios" : completo ? "dashboard" : (proxima!.tela))}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold transition-all duration-150 active:scale-[0.97] flex-shrink-0 self-center"
              style={{ backgroundColor: T.ink, color: T.paper }}>
              {bloqueioAtivo ? "Ver relatórios" : completo ? "Ver resultado" : proxima?.cta}
              <ArrowRight size={15} strokeWidth={2} />
            </button>
          </div>

          {/* Progresso sutil */}
          {!bloqueioAtivo && (
            <div className="flex items-center gap-3 mt-6 pt-5" style={{ borderTop: `1px solid ${T.stone200}` }}>
              <div className="flex items-center gap-1.5">
                {ciclo.map((c, i) => (
                  <div key={i} className="h-1.5 w-9 rounded-full transition-all duration-300"
                    style={{ backgroundColor: c.ok ? T.margem : T.stone200 }} />
                ))}
              </div>
              <span className="text-[12px] font-medium" style={{ color: T.stone400 }}>
                {cicloOk} de {ciclo.length} etapas do ciclo
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Acesso Rápido ────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold uppercase mb-4"
          style={{ color: T.stone400, letterSpacing: '0.12em' }}>Acesso Rápido</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {modulos.map(id => {
            const meta = CARD_META[id]
            const bloqueado = meta.premium && !isPremium
            return (
              <button
                key={id}
                onClick={() => onNavegar(id as Tela)}
                className="group relative flex flex-col items-start gap-3 p-4 rounded-xl border transition-all duration-150 text-left active:scale-[0.97]"
                style={{ backgroundColor: T.paper, borderColor: T.stone200 }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = bloqueado ? T.stone200 : meta.cor
                  el.style.transform = bloqueado ? '' : 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = T.stone200
                  el.style.transform = ''
                }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: bloqueado ? T.stone100 : meta.corSoft, color: bloqueado ? T.stone400 : meta.cor }}>
                  {CARD_ICONS[id]}
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-[13px] font-semibold leading-tight truncate"
                    style={{ color: bloqueado ? T.stone400 : T.ink }}>
                    {LABELS[id] || id}
                  </p>
                  <p className="text-[11px] font-medium mt-0.5" style={{ color: T.stone400 }}>
                    {meta.grupo}
                  </p>
                </div>
                {bloqueado && (
                  <Lock size={10} strokeWidth={1.5} className="absolute top-3 right-3"
                    style={{ color: T.stone300 }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
