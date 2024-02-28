// // 42["exec","zelid=15gSe8HrNhVrWph6CTPtpb6nXESqPtgCCe&signature=IO6RAyW26bHKngWgPIUn3wfZO5u9ViLeAADPkdXFDHKbJCRE%2BIrrkNiokkc4uYYV1dzhbGhGgSb%2FXn31I5vb%2BoY%3D&loginPhrase=1709117874375gctifb2qnezsi76hb4gnaucqxknhss3pnokxqrsk1ki","emailTriggerSignupApi_emailTriggerServer","/bin/bash",""]
// import { io } from 'socket.io-client'
// import { loadEnv } from '@prosopo/cli'
// loadEnv()
//
// async function main() {
//     let running = true
//     try {
//         const selectedIp = '176.9.52.22:16186'
//         const url = selectedIp.split(':')[0]
//         const urlPort = selectedIp.split(':')[1] || 16127
//         const zelidauth = process.env.Z
//         const socketUrl = `https://${url.replace(/\./g, '-')}-${urlPort}.node.api.runonflux.io`
//         console.log(socketUrl)
//         const socket = io(socketUrl)
//         socket.on('connect', () => {
//             console.log('connected')
//             console.log(socket.id)
//         })
//         socket.on('connect_error', (err) => {
//             console.log(`connect_error due to ${err.message}`)
//         })
//         socket.on('disconnect', () => {
//             console.log('disconnected')
//             running = false
//         })
//         socket.on('error', (e) => {
//             console.log('error', e)
//             running = false
//         })
//         while (running) {
//             await new Promise((resolve) => setTimeout(resolve, 1000))
//         }
//     } catch (e) {
//         console.error(e)
//         running = false
//     }
// }
// main()
//     .then(() => console.log('done'))
//     .catch((err) => console.error(err))
