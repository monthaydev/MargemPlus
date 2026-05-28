"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { HelpCircle, X } from "lucide-react"
import { T, cls } from "@/lib/design-tokens"
import { AJUDA_MODULOS, type TelaAjuda } from "@/lib/ajuda-modulos"

interface AjudaPopoverProps {
  tela: string
  /** 'header' — popover abaixo do botão (posição relativa).
   *  'sidebar' — popover à direita, via React Portal (escapa opacity/overflow/z-index). */
  variant?: 'header' | 'sidebar'
}

const ARROW_Y = 22 // px do topo do popover até o centro da seta

export function AjudaPopover({ tela, variant = 'header' }: AjudaPopoverProps) {
  const [aberto, setAberto] = useState(false)
  const [fixedPos, setFixedPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const conteudo = AJUDA_MODULOS[tela as TelaAjuda]
  if (!conteudo) return null

  const isSidebar = variant === 'sidebar'

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSidebar && btnRef.current && !aberto) {
      const r = btnRef.current.getBoundingClientRect()
      setFixedPos({
        top: r.top + r.height / 2 - ARROW_Y,
        left: r.right + 14,
      })
    }
    setAberto(v => !v)
  }

  useEffect(() => {
    if (!aberto) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !popoverRef.current?.contains(t)) {
        setAberto(false)
      }
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [aberto])

  // ── Cartão do popover ────────────────────────────────────────────────────────
  const popoverCard = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Ajuda"
      className="w-[300px] sm:w-[320px] rounded-2xl shadow-2xl"
      style={
        isSidebar
          ? {
              position: 'fixed',
              top: fixedPos.top,
              left: fixedPos.left,
              zIndex: 9999,
              backgroundColor: T.paper,
              border: `1px solid ${T.stone200}`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }
          : {
              position: 'absolute',
              left: '50%',
              top: 'calc(100% + 10px)',
              transform: 'translateX(-50%)',
              zIndex: 50,
              backgroundColor: T.paper,
              border: `1px solid ${T.stone200}`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }
      }
    >
      {/* Seta — aponta para cima (header) ou para a esquerda (sidebar) */}
      {!isSidebar && (
        <div
          className="absolute left-1/2 -top-[6px] w-3 h-3"
          style={{
            transform: 'translateX(-50%) rotate(45deg)',
            backgroundColor: T.paper,
            borderLeft: `1px solid ${T.stone200}`,
            borderTop: `1px solid ${T.stone200}`,
          }}
        />
      )}
      {isSidebar && (
        <div
          className="absolute -left-[6px] w-3 h-3"
          style={{
            top: `${ARROW_Y - 6}px`,
            transform: 'rotate(45deg)',
            backgroundColor: T.paper,
            borderLeft: `1px solid ${T.stone200}`,
            borderBottom: `1px solid ${T.stone200}`,
          }}
        />
      )}

      <div className="p-4 pt-5">
        {/* Fechar */}
        <button
          type="button"
          aria-label="Fechar ajuda"
          onClick={() => setAberto(false)}
          className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-lg transition-colors"
          style={{ color: T.stone400 }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = T.stone100}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <X size={13} strokeWidth={2} />
        </button>

        {/* O que é */}
        <div className="mb-3">
          <p className={cls.eyebrow} style={{ color: T.stone400, marginBottom: '4px' }}>O que é</p>
          <p className={cls.body} style={{ color: T.ink, lineHeight: '1.55' }}>{conteudo.oQueE}</p>
        </div>

        {/* Como usar */}
        <div className="mb-3">
          <p className={cls.eyebrow} style={{ color: T.stone400, marginBottom: '4px' }}>Como usar</p>
          <p className={cls.body} style={{ color: T.ink2, lineHeight: '1.55' }}>{conteudo.comoUsar}</p>
        </div>

        {/* Dica */}
        {conteudo.dica && (
          <div className="rounded-xl px-3 py-2.5 mt-1" style={{ backgroundColor: T.margemSoft }}>
            <p className="text-[13px] leading-snug" style={{ color: T.margem }}>
              <span className="font-semibold">💡 Dica: </span>{conteudo.dica}
            </p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="relative flex-shrink-0">
      {/* Botão ? */}
      <button
        ref={btnRef}
        type="button"
        aria-label="Ajuda sobre este módulo"
        aria-expanded={aberto}
        onClick={handleToggle}
        className={`flex items-center justify-center rounded-full transition-all duration-150 active:scale-95
          ${isSidebar ? 'w-5 h-5' : 'w-[22px] h-[22px] hover:scale-110'}`}
        style={{
          color: aberto
            ? (isSidebar ? T.margemMint : T.margem)
            : (isSidebar ? 'rgba(251,250,247,0.28)' : T.stone400),
          backgroundColor: aberto
            ? (isSidebar ? 'rgba(109,196,160,0.15)' : T.margemSoft)
            : 'transparent',
        }}
        onMouseEnter={e => {
          if (!aberto) e.currentTarget.style.color = isSidebar ? 'rgba(251,250,247,0.8)' : T.stone600
        }}
        onMouseLeave={e => {
          if (!aberto) e.currentTarget.style.color = isSidebar ? 'rgba(251,250,247,0.28)' : T.stone400
        }}
      >
        <HelpCircle size={isSidebar ? 13 : 15} strokeWidth={1.8} />
      </button>

      {/* Popover: sidebar usa portal para escapar opacity/overflow do ancestral */}
      {aberto && (
        isSidebar
          ? createPortal(popoverCard, document.body)
          : popoverCard
      )}
    </div>
  )
}
