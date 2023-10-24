import { at } from '@prosopo/util'
import { base64Encode } from '@polkadot/util-crypto'
import { loadEnv } from '@prosopo/cli'
import { sign, wifToPrivateKey } from './sep256k1Sign.js'
import axios, { AxiosResponse } from 'axios'
import qs from 'qs'

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

async function getLoginPhrase(url?: URL) {
    const apiURL = new URL(`${url || 'https://api.runonflux.io/'}id/loginphrase`)
    console.log('Calling:', apiURL)
    const response = await axios.get(apiURL.toString())
    errorHandler(response)
    return response.data.data
}

async function getFluxAppsDetails(zelId: string, signature: string, loginPhrase: string) {
    const apiUrl = `https://jetpackbridge.runonflux.io/api/v1/dapps.php?filter=&zelid=${zelId}&signature=${signature}&loginPhrase=${loginPhrase}`
    const response = await axios.get(apiUrl)
    errorHandler(response)
    return response.data
}

async function getIndividualFluxAppDetails(
    dappName: string,
    zelId: string,
    signature: string,
    loginPhrase: string
): Promise<DappDataResponse> {
    const apiUrl = `https://jetpackbridge.runonflux.io/api/v1/dapps.php?dapp=${dappName}&zelid=${zelId}&signature=${signature}&loginPhrase=${loginPhrase}`
    const response = await axios.get(apiUrl)
    errorHandler(response)
    return response.data
}

async function getFluxOSURLs(dappName: string, zelId: string, signature: string, loginPhrase: string) {
    const data = await getIndividualFluxAppDetails(dappName, zelId, signature, loginPhrase)
    // return the fluxOS urls
    return Object.values(data.nodes).map((node) => node.fluxos)
}

async function verifyLogin(zelid: string, signature: string, loginPhrase: string, url?: URL) {
    const apiUrl = new URL(`${url || 'api.runonfux.io/'}id/verifylogin`).toString()
    const data = qs.stringify({
        zelid,
        signature,
        loginPhrase,
    })
    console.log('Data:', data)
    const response = await axios.post(apiUrl, data, {
        method: 'POST',
        headers: { 'Content-Type': `application/x-www-form-urlencoded` },
    })
    errorHandler(response)
    return response
}

async function softRedeploy(zelid: string, signature: string, loginPhrase: string, url: URL) {
    const apiUrl = new URL(`${url}apps/redeploy/imageServer/false/true`).toString()
    const data = qs.stringify({
        zelid,
        signature,
        loginPhrase,
    })
    const response = await axios.get(apiUrl, {
        method: 'GET',
        headers: {
            Zelidauth: data,
        },
    })
    errorHandler(response)
    return response
}

;(async () => {
    try {
        loadEnv()

        // Step 1: Get Flux login phrase
        const loginPhrase = await getLoginPhrase()
        console.log('Login Phrase:', loginPhrase)

        // Step 2: Sign data with zelcore private key
        const privateKey = process.env.ZELCORE_PRIVATE_KEY
        if (!privateKey) {
            throw new Error('No private key provided')
        }
        const secretKey = wifToPrivateKey(privateKey)

        const message = 'Your Message to Sign'
        const signature = base64Encode(await sign(message, { secretKey }))
        console.log('Signature:', signature)

        // Step 3: Get details of Flux apps
        const zelId = '15gSe8HrNhVrWph6CTPtpb6nXESqPtgCCe' // Replace with your zelId
        // const fluxAppsDetails = await getFluxAppsDetails(zelId, signature, loginPhrase)
        // console.log('Flux Apps Details:', fluxAppsDetails)

        // Step 4: Get details of individual Flux app
        const dappName = 'imageServer' // Replace with the app name you want to fetch
        const individualNodeIPs = await getFluxOSURLs(dappName, zelId, signature, loginPhrase)
        console.log('Individual Node IPs:', individualNodeIPs)

        // Step 5: Choose a node at random from individualNodeIPs
        const node = individualNodeIPs[Math.floor(Math.random() * individualNodeIPs.length)]
        if (!node) {
            throw new Error('Failed to randomly select node')
        }
        console.log('Node:', node)
        const port = at(node.split(':'), 1)
        const portLogin = Number(port) + 1
        console.log('Port:', port)
        console.log('Port Login:', portLogin)
        const nodeAPIURL = new URL(`http://${node.replace(port, portLogin.toString())}`)

        // Step 6: Get a login token from the node
        const nodeLoginPhrase = await getLoginPhrase(nodeAPIURL)
        console.log('Node Login Phrase:', nodeLoginPhrase)

        // Step 7: Sign the login token with zelcore private key
        const nodeSignature = base64Encode(await sign(nodeLoginPhrase, { secretKey }))
        console.log('Node Signature:', nodeSignature)

        // Step 8: Login to the node
        const nodeLoginResponse = await verifyLogin(zelId, nodeSignature, nodeLoginPhrase, nodeAPIURL)
        console.log(nodeLoginResponse.headers['set-cookie'])

        // Step9 .Redeploy the app
        const redployResponse = await softRedeploy(zelId, nodeSignature, nodeLoginPhrase, nodeAPIURL)

        console.log(redployResponse.data)
        process.exit(0)
    } catch (error) {
        console.error('An error occurred:', error)
        process.exit(1)
    }
})()
