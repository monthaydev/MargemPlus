"use client"

import { useState, useEffect } from "react"
import { Briefcase, UserCheck, Eye, EyeOff, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Toaster, toast } from 'react-hot-toast'
import { T } from "@/lib/design-tokens"
import { Wordmark } from "@/components/shared/wordmark"
import type { AuthMode } from "@/lib/navegacao"

// Citações editoriais rotativas no lado esquerdo da tela.
const CITACOES = [
  "35% é o ponto sagrado. Acima disso, você não tem lucro — tem ilusão.",
  "Quem não mede, paga. Literalmente.",
  "Não é quanto você vende. É quanto você guarda.",
  "O desperdício não grita. Sangra em silêncio, todo dia.",
  "Faturamento é vaidade. Margem é sanidade.",
  "Conhecer o CMV é o mínimo. Controlá-lo é o diferencial.",
]

const traduzirErroAuth = (msg: string) => {
  const m = msg.toLowerCase()
  if (m.includes("rate limit")) return "Limite de e-mails atingido. Desative a confirmação no Supabase ou aguarde ~1h."
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) return "E-mail já cadastrado. Faça login."
  if (m.includes("password")) return "Senha inválida. Use no mínimo 6 caracteres."
  if (m.includes("invalid") && m.includes("email")) return "E-mail inválido. Verifique e tente novamente."
  return msg
}

