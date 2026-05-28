"use client"

import { Lock, X, LineChart, ArrowRight, Unlock } from "lucide-react"
import { T } from "@/lib/design-tokens"

interface ModalDesbloqueioProps {
  dataInicio: string
  /** Há uma semana passada para voltar (mostra atalhos "só visualizar"/"semana atual"). */
  temOpcaoVoltar: boolean
  temPinConfigurado: boolean
  pin: string
  onPinChange: (v: string) => void
  verificando: boolean
  onFechar: () => void
  onSoVisualizar: () => void
  onIrSemanaAtual: () => void
  onConfirmar: () => void
}

export function ModalDesbloqueio({
  dataInicio, temOpcaoVoltar, temPinConfigurado, pin, onPinChange,
  verificando, onFechar, onSoVisualizar, onIrSemanaAtual, onConfirmar,
}: ModalDesbloqueioProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-6 animate-in zoom-in-95 duration-200">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: T.stone100 }}>
              <Lock size={18} style={{ color: T.stone600 }} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-semibold text-base" style={{ color: T.ink }}>Semana encerrada</h2>
              <p className="text-[12px] font-medium" style={{ color: T.stone400 }}>
                {dataInicio?.split('-').reverse().join('/')} — como deseja acessar?
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: T.stone400 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.stone100}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Opção rápida: só visualizar */}
        {temOpcaoVoltar && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onSoVisualizar}
              className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 text-center transition-all duration-150"
              style={{ borderColor: T.stone200, backgroundColor: T.paper }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.stone400; (e.currentTarget as HTMLElement).style.backgroundColor = T.paper2 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.stone200; (e.currentTarget as HTMLElement).style.backgroundColor = T.paper }}
            >
              <LineChart size={20} strokeWidth={1.5} style={{ color: T.stone500 }} />
              <span className="text-[12px] font-semibold" style={{ color: T.stone600 }}>Só visualizar</span>
              <span className="text-[11px]" style={{ color: T.stone400 }}>Sem editar nada</span>
            </button>
            <button
              onClick={onIrSemanaAtual}
              className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 text-center transition-all duration-150"
              style={{ borderColor: T.margemSoft, backgroundColor: T.margemSoft }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.margem; (e.currentTarget as HTMLElement).style.backgroundColor = '#d4e8dc' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.margemSoft; (e.currentTarget as HTMLElement).style.backgroundColor = T.margemSoft }}
            >
              <ArrowRight size={20} strokeWidth={1.5} style={{ color: T.margem }} />
              <span className="text-[12px] font-semibold" style={{ color: T.margem }}>Semana atual</span>
              <span className="text-[11px]" style={{ color: T.margemMid }}>Voltar ao ciclo aberto</span>
            </button>
          </div>
        )}

        {/* Separador */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: T.stone200 }} />
          <span className="text-[11px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
            ou editar com PIN
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: T.stone200 }} />
        </div>

        {/* Aviso de PIN não configurado */}
        {!temPinConfigurado && (
          <div className="px-4 py-3 rounded-xl text-[12px] font-medium leading-relaxed"
            style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
            PIN não configurado — usando senha de login. Configure em <strong>Configurações → Segurança</strong>.
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[12px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.08em' }}>
            {temPinConfigurado ? "PIN de Desbloqueio" : "Senha de Login"}
          </label>
          <input
            type="password"
            value={pin}
            onChange={e => onPinChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !verificando && onConfirmar()}
            placeholder="••••••••"
            autoFocus
            className="w-full px-4 py-3 rounded-xl font-medium text-sm outline-none transition-colors"
            style={{ background: T.paper2, border: `1px solid ${T.stone200}`, color: T.ink }}
          />
        </div>

        <button
          onClick={onConfirmar}
          disabled={verificando || !pin.trim()}
          className="w-full px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          style={{ background: T.ink, color: '#fff' }}
        >
          {verificando
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Unlock size={14} strokeWidth={1.5} />}
          {verificando ? "Verificando..." : "Liberar para edição"}
        </button>
      </div>
    </div>
  )
}
