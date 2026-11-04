import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Vite middleware plugin to serve onnxruntime-web wasm/mjs dist files directly
// This bypasses Vite's /public restriction on dynamic .mjs imports in dev mode
const serveOnnxruntimePlugin = () => ({
  name: 'serve-onnxruntime',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url) {
        const pathname = req.url.split('?')[0]
        if (pathname.startsWith('/ort-wasm') || pathname.startsWith('/ort.')) {
          const filePath = path.resolve(__dirname, 'node_modules/onnxruntime-web/dist', pathname.slice(1))
          if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath)
            if (ext === '.wasm') {
              res.setHeader('Content-Type', 'application/wasm')
            } else if (ext === '.mjs' || ext === '.js') {
              res.setHeader('Content-Type', 'text/javascript')
            }
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
            fs.createReadStream(filePath).pipe(res)
            return
          }
        }
      }
      next()
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveOnnxruntimePlugin()],

  // Include .onnx as a static asset so Vite doesn't try to transform it
  assetsInclude: ['**/*.onnx'],

  // Prevent onnxruntime-web from being pre-bundled — it self-loads WASM files
  // via dynamic import and breaks if Vite rewrites its internal paths
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },

  server: {
    hmr: {
      overlay: false, // Prevent fullscreen error overlay on transient WASM worker messages
    },
    headers: {
      // Required MIME types for ONNX Runtime Web WASM execution provider
      '*.wasm': 'application/wasm',
      '*.onnx': 'application/octet-stream',
      // Cross-Origin Isolation headers — required for SharedArrayBuffer (multi-threaded WASM)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  // Ensure WASM files are not hashed/renamed by Vite's asset pipeline
  // so onnxruntime-web can find them at predictable paths
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && (assetInfo.name.endsWith('.wasm') || assetInfo.name.endsWith('.onnx'))) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
})

