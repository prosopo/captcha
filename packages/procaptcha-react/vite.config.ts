import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'path'
const base = path.resolve('./tsconfig.json')
export default async function () {
    const commonJSconfig = await ViteCommonJSConfig('procaptcha-react', base)
    return {
        ...commonJSconfig,
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
