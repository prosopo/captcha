// import { Keyring } from '@polkadot/keyring'
// import { ProviderEnvironment } from '@prosopo/types-env'
// import express, { Router } from 'express'
// import jwt from 'jsonwebtoken'

// /**
//  * Admin router with auth, temp example
//  *
//  * @return {Router} - router stuff
//  * @param {Environment} env - env stuff
//  */
// export function adminRouter(env: ProviderEnvironment): Router {
//     const keyring = new Keyring({ type: 'sr25519' })

//     const router = express.Router()

//     // Middleware to verify auth token
//     const authMiddleware = (req, res, next) => {
//         const authHeader = req.headers.authorization

//         if (authHeader) {
//             const token = authHeader.split(' ')[1]

//             // Verify token using the public key
//             jwt.verify(token, env.config.account.address, (err, user) => {
//                 if (err) {
//                     return res.sendStatus(403)
//                 }

//                 req.user = user
//                 next()
//             })
//         } else {
//             res.sendStatus(401)
//         }
//     }

//     // Endpoint to authenticate user using Polkadot network for signing messages
//     router.post('/auth', async (req, res) => {
//         const { message, signature } = req.body

//         try {
//             const address = env.config.account.address
//             const pair = keyring.addFromAddress(env.config.account.address)
//             const isValid = pair.verify(message, signature, address)

//             if (isValid) {
//                 const user = { address }

//                 // temp jwt, need to verify usage with correct imports and types
//                 const accessToken = jwt.sign(user, env.config.account.secret, { expiresIn: '1h' })

//                 return res.json({ accessToken })
//             } else {
//                 return res.status(401).json({ message: 'bad auth' })
//             }
//         } catch (err) {
//             // todo needs proper prosopo error handling
//             return res.status(500).json({ message: 'An error occurred' })
//         }
//     })

//     // Secure endpoint which requires auth token to access
//     router.get('/secure', authMiddleware, (req, res) => {
//         res.json({ message: 'correct auth' })
//     })

//     return router
// }
