import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'node:path'

export default function () {
    return ViteCommonJSConfig('datasets-fs', path.resolve('./tsconfig.cjs.json'))
}
