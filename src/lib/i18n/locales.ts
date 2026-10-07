import type { SiteLocale } from '@/lib/i18n/types'

export const SITE_LOCALES: readonly SiteLocale[] = ['zh-CN', 'zh-TW', 'ja-JP', 'en-US', 'ko-KR']

export const LOCALE_META: Record<
  SiteLocale,
  {
    htmlLang: string
    prefix: string
    hrefLang: string
    ogLocale: string
    homePath: string
  }
> = {
  'zh-CN': { htmlLang: 'zh-CN', prefix: '', hrefLang: 'zh-CN', ogLocale: 'zh_CN', homePath: '/' },
  'zh-TW': { htmlLang: 'zh-Hant-TW', prefix: '/zh-tw', hrefLang: 'zh-Hant', ogLocale: 'zh_TW', homePath: '/zh-tw' },
  'ja-JP': { htmlLang: 'ja', prefix: '/ja', hrefLang: 'ja', ogLocale: 'ja_JP', homePath: '/ja' },
  'en-US': { htmlLang: 'en', prefix: '/en', hrefLang: 'en', ogLocale: 'en_US', homePath: '/en' },
  'ko-KR': { htmlLang: 'ko', prefix: '/ko', hrefLang: 'ko', ogLocale: 'ko_KR', homePath: '/ko' },
}

export const DEFAULT_LOCALE: SiteLocale = 'zh-CN'
export const SITE_ORIGIN = 'https://eva.dashen.wang'
export const SHARED_STORAGE_KEY = 'eva-title-generator:shared'

export type SitePage = 'home' | 'about' | 'faq' | 'apiDocs'

export function localeHref(locale: SiteLocale, path: string): string {
  const prefix = LOCALE_META[locale].prefix
  if (path === '/' || path === '') {
    return prefix || '/'
  }
  return `${prefix}${path.startsWith('/') ? path : `/${path}`}`
}

export function pageHref(locale: SiteLocale, page: SitePage): string {
  if (page === 'home') {
    return localeHref(locale, '/')
  }
  if (page === 'apiDocs') {
    return localeHref(locale, '/api-docs')
  }
  return localeHref(locale, `/${page}`)
}
