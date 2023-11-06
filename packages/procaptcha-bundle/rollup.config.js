import { visualizer } from 'rollup-plugin-visualizer'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import path from 'node:path'
import resolve from '@rollup/plugin-node-resolve'
const libName = 'procaptcha'

export default [
    {
        input: path.resolve(`./dist/index.js`),
        treeshake: {
            preset: 'smallest',
            manualPureFunctions: ['createWasmFn', 'wasmBytes'],
        },
        plugins: [
            resolve({
                browser: true,
            }),
            babel({
                exclude: 'node_modules/**',
                plugins: [
                    [
                        '@babel/plugin-syntax-import-attributes',
                        {
                            deprecatedAssertSyntax: true,
                        },
                    ],
                ],
            }),
            commonjs({
                namedExports: {
                    // react: Object.keys(react),
                    // 'react-is': Object.keys(reactIs),
                    // 'react-dom': Object.keys(reactDom),
                    //'prop-types': Object.keys(propTypes),
                },
            }),
            // terser({
            //     compress: {
            //         global_defs: {
            //             'process.env.NODE_ENV': 'production',
            //         },
            //     },
            //     toplevel: true,
            // }),
            json(),
            visualizer(),
        ],
        output: [
            {
                file: `rollup/${libName}.js`,
                //dir: 'rollup',
                format: 'es',
                //preserveModules: true,
            },
        ],
    },
]
