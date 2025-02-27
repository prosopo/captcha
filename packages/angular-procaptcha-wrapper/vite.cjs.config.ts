// Copyright 2021-2025 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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