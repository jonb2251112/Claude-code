import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          engine: ['./src/game/Board.ts', './src/game/MatchFinder.ts'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
