import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBRL(v: any): string {
  try {
    if (v === null || v === undefined || v === "" || isNaN(Number(v))) return "R$ 0,00"
    return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  } catch {
    return "R$ 0,00"
  }
}

export function formatPerc(v: number, decimals = 2): string {
  if (isNaN(v) || v === null || !isFinite(v)) return `0.${"0".repeat(decimals)}%`
  return `${v.toFixed(decimals)}%`
}

// Fórmula Vilhena: CMV = EI + Compras - EF - Deduções
export function calcularCMV({ lancamentos, contagemInicial, contagemFinal, produtos }: any) {
  const faturamento = lancamentos?.faturamento || 0
  const compras = (lancamentos?.compras || []).reduce((a: number, c: any) => a + parseFloat(c.valorTotal || 0), 0)
  const deducoes = (lancamentos?.saidas || []).reduce((a: number, s: any) => a + parseFloat(s.valorTotal || 0), 0)

  const estInicial = Object.values(contagemInicial || {}).reduce((acc: number, i: any) =>
    acc + (parseFloat(i?.qtd || 0) * parseFloat(i?.valor || 0)), 0)

  const estFinal = (produtos || []).reduce((acc: number, p: any) => {
    const qtdF = contagemFinal?.[p.id]?.qtd ? parseFloat(contagemFinal[p.id].qtd) : 0
    if (qtdF <= 0) return acc
    const compProd = (lancamentos?.compras || []).filter((c: any) => c.produto === p.nome)
    const preco = compProd.length > 0
      ? parseFloat(compProd[compProd.length - 1].valorUnitario)
      : (contagemInicial?.[p.id]?.valor ? parseFloat(contagemInicial[p.id].valor) : 0)
    return acc + (qtdF * preco)
  }, 0)

  const cmv = estInicial + compras - estFinal - deducoes
  const margemCMV = faturamento > 0 ? (cmv / faturamento) * 100 : 0

  return { faturamento, compras, deducoes, estInicial, estFinal, cmv, margemCMV }
}
