/// <reference types="vitest" />

import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';
import { sveltekitRoutes } from './src/plugin/index.js';

export default defineConfig({
  plugins: [
    sveltekit(),
    sveltekitRoutes({
      debug: true,
    }),
    svelteTesting(),
  ],
  // @ts-expect-error Somehow the types are not present???
  test: {
    environment: 'happy-dom',
  },
});
