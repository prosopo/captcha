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
import * as path from 'path'
import { VitePluginCloseAndCopy } from '@prosopo/config'
import { VitePluginWatchWorkspace } from '@prosopo/vite-plugin-watch-workspace'
import { defineConfig } from 'vite'
import { getLogger } from '@prosopo/common'
import { loadEnv } from '@prosopo/cli'
import react from '@vitejs/plugin-react'
const logger = getLogger(`Info`, `vite.config.js`)
const dir = path.resolve('.')
loadEnv(dir)
// https://vitejs.dev/config/
export default defineConfig(async function ({ command, mode }) {
    logger.info(`Running at ${dir} in ${mode} mode`)
    // NODE_ENV must be wrapped in quotes. We just set it to the mode and ignore what's in the env file, otherwise the
    // mode and NODE_ENV can end up out of sync (one set to development and the other set to production, which causes
    // issues like this: https://github.com/hashicorp/next-mdx-remote/pull/323
    logger.info(`NODE_ENV: ${process.env.NODE_ENV}`)

    // Set the env vars that we want to be available in the browser
    const define = {
        // used to stop websockets package from breaking
        'process.env.WS_NO_BUFFER_UTIL': JSON.stringify('true'),
        'process.env.WS_NO_UTF_8_VALIDATE': JSON.stringify('true'),
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.PROSOPO_SUBSTRATE_ENDPOINT': JSON.stringify(process.env.PROSOPO_SUBSTRATE_ENDPOINT),
        'process.env.PROSOPO_DEFAULT_ENVIRONMENT': JSON.stringify(process.env.PROSOPO_DEFAULT_ENVIRONMENT),
        // only needed if bundling with a site key
        'process.env.PROSOPO_SITE_KEY': JSON.stringify(process.env.PROSOPO_SITE_KEY),
        'process.env.PROSOPO_CONTRACT_ADDRESS': JSON.stringify(process.env.PROSOPO_CONTRACT_ADDRESS),
        'process.env.PROSOPO_WEB2': JSON.stringify(process.env.PROSOPO_WEB2),
        'process.env.PROSOPO_SERVER_URL': JSON.stringify(process.env.PROSOPO_SERVER_URL),
        'process.env.PROSOPO_SERVER_PORT': JSON.stringify(process.env.PROSOPO_SERVER_PORT),
        'process.env.PROSOPO_PORT': JSON.stringify(process.env.PROSOPO_PORT),
        'process.env._DEV_ONLY_WATCH_EVENTS': JSON.stringify(process.env._DEV_ONLY_WATCH_EVENTS),
    }
    logger.debug('define', JSON.stringify(define))
    return {
        watch: false,
        mode: 'development',
        bundle: true,
        define,
        optimizeDeps: {
            include: ['prop-types'],
        },
        esbuild: {
            target: ['es2020', 'chrome60', 'edge18', 'firefox60', 'node12', 'safari11'],
        },
        build: {
            modulePreload: { polyfill: true },
            lib: { entry: path.resolve(__dirname, './index.html'), name: 'client_example' },
        },
        plugins: [
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            react(),
            // Closes the bundler and copies the bundle to the client-bundle-example project unless we're in serve
            // mode, in which case we don't want to close the bundler because it will close the server
            command !== 'serve' ? VitePluginCloseAndCopy() : undefined,
            // Watches external files (workspace packages) and rebuilds them when they change
            await VitePluginWatchWorkspace({
                workspaceRoot: path.resolve('../..'),
                currentPackage: `${path.resolve('.')}/**/*`,
                format: 'esm',
                ignorePaths: [`${path.resolve('../..')}/demos/*`, `${path.resolve('../..')}/dev/*`, `**/dist/**/*`],
            }),
        ],
        server: { port: process.env.PROSOPO_PORT ? Number(process.env.PROSOPO_PORT) : 9230 },
    }
})
