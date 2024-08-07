// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { ApiParams, ProcaptchaToken, ProsopoServerConfigOutput } from '@prosopo/types'
import { Connection } from 'mongoose'
import { NextFunction, Request, Response } from 'express'
import { ProcaptchaResponse } from '@prosopo/types'
import { ProsopoEnvError } from '@prosopo/common'
import { ProsopoServer } from '@prosopo/server'
import { UserInterface } from '../models/user.js'
import { at } from '@prosopo/util'
import { blake2b } from '@noble/hashes/blake2b'
import { getPairAsync } from '@prosopo/contract'
import { randomAsHex } from '@polkadot/util-crypto'
import { u8aToHex } from '@polkadot/util'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const SubscribeBodySpec = ProcaptchaResponse.merge(
    z.object({
        email: z.string().email(),
        password: z.string(),
    })
)

function hashPassword(password: string): string {
    return u8aToHex(blake2b(password))
}

const verify = async (
    prosopoServer: ProsopoServer,
    verifyType: string,
    verifyEndpoint: string,
    token: ProcaptchaToken,
    secret: string
) => {
    if (verifyType === 'api') {
        // verify using the API endpoint
        console.log('Verifying using the API endpoint', verifyEndpoint)

        const response = await fetch(verifyEndpoint, {
            method: 'POST',
            body: JSON.stringify({ [ApiParams.token]: token, [ApiParams.secret]: secret }),
        })
        console.log('Status:', response.status, 'Status Text:', response.statusText)

        const verified = (await response.json()).verified

        console.log(`Verified: ${verified}`)

        return verified
    } else {
        // verify using the TypeScript library
        console.log('Verifying using the TypeScript library')

        const verified = await prosopoServer.isVerified(token)

        console.log(`Verified: ${verified}`)

        return await prosopoServer.isVerified(token)
    }
}

const signup = async (
    mongoose: Connection,
    config: ProsopoServerConfigOutput,
    verifyEndpoint: string,
    verifyType: string,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const User = mongoose.model<UserInterface>('User')
        // checks if email exists
        const dbUser = await User.findOne({
            email: req.body.email,
        })
        const payload = SubscribeBodySpec.parse(req.body)
        const pair = await getPairAsync(config.networks[config.defaultNetwork], config.account.secret)
        const prosopoServer = new ProsopoServer(config, pair)
        await prosopoServer.isReady()
        if (dbUser) {
            return res.status(409).json({ message: 'email already exists' })
        }
        console.log('Request payload', payload)

        // get the procaptcha-response token
        const token = payload[ApiParams.procaptchaResponse]

        console.log('Sending Procaptcha token', token)

        if (!config.account.secret) {
            throw new ProsopoEnvError('GENERAL.MNEMONIC_UNDEFINED', {
                context: { missingParams: ['PROSOPO_SITE_PRIVATE_KEY'] },
            })
        }

        const verified = await verify(prosopoServer, verifyType, verifyEndpoint, token, config.account.secret)

        if (verified) {
            // salt
            const salt = randomAsHex(32)
            // !!!DUMMY CODE!!! - Do not use in production. Use bcrypt or similar for password hashing.
            const passwordHash = hashPassword(`${req.body.password}${salt}`)
            if (passwordHash) {
                return User.create({
                    email: req.body.email,
                    name: req.body.name,
                    password: passwordHash,
                    salt: salt,
                })
                    .then(() => {
                        res.status(200).json({ message: 'user created' })
                    })
                    .catch((err) => {
                        console.log(err)
                        res.status(502).json({ message: 'error while creating the user' })
                    })
            }
        } else {
            res.status(401).json({ message: 'user has not completed a captcha' })
        }
    } catch (err) {
        console.error('error', err)
        res.status(500).json({ message: (err as Error).message || 'internal server error' })
    }
}

const login = async (
    mongoose: Connection,
    config: ProsopoServerConfigOutput,
    verifyEndpoint: string,
    verifyType: string,
    req: Request,
    res: Response
) => {
    const User = mongoose.model<UserInterface>('User')
    const pair = await getPairAsync(config.networks[config.defaultNetwork], config.account.secret)
    const prosopoServer = new ProsopoServer(config, pair)
    await prosopoServer.isReady()
    // checks if email exists
    await User.findOne({
        email: req.body.email,
    })
        .then(async (dbUser) => {
            if (!dbUser) {
                res.status(404).json({ message: 'user not found' })
            } else {
                const payload = SubscribeBodySpec.parse(req.body[ApiParams.procaptchaResponse])

                const token = payload[ApiParams.procaptchaResponse]

                if (!config.account.secret) {
                    throw new ProsopoEnvError('GENERAL.MNEMONIC_UNDEFINED', {
                        context: { missingParams: ['PROSOPO_SITE_PRIVATE_KEY'] },
                    })
                }

                const verified = await verify(prosopoServer, verifyType, verifyEndpoint, token, config.account.secret)

                if (verified) {
                    // password hash
                    // !!!DUMMY CODE!!! - Do not use in production. Use bcrypt or similar for password hashing.
                    const passwordHash = hashPassword(`${req.body.password}${dbUser.salt}`)
                    if (passwordHash !== dbUser.password) {
                        // password doesnt match
                        res.status(401).json({ message: 'invalid credentials' })
                    } else {
                        // password match
                        const token = jwt.sign({ email: req.body.email }, 'secret', { expiresIn: '1h' })
                        res.status(200).json({ message: 'user logged in', token: token })
                    }
                }
            }
        })
        .catch((err) => {
            console.error('error', err)
            res.status(500).json({ message: err.message || 'internal server error' })
        })
}

const isAuth = (req: Request, res: Response) => {
    const authHeader = req.get('Authorization') || ''
    if (!authHeader) {
        res.status(401).json({ message: 'not authenticated' })
    }

    const token = at(authHeader.split(' '), 1)
    let decodedToken
    try {
        decodedToken = jwt.verify(token, 'secret')
    } catch (err) {
        res.status(500).json({ message: (err as Error).message || 'could not decode the token' })
    }

    if (!decodedToken) {
        res.status(401).json({ message: 'unauthorized' })
    } else {
        res.status(200).json({ message: 'here is your resource' })
    }
}

export { signup, login, isAuth }
