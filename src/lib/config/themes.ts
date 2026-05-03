export type ThemeId = 'mono' | 'nerv' | 'unit00' | 'unit01' | 'unit02' | 'unit03' | 'unit04' | 'magi' | 'seele'

export interface ThemeOption {
  id: ThemeId
  base: string
  accent: string
}

export interface ThemeTokens {
  base: string
  accent: string
  accentSoft: string
  accentFaint: string
  accentHairline: string
  textStrong: string
  textMuted: string
  panel: string
  panelBorder: string
  surface: string
  shadow: string
}

export const themeOptions: ThemeOption[] = [
  { id: 'mono',   base: '#000000', accent: '#e8e8e8' },
  { id: 'nerv',   base: '#090909', accent: '#ff6a00' },
  { id: 'unit00', base: '#050d14', accent: '#00ccff' },
  { id: 'unit01', base: '#130d1f', accent: '#7cff4f' },
  { id: 'unit02', base: '#150306', accent: '#ff2233' },
  { id: 'unit03', base: '#0a0814', accent: '#cc44ff' },
  { id: 'unit04', base: '#0e0e00', accent: '#ffdd00' },
  { id: 'magi',   base: '#061109', accent: '#00ff66' },
  { id: 'seele',  base: '#0a0f17', accent: '#9fb7ff' },
]

export const themeMap = Object.fromEntries(
  themeOptions.map((theme) => [theme.id, theme]),
) as Record<ThemeId, ThemeOption>

export function getTheme(themeId: ThemeId): ThemeOption {
  return themeMap[themeId]
}

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  const expanded = normalized.length === 3
    ? normalized.split('').map((value) => `${value}${value}`).join('')
    : normalized

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ]
}

export function alpha(hex: string, opacity: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export function rgbString(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return `${r} ${g} ${b}`
}

export function getThemeTokens(themeId: ThemeId): ThemeTokens {
  const theme = getTheme(themeId)

  return {
    base: theme.base,
    accent: theme.accent,
    accentSoft: alpha(theme.accent, 0.72),
    accentFaint: alpha(theme.accent, 0.18),
    accentHairline: alpha(theme.accent, 0.1),
    textStrong: theme.accent,
    textMuted: alpha(theme.accent, 0.78),
    panel: alpha(theme.accent, 0.06),
    panelBorder: alpha(theme.accent, 0.24),
    surface: alpha(theme.accent, 0.08),
    shadow: alpha(theme.accent, 0.24),
  }
}
