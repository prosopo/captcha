import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'node:path'

export default function () {
    return ViteCommonJSConfig('types-database', path.resolve('./tsconfig.cjs.json'))
}
