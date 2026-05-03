import { enUS } from '@/lib/i18n/en-US'
import { zhCN } from '@/lib/i18n/zh-CN'
import type { Dictionary, SiteLocale } from '@/lib/i18n/types'

const dictionaries: Record<SiteLocale, Dictionary> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

export function getDictionary(locale: SiteLocale): Dictionary {
  return dictionaries[locale]
}
