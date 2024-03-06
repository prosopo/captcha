import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'path'

export default function () {
    return ViteCommonJSConfig('web-components', path.resolve('./tsconfig.cjs.json'))
}
