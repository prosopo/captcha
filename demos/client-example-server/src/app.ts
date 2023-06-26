import { ProsopoServer } from '@prosopo/server'
import connectionFactory from './utils/connection'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import memoryServerSetup from './utils/database'
import path from 'path'
import prosopoConfig from './prosopo.config'
import routesFactory from './routes/routes'

export function loadEnv() {
    dotenv.config({ path: getEnvFile() })
}

export function getEnvFile(filename = '.env', filepath = './') {
    const env = process.env.NODE_ENV || 'development'
    return path.join(filepath, `${filename}.${env}`)
}

async function main() {
    loadEnv()

    const app = express()

    app.use(cors({ origin: true, credentials: true }))

    app.use(express.urlencoded({ extended: true }))

    app.use(express.json())

    app.use((_, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE')
        res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Auth-Token, Authorization')
        next()
    })

    app.options('/*', (_, res) => {
        res.sendStatus(200)
    })

    const uri = await memoryServerSetup()
    console.log('mongo uri', uri)
    const mongoose = connectionFactory(uri)
    if (!process.env.REACT_APP_SERVER_MNEMONIC) {
        throw new Error('No mnemonic found')
    }

    const config = prosopoConfig()

    console.log('config', config)

    const prosopoServer = new ProsopoServer(process.env.REACT_APP_SERVER_MNEMONIC, config)

    app.use(routesFactory(mongoose, prosopoServer))

    app.listen(process.env.REACT_APP_SERVER_PORT)
}

main()
    .then(() => {
        console.log('Server started')
    })
    .catch((err) => {
        console.log(err)
        process.exit()
    })
