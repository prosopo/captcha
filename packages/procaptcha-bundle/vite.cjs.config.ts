import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'node:path'

export default function () {
    return ViteCommonJSConfig('procaptcha-bundle', path.resolve('./tsconfig.cjs.json'), 'src/index.tsx')
}
