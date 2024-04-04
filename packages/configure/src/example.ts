import { loadConfig } from "./index.js";
import { ConfigSchema } from "./tests/config.js";

const main = async () => {
    const config = await loadConfig({ path: 'example.config.ts', schema: ConfigSchema })
    console.log(config)
}

main().catch(console.error)