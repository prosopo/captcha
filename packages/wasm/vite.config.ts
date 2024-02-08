import path from 'path'
import { UserConfig, defineConfig } from 'vite'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig(({ command, mode }) => {
    return {
        build: {
            outDir: path.resolve(__dirname, 'dist'),
            ssr: false,
            lib: {
                entry: path.resolve(__dirname, 'pkg2/dist/index.js'),
                // entry: path.resolve(__dirname, 'pkg/wasm.js'),
                name: 'bundle',
                fileName: `bundle`,
                formats: ['es'],
            },
        },
        plugins: [
            wasm(),
            topLevelAwait()
        ],
        worker: {
            plugins: [
                wasm(),
                topLevelAwait()
            ]
        }
    }   
})
