import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'node:path'

export default function () {
    return ViteCommonJSConfig('file-server', path.resolve('./tsconfig.cjs.json'))
}
