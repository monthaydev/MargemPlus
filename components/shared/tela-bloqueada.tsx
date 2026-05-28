"use client"

import { TrendingDown, ShoppingCart, Utensils, Sparkles } from "lucide-react"
import { T } from "@/lib/design-tokens"
import { TELA_META } from "@/lib/navegacao"

// Descrições das features premium exibidas na tela de upgrade.
const PREMIUM_META: Record<string, { icone: React.ReactNode; descricao: string }> = {
  "ruptura": {
    icone: <TrendingDown className="w-7 h-7" strokeWidth={1.5} />,
    descricao: "Saiba exatamente quantos dias de estoque restam para cada ingrediente. Nunca mais pare o serviço por falta de insumo no meio do rush."
  },
  "compras-inteligente": {
    icone: <ShoppingCart className="w-7 h-7" strokeWidth={1.5} />,
    descricao: "Receba sugestões automáticas de compra baseadas no seu consumo histórico. Compre a quantidade certa — sem sobrar nem faltar."
  },
  "cardapio-inteligente": {
    icone: <Utensils className="w-7 h-7" strokeWidth={1.5} />,
    descricao: "Veja quais pratos te fazem ganhar e quais te sangram. Matriz BCG automática com base na margem real e nas vendas semanais."
  },
}

export function TelaBloqueada({ tela }: { tela: string }) {
  const meta = PREMIUM_META[tela]
  const titulo = TELA_META[tela]?.titulo || tela
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] gap-10 px-4">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: T.margemSoft, color: T.margem }}>
          {meta?.icone}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase mb-2"
            style={{ color: T.margemMid, letterSpacing: '0.12em' }}>
            Plano Completo
          </p>
          <h2 className="text-[26px] font-serif mb-3" style={{ color: T.ink }}>{titulo}</h2>
          <p className="text-[14px] leading-relaxed" style={{ color: T.stone500 }}>
            {meta?.descricao}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <button
          className="flex items-center gap-2.5 px-8 py-4 rounded-xl text-[14px] font-semibold transition-all duration-150 active:scale-[0.97]"
          style={{ backgroundColor: T.margem, color: '#fff' }}>
          <Sparkles className="w-4 h-4" />
          Upgrade para Completo — R$397/mês
        </button>
        <p className="text-[12px]" style={{ color: T.stone400 }}>
          Dashboard, Estoque e Fichas Técnicas continuam disponíveis no Plano Básico
        </p>
      </div>
    </div>
  )
}
