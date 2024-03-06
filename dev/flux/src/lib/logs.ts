import { FLUX_URL, main as authMain, getAuth, getIndividualFluxAppDetails, verifyLogin } from './auth.js'
import { at } from '@prosopo/util'
import { getLogger } from '@prosopo/common'
import { getSocketURL, getZelIdAuthHeader, prefixIPAddress } from './url.js'

const log = getLogger(`Info`, `logs.js`)

async function getLogs(
    zelid: string,
    signature: string,
    loginPhrase: string,
    nodeAPIURL: URL,
    appName: string,
    appComponentName: string,
    lineCount = 100
) {
    lineCount = Math.min(lineCount, 1000)
    // https://176-9-52-22-16187.node.api.runonflux.io/apps/applog/emailTriggerSignupApi_emailTriggerServer/100
    const socketURL = getSocketURL(nodeAPIURL)
    const apiUrl = new URL(`/apps/applog/${appComponentName}_${appName}/${lineCount}`, socketURL.href)
    const Zelidauth = getZelIdAuthHeader(zelid, signature, loginPhrase)
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            Zelidauth: Zelidauth,
        },
    })
    return await response.text()
}

export const main = async (
    publicKey: string,
    privateKey: Uint8Array,
    appName: string,
    ip?: string,
    lineCount?: number
) => {
    try {
        const { signature, loginPhrase } = await getAuth(privateKey, FLUX_URL)
        const dapp = await getIndividualFluxAppDetails(appName, publicKey, signature, loginPhrase)
        const appComponentName = at(dapp.components_new, 0)['Component Name']

        let ips: URL[] = []
        if (ip) {
            ips.push(prefixIPAddress(ip))
        } else {
            if (dapp.nodes !== undefined) {
                log.info(dapp.nodes)
                // take the fluxos urls from the dapp (these are different to the API URLs)
                ips = ips.concat(Object.values(dapp.nodes).map((node) => new URL(prefixIPAddress(node.fluxos))))
            }
        }
        const logPromises: Promise<{ url: string; logs: string }>[] = ips.map(async (ip) => {
            // Get auth details
            const { nodeAPIURL, nodeLoginPhrase, nodeSignature } = await authMain(
                publicKey,
                privateKey,
                appName,
                ip.href
            )

            // Login to the node
            await verifyLogin(publicKey, nodeSignature, nodeLoginPhrase, nodeAPIURL)

            // Get the logs for the app
            return {
                url: ip.href,
                logs: await getLogs(
                    publicKey,
                    nodeSignature,
                    nodeLoginPhrase,
                    nodeAPIURL,
                    appName,
                    appComponentName,
                    lineCount
                ),
            }
        })

        return await Promise.all(logPromises)
    } catch (error) {
        log.error('An error occurred:', error)
        process.exit(1)
    }
}
