import { ApiParams } from '@prosopo/types'
import { Connection } from 'mongoose'
import { ProcaptchaResponse } from '@prosopo/procaptcha'
import { ProsopoServer } from '@prosopo/server'
import { UserInterface } from '../models/user'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const SubscribeBodySpec = ProcaptchaResponse.merge(
    z.object({
        email: z.string().email(),
        password: z.string(),
    })
)

const signup = async (mongoose: Connection, prosopoServer: ProsopoServer, req, res, next) => {
    try {
        const User = mongoose.model<UserInterface>('User')
        // checks if email exists
        const dbUser = await User.findOne({
            email: req.body.email,
        })
        const payload = SubscribeBodySpec.parse(req.body)
        await prosopoServer.isReady()
        if (dbUser) {
            return res.status(409).json({ message: 'email already exists' })
        }

        if (await prosopoServer.isVerified(payload[ApiParams.procaptchaResponse])) {
            // password hash
            bcrypt.hash(req.body.password, 12, (err, passwordHash) => {
                if (err) {
                    return res.status(500).json({ message: 'couldnt hash the password' })
                } else if (passwordHash) {
                    return User.create({
                        email: req.body.email,
                        name: req.body.name,
                        password: passwordHash,
                    })
                        .then(() => {
                            res.status(200).json({ message: 'user created' })
                        })
                        .catch((err) => {
                            console.log(err)
                            res.status(502).json({ message: 'error while creating the user' })
                        })
                }
            })
        } else {
            res.status(401).json({ message: 'user has not completed a captcha' })
        }
    } catch (err) {
        console.error('error', err)
        res.status(500).json({ message: err.message || 'internal server error' })
    }
}

const login = async (mongoose: Connection, prosopoServer: ProsopoServer, req, res) => {
    const User = mongoose.model<UserInterface>('User')
    await prosopoServer.isReady()
    // checks if email exists
    await User.findOne({
        email: req.body.email,
    })
        .then(async (dbUser) => {
            if (!dbUser) {
                return res.status(404).json({ message: 'user not found' })
            } else {
                const payload = SubscribeBodySpec.parse(req.body)

                if (await prosopoServer.isVerified(payload[ApiParams.procaptchaResponse])) {
                    // password hash
                    bcrypt.compare(req.body.password, dbUser.password, (err, compareRes) => {
                        if (err) {
                            // error while comparing
                            res.status(502).json({ message: 'error while checking user password' })
                        } else if (compareRes) {
                            // password match
                            const token = jwt.sign({ email: req.body.email }, 'secret', { expiresIn: '1h' })
                            res.status(200).json({ message: 'user logged in', token: token })
                        } else {
                            // password doesnt match
                            res.status(401).json({ message: 'invalid credentials' })
                        }
                    })
                }
            }
        })
        .catch((err) => {
            console.error('error', err)
            res.status(500).json({ message: err.message || 'internal server error' })
        })
}

const isAuth = (req, res) => {
    const authHeader = req.get('Authorization')
    if (!authHeader) {
        return res.status(401).json({ message: 'not authenticated' })
    }

    const token = authHeader.split(' ')[1]
    let decodedToken
    try {
        decodedToken = jwt.verify(token, 'secret')
    } catch (err) {
        return res.status(500).json({ message: err.message || 'could not decode the token' })
    }

    if (!decodedToken) {
        res.status(401).json({ message: 'unauthorized' })
    } else {
        res.status(200).json({ message: 'here is your resource' })
    }
}

export { signup, login, isAuth }
