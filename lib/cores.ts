// Paleta de personalidades editoriais do sistema Atelier — Margem+
// Cada entrada é uma identidade de marca, não apenas um swatch de cor.

export type CorMarca = {
  chave:     string
  nome:      string
  descricao: string
  hex500: string  // --margem (principal)
  hex600: string  // --margem-2
  hex700: string  // --margem-3
  hex100: string  // --margem-soft (fundo tintado)
  hex50:  string  // extra soft
  mid:    string  // --margem-mid  (texto interativo sobre soft)
  mint:   string  // --margem-mint (ponto ativo na sidebar, highlights)
}

export const CORES_MARCA: Record<string, CorMarca> = {
  petroleo: {
    chave: "petroleo",
    nome: "Petróleo",
    descricao: "Contemporâneo e neutro — padrão Margem+",
    hex500: "#0F4C3A",
    hex600: "#0A3528",
    hex700: "#082B20",
    hex100: "#E8F0EC",
    hex50:  "#F3F8F5",
    mid:    "#2D7A5F",
    mint:   "#6DC4A0",
  },
  bordeaux: {
    chave: "bordeaux",
    nome: "Bordeaux",
    descricao: "Fine dining, carnes nobres e vinhos",
    hex500: "#7A1F2B",
    hex600: "#621820",
    hex700: "#4D1018",
    hex100: "#F5E8EA",
    hex50:  "#FAF2F3",
    mid:    "#C44B5E",
    mint:   "#E899A8",
  },
  cobre: {
    chave: "cobre",
    nome: "Cobre",
    descricao: "Pizzaria, forno a lenha e cozinha aberta",
    hex500: "#A05A2C",
    hex600: "#844A22",
    hex700: "#6A3A1A",
    hex100: "#F5EDE6",
    hex50:  "#FAF5F0",
    mid:    "#D4814A",
    mint:   "#F0B48A",
  },
  maritimo: {
    chave: "maritimo",
    nome: "Marítimo",
    descricao: "Frutos do mar, sushi e cozinha litorânea",
    hex500: "#1E4D6B",
    hex600: "#183D56",
    hex700: "#123040",
    hex100: "#E4EDF4",
    hex50:  "#F0F5FA",
    mid:    "#3A7FA8",
    mint:   "#7BBFD4",
  },
  tinta: {
    chave: "tinta",
    nome: "Tinta",
    descricao: "Bistrô urbano e hamburgueria moderna",
    hex500: "#1F2937",
    hex600: "#171F2C",
    hex700: "#0F1520",
    hex100: "#E9EBF0",
    hex50:  "#F3F4F6",
    mid:    "#4B5563",
    mint:   "#9CA3AF",
  },
  mostarda: {
    chave: "mostarda",
    nome: "Mostarda",
    descricao: "Boteco, pub e casual descolado",
    hex500: "#9A6B0F",
    hex600: "#7C550C",
    hex700: "#614208",
    hex100: "#F5EED9",
    hex50:  "#FAF5E7",
    mid:    "#C89020",
    mint:   "#E8C45A",
  },
}

// Mapeamento de slugs legados (dados existentes no banco) para os novos
const LEGADO: Record<string, string> = {
  blue:    "petroleo",
  emerald: "petroleo",
  orange:  "cobre",
  rose:    "bordeaux",
  violet:  "tinta",
  amber:   "mostarda",
}

export const LISTA_CORES: CorMarca[] = Object.values(CORES_MARCA)

export const getCorMarca = (chave: string | null | undefined): CorMarca => {
  if (!chave) return CORES_MARCA.petroleo
  return CORES_MARCA[chave] || CORES_MARCA[LEGADO[chave]] || CORES_MARCA.petroleo
}

/**
 * Aplica a identidade visual de um restaurante ao documento inteiro
 * trocando os CSS custom properties de --margem-* em runtime.
 * Funciona no modo claro e escuro (os valores do .dark sobrevivem em
 * suas variáveis semânticas — apenas a marca muda).
 */
export function aplicarCorMarca(chave: string | null | undefined): void {
  if (typeof document === "undefined") return
  const cor = getCorMarca(chave)
  const r = document.documentElement.style
  r.setProperty("--margem",      cor.hex500)
  r.setProperty("--margem-2",    cor.hex600)
  r.setProperty("--margem-3",    cor.hex700)
  r.setProperty("--margem-soft", cor.hex100)
  r.setProperty("--margem-mid",  cor.mid)
  r.setProperty("--margem-mint", cor.mint)
}
