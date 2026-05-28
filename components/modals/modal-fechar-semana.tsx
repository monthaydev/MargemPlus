"use client"

import { Lock, X } from "lucide-react"
import { T } from "@/lib/design-tokens"

interface ModalFecharSemanaProps {
  fechando: boolean
  onCancelar: () => void
  onConfirmar: () => void
}

export function ModalFecharSemana({ fechando, onCancelar, onConfirmar }: ModalFecharSemanaProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancelar() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: T.margemSoft }}>
              <Lock size={18} style={{ color: T.margem }} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-semibold text-base" style={{ color: T.ink }}>Fechar esta semana?</h2>
              <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>
                Esta ação vai travar os lançamentos.
              </p>
            </div>
          </div>
          <button
            onClick={onCancelar}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: T.stone400 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.stone100}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-4 py-3 rounded-xl text-[13px] font-medium leading-relaxed"
          style={{ background: T.margemSoft, color: T.margem, border: `1px solid ${T.margemSoft}` }}>
          Após fechar, os dados desta semana ficam protegidos. Você ainda pode reabrir com o PIN de desbloqueio.
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-colors"
            style={{ color: T.stone600, background: T.paper2 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.stone100}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = T.paper2}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={fechando}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{ background: T.margem, color: '#fff' }}
          >
            {fechando
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Lock size={14} strokeWidth={1.5} />}
            {fechando ? "Fechando..." : "Fechar semana"}
          </button>
        </div>
      </div>
    </div>
  )
}
