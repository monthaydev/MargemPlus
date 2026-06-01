"use client"

import { useState } from "react"
import { Loader2, TrendingDown, Target } from "lucide-react"
import { toast } from "react-hot-toast"
import { supabase } from "@/lib/supabase"
import { T } from "@/lib/design-tokens"
import { Wordmark } from "@/components/shared/wordmark"
import { marcarWelcomeVisto } from "@/lib/onboarding"

interface Props {
  empresaId: string
  onClose: () => void
}

export function ModalBoasVindas({ empresaId, onClose }: Props) {
  const [metaCmv,   setMetaCmv]   = useState('35')
  const [impostos,  setImpostos]  = useState('8')
  const [salvando,  setSalvando]  = useState(false)

  const handleComecar = async () => {
    const meta = Math.max(1, Math.min(99, parseFloat(metaCmv) || 35))
    const imp  = Math.max(0, Math.min(50, parseFloat(impostos) || 8))
    setSalvando(true)
    const { error } = await supabase
      .from('empresas')
      .update({ meta_cmv: meta, imposto_padrao_pct: imp })
      .eq('id', empresaId)
    if (error) {
      toast.error('Erro ao salvar. Tente novamente.')
      setSalvando(false)
      return
    }
    marcarWelcomeVisto(empresaId)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        style={{ background: T.paper, border: `1px solid ${T.stone200}` }}
      >
        {/* Cabeçalho ink */}
        <div className="px-8 pt-8 pb-7" style={{ background: T.ink }}>
          <Wordmark size={32} />
          <h2 className="text-[28px] font-light font-serif mt-5 leading-tight" style={{ color: 'white' }}>
            Bem-vindo ao<br />Margem+
          </h2>
          <p className="text-[14px] mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Configure dois números e o sistema já começa a trabalhar.
          </p>
        </div>

        {/* Conceito CMV */}
        <div className="mx-6 mt-5 p-4 rounded-xl flex items-start gap-3" style={{ background: T.margemSoft, border: `1px solid ${T.stone200}` }}>
          <TrendingDown className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: T.margem }} />
          <p className="text-[13px] leading-relaxed" style={{ color: T.margem }}>
            <strong>CMV</strong> é a fatia do faturamento que vai para insumos. Quanto menor, mais sobra. Restaurantes saudáveis ficam entre <strong>28% e 35%</strong>.
          </p>
        </div>

        {/* Campos */}
        <div className="p-6 space-y-6">

          {/* Meta CMV */}
          <div>
            <label className="flex items-center gap-2 text-[11px] font-semibold uppercase mb-3" style={{ color: T.stone500, letterSpacing: '0.08em' }}>
              <Target className="w-3.5 h-3.5" style={{ color: T.margem }} />
              Sua meta de CMV
            </label>
            <div className="flex items-baseline gap-2">
              <input
                type="number" min="10" max="60" step="1"
                value={metaCmv}
                onChange={e => setMetaCmv(e.target.value)}
                className="w-24 text-center text-[32px] font-light bg-transparent border-b-2 outline-none pb-1 tabular-nums"
                style={{ borderBottomColor: T.margem, color: T.ink }}
              />
              <span className="text-[24px] font-light" style={{ color: T.stone400 }}>%</span>
              <span className="text-[12px] font-medium ml-2" style={{ color: T.stone400 }}>Recomendado: 28–35%</span>
            </div>
          </div>

          {/* Imposto */}
          <div>
            <label className="block text-[11px] font-semibold uppercase mb-3" style={{ color: T.stone500, letterSpacing: '0.08em' }}>
              Imposto médio sobre as vendas
            </label>
            <div className="flex items-baseline gap-2">
              <input
                type="number" min="0" max="30" step="0.1"
                value={impostos}
                onChange={e => setImpostos(e.target.value)}
                className="w-24 text-center text-[32px] font-light bg-transparent border-b-2 outline-none pb-1 tabular-nums"
                style={{ borderBottomColor: T.stone300, color: T.ink }}
              />
              <span className="text-[24px] font-light" style={{ color: T.stone400 }}>%</span>
              <span className="text-[12px] font-medium ml-2" style={{ color: T.stone400 }}>Simples Nacional: 4–12%</span>
            </div>
          </div>

          <button
            onClick={handleComecar}
            disabled={salvando}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-[15px] font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
            style={{ background: T.ink, color: T.paper }}
          >
            {salvando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : 'Começar →'}
          </button>

          <p className="text-[12px] text-center" style={{ color: T.stone400 }}>
            Você pode alterar esses valores depois em{' '}
            <span className="font-semibold" style={{ color: T.stone500 }}>Configurações</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
