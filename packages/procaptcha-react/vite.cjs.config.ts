import { ViteCommonJSConfig } from '@prosopo/config'
import path from 'path'

export default function () {
    return ViteCommonJSConfig('procaptcha-react', path.resolve('./tsconfig.cjs.json'))
}
