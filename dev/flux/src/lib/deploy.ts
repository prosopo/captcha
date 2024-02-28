import { main as authMain } from './auth.js'
import { errorHandler } from '../errorHandler.js'
import { getLogger } from '@prosopo/common'
import qs from 'qs'

const log = getLogger(`Info`, `deploy.js`)

interface ResponseSoftRedeploy {
    status: string
    data: { message: string }
}

const verifyLogin = async (zelid: string, signature: string, loginPhrase: string, url?: URL) => {
    const apiUrl = new URL(`${url || 'api.runonflux.io/'}id/verifylogin`).toString()
    const data = qs.stringify({
        zelid,
        signature,
        loginPhrase,
    })
    log.info('Data:', data)
    log.info('apiUrl:', apiUrl)
    const response = await fetch(apiUrl, {
        method: 'POST',
        body: data,
        headers: { 'Content-Type': `application/x-www-form-urlencoded` },
    })
    return await errorHandler(response)
}

const reDeploy = async (
    zelid: string,
    signature: string,
    loginPhrase: string,
    url: URL,
    appName: string,
    hard = false
) => {
    const apiUrl = new URL(`${url}apps/redeploy/${appName}/${hard}/true`).toString()
    const Zelidauth = qs.stringify({
        zelid,
        signature,
        loginPhrase,
    })
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            Zelidauth: Zelidauth,
        },
    })
    return await errorHandler<ResponseSoftRedeploy>(response)
}
export const main = async (publicKey: string, privateKey: Uint8Array, appName: string, ip?: string, hard?: boolean) => {
    try {
        const { nodeAPIURL, nodeLoginPhrase, nodeSignature } = await authMain(publicKey, privateKey, appName, ip)

        // Login to the node
        await verifyLogin(publicKey, nodeSignature, nodeLoginPhrase, nodeAPIURL)

        // Soft redeploy the app
        const redeployResponse = await reDeploy(publicKey, nodeSignature, nodeLoginPhrase, nodeAPIURL, appName, hard)

        log.info(redeployResponse)
        process.exit(0)
    } catch (error) {
        log.error('An error occurred:', error)
        process.exit(1)
    }
}
