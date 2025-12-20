import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ mode }) => {
  const isContentScript = mode === 'content'

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(!isContentScript
        ? [
            viteStaticCopy({
              targets: [
                {
                  src: 'public/manifest.json',
                  dest: '.',
                },
              ],
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'build',
      emptyOutDir: !isContentScript,
      rollupOptions: isContentScript
        ? {
            input: './src/content/content.ts',
            output: {
              entryFileNames: 'content.js',
              format: 'iife',
              inlineDynamicImports: true,
            },
          }
        : {
            input: {
              background: './src/background/background.ts',
              sidepanel: 'sidepanel.html',
            },
            output: {
              entryFileNames: (chunkInfo) => {
                if (chunkInfo.name === 'background') return 'background.js'
                return 'assets/[name]-[hash].js'
              },
            },
          },
    },
  }
})
