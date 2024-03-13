import path from 'node:path'
import { ViteCommonJSConfig } from '@prosopo/config'

export default function () {
    return ViteCommonJSConfig('datasets-fs', path.resolve('./tsconfig.cjs.json'))
}
