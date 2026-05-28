// Tipos e metadados de navegação do app shell.

export type AuthMode = "login" | "dono" | "funcionario"

export type Tela =
  | "home" | "dashboard" | "cadastros" | "estoque" | "outros-custos"
  | "relatorios" | "fichas" | "configuracoes" | "ruptura"
  | "compras-inteligente" | "cardapio-inteligente" | "videos"

// Breadcrumb editorial: grupo + título exibidos no header.
export const TELA_META: Record<string, { grupo: string; titulo: string }> = {
  "home":                  { grupo: "Margem+",             titulo: "Início" },
  "dashboard":             { grupo: "CMV",                 titulo: "Sua Semana" },
  "estoque":               { grupo: "CMV",                 titulo: "Estoque" },
  "outros-custos":         { grupo: "CMV",                 titulo: "Despesas & Resultado" },
  "relatorios":            { grupo: "Análise",             titulo: "Relatórios" },
  "fichas":                { grupo: "Engenharia",          titulo: "Fichas Técnicas" },
  "cadastros":             { grupo: "Sistema",             titulo: "Cadastro de Insumos" },
  "configuracoes":         { grupo: "Sistema",             titulo: "Configurações" },
  "ruptura":               { grupo: "Estoque Inteligente", titulo: "Previsão de Ruptura" },
  "compras-inteligente":   { grupo: "Estoque Inteligente", titulo: "Plano de Compras" },
  "cardapio-inteligente":  { grupo: "Engenharia",          titulo: "Cardápio Inteligente" },
  "videos":                { grupo: "Aprendizado",         titulo: "Central de Aprendizado" },
}

// Agrupamento da sidebar. `premium` marca grupos do plano Completo.
export const navGroups: { label: string; premium: boolean; ids: Tela[] }[] = [
  { label: "Início",              premium: false, ids: ["home"] },
  { label: "CMV",                 premium: false, ids: ["dashboard", "estoque", "outros-custos"] },
  { label: "Estoque Inteligente", premium: true,  ids: ["ruptura", "compras-inteligente"] },
  { label: "Engenharia",          premium: false, ids: ["fichas", "cardapio-inteligente"] },
  { label: "Relatórios",          premium: false, ids: ["relatorios"] },
  { label: "Sistema",             premium: false, ids: ["cadastros", "configuracoes"] },
  { label: "Aprendizado",         premium: false, ids: ["videos"] },
]
