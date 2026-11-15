import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { icons, pageTitle, siteDescription, siteName, themeColor } from './src/pulse/siteMeta.js'

const escape = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** The PULSE-only build ships PULSE's own head from the first byte: title, description, icons, theme
 * colour and social card. The shared shell keeps GERAK's head; PULSE then corrects it at run time.
 * A social image and og:url need an absolute address, so they are written only when PULSE_ORIGIN
 * (or VITE_PUBLIC_ORIGIN) names the public origin of the installation. */
function pulseHead(env) {
  const origin = (env.VITE_PUBLIC_ORIGIN || env.PULSE_ORIGIN || '').replace(/\/$/, '')
  return {
    name: 'pulse-head',
    transformIndexHtml(html) {
      if (env.VITE_PULSE_ONLY !== 'true') return html
      const title = pageTitle()
      const tags = [
        ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: icons.png }],
        ['link', { rel: 'apple-touch-icon', href: icons.touch }],
        ['meta', { name: 'theme-color', content: themeColor.light }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:site_name', content: siteName }],
        ['meta', { property: 'og:locale', content: 'id_ID' }],
        ['meta', { property: 'og:title', content: title }],
        ['meta', { property: 'og:description', content: siteDescription }],
        ...(origin ? [
          ['meta', { property: 'og:url', content: origin + '/pulse' }],
          ['meta', { property: 'og:image', content: origin + icons.social }],
          ['meta', { property: 'og:image:width', content: '1200' }],
          ['meta', { property: 'og:image:height', content: '630' }],
          ['meta', { property: 'og:image:alt', content: title }],
        ] : []),
        ['meta', { name: 'twitter:card', content: origin ? 'summary_large_image' : 'summary' }],
      ]
      return {
        html: html
          .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
          .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(siteDescription)}" />`)
          .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="${icons.svg}" />`),
        tags: tags.map(([tag, attrs]) => ({ tag, attrs, injectTo: 'head' })),
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads .env files and the process environment, so a Docker build ARG such as PULSE_ORIGIN is seen too.
  const env = loadEnv(mode, new URL('.', import.meta.url).pathname, ['VITE_', 'PULSE_'])
  return {
    resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
    plugins: [react(), pulseHead(env)],
  }
})
