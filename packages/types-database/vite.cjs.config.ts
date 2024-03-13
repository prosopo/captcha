import path from 'node:path'
import { ViteCommonJSConfig } from '@prosopo/config'

export default function () {
    return ViteCommonJSConfig('types-database', path.resolve('./tsconfig.cjs.json'))
}
