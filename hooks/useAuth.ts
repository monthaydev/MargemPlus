import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

const PERFIL_SELECT = '*, empresa:empresas(id, nome, meta_cmv, categorias_custos, categorias_produtos, unidades, logo_url, cor_principal, plano, senha_desbloqueio, imposto_padrao_pct, dias_alerta_lote), cargo:cargos(id, nome, permissoes)'

export function useAuth() {
  const [sessao, setSessao] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [carregandoAuth, setCarregandoAuth] = useState(true)

  const checkUser = async () => {
    setCarregandoAuth(true)
    const { data: { session } } = await supabase.auth.getSession()
    setSessao(session)
    if (session) {
      const { data: p } = await supabase.from('perfis').select(PERFIL_SELECT).eq('id', session.user.id).single()
      setPerfil(p)
      if (p && p.ativo !== false) {
        supabase.from('perfis').update({ ultimo_acesso: new Date().toISOString() }).eq('id', session.user.id).then(() => {})
      }
    }
    setCarregandoAuth(false)
  }

  const refreshPerfil = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: p } = await supabase.from('perfis').select(PERFIL_SELECT).eq('id', session.user.id).single()
    if (p) setPerfil(p)
  }

  useEffect(() => {
    checkUser()
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session)
      if (session) checkUser()
      else setPerfil(null)
    })
    return () => authListener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => { await supabase.auth.signOut(); setPerfil(null) }

  return { sessao, perfil, carregandoAuth, checkUser, refreshPerfil, handleLogout }
}
