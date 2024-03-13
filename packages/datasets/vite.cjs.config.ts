import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'node:path'

export default function () {
    return ViteCommonJSConfig('datasets', path.resolve('./tsconfig.cjs.json'))
}
