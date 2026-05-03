import type { FormatId } from '@/lib/config/formats'
import type { ThemeId } from '@/lib/config/themes'

export interface GeneratorContent {
  series: string
  issue: string
  date: string
  title: string
  subtitle: string
  author: string
  handle: string
  site: string
}

export interface GeneratorState {
  formatId: FormatId
  themeId: ThemeId
  backgroundUrl: string | null
  backgroundOpacity: number
  content: GeneratorContent
}

export interface SvgBuildOptions {
  formatId: FormatId
  themeId: ThemeId
  content: GeneratorContent
  backgroundUrl: string | null
  backgroundOpacity: number
  embeddedFontCss?: string
}

export interface GeneratorCopy {
  locale: string
  storageKey: string
  previewLabel: string
  previewReadyHint: string
  fontStatusLoading: string
  fontStatusReady: string
  fontStatusFallback: string
  formatCopy: Record<FormatId, { label: string; hint: string }>
  themeCopy: Record<ThemeId, { label: string; note: string }>
  defaultContent: GeneratorContent
  defaultFormat: FormatId
  defaultTheme: ThemeId
  defaultBackgroundOpacity: number
}
