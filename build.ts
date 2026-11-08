await Bun.build({
  entrypoints: ['./index.ts'],
  minify: true,
  bytecode: true,
  sourcemap: 'inline',
  compile: {
    outfile: Bun.env['OUTFILE'] || 'dist/gacha-auto',
    // Set by the Dockerfile or caller to cross-compile. Bun rejects an explicit undefined target.
    ...(Bun.env['BUN_COMPILE_TARGET'] && { target: Bun.env['BUN_COMPILE_TARGET'] as Bun.Build.CompileTarget }),
  },
})
