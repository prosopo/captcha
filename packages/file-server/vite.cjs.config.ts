import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'path'

export default function () {
    return ViteCommonJSConfig('file-server', path.resolve('./tsconfig.cjs.json'))
}
