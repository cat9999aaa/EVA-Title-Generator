import type { FormatId } from '@/lib/config/formats'
import type { ThemeId } from '@/lib/config/themes'
import type { GeneratorContent } from '@/lib/generator/types'

export type SiteLocale = 'zh-CN' | 'zh-TW' | 'ja-JP' | 'en-US' | 'ko-KR'

export interface FaqItem {
  question: string
  answer: string
}

export interface ContentCard {
  title: string
  body: string
}

export interface PageSeo {
  title: string
  description: string
  keywords: string
}

export interface Dictionary {
  locale: SiteLocale
  htmlLang: string
  pagePath: string
  pageTitle: string
  pageDescription: string
  pageKeywords: string
  seo: {
    home: PageSeo
    about: PageSeo
    faq: PageSeo
    apiDocs: PageSeo
  }
  nav: {
    languageLabel: string
    languages: Record<SiteLocale, string>
    skipToGenerator: string
    generator: string
    about: string
    faq: string
    apiDocs: string
    menu: string
    homeAria: string
    primaryNav: string
  }
  chrome: {
    brandSmall: string
    tagline: string
    groupTitle: string
    groupOutput: string
    groupDashen: string
    groupSource: string
    outputRaster: string
    outputSvg: string
    outputSizes: string
    content: string
    tools: string
    business: string
    fontProject: string
    homeCrumb: string
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
    overflowHint: string
    counterUnavailable: string
    counterLabel: string
    sections: {
      format: string
      theme: string
      content: string
      author: string
      background: string
      actions: string
    }
    fields: {
      format: string
      exportScale: string
      exportKind: string
      exportQuality: string
      series: string
      issue: string
      date: string
      title: string
      subtitle: string
      mark: string
      author: string
      handle: string
      site: string
      backgroundFile: string
      backgroundOpacity: string
    }
    placeholders: {
      series: string
      issue: string
      date: string
      title: string
      subtitle: string
      mark: string
      author: string
      handle: string
      site: string
      background: string
    }
    buttons: {
      clearBackground: string
      exportImage: string
      exportPng: string
      exportWebp: string
      exportSvg: string
      reset: string
    }
    hints: {
      title: string
      date: string
      theme: string
      actions: string
      quality: string
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
  apiDocs: {
    title: string
    intro: string
    authTitle: string
    authBody: string
    endpointsTitle: string
    examplesTitle: string
  }
  footer: {
    note: string
    description: string
    credit: string
  }
}
