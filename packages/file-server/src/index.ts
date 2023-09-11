import { dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import esMain from 'es-main'
import express, { Request, Response } from 'express'
import fetch from 'node-fetch'
import sharp from 'sharp'
import stream from 'stream'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const parseArray = (value: string) => {
    try {
        return JSON.parse(value)
    } catch (error) {
        return [value]
    }
}

const toInt = (value: string | number | undefined) => {
    if (typeof value === 'number') {
        return value
    }
    if (value === undefined) {
        return undefined
    }
    return parseInt(value)
}

const getEnv = () => {
    const path = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'
    dotenv.config({ path })
    return {
        port: process.env.PORT || 3000,
        paths: parseArray(process.env.PATHS || '[]'),
        resize: toInt(process.env.RESIZE) || undefined, // the size to resize images to, undefined means no resize
        remotes: parseArray(process.env.REMOTES || '[]'), // the remote servers to proxy to
        logLevel: process.env.LOG_LEVEL || 'info',
    }
}

const main = async () => {
    const env = getEnv()

    const app = express()

    env.paths.forEach((loc: string) => {
        // allow local filesystem lookup at each location
        // http://localhost:3000/a.jpg
        // serve path set to /
        // url: pronode1.duckdns.org/img/a.jpg
        // serve path set to /img
        // url: pronode1.duckdns.org/a.jpg`
        app.use('/', express.static(loc))
        console.info(`Serving files from ${loc}`)
    })

    app.get('*', async (req: Request, res: Response) => {
        for (const remote of env.remotes) {
            console.info('trying', remote, req.url)
            let img
            try {
                const result = await fetch(`${remote}${req.url}`)
                if (result.status !== 200) {
                    console.warn('not found', remote, req.url, req.statusCode)
                    continue
                }
                console.info('found', remote, req.url)
                img = await result.arrayBuffer()
                img = Buffer.from(img)
            } catch (error) {
                console.warn('error', remote, req.url, error)
                continue
            }
            if (env.resize) {
                console.info('resizing', remote, req.url, env.resize)
                img = await sharp(img)
                    .resize({
                        width: env.resize,
                        height: env.resize,
                        fit: 'fill',
                    })
                    .toBuffer()
            }
            stream.Readable.from(img).pipe(res)
            return
        }
        // could not find file in any remote
        res.status(404).send('Not found')
    })

    // only run server if locations have been specified
    app.listen(env.port, () => {
        console.info(`File server running on port ${env.port}`)
    })
}

//if main process
if (esMain(import.meta)) {
    main().catch((error) => {
        console.error(error)
    })
}
