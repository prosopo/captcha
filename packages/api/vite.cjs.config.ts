import path from 'node:path'
import { ViteCommonJSConfig } from '@prosopo/config'

export default function () {
    return ViteCommonJSConfig('api', path.resolve('./tsconfig.cjs.json'))
}
