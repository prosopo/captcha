import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'path'

export default function () {
    return ViteCommonJSConfig('procaptcha-bundle', path.resolve('./tsconfig.cjs.json'), 'src/index.tsx')
}
