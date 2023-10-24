import { at } from '@prosopo/util'
import { base64Encode } from '@polkadot/util-crypto'
import { getLogger } from '@prosopo/common'
import { loadEnv } from '@prosopo/cli'
import { sign, wifToPrivateKey } from './sep256k1Sign.js'
import axios, { AxiosResponse } from 'axios'
import qs from 'qs'

const log = getLogger(`Info`, `fluxDeploy.js`)

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

const errorHandler = (axiosResponse: AxiosResponse) => {
    if (axiosResponse.data && axiosResponse.data.status === 'error') {
        throw new Error(axiosResponse.data.data.message)
    }
    return axiosResponse
}

const getLoginPhrase = async (url?: URL) => {
    const apiURL = new URL(`${url || 'https://api.runonflux.io/'}id/loginphrase`)
    log.info('Calling:', apiURL.href)
    const response = await axios.get(apiURL.toString())
    errorHandler(response)
    return response.data.data
}

const getFluxAppsDetails = async (zelId: string, signature: string, loginPhrase: string) => {
    const apiUrl = `https://jetpackbridge.runonflux.io/api/v1/dapps.php?filter=&zelid=${zelId}&signature=${signature}&loginPhrase=${loginPhrase}`
    const response = await axios.get(apiUrl)
    errorHandler(response)
    return response.data
}

const getIndividualFluxAppDetails = async (
    dappName: string,
    zelId: string,
    signature: string,
    loginPhrase: string
): Promise<DappDataResponse> => {
    const apiUrl = `https://jetpackbridge.runonflux.io/api/v1/dapps.php?dapp=${dappName}&zelid=${zelId}&signature=${signature}&loginPhrase=${loginPhrase}`
    const response = await axios.get(apiUrl)
    errorHandler(response)
    return response.data
}

const getFluxOSURLs = async (dappName: string, zelId: string, signature: string, loginPhrase: string) => {
    const data = await getIndividualFluxAppDetails(dappName, zelId, signature, loginPhrase)
    // return the fluxOS urls
    return Object.values(data.nodes).map((node) => node.fluxos)
}

const verifyLogin = async (zelid: string, signature: string, loginPhrase: string, url?: URL) => {
    const apiUrl = new URL(`${url || 'api.runonfux.io/'}id/verifylogin`).toString()
    const data = qs.stringify({
        zelid,
        signature,
        loginPhrase,
    })
    log.info('Data:', data)
    const response = await axios.post(apiUrl, data, {
        method: 'POST',
        headers: { 'Content-Type': `application/x-www-form-urlencoded` },
    })
    errorHandler(response)
    return response
}

const softRedeploy = async (zelid: string, signature: string, loginPhrase: string, url: URL) => {
    const apiUrl = new URL(`${url}apps/redeploy/imageServer/false/true`).toString()
    const Zelidauth = qs.stringify({
        zelid,
        signature,
        loginPhrase,
    })
    const response = await axios.get(apiUrl, {
        method: 'GET',
        headers: {
            Zelidauth: Zelidauth,
        },
    })
    errorHandler(response)
    return response
}

const setupArgs = () => {
    const appName = process.argv.slice(2)[0]
    if (!appName) {
        throw new Error('Please provide an app name')
    }

    const secretWIFKey = process.env.ZELCORE_PRIVATE_KEY
    if (!secretWIFKey) {
        throw new Error('No private key provided')
    }
    const zelId = process.env.ZELCORE_PUBLIC_KEY
    if (!zelId) {
        throw new Error('No zelId provided')
    }
    const secretKey = wifToPrivateKey(secretWIFKey)
    return { appName, secretKey, zelId }
}

const getNodeAPIURL = (nodeUIURL: string) => {
    const port = at(nodeUIURL.split(':'), 1)
    const portLogin = Number(port) + 1
    const nodeAPIURL = new URL(`http://${nodeUIURL.replace(port, portLogin.toString())}`)
    log.info('Node API URL:', nodeAPIURL)
    return new URL(`http://${nodeUIURL.replace(port, portLogin.toString())}`)
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
        throw new Error('Failed to randomly select node')
    }
    log.info('Node:', node)
    return node
}

;(async () => {
    try {
        loadEnv()

        const { appName, secretKey, zelId } = setupArgs()

        // Get a Flux node
        const nodeUIURL = await getNode(appName, zelId, secretKey)

        // Get the admin API URL as it is different from the UI URL
        const nodeAPIURL = getNodeAPIURL(nodeUIURL)

        // Get a login token from the node
        const nodeLoginPhrase = await getLoginPhrase(nodeAPIURL)
        log.info('Node Login Phrase:', nodeLoginPhrase)

        // Sign the login token with zelcore private key
        const nodeSignature = base64Encode(await sign(nodeLoginPhrase, { secretKey }))
        log.info('Node Signature:', nodeSignature)

        // Login to the node
        await verifyLogin(zelId, nodeSignature, nodeLoginPhrase, nodeAPIURL)

        // Soft redeploy the app
        const redployResponse = await softRedeploy(zelId, nodeSignature, nodeLoginPhrase, nodeAPIURL)

        log.info(redployResponse.data)
        process.exit(0)
    } catch (error) {
        log.error('An error occurred:', error)
        process.exit(1)
    }
})()
