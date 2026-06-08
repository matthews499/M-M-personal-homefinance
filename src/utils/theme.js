// Shared design tokens — uses CSS custom properties for dark/light theming.
// The :root variables are defined in index.css.
// All t.xxx values are CSS var() references that update automatically on theme change.

export const t = {
  // Surfaces
  page:          'var(--color-page)',
  card:          'var(--color-card)',
  cardBorder:    'var(--color-card-border)',
  surface:       'var(--color-surface)',
  surfaceBorder: 'var(--color-surface-border)',
  formBg:        'var(--color-form-bg)',
  formBorder:    'var(--color-form-border)',

  // Inputs
  inputBg:     'var(--color-input-bg)',
  inputBorder: 'var(--color-input-border)',

  // Dividers
  divider: 'var(--color-divider)',

  // Text
  textPrimary:   'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textMuted:     'var(--color-text-muted)',

  // Accents — same in both modes
  green:     '#34d399',
  greenDim:  'rgba(52,211,153,0.15)',
  red:       '#f43f5e',
  redDim:    'rgba(244,63,94,0.15)',
  amber:     '#f59e0b',
  amberDim:  'rgba(245,158,11,0.15)',
  violet:    '#818cf8',
  violetBg:  'rgba(129,140,248,0.15)',
  purple:    '#7c3aed',
  purpleBg:  'rgba(109,40,217,0.22)',
  purpleText:'#a78bfa',
}

export const cardStyle        = { backgroundColor: t.card,    border: `1px solid ${t.cardBorder}` }
export const surfaceStyle     = { backgroundColor: t.surface,  border: `1px solid ${t.surfaceBorder}` }
export const formSurfaceStyle = { backgroundColor: t.formBg,   border: `1px solid ${t.formBorder}` }
export const inputStyle       = { backgroundColor: t.inputBg,  border: `1px solid ${t.inputBorder}`, color: t.textPrimary }
