import { ProviderEnvironment } from "@prosopo/env"

const config = 
const env = new ProviderEnvironment(config, pair)
await env.isReady()
const tasks = new Tasks(env)
const result = (await tasks.contract.query.getDapp(validateAddress(argv).address)).value.unwrap().unwrap()
