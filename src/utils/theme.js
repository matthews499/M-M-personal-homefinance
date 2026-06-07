// Shared design tokens — Monzo/Revolut-inspired dark theme
export const t = {
  // Surfaces
  page:          '#0d0d12',
  card:          '#17171f',
  cardBorder:    'rgba(255,255,255,0.10)',
  surface:       '#20202c',
  surfaceBorder: 'rgba(255,255,255,0.11)',
  formBg:        '#1c1c28',
  formBorder:    'rgba(255,255,255,0.13)',

  // Inputs
  inputBg:     'rgba(255,255,255,0.08)',
  inputBorder: 'rgba(255,255,255,0.15)',

  // Dividers
  divider: 'rgba(255,255,255,0.07)',

  // Text
  textPrimary:   '#f0f0f5',
  textSecondary: '#9898a8',
  textMuted:     '#6b6b7b',

  // Accents
  green:  '#34d399',
  greenDim: 'rgba(52,211,153,0.15)',
  red:    '#f43f5e',
  redDim: 'rgba(244,63,94,0.15)',
  amber:  '#f59e0b',
  amberDim: 'rgba(245,158,11,0.15)',
  violet: '#818cf8',
  violetBg: 'rgba(129,140,248,0.15)',
  purple: '#7c3aed',
  purpleBg: 'rgba(109,40,217,0.22)',
  purpleText: '#a78bfa',
}

export const cardStyle        = { backgroundColor: t.card,    border: `1px solid ${t.cardBorder}` }
export const surfaceStyle     = { backgroundColor: t.surface,  border: `1px solid ${t.surfaceBorder}` }
export const formSurfaceStyle = { backgroundColor: t.formBg,   border: `1px solid ${t.formBorder}` }
export const inputStyle       = { backgroundColor: t.inputBg,  border: `1px solid ${t.inputBorder}`, color: t.textPrimary }
