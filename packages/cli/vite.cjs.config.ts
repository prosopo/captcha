import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'path'

export default function () {
    return ViteCommonJSConfig('cli', path.resolve('./tsconfig.cjs.json'))
}
