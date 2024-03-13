import path from 'node:path'
import { ViteCommonJSConfig } from '@prosopo/config'

export default function () {
    return ViteCommonJSConfig(
        'procaptcha-bundle',
        path.resolve('./tsconfig.cjs.json'),
        'src/index.tsx'
    )
}