export function TelaLogin({ onAuthenticated }: { onAuthenticated: () => Promise<void> | void }) {
  const [authMode, setAuthMode] = useState<AuthMode>("login")
  const [authForm, setAuthForm] = useState({ email: '', senha: '', nomeRestaurante: '', nomeCompleto: '', codigoConvite: '' })
  const [authLoading, setAuthLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [citacaoIdx, setCitacaoIdx] = useState(0)

  const isLogin = authMode === "login"

  useEffect(() => {
    const interval = setInterval(() => setCitacaoIdx(i => (i + 1) % CITACOES.length), 5000)
    return () => clearInterval(interval)
  }, [])

  const handleAutenticacao = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)

    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.senha })
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes("email not confirmed")) {
          toast.error("E-mail ainda não confirmado. Verifique sua caixa de entrada.", { duration: 7000 })
        } else {
          toast.error("E-mail ou senha incorretos.")
        }
      }
    } else if (authMode === "dono") {
      if (!authForm.nomeRestaurante || !authForm.nomeCompleto) {
        setAuthLoading(false)
        return toast.error("Preencha todos os campos.")
      }
      toast.loading("Criando conta...", { id: "setup" })
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: authForm.email, password: authForm.senha })
      if (authError) {
        toast.error(traduzirErroAuth(authError.message), { id: "setup", duration: 7000 })
      } else if (authData.user) {
        toast.loading("Criando o ambiente da sua empresa...", { id: "setup" })
        const { data: setupResult, error: setupError } = await supabase
          .rpc('criar_conta_dono', { p_nome_restaurante: authForm.nomeRestaurante, p_nome_completo: authForm.nomeCompleto })
        if (setupError) {
          toast.error(`Erro ao configurar: ${setupError.message}`, { id: "setup", duration: 8000 })
        } else if (setupResult?.ok) {
          toast.success("Conta criada! Entrando...", { id: "setup" })
          await onAuthenticated()
        } else {
          toast.error(setupResult?.erro || "Erro inesperado.", { id: "setup", duration: 8000 })
        }
      }
    } else if (authMode === "funcionario") {
      if (!authForm.nomeCompleto || !authForm.codigoConvite) {
        setAuthLoading(false)
        return toast.error("Preencha todos os campos.")
      }
      toast.loading("Criando seu acesso...", { id: "setup" })
      const codigo = authForm.codigoConvite.trim().toUpperCase()
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: authForm.email, password: authForm.senha })
      if (authError) {
        toast.error(traduzirErroAuth(authError.message), { id: "setup", duration: 7000 })
      } else if (authData.user) {
        // O perfil é criado por uma RPC no servidor: ela valida o convite e
        // FORÇA role='funcionario' + empresa do convite (impede virar dono de outra empresa).
        const { data: result, error: rpcError } = await supabase
          .rpc('criar_conta_funcionario', { p_codigo: codigo, p_nome: authForm.nomeCompleto })
        if (rpcError) {
          toast.error(`Erro ao criar acesso: ${rpcError.message}`, { id: "setup", duration: 8000 })
        } else if (result?.ok) {
          toast.success(`Bem-vindo(a)! Cargo: ${result.cargo}`, { id: "setup" })
          await onAuthenticated()
        } else {
          toast.error(result?.erro || "Código de convite inválido.", { id: "setup", duration: 7000 })
        }
      }
    }
    setAuthLoading(false)
  }

  return (
    <div className="min-h-dvh flex" style={{ backgroundColor: T.paper }}>
      <Toaster position="top-right" />

      {/* Lado esquerdo — citações editoriais (desktop) */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: T.ink }}>

        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <Wordmark size={32} />
          <span className="text-[16px] font-bold tracking-tight" style={{ color: T.paper }}>
            Margem<span style={{ color: T.margemMint }}>+</span>
          </span>
        </div>

        {/* Citação rotativa */}
        <div className="max-w-sm">
          <div className="mb-6" style={{ color: T.margemMint, opacity: 0.6 }}>
            <span className="text-[36px] font-serif leading-none select-none">&ldquo;</span>
          </div>
          <p key={citacaoIdx} className="text-[22px] font-serif leading-snug mb-8"
            style={{ color: T.paper, fontStyle: 'italic', animation: 'fadeIn 0.6s ease' }}>
            {CITACOES[citacaoIdx]}
          </p>
          <div className="flex gap-1.5">
            {CITACOES.map((_, i) => (
              <button key={i} onClick={() => setCitacaoIdx(i)}
                className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                style={{ backgroundColor: i === citacaoIdx ? T.margemMint : T.stone600 }} />
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-[12px]" style={{ color: T.stone600 }}>
          © {new Date().getFullYear()} Margem+ · Inteligência financeira para restaurantes
        </p>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">

          {/* Wordmark mobile */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <Wordmark size={28} />
            <span className="text-[15px] font-bold tracking-tight" style={{ color: T.ink }}>
              Margem<span style={{ color: T.margem }}>+</span>
            </span>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h1 className="text-[28px] font-serif mb-1.5" style={{ color: T.ink }}>
              {isLogin ? "Acesse seu painel" : authMode === "dono" ? "Crie sua empresa" : "Entrar com convite"}
            </h1>
            <p className="text-[14px]" style={{ color: T.stone500 }}>
              {isLogin ? "Controle seu CMV com precisão." : authMode === "dono" ? "Configure em menos de 2 minutos." : "Use o código do seu gestor."}
            </p>
          </div>

          {/* Toggle Dono / Funcionário */}
          {!isLogin && (
            <div className="flex mb-6 rounded-xl p-1 border" style={{ backgroundColor: T.stone100, borderColor: T.stone200 }}>
              {(["dono", "funcionario"] as const).map(m => (
                <button key={m} onClick={() => setAuthMode(m)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-semibold transition-all duration-150"
                  style={{
                    backgroundColor: authMode === m ? '#fff' : 'transparent',
                    color: authMode === m ? T.ink : T.stone500,
                    boxShadow: authMode === m ? '0 1px 3px rgba(11,13,14,0.08)' : 'none',
                    border: authMode === m ? `1px solid ${T.stone200}` : '1px solid transparent',
                  }}>
                  {m === "dono" ? <Briefcase className="w-3 h-3" strokeWidth={1.5} /> : <UserCheck className="w-3 h-3" strokeWidth={1.5} />}
                  {m === "dono" ? "Sou Dono" : "Sou Funcionário"}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleAutenticacao} className="space-y-6">
            {authMode === "dono" && (<>
              <div>
                <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: T.stone500, letterSpacing: '0.08em' }}>Nome do Restaurante</label>
                <input required type="text" placeholder="Ex: Pizzaria do João"
                  value={authForm.nomeRestaurante}
                  onChange={e => setAuthForm({ ...authForm, nomeRestaurante: e.target.value })}
                  className="w-full bg-transparent pb-2 border-b outline-none text-[14px] font-medium transition-all duration-200 placeholder:text-[var(--stone-300)]"
                  style={{ borderBottomColor: T.stone300, color: T.ink }} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: T.stone500, letterSpacing: '0.08em' }}>Seu Nome Completo</label>
                <input required type="text" placeholder="João Carlos Monthay"
                  value={authForm.nomeCompleto}
                  onChange={e => setAuthForm({ ...authForm, nomeCompleto: e.target.value })}
                  className="w-full bg-transparent pb-2 border-b outline-none text-[14px] font-medium transition-all duration-200"
                  style={{ borderBottomColor: T.stone300, color: T.ink }} />
              </div>
            </>)}

            {authMode === "funcionario" && (<>
              <div>
                <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: T.stone500, letterSpacing: '0.08em' }}>Código de Convite</label>
                <input required type="text" placeholder="ABCD1234"
                  value={authForm.codigoConvite}
                  onChange={e => setAuthForm({ ...authForm, codigoConvite: e.target.value.toUpperCase() })}
                  maxLength={12}
                  className="w-full bg-transparent pb-2 border-b outline-none text-[14px] font-bold tracking-widest uppercase transition-all duration-200"
                  style={{ borderBottomColor: T.margem, color: T.margem }} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: T.stone500, letterSpacing: '0.08em' }}>Seu Nome Completo</label>
                <input required type="text" placeholder="Seu nome"
                  value={authForm.nomeCompleto}
                  onChange={e => setAuthForm({ ...authForm, nomeCompleto: e.target.value })}
                  className="w-full bg-transparent pb-2 border-b outline-none text-[14px] font-medium transition-all duration-200"
                  style={{ borderBottomColor: T.stone300, color: T.ink }} />
              </div>
            </>)}

            <div>
              <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: T.stone500, letterSpacing: '0.08em' }}>E-mail</label>
              <input required type="email" placeholder="seu@email.com" autoComplete="email"
                value={authForm.email}
                onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full bg-transparent pb-2 border-b outline-none text-[14px] font-medium transition-all duration-200"
                style={{ borderBottomColor: T.stone300, color: T.ink }} />
            </div>

            <div>
              <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: T.stone500, letterSpacing: '0.08em' }}>Senha</label>
              <div className="relative">
                <input required type={mostrarSenha ? "text" : "password"} placeholder="Mínimo 6 caracteres"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={authForm.senha}
                  onChange={e => setAuthForm({ ...authForm, senha: e.target.value })}
                  className="w-full bg-transparent pb-2 border-b outline-none text-[14px] font-medium transition-all duration-200 pr-8"
                  style={{ borderBottomColor: T.stone300, color: T.ink }} />
                <button type="button" onClick={() => setMostrarSenha(v => !v)}
                  className="absolute right-0 bottom-2 transition-colors"
                  style={{ color: T.stone400 }}>
                  {mostrarSenha
                    ? <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                    : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 mt-2"
              style={{ backgroundColor: T.ink, color: T.paper }}>
              {authLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isLogin ? "Entrar" : authMode === "dono" ? "Criar minha empresa" : "Entrar na equipe"
              }
            </button>
          </form>

          <div className="mt-8 pt-6 text-center" style={{ borderTop: `1px solid ${T.stone200}` }}>
            {isLogin ? (
              <button onClick={() => setAuthMode("dono")} className="text-[14px] transition-colors" style={{ color: T.stone500 }}>
                Não tem conta?{' '}
                <span className="font-semibold" style={{ color: T.margem }}>Cadastre-se</span>
              </button>
            ) : (
              <button onClick={() => setAuthMode("login")} className="text-[14px] transition-colors" style={{ color: T.stone500 }}>
                Já tem conta?{' '}
                <span className="font-semibold" style={{ color: T.margem }}>Fazer login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
