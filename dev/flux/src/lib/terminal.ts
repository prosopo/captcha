// // 42["exec","zelid=15gSe8HrNhVrWph6CTPtpb6nXESqPtgCCe&signature=IO6RAyW26bHKngWgPIUn3wfZO5u9ViLeAADPkdXFDHKbJCRE%2BIrrkNiokkc4uYYV1dzhbGhGgSb%2FXn31I5vb%2BoY%3D&loginPhrase=1709117874375gctifb2qnezsi76hb4gnaucqxknhss3pnokxqrsk1ki","emailTriggerSignupApi_emailTriggerServer","/bin/bash",""]
import { main as authMain, verifyLogin } from './auth.js'
import { io } from 'socket.io-client'
import { loadEnv } from '@prosopo/cli'
loadEnv()

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
            console.log('connected')
            console.log(socket.id)
        })
        socket.on('connect_error', (err) => {
            console.log(`connect_error due to ${err.message}`)
        })
        socket.on('disconnect', () => {
            console.log('disconnected')
            running = false
        })
        socket.on('error', (e) => {
            console.log('error', e)
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
