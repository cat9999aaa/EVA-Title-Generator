import type { FormatId } from '@/lib/config/formats'
import type { ThemeId } from '@/lib/config/themes'
import type { GeneratorContent, GeneratorState } from '@/lib/generator/types'

export const DEFAULT_FORMAT_ID: FormatId = 'x52'
export const DEFAULT_THEME_ID: ThemeId = 'mono'
export const DEFAULT_BACKGROUND_OPACITY = 28

export function cloneContent(content: GeneratorContent): GeneratorContent {
  return { ...content }
}

export function createDefaultState(content: GeneratorContent): GeneratorState {
  return {
    formatId: DEFAULT_FORMAT_ID,
    themeId: DEFAULT_THEME_ID,
    backgroundUrl: null,
    backgroundOpacity: DEFAULT_BACKGROUND_OPACITY,
    content: cloneContent(content),
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
    return {
      ...fallback,
      ...parsed,
      backgroundUrl: null,
      content: {
        ...fallback.content,
        ...(parsed.content ?? {}),
      },
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
  }

  window.localStorage.setItem(storageKey, JSON.stringify(storable))
}
