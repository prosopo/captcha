import { ProsopoEnvError, ProsopoError, getLogger } from '@prosopo/common'
import { at } from '@prosopo/util'
import { base64Encode } from '@polkadot/util-crypto'
import { errorHandler } from '../errorHandler.js'
import { loadEnv } from '@prosopo/cli'
import { sign, wifToPrivateKey } from './sep256k1Sign.js'

loadEnv()
const log = getLogger(`Info`, `auth.js`)

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

const setupArgs = () => {
    const appName = process.argv.slice(2)[0]
    if (!appName) {
        throw new ProsopoError(Error('Please provide an app name'))
    }

    const secretWIFKey = process.env.PROSOPO_ZELCORE_PRIVATE_KEY
    if (!secretWIFKey) {
        throw new ProsopoEnvError('DEVELOPER.MISSING_ENV_VARIABLE', {
            context: { missingEnvVars: ['PROSOPO_ZELCORE_PRIVATE_KEY'] },
        })
    }
    const zelId = process.env.PROSOPO_ZELCORE_PUBLIC_KEY
    if (!zelId) {
        throw new ProsopoEnvError('DEVELOPER.MISSING_ENV_VARIABLE', {
            context: { missingEnvVars: ['PROSOPO_ZELCORE_PUBLIC_KEY'] },
        })
    }
    const secretKey = wifToPrivateKey(secretWIFKey)
    return { appName, secretKey, zelId }
}

const getLoginPhrase = async (url?: URL): Promise<string> => {
    const apiURL = new URL(`${url || 'https://api.runonflux.io/'}id/loginphrase`)
    log.info('Calling:', apiURL.href)
    const response = await fetch(apiURL.toString())
    return (await errorHandler<ResponseLoginPhrase>(response)).data
}

const getFluxAppsDetails = async (zelId: string, signature: string, loginPhrase: string) => {
    const apiUrl = `https://jetpackbridge.runonflux.io/api/v1/dapps.php?filter=&zelid=${zelId}&signature=${signature}&loginPhrase=${loginPhrase}`
    const response = await fetch(apiUrl)
    return await errorHandler(response)
}

const getNodeAPIURL = (nodeUIURL: string) => {
    const port = at(nodeUIURL.split(':'), 1)
    const portLogin = Number(port) + 1
    const nodeAPIURL = new URL(`http://${nodeUIURL.replace(port, portLogin.toString())}`)
    log.info('Node API URL:', nodeAPIURL)
    return new URL(`http://${nodeUIURL.replace(port, portLogin.toString())}`)
}

const getIndividualFluxAppDetails = async (
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

const getNode = async (appName: string, zelId: string, secretKey: Uint8Array) => {
    // Get Flux login phrase
    const loginPhrase = await getLoginPhrase()
    log.info('Login Phrase:', loginPhrase)

    const signature = base64Encode(await sign(loginPhrase, { secretKey }))
    log.info('Signature:', signature)

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

export async function main(publicKey: string, privateKey: Uint8Array, appName: string, ip?: string) {
    // Get a Flux node
    const nodeUIURL = await getNode(appName, publicKey, privateKey)

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
