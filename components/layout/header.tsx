"use client"

import { useRef } from "react"
import { Menu, Lock, ArrowRight, Unlock, Sun, Moon } from "lucide-react"
import { T } from "@/lib/design-tokens"
import { fmtData } from "@/lib/dates"

interface HeaderProps {
  telaMeta: { grupo: string; titulo: string }
  bloqueioAtivo: boolean
  mostrarSemana: boolean
  ehSemanaAtual: boolean
  dataInicio: string
  dataFim: string
  onChangeDataInicio: (value: string) => void
  onVoltarSemanaAtual: () => void
  onDesbloquear: () => void
  isDark: boolean
  onToggleDark: () => void
  onOpenMobileMenu: () => void
}

export function Header({
  telaMeta, bloqueioAtivo, mostrarSemana, ehSemanaAtual, dataInicio, dataFim,
  onChangeDataInicio, onVoltarSemanaAtual, onDesbloquear, isDark, onToggleDark, onOpenMobileMenu,
}: HeaderProps) {
  const dateInicioRef = useRef<HTMLInputElement>(null)

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-5 sm:px-6 h-16"
      style={{ backgroundColor: T.paper, borderBottom: `1px solid ${T.stone200}` }}>

      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg transition-colors flex-shrink-0"
          style={{ color: T.stone500 }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = T.paper2}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <Menu size={20} strokeWidth={1.5} />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[14px] hidden sm:inline" style={{ color: T.stone400 }}>
            {telaMeta.grupo}
          </span>
          <span className="hidden sm:inline text-[14px]" style={{ color: T.stone300 }}>/</span>
          <h2 className="text-[15px] font-semibold truncate" style={{ color: T.ink }}>
            {telaMeta.titulo}
          </h2>
          {bloqueioAtivo && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-semibold"
              style={{ backgroundColor: T.negSoft, color: T.negative }}>
              <Lock size={9} strokeWidth={2.5} />
              Fechado
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mostrarSemana && !ehSemanaAtual && (
          <button onClick={onVoltarSemanaAtual}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 border"
            style={{ color: T.margem, borderColor: T.margemSoft, backgroundColor: T.margemSoft }}>
            Semana atual
          </button>
        )}

        {mostrarSemana && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-1.5"
            style={{ backgroundColor: T.stone100, border: `1px solid ${T.stone200}` }}>

            {/* Data de início — clique chama showPicker() no input oculto */}
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.06em' }}>Início</span>
              <button
                type="button"
                onClick={() => { try { dateInicioRef.current?.showPicker() } catch { dateInicioRef.current?.focus() } }}
                className="text-[12px] font-semibold tabular-nums text-left bg-transparent border-0 p-0 cursor-pointer leading-snug"
                style={{ color: T.ink }}>
                {fmtData(dataInicio)}
              </button>
              <input
                ref={dateInicioRef}
                type="date"
                value={dataInicio}
                onChange={e => onChangeDataInicio(e.target.value)}
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
              />
            </div>

            <ArrowRight size={12} strokeWidth={1.5} style={{ color: T.stone300, flexShrink: 0 }} />

            {/* Data de fim — apenas leitura */}
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold uppercase" style={{ color: T.stone400, letterSpacing: '0.06em' }}>Fim</span>
              <span className="text-[12px] font-semibold tabular-nums"
                style={{ color: T.stone400 }}>
                {fmtData(dataFim)}
              </span>
            </div>

          </div>
        )}

        {mostrarSemana && bloqueioAtivo && (
          <button
            onClick={onDesbloquear}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 border"
            style={{ color: T.stone600, borderColor: T.stone200, backgroundColor: T.paper2 }}>
            <Unlock size={12} strokeWidth={1.75} />
            Editar semana
          </button>
        )}

        <button
          onClick={onToggleDark}
          title={isDark ? "Modo claro" : "Modo escuro"}
          className="p-2 rounded-lg transition-colors"
          style={{ color: T.stone500 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = T.stone100}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
        >
          {isDark
            ? <Sun size={16} strokeWidth={1.5} />
            : <Moon size={16} strokeWidth={1.5} />}
        </button>
      </div>
    </header>
  )
}
