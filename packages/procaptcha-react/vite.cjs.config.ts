import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'node:path'

export default function () {
    return ViteCommonJSConfig('procaptcha-react', path.resolve('./tsconfig.cjs.json'))
}
