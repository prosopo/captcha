import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'path'

export default function () {
    return ViteCommonJSConfig('procaptcha-frictionless', path.resolve('./tsconfig.cjs.json'))
}
