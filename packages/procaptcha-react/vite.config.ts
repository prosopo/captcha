import { ViteCommonJSConfig } from '@prosopo/config'
import dts from 'vite-plugin-dts'
import path from 'path'

const base = path.resolve('./tsconfig.json')

export default async function () {
    const commonJSconfig = await ViteCommonJSConfig('procaptcha-react', base)
    return {
        ...commonJSconfig,
        plugins: [...(commonJSconfig.plugins || []), dts({ rollupTypes: true })], // add the declaration files (d.ts) generation plugin
        build: {
            ssr: false,
            ...commonJSconfig.build,
            outDir: 'dist',
            lib: {
                ...commonJSconfig.build?.lib,
                formats: ['es'],
            },
        },
    }
}
