import { ProsopoError, getLogger } from '@prosopo/common'
import { base64Encode } from '@polkadot/util-crypto'
import { errorHandler } from '../errorHandler.js'
import { loadEnv } from '@prosopo/cli'
import { sign } from './sep256k1Sign.js'
import qs from 'qs'

loadEnv()
const log = getLogger(`Info`, `auth.js`)
const FLUX_URL = 'https://api.runonflux.io/'

interface ResponseLoginPhrase {
    status: string
    data: string
}

interface DappDataResponse {
    _id: string
    name_id: string
    active: boolean
    api_version: number
    contacts: string[]
    description: string
    expires: number
    expires_block: number
    expires_date: string
    expires_in: string
    fee: string
    geolocation: [
        string,
        {
            type: string
            cont: string
            contText: string
            data: string
            btn: string
        },
    ]
    hash: string
    hash_abbr: string
    instances: number
    lifetime_fees: number
    live: number
    name: string
    owner: string
    registered: number
    registered_date: string
    sync_date: string
    txid: string
    txs: { [key: string]: Transaction }
    updated: number
    updated_date: string
    url: string
    owner_abbr: string
    nodes_assigned: Node[]
    nodes: { [key: string]: NodeInfo }
    components_new: {
        'Component Name': string
        'Component Ref': string
        Repository: string
        'Env Vars': string
        'Run Cmd': string
        Domains: string
        Directory: string
        'Public Port(s)': string
        'Private Port(s)': string
        'CPU Cores': number
        'RAM Memory': number
        'SSD Storage': number
    }[]
    domains: string[]
}

interface Node {
    ip: string
    name: string
    broadcastedAt: string
    expireAt: string
    hash: string
}

interface NodeInfo {
    url: string
    fluxos: string
    ip: string
    location: string
    hash: string
    hash_abbr: string
}

interface Transaction {
    fee: string
    owner: string
    tx: string
    date: string
    expire: number
}

export const verifyLogin = async (zelid: string, signature: string, loginPhrase: string, url?: URL) => {
    const apiUrl = new URL(`${url || FLUX_URL}id/verifylogin`).toString()
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

const getLoginPhrase = async (url?: URL): Promise<string> => {
    const apiURL = new URL(`${url || FLUX_URL}id/loginphrase`)
    log.info('Calling:', apiURL.href)
    const response = await fetch(apiURL.toString())
    return (await errorHandler<ResponseLoginPhrase>(response)).data
}

export const getNodeAPIURL = (nodeUIURL: string) => {
    if (!nodeUIURL.startsWith('http')) {
        nodeUIURL = `http://${nodeUIURL}`
    }
    const url = new URL(nodeUIURL)
    if (url.port) {
        const portLogin = Number(url.port) + 1
        return new URL(`http://${url.hostname}:${portLogin}`)
    }
    return new URL(`http://${url.hostname}:${16187}`)
}

export const getIndividualFluxAppDetails = async (
    dappName: string,
    zelId: string,
    signature: string,
    loginPhrase: string
): Promise<DappDataResponse> => {
    const apiUrl = `https://jetpackbridge.runonflux.io/api/v1/dapps.php?dapp=${dappName}&zelid=${zelId}&signature=${signature}&loginPhrase=${loginPhrase}`
    const response = await fetch(apiUrl)
    return await errorHandler(response)
}

const getFluxOSURLs = async (dappName: string, zelId: string, signature: string, loginPhrase: string) => {
    const data = await getIndividualFluxAppDetails(dappName, zelId, signature, loginPhrase)
    // return the fluxOS urls
    return Object.values(data.nodes).map((node) => node.fluxos)
}

export const getAuth = async (secretKey: Uint8Array) => {
    // Get Flux login phrase
    const loginPhrase = await getLoginPhrase()
    log.info('Login Phrase:', loginPhrase)

    const signature = base64Encode(await sign(loginPhrase, { secretKey }))
    log.info('Signature:', signature)
    return { signature, loginPhrase }
}

const getNode = async (appName: string, zelId: string, signature: string, loginPhrase: string) => {
    // Get details of individual Flux app
    const individualNodeIPs = await getFluxOSURLs(appName, zelId, signature, loginPhrase)
    log.info('Individual Node IPs:', individualNodeIPs)

    // Choose a node at random from individualNodeIPs
    const node = individualNodeIPs[Math.floor(Math.random() * individualNodeIPs.length)]
    if (!node) {
        throw new ProsopoError('DEVELOPER.GENERAL', {
            context: { error: 'Failed to randomly select node', appName, zelId, individualNodeIPs },
        })
    }
    log.info('Node:', node)
    return node
}

export async function main(publicKey: string, privateKey: Uint8Array, appName?: string, ip?: string) {
    let nodeUIURL = ip
    const { signature, loginPhrase } = await getAuth(privateKey)

    if (appName) {
        // Get a Flux node if one has not been supplied
        nodeUIURL = await getNode(appName, publicKey, signature, loginPhrase)
    }

    if (!nodeUIURL) {
        // assume we only want authentication with main Flux API
        return { nodeAPIURL: new URL(FLUX_URL), nodeLoginPhrase: loginPhrase, nodeSignature: signature }
    }

    // Get the admin API URL as it is different from the UI URL
    const nodeAPIURL = getNodeAPIURL(nodeUIURL)

    // Get a login token from the node
    const nodeLoginPhrase = await getLoginPhrase(nodeAPIURL)
    log.info('Node Login Phrase:', nodeLoginPhrase)

    // Sign the login token with zelcore private key
    const nodeSignature = base64Encode(await sign(nodeLoginPhrase, { secretKey: privateKey }))
    log.info('Node Signature:', nodeSignature)

    return { nodeAPIURL, nodeLoginPhrase, nodeSignature }
}
