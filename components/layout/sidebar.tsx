"use client"

import { LogOut, Lock, X, ChevronLeft, ChevronRight } from "lucide-react"
import { T } from "@/lib/design-tokens"
import { AjudaPopover } from "@/components/shared/ajuda-popover"
import { Wordmark } from "@/components/shared/wordmark"
import type { Tela } from "@/lib/navegacao"

export type MenuItem = {
  id: Tela
  label: string
  icone: React.ReactNode
  permissao: any
  premium?: boolean
}

type NavGroup = { label: string; premium: boolean; ids: Tela[] }

interface SidebarProps {
  menus: MenuItem[]
  navGroups: NavGroup[]
  telaEfetiva: Tela
  isPremium: boolean
  collapsed: boolean
  mobileOpen: boolean
  logoUrl: string | null
  empresaNome?: string
  userEmail?: string
  onSetCollapsed: (value: boolean) => void
  onCloseMobile: () => void
  onNavigate: (id: Tela) => void
  onLogout: () => void
}

function LogoEmpresa({ logoUrl, empresaNome }: { logoUrl: string | null; empresaNome?: string }) {
  if (logoUrl) {
    return (
      <img src={logoUrl} alt={empresaNome || "Logo"}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
    )
  }
  return <Wordmark size={28} />
}

export function Sidebar({
  menus, navGroups, telaEfetiva, isPremium, collapsed, mobileOpen,
  logoUrl, empresaNome, userEmail, onSetCollapsed, onCloseMobile, onNavigate, onLogout,
}: SidebarProps) {
  return (
    <>
      {/* Backdrop mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(11,13,14,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onCloseMobile} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen flex flex-col z-50 transition-all duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: collapsed ? '72px' : '248px', backgroundColor: T.sidebarBg, borderRight: `1px solid ${T.sideBar}` }}>

        {/* Wordmark / Logo */}
        <div className={`pt-5 pb-5 ${collapsed ? 'px-3' : 'px-5'}`} style={{ borderBottom: `1px solid ${T.sideBar}` }}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <LogoEmpresa logoUrl={logoUrl} empresaNome={empresaNome} />
              <button
                onClick={() => onSetCollapsed(false)}
                title="Expandir menu"
                className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150"
                style={{ color: T.sideText, backgroundColor: T.sideHover }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = T.sideActive; (e.currentTarget as HTMLElement).style.color = T.paper }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = T.sideHover; (e.currentTarget as HTMLElement).style.color = T.sideText }}>
                <ChevronRight size={18} strokeWidth={1.75} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <LogoEmpresa logoUrl={logoUrl} empresaNome={empresaNome} />
                <div className="min-w-0">
                  <div className="text-[14px] font-bold tracking-tight" style={{ color: T.paper }}>
                    Margem<span style={{ color: T.margemMint }}>+</span>
                  </div>
                  {empresaNome && (
                    <div className="text-[12px] truncate" style={{ color: T.sideMuted }}>
                      {empresaNome}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => onSetCollapsed(true)}
                title="Recolher menu"
                className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 flex-shrink-0"
                style={{ color: T.sideText, backgroundColor: T.sideHover }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = T.sideActive; (e.currentTarget as HTMLElement).style.color = T.paper }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = T.sideHover; (e.currentTarget as HTMLElement).style.color = T.sideText }}>
                <ChevronLeft size={18} strokeWidth={1.75} />
              </button>
              <button className="lg:hidden p-1 flex-shrink-0" onClick={onCloseMobile}
                style={{ color: T.sideText }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto no-scrollbar space-y-4">
          {navGroups.map(group => {
            const grupoMenus = menus.filter(m => group.ids.includes(m.id))
            if (grupoMenus.length === 0) return null
            return (
              <div key={group.label}>
                {!collapsed && (
                  <div className="flex items-center gap-2 px-3 mb-1.5">
                    <p className="text-[11px] font-semibold uppercase flex-1"
                      style={{ color: T.sideMuted, letterSpacing: '0.12em' }}>
                      {group.label}
                    </p>
                    {group.premium && !isPremium && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(109,196,160,0.15)', color: T.margemMint, letterSpacing: '0.06em' }}>
                        Pro
                      </span>
                    )}
                  </div>
                )}
                <div className="space-y-0.5">
                  {grupoMenus.map(m => {
                    const ativo = telaEfetiva === m.id
                    const bloqueado = m.premium && !isPremium
                    return (
                      <div key={m.id} className="flex items-center gap-1 pr-1">
                        <button
                          onClick={() => onNavigate(m.id)}
                          title={collapsed ? m.label : undefined}
                          className={`flex-1 flex items-center rounded-xl text-left transition-all duration-150 ${collapsed ? 'justify-center py-3 px-2' : 'gap-3 pl-3 pr-2 py-2.5'}`}
                          style={{ color: ativo ? T.paper : bloqueado ? T.sideMuted : T.sideText }}
                          onMouseEnter={e => { if (!ativo) e.currentTarget.style.color = T.paper }}
                          onMouseLeave={e => { if (!ativo) e.currentTarget.style.color = bloqueado ? T.sideMuted : T.sideText }}>
                          {collapsed ? (
                            m.icone
                          ) : (
                            <>
                              <span className="w-4 flex-shrink-0 flex justify-center">
                                {ativo
                                  ? <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.margemMint }} />
                                  : <span className="w-1.5 h-1.5 rounded-full opacity-0" />
                                }
                              </span>
                              <span className="text-[14px] font-medium truncate flex-1">{m.label}</span>
                              {bloqueado && (
                                <Lock size={10} strokeWidth={2} className="flex-shrink-0" style={{ color: T.margemMint, opacity: 0.45 }} />
                              )}
                              {!bloqueado && m.permissao === "ver" && (
                                <Lock size={10} strokeWidth={2} className="ml-auto flex-shrink-0" style={{ opacity: 0.25, color: T.paper }} />
                              )}
                            </>
                          )}
                        </button>
                        {!collapsed && <AjudaPopover tela={m.id} variant="sidebar" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={`pb-4 pt-3 ${collapsed ? 'px-2' : 'px-4'}`} style={{ borderTop: `1px solid ${T.sideBar}` }}>
          {!collapsed && userEmail && (
            <p className="px-3 mb-2 text-[12px] truncate" style={{ color: T.sideMuted }}>
              {userEmail}
            </p>
          )}
          <button onClick={onLogout}
            title="Sair"
            className={`flex items-center gap-2.5 rounded-xl text-[12px] font-medium transition-all duration-150 ${collapsed ? 'p-2.5 w-full justify-center' : 'w-full px-3 py-2'}`}
            style={{ color: T.sideMuted }}
            onMouseEnter={e => e.currentTarget.style.color = T.paper}
            onMouseLeave={e => e.currentTarget.style.color = T.sideMuted}>
            <LogOut size={13} strokeWidth={1.5} />
            {!collapsed && "Sair"}
          </button>
        </div>
      </aside>
    </>
  )
}
