import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'path'

export default function () {
    return ViteCommonJSConfig('provider', path.resolve('./tsconfig.cjs.json'))
}
