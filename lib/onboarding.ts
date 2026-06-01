const get = (key: string) =>
  typeof window !== 'undefined' ? localStorage.getItem(key) : null

const set = (key: string, val: string) => {
  if (typeof window !== 'undefined') localStorage.setItem(key, val)
}

const keyWelcome    = (id: string) => `margem:welcome:${id}`
const keyAtivo      = (id: string) => `margem:onboarding-ativo:${id}`
const keyDispensado = (id: string) => `margem:onboarding-dispensado:${id}`

export const isWelcomeVisto       = (id: string) => get(keyWelcome(id)) === '1'
export const marcarWelcomeVisto   = (id: string) => set(keyWelcome(id), '1')

export const isOnboardingAtivo    = (id: string) => get(keyAtivo(id)) === '1'
export const ativarOnboarding     = (id: string) => set(keyAtivo(id), '1')

export const isOnboardingDispensado = (id: string) => get(keyDispensado(id)) === '1'
export const dispensarOnboarding    = (id: string) => set(keyDispensado(id), '1')
