import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['electron/server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',                    // ESM → CJS 변경 (Electron spawn 호환)
  outfile: 'dist-electron/server.cjs',
  external: [
    // Electron 내장 모듈만 제외, DB 드라이버는 모두 번들링
    'electron',
    // pg-native는 선택적 네이티브 모듈이므로 제외
    'pg-native',
  ],
  sourcemap: false,
  minify: true,                     // 번들 크기 최소화
  banner: {
    js: '// Bundled proxy server for Electron\n'
  },
});

console.log('Server bundle complete (CJS format)');
