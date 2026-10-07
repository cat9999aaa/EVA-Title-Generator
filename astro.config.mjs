import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

const site = process.env.SITE_URL ?? 'https://eva.dashen.wang'

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'zh-CN',
        locales: {
          'zh-CN': 'zh-CN',
          'zh-tw': 'zh-Hant-TW',
          ja: 'ja-JP',
          en: 'en-US',
          ko: 'ko-KR',
        },
      },
    }),
  ],
})
