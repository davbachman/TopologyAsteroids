import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/DoubleTorusAsteroids/' : '/',
  server: {
    host: true,
    port: 5173,
  },
}));
