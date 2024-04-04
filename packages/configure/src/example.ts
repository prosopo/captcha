import { ConfigSchema } from './tests/config.js'
import { loadConfig } from './index.js'

const main = async () => {
    const config = await loadConfig({ path: 'example.config.ts', schema: ConfigSchema })
    console.log(config)
}

main().catch(console.error)
