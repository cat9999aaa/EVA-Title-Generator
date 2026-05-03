import type { FormatId } from '@/lib/config/formats'
import type { ThemeId } from '@/lib/config/themes'
import type { GeneratorContent } from '@/lib/generator/types'

export type SiteLocale = 'zh-CN' | 'en-US'

export interface FaqItem {
  question: string
  answer: string
}

export interface ContentCard {
  title: string
  body: string
}

export interface Dictionary {
  locale: SiteLocale
  htmlLang: string
  pagePath: string
  pageTitle: string
  pageDescription: string
  pageKeywords: string
  nav: {
    languageLabel: string
    chinese: string
    english: string
    skipToGenerator: string
    generator: string
    about: string
    faq: string
  }
  hero: {
    eyebrow: string
    title: string
    lead: string
    bulletPoints: string[]
  }
  generator: {
    title: string
    description: string
    previewLabel: string
    previewReadyHint: string
    fontStatusLoading: string
    fontStatusReady: string
    fontStatusFallback: string
    sections: {
      format: string
      theme: string
      content: string
      author: string
      background: string
      actions: string
    }
    fields: {
      series: string
      issue: string
      date: string
      title: string
      subtitle: string
      author: string
      handle: string
      site: string
      backgroundFile: string
      backgroundOpacity: string
    }
    placeholders: {
      title: string
      subtitle: string
      background: string
    }
    buttons: {
      clearBackground: string
      exportPng: string
      exportSvg: string
      reset: string
    }
    hints: {
      title: string
      theme: string
      actions: string
    }
    formatCopy: Record<FormatId, { label: string; hint: string }>
    themeCopy: Record<ThemeId, { label: string; note: string }>
    defaultContent: GeneratorContent
  }
  sections: {
    formatsTitle: string
    formatsIntro: string
    useCasesTitle: string
    useCasesIntro: string
    useCases: ContentCard[]
    workflowTitle: string
    workflowIntro: string
    workflow: ContentCard[]
    technicalTitle: string
    technicalIntro: string
    technical: ContentCard[]
  }
  credit: {
    title: string
    body: string
    upstreamLabel: string
    upstreamUrl: string
    note: string
  }
  faq: {
    title: string
    intro: string
    items: FaqItem[]
  }
  footer: {
    note: string
    description: string
    credit: string
  }
}
