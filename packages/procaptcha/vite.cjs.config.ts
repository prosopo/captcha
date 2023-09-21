import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'path'

export default function () {
    return ViteCommonJSConfig('procaptcha', path.resolve('./tsconfig.cjs.json'))
}
