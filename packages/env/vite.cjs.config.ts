import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'node:path'

export default function () {
    return ViteCommonJSConfig('env', path.resolve('./tsconfig.cjs.json'))
}
