import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiPlugin } from './vite-plugin-api.mjs'

export default defineConfig({
  plugins: [react(), apiPlugin()],
})
