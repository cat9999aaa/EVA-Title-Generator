import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

const site = process.env.SITE_URL ?? 'https://eva-title-generator.pages.dev'

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  integrations: [sitemap()],
})
