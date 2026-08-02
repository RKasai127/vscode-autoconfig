import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    platform: 'node',
    target: 'node18',
  },
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    platform: 'node',
    target: 'node18',
    banner: { js: '#!/usr/bin/env node' },
  },
]);
