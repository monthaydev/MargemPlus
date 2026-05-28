export type NivelPermissao = false | "ver" | "editar"

export type Permissoes = {
  dashboard: NivelPermissao
  cadastros: NivelPermissao
  estoque: NivelPermissao
  dre: NivelPermissao
  relatorios: NivelPermissao
  fichas_tecnicas: NivelPermissao
  fechar_semana: boolean
  configuracoes: boolean
}

export const MODULOS: { chave: keyof Permissoes; label: string; tipo: "nivel" | "boolean" }[] = [
  { chave: "dashboard",      label: "Dashboard",                      tipo: "nivel" },
  { chave: "cadastros",      label: "Cadastros (Insumos & Categorias)", tipo: "nivel" },
  { chave: "estoque",        label: "Lançamento de Estoque",           tipo: "nivel" },
  { chave: "dre",            label: "Outros Custos / DRE",             tipo: "nivel" },
  { chave: "relatorios",     label: "Relatórios",                      tipo: "nivel" },
  { chave: "fichas_tecnicas",label: "Fichas Técnicas",                  tipo: "nivel" },
  { chave: "fechar_semana",  label: "Fechar / reabrir semana",          tipo: "boolean" },
  { chave: "configuracoes",  label: "Acessar Configurações",            tipo: "boolean" },
]

export const PERMISSOES_PADRAO: Permissoes = {
  dashboard:      "ver",
  cadastros:      false,
  estoque:        false,
  dre:            false,
  relatorios:     false,
  fichas_tecnicas: false,
  fechar_semana:  false,
  configuracoes:  false,
}

export const PERMISSOES_DONO: Permissoes = {
  dashboard:      "editar",
  cadastros:      "editar",
  estoque:        "editar",
  dre:            "editar",
  relatorios:     "editar",
  fichas_tecnicas:"editar",
  fechar_semana:  true,
  configuracoes:  true,
}

export function resolverPermissoes(perfil: any): Permissoes {
  if (!perfil) return PERMISSOES_PADRAO
  if (perfil.role === "dono") return PERMISSOES_DONO
  const p = perfil.cargo?.permissoes || {}
  return { ...PERMISSOES_PADRAO, ...p }
}

export function gerarCodigoConvite(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let codigo = ""
  for (let i = 0; i < 8; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)]
  }
  return codigo
}
