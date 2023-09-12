import type { Plugin } from 'vite'

interface SourcemapExclude {
    excludeNodeModules?: boolean
}
// Taken from https://github.com/vitejs/vite/issues/2433#issuecomment-1487472995 to prevent memory leaks
export default function VitePluginSourcemapExclude(opts?: SourcemapExclude): Plugin {
    return {
        name: 'sourcemap-exclude',
        transform(code: string, id: string) {
            if (opts?.excludeNodeModules && id.includes('node_modules')) {
                return {
                    code,
                    // https://github.com/rollup/rollup/blob/master/docs/plugin-development/index.md#source-code-transformations
                    map: { mappings: '' },
                }
            }
            return
        },
    }
}
