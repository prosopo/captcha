import { ProsopoEnvError } from '@prosopo/common'
import { wifToPrivateKey } from '../lib/sep256k1Sign.js'

export const getPrivateKey = () => {
    const secret = process.env['PROSOPO_ZELCORE_PRIVATE_KEY']
    if (!secret) {
        throw new ProsopoEnvError('DEVELOPER.MISSING_ENV_VARIABLE', {
            context: { missingEnvVars: ['PROSOPO_ZELCORE_PRIVATE_KEY'] },
        })
    }
    return wifToPrivateKey(secret)
}

export const getPublicKey = () => {
    const secret = process.env['PROSOPO_ZELCORE_PUBLIC_KEY']
    if (!secret) {
        throw new ProsopoEnvError('DEVELOPER.MISSING_ENV_VARIABLE', {
            context: { missingEnvVars: ['PROSOPO_ZELCORE_PUBLIC_KEY'] },
        })
    }

    return secret
}
