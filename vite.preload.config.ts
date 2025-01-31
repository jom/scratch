import { defineConfig } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'module'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.IS_DEV !== 'true' ? './' : '/',
  build: {
    sourcemap: true,
    lib: {
      entry: 'src/preload.ts',
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      external: [
        'electron',
        'electron-devtools-installer',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      },
    },
    emptyOutDir: false,
    outDir: '.vite',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}) 