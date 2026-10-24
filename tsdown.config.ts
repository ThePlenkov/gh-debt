import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    github: 'src/github.ts',
    formatters: 'src/formatters.ts',
  },
  outDir: 'dist',
  platform: 'node',
  format: ['esm'],
  dts: true,
  clean: true,
  // Without minification React+ink ship at ~1.5 MB instead of ~670 KB.
  minify: true,
})
