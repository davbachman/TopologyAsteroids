import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/TopologyAsteroids/' : '/',
  server: {
    host: true,
    port: 5174,
  },
}));
