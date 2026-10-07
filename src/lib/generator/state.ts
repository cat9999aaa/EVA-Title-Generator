import { formatMap, type FormatId } from '@/lib/config/formats'
import type { ThemeId } from '@/lib/config/themes'
import { LEGACY_SAMPLE_DATE, displayDate } from '@/lib/generator/measure-text'
import type { DateMode, ExportKind, GeneratorContent, GeneratorState } from '@/lib/generator/types'

export const DEFAULT_FORMAT_ID: FormatId = 'article'
export const DEFAULT_THEME_ID: ThemeId = 'mono'
export const DEFAULT_BACKGROUND_OPACITY = 28
export const DEFAULT_EXPORT_KIND: ExportKind = 'webp'
export const DEFAULT_EXPORT_QUALITY = 80

export function cloneContent(content: GeneratorContent): GeneratorContent {
  return { ...content, mark: content.mark ?? '' }
}

function normalizeTitle(value: string): string {
  return value.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
}

function resolveDateMode(content: GeneratorContent, parsed?: DateMode): DateMode {
  if (parsed === 'auto' || parsed === 'manual' || parsed === 'hidden') {
    return parsed
  }
  if (!content.date || content.date === LEGACY_SAMPLE_DATE) {
    return 'auto'
  }
  return 'manual'
}

function applyDate(content: GeneratorContent, dateMode: DateMode): GeneratorContent {
  if (dateMode === 'hidden') {
    return { ...content, date: '' }
  }
  if (dateMode === 'auto') {
    return { ...content, date: displayDate() }
  }
  return content
}

export function createDefaultState(content: GeneratorContent): GeneratorState {
  const dateMode: DateMode = 'auto'
  return {
    formatId: DEFAULT_FORMAT_ID,
    themeId: DEFAULT_THEME_ID,
    backgroundUrl: null,
    backgroundOpacity: DEFAULT_BACKGROUND_OPACITY,
    exportScale: formatMap[DEFAULT_FORMAT_ID].defaultScale,
    exportKind: DEFAULT_EXPORT_KIND,
    exportQuality: DEFAULT_EXPORT_QUALITY,
    dateMode,
    content: applyDate({ ...cloneContent(content), title: normalizeTitle(content.title) }, dateMode),
  }
}

export function loadState(storageKey: string, fallback: GeneratorState): GeneratorState {
  if (typeof window === 'undefined') {
    return fallback
  }

  const raw = window.localStorage.getItem(storageKey)
  if (!raw) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GeneratorState>
    const mergedContent = cloneContent({
      ...fallback.content,
      ...(parsed.content ?? {}),
    })
    mergedContent.title = normalizeTitle(mergedContent.title)
    mergedContent.subtitle = normalizeTitle(mergedContent.subtitle)
    mergedContent.mark = normalizeTitle(mergedContent.mark ?? '')
    const dateMode = resolveDateMode(mergedContent, parsed.dateMode)
    const formatId = parsed.formatId && parsed.formatId in formatMap ? parsed.formatId : fallback.formatId
    const exportScale = parsed.exportScale === 1 || parsed.exportScale === 2
      ? parsed.exportScale
      : formatMap[formatId].defaultScale
    const exportKind: ExportKind = parsed.exportKind === 'png' ? 'png' : 'webp'
    const exportQuality = Number.isFinite(parsed.exportQuality)
      ? Math.min(100, Math.max(1, Math.round(Number(parsed.exportQuality))))
      : fallback.exportQuality
    return {
      ...fallback,
      ...parsed,
      formatId,
      exportScale,
      exportKind,
      exportQuality,
      dateMode,
      backgroundUrl: null,
      content: applyDate(mergedContent, dateMode),
    }
  } catch {
    return fallback
  }
}

export function persistState(storageKey: string, state: GeneratorState): void {
  if (typeof window === 'undefined') {
    return
  }

  const storable = {
    ...state,
    backgroundUrl: null,
    content: state.dateMode === 'auto' ? { ...state.content, date: '' } : state.content,
  }

  window.localStorage.setItem(storageKey, JSON.stringify(storable))
}

export function refreshAutoDate(state: GeneratorState): GeneratorState {
  if (state.dateMode !== 'auto') {
    return state
  }
  return { ...state, content: { ...state.content, date: displayDate() } }
}
