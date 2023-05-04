import bcrypt from 'bcryptjs'

import jwt from 'jsonwebtoken'

import { UserInterface } from '../models/user'
import { Connection } from 'mongoose'
import { ProsopoServer } from '@prosopo/server'

const signup = async (mongoose: Connection, prosopoServer: ProsopoServer, req, res, next) => {
    try {
        const User = mongoose.model<UserInterface>('User')
        // checks if email exists
        const dbUser = await User.findOne({
            email: req.body.email,
        })
        await prosopoServer.isReady()
        if (dbUser) {
            return res.status(409).json({ message: 'email already exists' })
        } else if (
            req.body.email &&
            req.body.password &&
            req.body.prosopo &&
            req.body.prosopo.userAccountAddress &&
            req.body.prosopo.blockNumber
        ) {
            console.log(req.body)
            if (
                await prosopoServer.isVerified(
                    req.body.prosopo.userAccountAddress,
                    req.body.prosopo.providerUrl,
                    req.body.prosopo.commitmentId,
                    req.body.prosopo.blockNumber
                )
            ) {
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
        } else if (!req.body.password) {
            return res.status(400).json({ message: 'password not provided' })
        } else if (!req.body.email) {
            return res.status(400).json({ message: 'email not provided' })
        } else {
            return res.status(500).json({ message: 'internal server error' })
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
                if (
                    req.body.email &&
                    req.body.password &&
                    req.body.prosopo &&
                    req.body.prosopo.userAccountAddress &&
                    req.body.prosopo.blockNumber
                ) {
                    console.log(req.body)
                    if (
                        await prosopoServer.isVerified(
                            req.body.prosopo.userAccountAddress,
                            req.body.prosopo.providerUrl,
                            req.body.prosopo.commitmentId,
                            req.body.prosopo.blockNumber
                        )
                    ) {
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
