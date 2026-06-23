import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import sitemap from '@astrojs/sitemap'

// Production marketing site for OKKARO
export default defineConfig({
  site: 'https://okkaro.pk',
  integrations: [tailwind({ applyBaseStyles: false }), sitemap()],
})
