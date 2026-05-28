// Tokens do sistema Atelier — usam CSS custom properties para suportar dark mode.
// A classe .dark no wrapper de conteúdo troca automaticamente os valores.
export const T = {
  ink:         'var(--ink)',
  ink2:        'var(--ink-2)',
  paper:       'var(--paper)',
  paper2:      'var(--paper-2)',
  stone600:    'var(--stone-600)',
  stone500:    'var(--stone-500)',
  stone400:    'var(--stone-400)',
  stone300:    'var(--stone-300)',
  stone200:    'var(--stone-200)',
  stone100:    'var(--stone-100)',
  margem:      'var(--margem)',
  margem2:     'var(--margem-2)',
  margemSoft:  'var(--margem-soft)',
  margemMid:   'var(--margem-mid)',
  margemMint:  'var(--margem-mint)',
  positive:    'var(--positive)',
  posSoft:     'var(--positive-soft)',
  negative:    'var(--negative)',
  negSoft:     'var(--negative-soft)',
  warning:     'var(--warning)',
  warnSoft:    'var(--warning-soft)',
  info:        'var(--info)',
  infoSoft:    'var(--info-soft)',
  // Sidebar — sempre escura, independente do tema
  sideBar:     'rgba(251,250,247,0.06)',
  sideText:    'rgba(251,250,247,0.5)',
  sideMuted:   'rgba(251,250,247,0.3)',
  sideHover:   'rgba(251,250,247,0.05)',
  sideActive:  'rgba(251,250,247,0.09)',
  // Background fixo da sidebar (nunca muda com o tema)
  sidebarBg:   '#0B0D0E',
} as const

// Classes Tailwind compostas para padrões recorrentes
export const cls = {
  eyebrow:     'text-[11px] font-semibold uppercase tracking-[0.10em]',
  label:       'text-[12px] font-medium',
  body:        'text-[14px] font-normal leading-relaxed',
  bodyStrong:  'text-[14px] font-medium',
  uiSm:        'text-[13px] font-medium',
  kpi:         'text-[40px] font-light font-serif tabular-nums leading-none',
  display:     'text-[28px] font-normal font-serif leading-tight',

  cardBase:    'rounded-xl border',
  rowHover:    'transition-colors duration-100',
  inputUnder:  'w-full bg-transparent pb-2 border-b outline-none text-[14px] font-medium transition-all duration-200',
  inputLabel:  'block text-[11px] font-semibold uppercase tracking-[0.08em] mb-1.5',

  btnPrimary:  'flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-[14px] font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed',
  btnGhost:    'flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[13px] font-medium transition-all duration-150 active:scale-[0.97] border',

  chipPos:     'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold',
  chipNeg:     'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold',
  chipWarn:    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold',
  chipNeutral: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium',
} as const
