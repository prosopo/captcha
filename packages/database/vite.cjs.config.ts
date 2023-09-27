import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'path'

export default function () {
    return ViteCommonJSConfig('database', path.resolve('./tsconfig.cjs.json'))
}
