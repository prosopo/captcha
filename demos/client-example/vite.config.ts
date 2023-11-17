import * as path from 'path'
import { VitePluginCloseAndCopy } from '@prosopo/config'
import { defineConfig } from 'vite'
import { getLogger } from '@prosopo/common'
import { loadEnv } from '@prosopo/cli'
import react from '@vitejs/plugin-react'
const logger = getLogger(`Info`, `vite.config.js`)
const dir = path.resolve('.')
loadEnv(dir)
// https://vitejs.dev/config/
export default defineConfig(function ({ command, mode }) {
    logger.info(`Running at ${dir} in ${mode} mode`)
    // NODE_ENV must be wrapped in quotes. We just set it to the mode and ignore what's in the env file, otherwise the
    // mode and NODE_ENV can end up out of sync (one set to development and the other set to production, which causes
    // issues like this: https://github.com/hashicorp/next-mdx-remote/pull/323
    process.env.NODE_ENV = `${mode}`
    logger.info(`NODE_ENV: ${process.env.NODE_ENV}`)

    // Set the env vars that we want to be available in the browser
    const define = {
        // used to stop websockets package from breaking
        'process.env.WS_NO_BUFFER_UTIL': JSON.stringify('true'),
        'process.env.WS_NO_UTF_8_VALIDATE': JSON.stringify('true'),
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'process.env.PROTOCOL_CONTRACT_ADDRESS': JSON.stringify(process.env.PROTOCOL_CONTRACT_ADDRESS),
        'process.env.SUBSTRATE_NODE_URL': JSON.stringify(process.env.SUBSTRATE_NODE_URL),
        'process.env.DEFAULT_ENVIRONMENT': JSON.stringify(process.env.DEFAULT_ENVIRONMENT),
        // only needed if bundling with a site key
        'process.env.PROSOPO_SITE_KEY': JSON.stringify(process.env.PROSOPO_SITE_KEY),
        'process.env.REACT_APP_DAPP_SITE_KEY': JSON.stringify(process.env.REACT_APP_DAPP_SITE_KEY),
        'process.env.REACT_APP_SUBSTRATE_ENDPOINT': JSON.stringify(process.env.REACT_APP_SUBSTRATE_ENDPOINT),
        'process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS': JSON.stringify(
            process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS
        ),
        'process.env.REACT_APP_WEB2': JSON.stringify(process.env.REACT_APP_WEB2),
        'process.env.REACT_APP_SERVER_URL': JSON.stringify(process.env.REACT_APP_SERVER_URL),
        'process.env.REACT_APP_PORT': JSON.stringify(process.env.REACT_APP_PORT),
    }
    console.log('define', JSON.stringify(define))

    return {
        watch: false,
        mode: 'production',
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
        ],
        server: { port: process.env.REACT_APP_PORT },
    }
})
