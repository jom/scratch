import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config
export default defineConfig(({ command, mode }) => {
  const isServe = command === 'serve'
  const isBuild = command === 'build'
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    base: process.env.IS_DEV !== 'true' ? './' : '/',
    build: {
      sourcemap,
      minify: isBuild,
      outDir: '.vite',
      assetsDir: '.',
      rollupOptions: {
        input: {
          renderer: resolve(__dirname, 'index.html'),
        },
        external: [
          'electron',
          'electron-devtools-installer',
          'fs',
          'path'
        ],
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]'
        }
      },
      emptyOutDir: false
    },
    server: {
      port: 5173,
    },
    clearScreen: false,
    optimizeDeps: {
      exclude: ['electron']
    }
  }
})

