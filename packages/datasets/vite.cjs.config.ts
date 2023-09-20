import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'path'

export default function () {
    return ViteCommonJSConfig('datasets', path.resolve('./tsconfig.cjs.json'))
}
