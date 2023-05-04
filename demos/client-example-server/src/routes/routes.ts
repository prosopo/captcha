import { isAuth, login, signup } from '../controllers/auth'
import express from 'express'
import { Connection } from 'mongoose'
import { ProsopoServer } from '@prosopo/server'

const router = express.Router()

function getRoutes(mongoose: Connection, prosopoServer: ProsopoServer): express.Router {
    router.post('/login', login.bind(null, mongoose, prosopoServer))

    router.post('/signup', signup.bind(null, mongoose, prosopoServer))

    router.get('/private', isAuth)

    router.get('/public', (req, res) => {
        res.status(200).json({ message: 'here is your public resource' })
    })

    // will match any other path
    router.use('/', (req, res) => {
        res.status(404).json({ error: 'page not found' })
    })
    return router
}

export default getRoutes
