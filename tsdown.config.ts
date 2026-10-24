import { fileURLToPath } from 'node:url'
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
  // ink imports the optional `react-devtools-core` peer behind
  // `DEV === 'true'`; aliasing it keeps the emitted chunk self-contained
  // instead of leaving an unresolved import in it.
  alias: {
    'react-devtools-core': fileURLToPath(new URL('./src/tui/devtools-stub.ts', import.meta.url)),
  },
  // Without minification React+ink ship at ~1.5 MB instead of ~670 KB.
  minify: true,
})
