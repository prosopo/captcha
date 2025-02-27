import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ProsopoCaptcha',
      fileName: (format) => `index.${format}.js`,
      formats: ['cjs']
    },
    rollupOptions: {
      external: ['@angular/core', '@angular/common'],
      output: {
        globals: {
          '@angular/core': 'ng.core',
          '@angular/common': 'ng.common'
        }
      }
    },
    outDir: 'dist/cjs'
  }
}); 