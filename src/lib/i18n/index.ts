import { enUS } from '@/lib/i18n/en-US'
import { jaJP } from '@/lib/i18n/ja-JP'
import { koKR } from '@/lib/i18n/ko-KR'
import { type SitePage, localeHref } from '@/lib/i18n/locales'
import type { Dictionary, SiteLocale } from '@/lib/i18n/types'
import { zhCN } from '@/lib/i18n/zh-CN'
import { zhTW } from '@/lib/i18n/zh-TW'

const dictionaries: Record<SiteLocale, Dictionary> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'ja-JP': jaJP,
  'en-US': enUS,
  'ko-KR': koKR,
}

export function getDictionary(locale: SiteLocale): Dictionary {
  return dictionaries[locale]
}

export function withPage(dict: Dictionary, page: SitePage): Dictionary {
  const seo = dict.seo[page]
  const path =
    page === 'home' ? localeHref(dict.locale, '/') :
    page === 'apiDocs' ? localeHref(dict.locale, '/api-docs') :
    localeHref(dict.locale, `/${page}`)
  return {
    ...dict,
    pagePath: path,
    pageTitle: seo.title,
    pageDescription: seo.description,
    pageKeywords: seo.keywords,
  }
}
