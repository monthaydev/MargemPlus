"use client"

import { ShieldAlert } from "lucide-react"
import { T } from "@/lib/design-tokens"

// Tela exibida quando o perfil teve o acesso suspenso pelo administrador.
export function TelaDesativado({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6" style={{ backgroundColor: T.paper }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: T.negSoft }}>
        <ShieldAlert className="w-6 h-6" strokeWidth={1.5} style={{ color: T.negative }} />
      </div>
      <h2 className="text-[20px] font-semibold mb-2" style={{ color: T.ink }}>Acesso Suspenso</h2>
      <p className="text-[14px] text-center max-w-sm mb-8" style={{ color: T.stone500 }}>
        Seu acesso foi suspenso pelo administrador. Entre em contato com o gestor para reativá-lo.
      </p>
      <button onClick={onLogout}
        className="px-6 py-3 rounded-xl text-[14px] font-semibold transition-all duration-150 active:scale-[0.97]"
        style={{ backgroundColor: T.ink, color: T.paper }}>
        Sair
      </button>
    </div>
  )
}
