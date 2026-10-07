import type { FormatId } from '@/lib/config/formats'
import type { ThemeId } from '@/lib/config/themes'

export type DateMode = 'auto' | 'manual' | 'hidden'
export type ExportKind = 'png' | 'webp'

export interface GeneratorContent {
  series: string
  issue: string
  date: string
  title: string
  subtitle: string
  author: string
  handle: string
  site: string
  mark: string
}

export interface GeneratorState {
  formatId: FormatId
  themeId: ThemeId
  backgroundUrl: string | null
  backgroundOpacity: number
  exportScale: 1 | 2
  exportKind: ExportKind
  exportQuality: number
  dateMode: DateMode
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
  overflowHint: string
  counterUnavailable: string
  counterLabel: string
  exportPng: string
  exportWebp: string
  formatCopy: Record<FormatId, { label: string; hint: string }>
  themeCopy: Record<ThemeId, { label: string; note: string }>
  defaultContent: GeneratorContent
  defaultFormat: FormatId
  defaultTheme: ThemeId
  defaultBackgroundOpacity: number
}
