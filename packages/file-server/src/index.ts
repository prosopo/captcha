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
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import {
    getFileServerPaths,
    getFileServerPort,
    getFileServerRemotePaths,
    getFileServerResize,
    getLogLevel,
    getEnv as getNodeEnv,
} from '@prosopo/config'
import { isMain } from '@prosopo/util'
import dotenv from 'dotenv'
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
    const nodeEnv = getNodeEnv()
    const path = nodeEnv ? `.env.${nodeEnv}` : '.env'
    dotenv.config({ path })
    return {
        port: getFileServerPort(),
        paths: parseArray(getFileServerPaths()),
        resize: toInt(getFileServerResize()) || undefined, // the size to resize images to, undefined means no resize
        remotes: parseArray(getFileServerRemotePaths()), // the remote servers to proxy to
        logLevel: getLogLevel() || 'info',
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
if (isMain(import.meta.url)) {
    main().catch((error) => {
        console.error(error)
    })
}
