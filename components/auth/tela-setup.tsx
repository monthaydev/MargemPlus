"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Toaster, toast } from 'react-hot-toast'
import { T } from "@/lib/design-tokens"
import { Wordmark } from "@/components/shared/wordmark"

// Tela exibida quando o usuário está logado mas ainda não tem perfil/empresa.
export function TelaSetup({ onSuccess, onLogout }: { onSuccess: () => Promise<void> | void; onLogout: () => void }) {
  const [setupNome, setSetupNome] = useState('')
  const [setupRestaurante, setSetupRestaurante] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)

  const handleSetupConta = async (e: React.FormEvent) => {
    e.preventDefault()
    setSetupLoading(true)
    toast.loading("Criando seu ambiente...", { id: "setup-manual" })
    const { data: result, error } = await supabase.rpc('criar_conta_dono', { p_nome_restaurante: setupRestaurante, p_nome_completo: setupNome })
    const errMsg = (result?.erro || error?.message || '').toString()
    if (error || !result?.ok) {
      if (errMsg.includes('perfis_id_fkey') || errMsg.toLowerCase().includes('foreign key')) {
        toast.error("Sessão inválida. Vou te deslogar — cadastre-se novamente.", { id: "setup-manual", duration: 8000 })
        setTimeout(() => { onLogout() }, 2500)
      } else {
        toast.error(errMsg || 'Erro ao configurar conta.', { id: "setup-manual", duration: 10000 })
      }
    } else {
      toast.success("Conta criada!", { id: "setup-manual" })
      await onSuccess()
    }
    setSetupLoading(false)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6" style={{ backgroundColor: T.paper }}>
      <Toaster position="top-right" />
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <Wordmark size={40} />
          <h2 className="text-[22px] font-serif mt-5 mb-1" style={{ color: T.ink }}>Finalize seu cadastro</h2>
          <p className="text-[14px] text-center" style={{ color: T.stone500 }}>Configure o perfil do seu restaurante para continuar.</p>
        </div>
        <form onSubmit={handleSetupConta} className="space-y-6">
          <div>
            <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: T.stone500, letterSpacing: '0.08em' }}>Nome do Restaurante</label>
            <input required type="text" placeholder="Ex: Pizzaria do João"
              value={setupRestaurante} onChange={e => setSetupRestaurante(e.target.value)}
              className="w-full bg-transparent pb-2 border-b outline-none text-[14px] font-medium"
              style={{ borderBottomColor: T.stone300, color: T.ink }} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: T.stone500, letterSpacing: '0.08em' }}>Seu Nome Completo</label>
            <input required type="text" placeholder="João Carlos Monthay"
              value={setupNome} onChange={e => setSetupNome(e.target.value)}
              className="w-full bg-transparent pb-2 border-b outline-none text-[14px] font-medium"
              style={{ borderBottomColor: T.stone300, color: T.ink }} />
          </div>
          <button type="submit" disabled={setupLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: T.ink, color: T.paper }}>
            {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar minha empresa"}
          </button>
        </form>
        <div className="mt-8 pt-6 text-center" style={{ borderTop: `1px solid ${T.stone200}` }}>
          <button onClick={onLogout} className="text-[14px]" style={{ color: T.stone500 }}>
            Usar outra conta?{' '}
            <span className="font-semibold" style={{ color: T.margem }}>Sair</span>
          </button>
        </div>
      </div>
    </div>
  )
}
