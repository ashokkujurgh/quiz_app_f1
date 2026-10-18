import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: they change far less often than app code, so
        // browsers keep them cached across deploys. Pages are split by route (router/index.tsx).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](@mui|@emotion)[\\/]/.test(id)) return 'vendor-mui'
          if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) return 'vendor-firebase'
          if (/[\\/]node_modules[\\/](socket\.io-client|engine\.io-client|socket\.io-parser)[\\/]/.test(id)) return 'vendor-socket'
          if (/[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/.test(id)) return 'vendor-charts'
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-redux|@reduxjs|redux|immer|reselect)[\\/]/.test(id)) return 'vendor-react'
          return undefined
        },
      },
    },
  },
})
