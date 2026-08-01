/// <reference types="vitest/config" />
// Locked file: the grading contract. Fix the code, not the config.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/main.tsx'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50
      }
    }
  }
});
