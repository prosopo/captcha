import path from 'path'
import { UserConfig, defineConfig } from 'vite'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { nodeResolve } from "@rollup/plugin-node-resolve"

export default defineConfig(({ command, mode }) => {
    return {
        build: {
            outDir: path.resolve(__dirname, 'dist'),
            ssr: false,
            lib: {
                entry: path.resolve(__dirname, 'dist/index.js'),
                // entry: path.resolve(__dirname, 'pkg/wasm.js'),
                name: 'bundle',
                fileName: `bundle`,
                formats: ['iife'],
                // formats: ['es'],
            },
            minify: false
        },
        plugins: [
            nodeResolve(),
            wasm(),
            topLevelAwait()
        ],
        worker: {
            plugins: [
                nodeResolve(),
                wasm(),
                topLevelAwait()
            ]
        }
    }   
})
