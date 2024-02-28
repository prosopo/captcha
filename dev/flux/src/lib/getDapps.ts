import { ProsopoEnvError } from '@prosopo/common'
import { errorHandler } from '../errorHandler.js'
import { getAuth, verifyLogin } from './auth.js'
import { getURLProtocol } from '@prosopo/util'

const nodeAPIURL = new URL('https://jetpackbridge.runonflux.io/')

export const main = async (publicKey: string, privateKey: Uint8Array) => {
    try {
        const { signature, loginPhrase } = await getAuth(privateKey)

        // Login to the node
        await verifyLogin(publicKey, signature, loginPhrase)
        console.log(nodeAPIURL)
        return getDappDetails(nodeAPIURL, publicKey, signature, loginPhrase)
    } catch (e) {
        console.error(e)
        throw new ProsopoEnvError('DEVELOPER.GENERAL', {
            context: { error: e },
        })
    }
}

async function getDappDetails(nodeUrl: URL, publicKey: string, signature: string, loginPhrase: string) {
    const protocol = getURLProtocol(nodeAPIURL)
    const apiUrl = new URL(
        `${protocol}://${nodeUrl.host}/api/v1/dapps.php?filter=&zelid=${publicKey}&signature=${signature}&loginPhrase=${loginPhrase}`
    )
    const response = await fetch(apiUrl)
    return await errorHandler(response)
}
