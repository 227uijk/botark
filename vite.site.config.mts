import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { rendererAlias, rendererPlugins } from './vite.shared.mts'

/**
 * Official BotArk interactive marketing & showcase website (`site/`).
 * Uses relative `base: './'` so assets work cleanly on both GitHub Pages
 * (`https://qybaihe.github.io/botark/`) and root custom domains.
 */
export default defineConfig({
  root: resolve('site'),
  base: './',
  publicDir: resolve('site/public'),
  resolve: { alias: rendererAlias },
  plugins: rendererPlugins(),
  server: { port: 5178, strictPort: false },
  build: {
    outDir: resolve('dist/site'),
    emptyOutDir: true
  }
})
