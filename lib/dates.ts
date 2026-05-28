// Utilitários de data do ciclo semanal (semana = segunda a domingo).

/** Formata "2026-05-19" → "19/05/26" (compacto, sem cortar) */
export const fmtData = (iso: string) => {
  if (!iso) return '--'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

/** Segunda-feira da semana corrente, em ISO (YYYY-MM-DD). */
export const getSegundaFeiraAtual = () => {
  const d = new Date()
  const dia = d.getDay()
  const segunda = new Date(d)
  segunda.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1))
  return segunda.toISOString().split('T')[0]
}

/** Próxima segunda-feira a partir de uma data de início. */
export const proximaSegunda = (inicio: string) => {
  const d = new Date(inicio + "T12:00:00")
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

/** Domingo de fechamento (início + 6 dias). */
export const calcularDataFim = (inicio: string) => {
  if (!inicio) return ""
  const d = new Date(inicio + "T12:00:00")
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}
