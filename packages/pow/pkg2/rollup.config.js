

import path from 'path';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import sourceMaps from 'rollup-plugin-sourcemaps';
import workerLoader from 'rollup-plugin-web-worker-loader';
import pkg from './package.json';
import copy from 'rollup-plugin-copy';
import { wasm } from '@rollup/plugin-wasm';

export default {
    input: [path.resolve(__dirname, 'src/index.ts')],
    output: {
        file: path.resolve(__dirname, 'dist/index.js'),
        format: 'esm',
        sourcemap: true,
    },
    plugins: [
        resolve({ extensions: [
            '.js', '.jsx', '.ts', '.tsx',
        ]
        }),
        wasm(),
        commonjs(),
        workerLoader({targetPlatform: 'browser'}),
        typescript({
            typescript: require('typescript'),
            cacheRoot: path.resolve(__dirname, '.rts2_cache'),
            clean: true,
        }),
        copy({
            targets: [
                { src: 'src/index.html', dest: 'dist' },
                { src: 'src/wasm/wasm_bg.wasm', dest: 'dist'}
            ]
        })
        // sourceMaps(),
    ],
}
