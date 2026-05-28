// ============================================================
// CATÁLOGO DE VÍDEOS — Margem+
//
// Para adicionar um vídeo:
//   1. Cole a URL do YouTube: https://youtu.be/XXXXXXXXXXX
//   2. O ID é a parte após "youtu.be/" ou "?v=" → XXXXXXXXXXX
//   3. Copie um dos blocos abaixo e preencha os campos
//   4. `destaque: true` faz o card aparecer maior no topo
// ============================================================

export type Categoria = "sistema" | "contabilidade"

export interface Video {
  /** ID do vídeo no YouTube (parte após youtu.be/ ou ?v=) */
  id: string
  titulo: string
  descricao: string
  categoria: Categoria
  /** Duração no formato "MM:SS" — exibida como badge no card */
  duracao: string
  /** Aparece como card destaque (maior) no topo da categoria */
  destaque?: boolean
}

export const VIDEOS: Video[] = [
  // ──────────────────────────────────────────────────────────
  // CATEGORIA: Como Usar o Sistema
  // ──────────────────────────────────────────────────────────
  {
    id: "",
    titulo: "Visão Geral do Margem+ — Do Cadastro ao Relatório",
    descricao: "Tour completo pelo sistema: como cadastrar insumos, lançar compras, fazer contagem de estoque e ler os relatórios de CMV.",
    categoria: "sistema",
    duracao: "00:00",
    destaque: true,
  },
  {
    id: "",
    titulo: "Como Lançar Compras e Controlar Lotes",
    descricao: "Passo a passo para registrar uma compra, entender o que são lotes FEFO e como interpretar os alertas de validade.",
    categoria: "sistema",
    duracao: "00:00",
  },
  {
    id: "",
    titulo: "Contagem de Estoque Inicial e Final",
    descricao: "Entenda a diferença entre estoque inicial e final, como fazer a contagem corretamente e o impacto no cálculo do CMV.",
    categoria: "sistema",
    duracao: "00:00",
  },
  {
    id: "",
    titulo: "Criando sua Primeira Ficha Técnica",
    descricao: "Como montar uma ficha técnica completa, adicionar ingredientes, calcular custo por porção e definir o preço de venda ideal.",
    categoria: "sistema",
    duracao: "00:00",
  },
  {
    id: "",
    titulo: "Lendo os Relatórios de CMV",
    descricao: "Como interpretar o relatório semanal, comparar períodos, identificar desvios e exportar para Excel.",
    categoria: "sistema",
    duracao: "00:00",
  },
  {
    id: "",
    titulo: "Configurando Permissões de Equipe",
    descricao: "Como convidar funcionários, definir cargos e controlar quem pode ver ou editar cada módulo do sistema.",
    categoria: "sistema",
    duracao: "00:00",
  },

  // ──────────────────────────────────────────────────────────
  // CATEGORIA: Contabilidade & Gestão
  // ──────────────────────────────────────────────────────────
  {
    id: "",
    titulo: "O que é CMV e Por que Todo Restaurante Precisa Controlar",
    descricao: "Conceito de Custo de Mercadoria Vendida, qual a meta ideal para o seu tipo de operação e o impacto direto no seu lucro.",
    categoria: "contabilidade",
    duracao: "00:00",
    destaque: true,
  },
  {
    id: "",
    titulo: "DRE Simplificado para Donos de Restaurante",
    descricao: "Como ler uma Demonstração de Resultado, separar custos fixos de variáveis e entender onde o dinheiro vai embora.",
    categoria: "contabilidade",
    duracao: "00:00",
  },
  {
    id: "",
    titulo: "Markup e Precificação: Quanto Cobrar no Seu Prato",
    descricao: "A fórmula do Markup Divisor, como calcular o preço de venda considerando impostos, taxas de delivery e margem de lucro.",
    categoria: "contabilidade",
    duracao: "00:00",
  },
  {
    id: "",
    titulo: "Ponto de Equilíbrio: Quantas Vendas Preciso Fazer para Não Perder Dinheiro",
    descricao: "Cálculo do break-even, como saber se seu restaurante cobre os custos fixos e o que fazer quando não cobre.",
    categoria: "contabilidade",
    duracao: "00:00",
  },
  {
    id: "",
    titulo: "Engenharia de Cardápio: Quais Pratos Lucram Mais",
    descricao: "Matriz BCG aplicada ao restaurante — como identificar os pratos estrela, vaca leiteira, abacaxi e ponto de interrogação.",
    categoria: "contabilidade",
    duracao: "00:00",
  },
  {
    id: "",
    titulo: "Fluxo de Caixa e Capital de Giro para Restaurantes",
    descricao: "Por que restaurantes fecham mesmo vendendo muito, como calcular necessidade de capital de giro e controlar o fluxo de caixa.",
    categoria: "contabilidade",
    duracao: "00:00",
  },
]

export const CATEGORIAS: Record<Categoria, { label: string; descricao: string }> = {
  sistema: {
    label: "Como Usar o Sistema",
    descricao: "Aprenda a usar o Margem+ do zero até os relatórios avançados.",
  },
  contabilidade: {
    label: "Contabilidade & Gestão",
    descricao: "Aulas práticas de contabilidade e gestão financeira para donos de restaurante.",
  },
}
