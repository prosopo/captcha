import { LogLevel, getLogger } from '@prosopo/common'
import { main as authMain, verifyLogin } from './auth.js'
import { io } from 'socket.io-client'
import { loadEnv } from '@prosopo/cli'
loadEnv()
const logger = getLogger(LogLevel.enum.info, 'flux.lib.terminal')

const getSockerURL = (nodeAPIURL: URL) => {
    const urlPort = nodeAPIURL.port || 16127
    return `https://${nodeAPIURL.hostname.replace(/\./g, '-')}-${urlPort}.node.api.runonflux.io`
}

export async function main(publicKey: string, privateKey: Uint8Array, appName: string, ip?: string) {
    let running = true
    try {
        // Get auth details
        const { nodeAPIURL, nodeLoginPhrase, nodeSignature } = await authMain(publicKey, privateKey, appName, ip)

        // Login to the node
        await verifyLogin(publicKey, nodeSignature, nodeLoginPhrase, nodeAPIURL)

        const selectedIp = nodeAPIURL.toString()
        const url = selectedIp.split(':')[0]
        if (!url) throw new Error('No url')
        const socketUrl = getSockerURL(nodeAPIURL)

        const socket = io(socketUrl)
        socket.on('connect', () => {
            logger.info('connected')
            logger.info(socket.id)
        })
        socket.on('message', (message) => {
            socket.emit('message', {
                message,
                id: socket.id,
            })
        })
        socket.on('connect_error', (err) => {
            logger.info(`connect_error due to ${err.message}`)
        })
        socket.on('disconnect', () => {
            logger.info('disconnected')
            running = false
        })
        socket.on('error', (e) => {
            logger.info('error', e)
            running = false
        })
        while (running) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }
    } catch (e) {
        console.error(e)
        running = false
    }
}