import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // expose on LAN so phones can reach the dev server
    watch: {
      // Ignore transient editor/tool temp files that can crash chokidar on Windows.
      ignored: ['**/*.tmpdir/**', '**/*.tmp', '**/.git/**'],
    },
  },
})
